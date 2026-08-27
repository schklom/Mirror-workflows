{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.services.opengym;

  opengymPkgs = {
    opengym-frontend = pkgs.callPackage ./frontend.nix { };
    opengym-api = pkgs.callPackage ./api.nix { };
    opengym-mcp = pkgs.callPackage ./mcp.nix { };
    opengym-media = pkgs.callPackage ./media.nix { };
    opengym-fetch-media = pkgs.callPackage ./media-script.nix { };
  };

  packages = cfg.package;

  apiEnv = lib.filterAttrs (_: v: v != null) {
    PORT = toString cfg.apiPort;
    DATA_DIR = cfg.dataDir;
    RP_ID = cfg.rpId;
    ORIGIN = cfg.origin;
    RP_NAME = cfg.rpName;
    SESSION_DAYS = toString cfg.sessionDays;
    ALLOW_GUEST = if cfg.allowGuest then "1" else "0";
    INVITE_ONLY = if cfg.inviteOnly then "1" else "0";
    AUDIT_LOG = if cfg.auditLog then "1" else "0";
    AUDIT_MAX = toString cfg.auditMax;
    AUDIT_DAYS = toString cfg.auditDays;
    AUDIT_IP = cfg.auditIp;
    VAPID_SUBJECT = if cfg.vapidSubject != "" then cfg.vapidSubject else null;
    ADMIN_UIDS = if cfg.adminUids != "" then cfg.adminUids else null;
  };

  mediaRoot =
    if cfg.media.fetchAtBuild then "${packages.opengym-media}/images" else "${cfg.media.dataDir}/img";
  mediaGifRoot =
    if cfg.media.fetchAtBuild then "${packages.opengym-media}/videos" else "${cfg.media.dataDir}/gif";

in
{
  options.services.opengym = {
    enable = lib.mkEnableOption "openGym self-hosted gym tracker";

    package = lib.mkOption {
      type = lib.types.attrsOf lib.types.package;
      default = opengymPkgs;
      defaultText = lib.literalExpression "opengym packages built from source";
      description = "openGym package set (typically the flake output).";
    };

    dataDir = lib.mkOption {
      type = lib.types.path;
      default = "/var/lib/opengym";
      description = "Persistent data directory (db.json, state files, secrets).";
    };

    apiPort = lib.mkOption {
      type = lib.types.port;
      default = 3000;
      description = "Port the API listens on (internal, proxied by nginx).";
    };

    rpId = lib.mkOption {
      type = lib.types.str;
      default = "localhost";
      description = "WebAuthn Relying Party ID (bare hostname, must match address bar).";
    };

    origin = lib.mkOption {
      type = lib.types.str;
      default = "http://localhost:8080";
      description = "Full origin URL for CSRF validation (must match address bar).";
    };

    rpName = lib.mkOption {
      type = lib.types.str;
      default = "openGym";
      description = "Display name for passkey registration prompts.";
    };

    sessionDays = lib.mkOption {
      type = lib.types.ints.unsigned;
      default = 90;
      description = "Session cookie lifetime in days.";
    };

    adminUids = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "Comma-separated user IDs granted admin access.";
    };

    inviteOnly = lib.mkEnableOption "require invite code for new signups";

    allowGuest = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Allow 'Continue without account' (guest mode).";
    };

    auditLog = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Enable activity audit log.";
    };

    auditMax = lib.mkOption {
      type = lib.types.ints.unsigned;
      default = 5000;
      description = "Max audit events kept (0 = unlimited).";
    };

    auditDays = lib.mkOption {
      type = lib.types.ints.unsigned;
      default = 90;
      description = "Max days of audit events kept.";
    };

    auditIp = lib.mkOption {
      type = lib.types.enum [
        "off"
        "net"
        "full"
      ];
      default = "off";
      description = "IP recording mode: off, net (masked), full.";
    };

    vapidSubject = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "VAPID subject for push notifications (defaults to ORIGIN).";
    };

    media = {
      fetchAtBuild = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Fetch exercise media at build time (into Nix store). If false, fetch at runtime.";
      };

      dataDir = lib.mkOption {
        type = lib.types.path;
        default = "${cfg.dataDir}/media";
        description = "Directory for runtime-fetched exercise media.";
      };

      imageRoot = lib.mkOption {
        type = lib.types.path;
        readOnly = true;
        description = "Directory containing exercise images (jpg). For use by a web server.";
      };

      gifRoot = lib.mkOption {
        type = lib.types.path;
        readOnly = true;
        description = "Directory containing exercise GIFs. For use by a web server.";
      };
    };

    web = {
      root = lib.mkOption {
        type = lib.types.path;
        readOnly = true;
        description = "Built frontend directory (static SPA). For use by a web server.";
      };
    };

    mcp = {
      enable = lib.mkEnableOption "openGym MCP server (stdio bridge for LLM clients)";
    };
  };

  config = lib.mkIf cfg.enable {

    users.users.opengym = {
      isSystemUser = true;
      group = "opengym";
      description = "openGym service user";
    };

    users.groups.opengym = { };

    systemd.tmpfiles.rules = [
      "d ${cfg.dataDir} 0750 opengym opengym - -"
      "d ${cfg.media.dataDir} 0755 opengym opengym - -"
    ];

    systemd.services.opengym-api = {
      description = "openGym API server";
      after = [ "network.target" ];
      wantedBy = [ "multi-user.target" ];
      environment = apiEnv;
      serviceConfig = {
        ExecStart = "${packages.opengym-api}/bin/opengym-api";
        User = "opengym";
        Group = "opengym";
        StateDirectory = "opengym";
        StateDirectoryMode = "0750";
        Restart = "on-failure";
        RestartSec = 5;

        NoNewPrivileges = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        PrivateTmp = true;
        PrivateDevices = true;
        ProtectKernelTunables = true;
        ProtectKernelModules = true;
        ProtectControlGroups = true;
        RestrictNamespaces = true;
        RestrictSUIDSGID = true;
        LockPersonality = true;
        SystemCallFilter = [
          "@system-service"
          "~@privileged"
        ];
        ReadWritePaths = [ cfg.dataDir ];
      };
    };

    systemd.services.opengym-media = lib.mkIf (!cfg.media.fetchAtBuild) {
      description = "Download exercise media for openGym";
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        ExecStart = "${packages.opengym-fetch-media}/bin/opengym-fetch-media ${cfg.media.dataDir}";
        Type = "oneshot";
        RemainAfterExit = true;
        User = "opengym";
        Group = "opengym";
        StateDirectory = "opengym";
      };
    };

    services.nginx.enable = lib.mkForce false;

    services.opengym.media = {
      imageRoot = mediaRoot;
      gifRoot = mediaGifRoot;
    };

    services.opengym.web.root = "${packages.opengym-frontend}/share/opengym";

    systemd.services.opengym-mcp = lib.mkIf cfg.mcp.enable {
      description = "openGym MCP server";
      after = [ "network.target" ];
      wantedBy = [ "multi-user.target" ];
      environment = {
        DATA_DIR = cfg.dataDir;
      };
      serviceConfig = {
        ExecStart = "${packages.opengym-mcp}/bin/opengym-mcp";
        StandardInput = "null";
        StandardOutput = "journal";
        User = "opengym";
        Group = "opengym";
        Restart = "on-failure";
      };
    };
  };
}
