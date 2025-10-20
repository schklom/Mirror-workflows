<?php

use PHPUnit\Framework\TestCase;

final class FeedParserTest extends TestCase {
	
	// ===== RSS 2.0 Feed Tests =====
	
	public function testParseValidRss2Feed(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<title>Test Feed</title>
				<link>https://example.com</link>
				<item>
					<title>Article 1</title>
					<link>https://example.com/1</link>
				</item>
			</channel>
		</rss>';
		
		$parser = new FeedParser($xml);
		$this->assertTrue($parser->init());
		$this->assertEquals(FeedParser::FEED_RSS, $parser->get_type());
		$this->assertEquals('Test Feed', $parser->get_title());
		$this->assertEquals('https://example.com', $parser->get_link());
		$this->assertCount(1, $parser->get_items());
	}
	
	public function testParseRssFeedWithMultipleItems(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<title>Multi-Item Feed</title>
				<link>https://example.com</link>
				<item><title>Item 1</title></item>
				<item><title>Item 2</title></item>
				<item><title>Item 3</title></item>
			</channel>
		</rss>';
		
		$parser = new FeedParser($xml);
		$parser->init();
		$this->assertCount(3, $parser->get_items());
	}
	
	public function testRssFeedTrimsWhitespaceInTitleAndLink(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<title>  Whitespace Title  </title>
				<link>  https://example.com  </link>
			</channel>
		</rss>';
		
		$parser = new FeedParser($xml);
		$parser->init();
		$this->assertEquals('Whitespace Title', $parser->get_title());
		$this->assertEquals('https://example.com', $parser->get_link());
	}
	
	// ===== Atom Feed Tests =====
	
	public function testParseValidAtomFeed(): void {
		$xml = '<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<title>Atom Feed</title>
			<link href="https://example.com" />
			<entry>
				<title>Entry 1</title>
			</entry>
		</feed>';
		
		$parser = new FeedParser($xml);
		$this->assertTrue($parser->init());
		$this->assertEquals(FeedParser::FEED_ATOM, $parser->get_type());
		$this->assertEquals('Atom Feed', $parser->get_title());
		$this->assertEquals('https://example.com', $parser->get_link());
		$this->assertCount(1, $parser->get_items());
	}
	
	public function testAtomFeedWithAlternateLinkRel(): void {
		$xml = '<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<title>Test</title>
			<link rel="alternate" href="https://example.com/alternate" />
			<link rel="self" href="https://example.com/self" />
		</feed>';
		
		$parser = new FeedParser($xml);
		$parser->init();
		$this->assertEquals('https://example.com/alternate', $parser->get_link());
	}
	
	public function testAtom03Feed(): void {
		$xml = '<?xml version="1.0"?>
		<feed version="0.3" xmlns="http://purl.org/atom/ns#">
			<title>Atom 0.3 Feed</title>
			<link href="https://example.com" />
			<entry>
				<title>Old Entry</title>
			</entry>
		</feed>';
		
		$parser = new FeedParser($xml);
		$this->assertTrue($parser->init());
		$this->assertEquals(FeedParser::FEED_ATOM, $parser->get_type());
		$this->assertEquals('Atom 0.3 Feed', $parser->get_title());
		$this->assertCount(1, $parser->get_items());
	}
	
	// ===== RDF/RSS 1.0 Feed Tests =====
	
	public function testParseRdfFeed(): void {
		$xml = '<?xml version="1.0"?>
		<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
		         xmlns="http://purl.org/rss/1.0/">
			<channel>
				<title>RDF Feed</title>
				<link>https://example.com</link>
			</channel>
			<item>
				<title>RDF Item</title>
			</item>
		</rdf:RDF>';
		
		$parser = new FeedParser($xml);
		$this->assertTrue($parser->init());
		$this->assertEquals(FeedParser::FEED_RDF, $parser->get_type());
		$this->assertEquals('RDF Feed', $parser->get_title());
		$this->assertEquals('https://example.com', $parser->get_link());
		$this->assertCount(1, $parser->get_items());
	}
	
	// ===== Error Handling Tests =====
	
	public function testInvalidXmlReturnsError(): void {
		$xml = '<?xml version="1.0"?><broken><tag>';
		
		$parser = new FeedParser($xml);
		$this->assertFalse($parser->init());
		$this->assertNotEmpty($parser->error());
	}
	
