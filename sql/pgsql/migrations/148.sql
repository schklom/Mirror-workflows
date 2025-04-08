alter table ttrss_feeds rename column auth_pass to auth_pass_old;
alter table ttrss_feeds add column auth_pass text;
update ttrss_feeds set auth_pass = auth_pass_old;
alter table ttrss_feeds alter column auth_pass set not null;
alter table ttrss_feeds drop column auth_pass_old;

update ttrss_version set schema_version = 148;
