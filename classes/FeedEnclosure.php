<?php
class FeedEnclosure {
	function __construct(
		public string $link = '',
		public string $type = '',
		public string $length = '',
		public string $title = '',
		public string $height = '',
		public string $width = '',
	) {}
}
