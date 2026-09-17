-- Crypto v2

-- fmd_users
ALTER TABLE fmd_users ADD COLUMN enc_master_key_v2 TEXT NOT NULL DEFAULT "";
ALTER TABLE fmd_users ADD COLUMN crypto_proto_version INTEGER NOT NULL DEFAULT 1;

-- data_v2
CREATE TABLE IF NOT EXISTS `data_v2` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `user_id` integer NOT NULL,
  `type` integer NOT NULL,
  `client_item_id` blob NOT NULL,
  `unix_millis` integer NOT NULL,
  `ciphertext` text NOT NULL,
  CONSTRAINT `fk_fmd_users_data_v2` FOREIGN KEY (`user_id`) REFERENCES `fmd_users` (`id`) ON DELETE CASCADE
);

-- Ensure that for a given user, the item ID (chosen by the client) is unique
CREATE UNIQUE INDEX IF NOT EXISTS `idx_data_v2_user_client_item_id` ON `data_v2` (`user_id`, `client_item_id`);

-- Speed up queries (not UNIQUE!)
CREATE INDEX IF NOT EXISTS `idx_data_v2_user_type` ON `data_v2` (`user_id`, `type`);

-- messages
CREATE TABLE IF NOT EXISTS `messages` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `user_id` integer NOT NULL,
  `uuid` text NOT NULL,
  `unix_millis` integer NOT NULL,
  `code` integer NOT NULL,
  `text` text NOT NULL,
  CONSTRAINT `fk_fmd_users_messages` FOREIGN KEY (`user_id`) REFERENCES `fmd_users` (`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_messages_user_id_uuid` ON `messages` (`user_id`, `uuid`);

