alter table ttrss_feeds add column last_successful_update timestamp;
alter table ttrss_feeds alter column last_successful_update set default null;

update ttrss_version set schema_version = 140;
