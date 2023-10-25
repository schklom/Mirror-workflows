<?php
interface IVirtualFeed {
	function get_unread(int $feed_id) : int;
	function get_total(int $feed_id) : int;
	/**
	 * @param int $feed_id
	 * @param array<string,int|string|bool> $options
	 * @return array<int,int|string>
	 */
	function get_headlines(int $feed_id, array $options) : array;
}
