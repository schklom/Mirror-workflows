alter table ttrss_users add column last_auth_attempt datetime;
alter table ttrss_users alter column last_auth_attempt set default null;
