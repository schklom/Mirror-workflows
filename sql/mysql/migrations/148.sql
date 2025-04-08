alter table ttrss_feeds change auth_pass auth_pass text not null;

update ttrss_version set schema_version = 148;
