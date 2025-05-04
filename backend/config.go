package backend

import (
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

// Config field keys

const CONF_DATABASE_DIR = "DatabaseDir"
const CONF_WEB_DIR = "WebDir"

const CONF_UNIX_SOCKET_PATH = "UnixSocketPath"
const CONF_UNIX_SOCKET_CHMOD = "UnixSocketChmod"

const CONF_PORT_SECURE = "PortSecure"
const CONF_PORT_INSECURE = "PortInsecure"

const CONF_USER_ID_LENGTH = "UserIdLength"

const CONF_MAX_SAVED_LOC = "MaxSavedLoc"
const CONF_MAX_SAVED_PIC = "MaxSavedPic"

const CONF_REGISTRATION_TOKEN = "RegistrationToken"

const CONF_SERVER_CERT = "ServerCrt"
const CONF_SERVER_KEY = "ServerKey"

const CONF_REMOTE_IP_HEADER = "RemoteIpHeader"

// Set the default values for all config fields.
//
// See the descriptions in config.example.yml,
// And keep the default values in sync!.
func setDefaults(config *viper.Viper) {
	config.SetDefault(CONF_DATABASE_DIR, "./db/")
	config.SetDefault(CONF_WEB_DIR, "./web/")

	config.SetDefault(CONF_UNIX_SOCKET_PATH, "")
	config.SetDefault(CONF_UNIX_SOCKET_CHMOD, 0600)

	config.SetDefault(CONF_PORT_SECURE, 8443)
	config.SetDefault(CONF_PORT_INSECURE, 8080)

	config.SetDefault(CONF_USER_ID_LENGTH, 5)

	config.SetDefault(CONF_MAX_SAVED_LOC, 1000)
	config.SetDefault(CONF_MAX_SAVED_PIC, 10)

	config.SetDefault(CONF_REGISTRATION_TOKEN, "")

	config.SetDefault(CONF_SERVER_CERT, "")
	config.SetDefault(CONF_SERVER_KEY, "")

	config.SetDefault(CONF_REMOTE_IP_HEADER, "")
}

// Initialise a config struct with all default values.
//
// This does NOT yet read the config file!
// It does set up the config struct to listen to env var changes.
func InitConfig() viper.Viper {
	// https://github.com/spf13/viper#viper-or-vipers
	config := viper.New()

	config.SetConfigName("config")
	config.SetConfigType("yaml")

	// Check env vars every time config.Get() is called
	config.SetEnvPrefix("fmd")
	config.AutomaticEnv()

	setDefaults(config)

	return *config
}

// Read the config file, either at the provided location, or at the default locations.
func ReadConfigFile(config *viper.Viper, configFilePath string) {
	useCustomPath := len(configFilePath) > 0

	if useCustomPath {
		config.SetConfigFile(configFilePath)
	} else {
		// If the admin has explicitly passed a path via the CLI flag,
		// DO NOT fall back to these locations.
		// Better to fail reading the file below to let the admin know something is wrong,
		// than silently using a different file (which can be hard to debug).
		config.AddConfigPath("/etc/fmd-server/")
		config.AddConfigPath(".")
	}

	err := config.ReadInConfig()
	if err != nil {
		_, ok := err.(viper.ConfigFileNotFoundError)
		if ok && !useCustomPath {
			// use default values if default config files don't exist
			log.Warn().Msg("no config found, using defaults")
		} else {
			// fail to alert the admin
			log.Fatal().Err(err).Msg("failed to read config file")
		}
	}

	log.Info().
		Str("configFile", config.ConfigFileUsed()).
		Msg("using config")

	// TODO: support auto-reload??
	// config.OnConfigChange(func(e fsnotify.Event) {
	// 	// TODO
	// })
	// config.WatchConfig()
}
