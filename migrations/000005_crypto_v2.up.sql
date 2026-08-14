-- Crypto v2

-- fmd_users
ALTER TABLE fmd_users ADD COLUMN enc_master_key_v2 TEXT NOT NULL DEFAULT "";
ALTER TABLE fmd_users ADD COLUMN crypto_proto_version INTEGER NOT NULL DEFAULT 1;

-- commands_v2
CREATE TABLE IF NOT EXISTS `commands_v2` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `user_id` integer NOT NULL,
  `client_item_id` blob NOT NULL,
  `unix_millis` integer NOT NULL,
  `ciphertext` text NOT NULL,
  CONSTRAINT `fk_fmd_users_commands_v2` FOREIGN KEY (`user_id`) REFERENCES `fmd_users` (`id`) ON DELETE CASCADE
);

-- Ensure that for a given user, the item ID (chosen by the client) is unique
CREATE UNIQUE INDEX IF NOT EXISTS `idx_commands_v2_user_id_client_item_id` ON `commands_v2` (`user_id`, `client_item_id`);

-- locations_v2
CREATE TABLE IF NOT EXISTS `locations_v2` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `user_id` integer NOT NULL,
  `client_item_id` blob NOT NULL,
  `unix_millis` integer NOT NULL,
  `ciphertext` text NOT NULL,
  CONSTRAINT `fk_fmd_users_locations_v2` FOREIGN KEY (`user_id`) REFERENCES `fmd_users` (`id`) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_locations_v2_user_id_client_item_id` ON `locations_v2` (`user_id`, `client_item_id`);

-- pictures_v2
CREATE TABLE IF NOT EXISTS `pictures_v2` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `user_id` integer NOT NULL,
  `client_item_id` blob NOT NULL,
  `unix_millis` integer NOT NULL,
  `ciphertext` text NOT NULL,
  CONSTRAINT `fk_fmd_users_pictures_v2` FOREIGN KEY (`user_id`) REFERENCES `fmd_users` (`id`) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_pictures_v2_user_id_client_item_id` ON `pictures_v2` (`user_id`, `client_item_id`);
