create index ttrss_user_labels2_article_id_idx on ttrss_user_labels2(article_id);
create index ttrss_user_labels2_label_id_idx on ttrss_user_labels2(label_id);

update ttrss_version set schema_version = 142;
