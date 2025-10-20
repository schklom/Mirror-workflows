<?php

use PHPUnit\Framework\TestCase;

final class FeedItemTest extends TestCase {

	// ===== FeedItem_RSS Tests =====

	public function testRssGetIdFromGuid(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<item>
					<guid>unique-id-123</guid>
					<link>https://example.com/article</link>
				</item>
			</channel>
		</rss>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		$this->assertEquals('unique-id-123', $items[0]->get_id());
	}

	public function testRssGetIdFallsBackToLink(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<item>
					<link>https://example.com/article</link>
				</item>
			</channel>
		</rss>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		$this->assertEquals('https://example.com/article', $items[0]->get_id());
	}

	public function testRssGetDateFromPubDate(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<item>
					<pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
				</item>
			</channel>
		</rss>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		$timestamp = $items[0]->get_date();
		$this->assertEquals(1704110400, $timestamp); // 2024-01-01 12:00:00 GMT
	}

	public function testRssGetDateFromDcDate(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
			<channel>
				<item>
					<dc:date>2024-01-01T12:00:00Z</dc:date>
				</item>
			</channel>
		</rss>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		$timestamp = $items[0]->get_date();
		$this->assertEquals(1704110400, $timestamp); // 2024-01-01 12:00:00 GMT
	}

	public function testRssGetDateReturnsFalseForMissingDate(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<item>
					<title>No date</title>
				</item>
			</channel>
		</rss>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		$this->assertFalse($items[0]->get_date());
	}

	public function testRssGetLinkFromAtomLink(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
			<channel>
				<item>
					<atom:link href="https://example.com/article" rel="alternate" />
					<link>https://example.com/old-link</link>
				</item>
			</channel>
		</rss>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		$this->assertEquals('https://example.com/article', $items[0]->get_link());
	}

	public function testRssGetLinkFromPermaLinkGuid(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<item>
					<guid isPermaLink="true">https://example.com/permalink</guid>
					<link>https://example.com/link</link>
				</item>
			</channel>
		</rss>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		// Permalink guid is checked AFTER atom:link but BEFORE <link>
		// Since there's no atom:link, permalink guid is used
		$this->assertEquals('https://example.com/permalink', $items[0]->get_link());
	}

	public function testRssGetLinkFromLinkElement(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<item>
					<link>https://example.com/article</link>
				</item>
			</channel>
		</rss>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		$this->assertEquals('https://example.com/article', $items[0]->get_link());
	}

	public function testRssGetTitle(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<item>
					<title>  Test Article Title  </title>
				</item>
			</channel>
		</rss>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		$this->assertEquals('Test Article Title', $items[0]->get_title());
	}

	public function testRssGetContentFromEncoded(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
			<channel>
				<item>
					<content:encoded><![CDATA[<p>Full article content</p>]]></content:encoded>
					<description>Short description</description>
				</item>
			</channel>
		</rss>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		$content = $items[0]->get_content();
		$this->assertStringContainsString('Full article content', $content);
	}

	public function testRssGetContentPrefersLonger(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
			<channel>
				<item>
					<content:encoded>Short</content:encoded>
					<description>This is a much longer description with more text</description>
				</item>
			</channel>
		</rss>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		$content = $items[0]->get_content();
		$this->assertStringContainsString('longer description', $content);
	}

	// ===== FeedItem_Atom Tests =====

	public function testAtomGetIdFromIdElement(): void {
		$xml = '<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<entry>
				<id>tag:example.com,2024:entry-123</id>
				<link href="https://example.com/article" />
			</entry>
		</feed>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		$this->assertEquals('tag:example.com,2024:entry-123', $items[0]->get_id());
	}

	public function testAtomGetIdFallsBackToLink(): void {
		$xml = '<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<entry>
				<link href="https://example.com/article" />
			</entry>
		</feed>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		$this->assertEquals('https://example.com/article', $items[0]->get_id());
	}

