create table ttrss_scheduled_tasks(
	id serial not null primary key,
	task_name varchar(250) unique not null,
	last_duration integer not null,
	last_rc integer not null,
	last_run timestamp not null default NOW());
