create table ttrss_user_prefs2 (
	owner_uid integer not null references ttrss_users(id) ON DELETE CASCADE,
	pref_name varchar(250) not null,
	profile integer references ttrss_settings_profiles(id) ON DELETE CASCADE,
	value text not null);

create index ttrss_user_prefs2_owner_uid_index on ttrss_user_prefs2(owner_uid);
create index ttrss_user_prefs2_pref_name_idx on ttrss_user_prefs2(pref_name);
create unique index ttrss_user_prefs2_composite_idx on ttrss_user_prefs2(pref_name, owner_uid, coalesce(profile, -1));

update ttrss_version set schema_version = 141;