	public function testAtomGetDateFromUpdated(): void {
		$xml = '<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<entry>
				<updated>2024-01-01T12:00:00Z</updated>
				<published>2024-01-01T10:00:00Z</published>
			</entry>
		</feed>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		$timestamp = $items[0]->get_date();
		$this->assertEquals(1704110400, $timestamp); // updated time
	}

	public function testAtomGetDateFromPublished(): void {
		$xml = '<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<entry>
				<published>2024-01-01T12:00:00Z</published>
			</entry>
		</feed>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		$timestamp = $items[0]->get_date();
		$this->assertEquals(1704110400, $timestamp);
	}

	public function testAtomGetLink(): void {
		$xml = '<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<entry>
				<link href="https://example.com/article" rel="alternate" />
				<link href="https://example.com/related" rel="related" />
			</entry>
		</feed>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		$this->assertEquals('https://example.com/article', $items[0]->get_link());
	}

	public function testAtomGetLinkWithoutRel(): void {
		$xml = '<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<entry>
				<link href="https://example.com/article" />
			</entry>
		</feed>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		$this->assertEquals('https://example.com/article', $items[0]->get_link());
	}

	public function testAtomGetTitle(): void {
		$xml = '<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<entry>
				<title>  Atom Entry Title  </title>
			</entry>
		</feed>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		$this->assertEquals('Atom Entry Title', $items[0]->get_title());
	}

	public function testAtomGetContentFromContent(): void {
		$xml = '<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<entry>
				<content type="html"><![CDATA[<p>Full content</p>]]></content>
				<summary>Short summary</summary>
			</entry>
		</feed>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		$content = $items[0]->get_content();
		$this->assertStringContainsString('Full content', $content);
	}

	public function testAtomGetContentReturnsContentOnly(): void {
		$xml = '<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<entry>
				<content type="text">Short</content>
				<summary>This is a much longer summary with more details</summary>
			</entry>
		</feed>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		// Atom get_content() returns only <content>, not <summary>
		$this->assertEquals('Short', $items[0]->get_content());
	}

	// ===== Edge Cases =====

	public function testRssEmptyItemReturnsEmptyStrings(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<item></item>
			</channel>
		</rss>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		$this->assertEquals('', $items[0]->get_link());
		$this->assertEquals('', $items[0]->get_title());
	}

	public function testAtomEmptyEntryReturnsEmptyStrings(): void {
		$xml = '<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<entry></entry>
		</feed>';

		$parser = new FeedParser($xml);
		$parser->init();
		$items = $parser->get_items();

		$this->assertCount(1, $items);
		$this->assertEquals('', $items[0]->get_link());
		$this->assertEquals('', $items[0]->get_title());
	}

	// ===== FeedItem_Common::normalize_categories() Tests =====

	public function testNormalizeCategoriesHandlesSingleCategory(): void {
		$cats = ['Technology'];

		$result = FeedItem_Common::normalize_categories($cats);

		$this->assertCount(1, $result);
		$this->assertContains('technology', $result);
	}

	public function testNormalizeCategoriesHandlesCommaSeparatedCategories(): void {
		$cats = ['Tech,News,Programming'];

		$result = FeedItem_Common::normalize_categories($cats);

		$this->assertCount(3, $result);
		$this->assertContains('tech', $result);
		$this->assertContains('news', $result);
		$this->assertContains('programming', $result);
	}

	public function testNormalizeCategoriesConvertsToLowercase(): void {
		$cats = ['TECHNOLOGY', 'NeWs', 'PrOgRaMmInG'];

		$result = FeedItem_Common::normalize_categories($cats);

		$this->assertContains('technology', $result);
		$this->assertContains('news', $result);
		$this->assertContains('programming', $result);
		$this->assertNotContains('TECHNOLOGY', $result);
	}

	public function testNormalizeCategoriesTrimsWhitespace(): void {
		$cats = ['  technology  ', ' news ', 'programming'];

		$result = FeedItem_Common::normalize_categories($cats);

		$this->assertContains('technology', $result);
		$this->assertContains('news', $result);
		$this->assertNotContains('  technology  ', $result);
	}