	public function testUnknownFeedTypeReturnsError(): void {
		$xml = '<?xml version="1.0"?><unknown><format /></unknown>';
		
		$parser = new FeedParser($xml);
		$this->assertFalse($parser->init());
		$this->assertEquals(FeedParser::FEED_UNKNOWN, $parser->get_type());
		$this->assertStringContainsString('Unknown/unsupported feed type', $parser->error());
	}
	
	public function testEmptyXmlReturnsError(): void {
		$parser = new FeedParser('');
		$this->assertFalse($parser->init());
		$this->assertStringContainsString('Empty feed data', $parser->error());
	}
	
	public function testLibxmlErrorsAreCollected(): void {
		$xml = '<?xml version="1.0"?><rss><channel><title>Test</broken></channel></rss>';
		
		$parser = new FeedParser($xml);
		$errors = $parser->errors();
		$this->assertNotEmpty($errors);
	}
	
	// ===== Feed Type Detection Tests =====
	
	public function testGetTypeBeforeInitReturnsUnknown(): void {
		$xml = '<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>';
		$parser = new FeedParser($xml);
		
		// get_type() before init() should detect type automatically
		$this->assertEquals(FeedParser::FEED_RSS, $parser->get_type());
	}
	
	public function testGetTypeCachesResult(): void {
		$xml = '<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>';
		$parser = new FeedParser($xml);
		
		$type1 = $parser->get_type();
		$type2 = $parser->get_type();
		$this->assertEquals($type1, $type2);
	}
	
	// ===== Link Extraction Tests =====
	
	public function testGetLinksFromAtomFeed(): void {
		$xml = '<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<title>Test</title>
			<link rel="self" href="https://example.com/self" />
			<link rel="alternate" href="https://example.com/alt" />
			<link rel="hub" href="https://example.com/hub" />
		</feed>';
		
		$parser = new FeedParser($xml);
		$parser->init();
		
		$selfLinks = $parser->get_links('self');
		$this->assertCount(1, $selfLinks);
		$this->assertEquals('https://example.com/self', $selfLinks[0]);
		
		$hubLinks = $parser->get_links('hub');
		$this->assertCount(1, $hubLinks);
		$this->assertEquals('https://example.com/hub', $hubLinks[0]);
	}
	
	public function testGetLinksFromRssFeed(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
			<channel>
				<title>Test</title>
				<atom:link rel="self" href="https://example.com/self" />
				<atom:link rel="hub" href="https://example.com/hub" />
			</channel>
		</rss>';
		
		$parser = new FeedParser($xml);
		$parser->init();
		
		$selfLinks = $parser->get_links('self');
		$this->assertCount(1, $selfLinks);
		$this->assertEquals('https://example.com/self', $selfLinks[0]);
	}
	
	public function testGetLinksWithoutRelReturnsAllLinks(): void {
		$xml = '<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<title>Test</title>
			<link rel="self" href="https://example.com/self" />
			<link rel="alternate" href="https://example.com/alt" />
		</feed>';
		
		$parser = new FeedParser($xml);
		$parser->init();
		
		$allLinks = $parser->get_links('');
		$this->assertCount(2, $allLinks);
	}
	
	// ===== Empty/Missing Data Tests =====
	
	public function testFeedWithoutTitleReturnsEmptyString(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<link>https://example.com</link>
			</channel>
		</rss>';
		
		$parser = new FeedParser($xml);
		$parser->init();
		$this->assertEquals('', $parser->get_title());
	}
	
	public function testFeedWithoutLinkReturnsEmptyString(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<title>Test</title>
			</channel>
		</rss>';
		
		$parser = new FeedParser($xml);
		$parser->init();
		$this->assertEquals('', $parser->get_link());
	}
	
	public function testFeedWithoutItemsReturnsEmptyArray(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<title>Empty Feed</title>
			</channel>
		</rss>';
		
		$parser = new FeedParser($xml);
		$parser->init();
		$this->assertCount(0, $parser->get_items());
	}
	
	// ===== RSS Link Attribute Handling =====
	
	public function testRssLinkWithHrefAttribute(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<title>Test</title>
				<link href="https://example.com/href-link" />
			</channel>
		</rss>';
		
		$parser = new FeedParser($xml);
		$parser->init();
		$this->assertEquals('https://example.com/href-link', $parser->get_link());
	}
	
	public function testRssLinkWithNodeValue(): void {
		$xml = '<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<title>Test</title>
				<link>https://example.com/node-link</link>
			</channel>
		</rss>';
		
		$parser = new FeedParser($xml);
		$parser->init();
		$this->assertEquals('https://example.com/node-link', $parser->get_link());
	}
}
