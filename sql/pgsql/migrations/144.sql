alter table ttrss_feeds add column favicon_is_custom boolean;
alter table ttrss_feeds alter column favicon_is_custom set default null;
