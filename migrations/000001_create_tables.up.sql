-- db_settings
CREATE TABLE IF NOT EXISTS `db_settings` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `setting` text,
  `value` text
);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_db_settings_setting` ON `db_settings` (`setting`);

-- fmd_users
CREATE TABLE IF NOT EXISTS `fmd_users` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `uid` text,
  `salt` text,
  `hashed_password` text,
  `private_key` text,
  `public_key` text,
  `command_to_user` text,
  `command_time` integer,
  `command_sig` text,
  `push_url` text
);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_fmd_users_uid` ON `fmd_users` (`uid`);

-- locations
CREATE TABLE IF NOT EXISTS `locations` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `user_id` integer,
  `position` text,
  CONSTRAINT `fk_fmd_users_locations` FOREIGN KEY (`user_id`) REFERENCES `fmd_users` (`id`) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `idx_locations_user_id` ON `locations` (`user_id`);

-- pictures
CREATE TABLE IF NOT EXISTS `pictures` (
  `id` integer PRIMARY KEY AUTOINCREMENT,
  `user_id` integer,
  `content` text,
  CONSTRAINT `fk_fmd_users_pictures` FOREIGN KEY (`user_id`) REFERENCES `fmd_users` (`id`) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `idx_pictures_user_id` ON `pictures` (`user_id`);
