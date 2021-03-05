alter table ttrss_users add column otp_secret varchar(250);
alter table ttrss_users alter column otp_secret set default null;
