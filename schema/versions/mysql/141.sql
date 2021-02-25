create table ttrss_user_prefs2 (
	owner_uid integer not null,
	pref_name varchar(250),
	profile integer null,
	value longtext not null,
	foreign key (profile) references ttrss_settings_profiles(id) ON DELETE CASCADE,
 	foreign key (owner_uid) references ttrss_users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=UTF8;

update ttrss_version set schema_version = 141;