	public function testNormalizeCategoriesRemovesDuplicates(): void {
		$cats = ['tech', 'Tech', 'TECH', 'technology', 'tech'];

		$result = FeedItem_Common::normalize_categories($cats);

		// After lowercase normalization, 'tech' appears 4 times, 'technology' once
		$this->assertContains('tech', $result);
		$this->assertContains('technology', $result);

		// Count occurrences - 'tech' should appear only once
		$tech_count = count(array_filter($result, fn($c) => $c === 'tech'));
		$this->assertEquals(1, $tech_count);
	}

	public function testNormalizeCategoriesRemovesEmptyValues(): void {
		$cats = ['tech', '', '  ', 'news', ''];

		$result = FeedItem_Common::normalize_categories($cats);

		$this->assertCount(2, $result);
		$this->assertContains('tech', $result);
		$this->assertContains('news', $result);
		$this->assertNotContains('', $result);
	}

	public function testNormalizeCategoriesHandlesNumericTags(): void {
		$cats = ['123', '456'];

		$result = FeedItem_Common::normalize_categories($cats);

		// Numeric tags are prefixed with 't:'
		$this->assertContains('t:123', $result);
		$this->assertContains('t:456', $result);
		$this->assertNotContains('123', $result);
	}

	public function testNormalizeCategoriesRemovesSpecialCharacters(): void {
		$cats = ["tech,news", "tech'news", 'tech"news'];

		$result = FeedItem_Common::normalize_categories($cats);

		// Commas split categories, quotes are removed
		$this->assertContains('tech', $result);
		$this->assertContains('news', $result);
		$this->assertContains('technews', $result);
	}

	public function testNormalizeCategoriesTruncatesLongCategories(): void {
		$long_cat = str_repeat('a', 300);
		$cats = [$long_cat];

		$result = FeedItem_Common::normalize_categories($cats);

		$this->assertCount(1, $result);
		$this->assertEquals(250, mb_strlen($result[0]));
		$this->assertEquals(str_repeat('a', 250), $result[0]);
	}

	public function testNormalizeCategoriesHandlesMultibyteCharacters(): void {
		$cats = ['技術', 'ニュース', '日本'];

		$result = FeedItem_Common::normalize_categories($cats);

		$this->assertCount(3, $result);
		$this->assertContains('技術', $result);
		$this->assertContains('ニュース', $result);
		$this->assertContains('日本', $result);
	}

	public function testNormalizeCategoriesSortsResults(): void {
		$cats = ['zebra', 'apple', 'mango', 'banana'];

		$result = FeedItem_Common::normalize_categories($cats);

		// Results should be sorted alphabetically
		$expected = ['apple', 'banana', 'mango', 'zebra'];
		$this->assertEquals($expected, array_values($result));
	}

	public function testNormalizeCategoriesHandlesEmptyArray(): void {
		$cats = [];

		$result = FeedItem_Common::normalize_categories($cats);

		$this->assertIsArray($result);
		$this->assertEmpty($result);
	}

	public function testNormalizeCategoriesHandlesComplexInput(): void {
		$cats = [
			'Tech,News',
			'  PROGRAMMING  ',
			'123',
			'Tech',  // duplicate
			"tech'news",  // special chars
			'',  // empty
			str_repeat('x', 300),  // too long
		];

		$result = FeedItem_Common::normalize_categories($cats);

		// Should contain: tech, news, programming, t:123, technews, xxx... (250 chars)
		$this->assertContains('tech', $result);
		$this->assertContains('news', $result);
		$this->assertContains('programming', $result);
		$this->assertContains('t:123', $result);
		$this->assertContains('technews', $result);
		$this->assertContains(str_repeat('x', 250), $result);

		// Count occurrences - 'tech' should appear only once despite duplicates
		$tech_count = count(array_filter($result, fn($c) => $c === 'tech'));
		$this->assertEquals(1, $tech_count);
	}
}
