alter table ttrss_scheduled_tasks add column owner_uid integer default null references ttrss_users(id) ON DELETE CASCADE;
alter table ttrss_scheduled_tasks add column last_cron_expression varchar(250);

update ttrss_scheduled_tasks set last_cron_expression = '';

alter table ttrss_scheduled_tasks alter column last_cron_expression set not null;
