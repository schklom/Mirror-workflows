<?php
abstract class FeedItem {
	abstract function get_id(): string;

	/** @return int|false a timestamp on success, false otherwise */
	abstract function get_date();

	abstract function get_link(): string;
	abstract function get_title(): string;
	abstract function get_description(): string;
	abstract function get_content(): string;
	abstract function get_comments_url(): string;
	abstract function get_comments_count(): int;

	/** @return array<int, string> */
	abstract function get_categories(): array;

	/** @return array<int, FeedEnclosure> */
	abstract function get_enclosures(): array;

	abstract function get_author(): string;
	abstract function get_language(): string;
}

