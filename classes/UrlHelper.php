<?php
class UrlHelper {
	const EXTRA_HREF_SCHEMES = [
		"magnet",
		"mailto",
		"tel"
	];

	const EXTRA_SCHEMES_BY_CONTENT_TYPE = [
		"application/x-bittorrent" => [ "magnet" ],
	];

	static string $fetch_last_error;
	static int $fetch_last_error_code;
	static string $fetch_last_error_content;
	static string $fetch_last_content_type;
	static string $fetch_last_modified;
	static string $fetch_effective_url;
	static string $fetch_effective_ip_addr;

	private static ?GuzzleHttp\ClientInterface $client = null;

	private static function get_client(): GuzzleHttp\ClientInterface {
		if (self::$client == null) {
			self::$client = new GuzzleHttp\Client([
				GuzzleHttp\RequestOptions::COOKIES => false,
				GuzzleHttp\RequestOptions::PROXY => Config::get(Config::HTTP_PROXY) ?: null,
			]);
		}

		return self::$client;
	}

	/**
	 * @param array<string, string|int> $parts
	 */
	static function build_url(array $parts): string {
		$tmp = $parts['scheme'] . "://" . $parts['host'];

		if (isset($parts['path'])) $tmp .= $parts['path'];
		if (isset($parts['query'])) $tmp .= '?' . $parts['query'];
		if (isset($parts['fragment'])) $tmp .= '#' . $parts['fragment'];

		return $tmp;
	}

	/**
	 * Converts a (possibly) relative URL to a absolute one, using provided base URL.
	 * Provides some exceptions for additional schemes like data: if called with owning element/attribute.
	 *
	 * @param string $base_url     Base URL (i.e. from where the document is)
	 * @param string $rel_url Possibly relative URL in the document
	 * @param string $owner_element Owner element tag name (i.e. "a") (optional)
	 * @param string $owner_attribute Owner attribute (i.e. "href") (optional)
	 * @param string $content_type URL content type as specified by enclosures, etc.
	 *
	 * @return false|string Absolute URL or false on failure (either during URL parsing or validation)
	 */
	public static function rewrite_relative($base_url,
				$rel_url,
				string $owner_element = "",
				string $owner_attribute = "",
				string $content_type = "") {

		$rel_parts = parse_url($rel_url);

		if (!$rel_url) return $base_url;

		/**
		 * If parse_url failed to parse $rel_url return false to match the current "invalid thing" behavior
		 * of UrlHelper::validate().
		 *
		 * TODO: There are many places where a string return value is assumed.  We should either update those
		 * to account for the possibility of failure, or look into updating this function's return values.
		 */
		if ($rel_parts === false) {
			return false;
		}

		if (!empty($rel_parts['host']) && !empty($rel_parts['scheme'])) {
			return self::validate($rel_url);

		// protocol-relative URL (rare but they exist)
		} else if (strpos($rel_url, "//") === 0) {
			return self::validate("https:" . $rel_url);
		// allow some extra schemes for A href
		} else if (in_array($rel_parts["scheme"] ?? "", self::EXTRA_HREF_SCHEMES, true) &&
				$owner_element == "a" &&
				$owner_attribute == "href") {
			return $rel_url;
		// allow some extra schemes for links with feed-specified content type i.e. enclosures
		} else if ($content_type &&
				isset(self::EXTRA_SCHEMES_BY_CONTENT_TYPE[$content_type]) &&
				in_array($rel_parts["scheme"], self::EXTRA_SCHEMES_BY_CONTENT_TYPE[$content_type])) {
			return $rel_url;
		// allow limited subset of inline base64-encoded images for IMG elements
		} else if (($rel_parts["scheme"] ?? "") == "data" &&
				preg_match('%^image/(webp|gif|jpg|png|svg);base64,%', $rel_parts["path"]) &&
				$owner_element == "img" &&
				$owner_attribute == "src") {
			return $rel_url;
		} else {
			$base_parts = parse_url($base_url);

			$rel_parts['host'] = $base_parts['host'] ?? "";
			$rel_parts['scheme'] = $base_parts['scheme'] ?? "";

			if ($rel_parts['path'] ?? "") {

				// we append dirname() of base path to relative URL path as per RFC 3986 section 5.2.2
				$base_path = with_trailing_slash(dirname($base_parts['path'] ?? ""));

				// 1. absolute relative path (/test.html) = no-op, proceed as is

				// 2. dotslash relative URI (./test.html) - strip "./", append base path
				if (strpos($rel_parts['path'], './') === 0) {
					$rel_parts['path'] = $base_path . substr($rel_parts['path'], 2);
				// 3. anything else relative (test.html) - append dirname() of base path
				} else if (strpos($rel_parts['path'], '/') !== 0) {
					$rel_parts['path'] = $base_path . $rel_parts['path'];
				}

				//$rel_parts['path'] = str_replace("/./", "/", $rel_parts['path']);
				//$rel_parts['path'] = str_replace("//", "/", $rel_parts['path']);
			}

			return self::validate(self::build_url($rel_parts));
		}
	}

	/** extended filtering involves validation for safe ports and loopback
	 * @return false|string false if something went wrong, otherwise the URL string
	 */
	static function validate(string $url, bool $extended_filtering = false) {

		$url = clean($url);

		# fix protocol-relative URLs
		if (strpos($url, "//") === 0)
			$url = "https:" . $url;

		$tokens = parse_url($url);

		// this isn't really necessary because filter_var(... FILTER_VALIDATE_URL) requires host and scheme
		// as per https://php.watch/versions/7.3/filter-var-flag-deprecation but it might save time
		if (empty($tokens['host']))
			return false;

		if (!in_array(strtolower($tokens['scheme']), ['http', 'https']))
			return false;

		//convert IDNA hostname to punycode if possible
		if (function_exists("idn_to_ascii")) {
			if (mb_detect_encoding($tokens['host']) != 'ASCII') {
				if (defined('IDNA_NONTRANSITIONAL_TO_ASCII') && defined('INTL_IDNA_VARIANT_UTS46')) {
					$tokens['host'] = idn_to_ascii($tokens['host'], IDNA_NONTRANSITIONAL_TO_ASCII, INTL_IDNA_VARIANT_UTS46);
				} else {
					$tokens['host'] = idn_to_ascii($tokens['host']);
				}

				// if `idn_to_ascii` failed
				if ($tokens['host'] === false) {
					return false;
				}
			}
		}

		// separate set of tokens with urlencoded 'path' because filter_var() rightfully fails on non-latin characters
		// (used for validation only, we actually request the original URL, in case of urlencode breaking it)
		$tokens_filter_var = $tokens;

		if ($tokens['path'] ?? false) {
			$tokens_filter_var['path'] = implode("/",
										array_map("rawurlencode",
											array_map("rawurldecode",
												explode("/", $tokens['path']))));
		}

		$url = self::build_url($tokens);
		$url_filter_var = self::build_url($tokens_filter_var);

		if (filter_var($url_filter_var, FILTER_VALIDATE_URL) === false)
			return false;

		if ($extended_filtering) {
			if (!in_array($tokens['port'] ?? '', [80, 443, '']))
				return false;

			if (strtolower($tokens['host']) == 'localhost' || $tokens['host'] == '::1' || strpos($tokens['host'], '127.') === 0)
				return false;
		}

		return $url;
	}

	/**
	 * @return false|string
	 */
	static function resolve_redirects(string $url, int $timeout) {
		$span = Tracer::start(__METHOD__);
		$span->setAttribute('func.args', json_encode(func_get_args()));
		$client = self::get_client();

		try {
			$response = $client->request('HEAD', $url, [
				GuzzleHttp\RequestOptions::CONNECT_TIMEOUT => $timeout ?: Config::get(Config::FILE_FETCH_CONNECT_TIMEOUT),
				GuzzleHttp\RequestOptions::TIMEOUT => $timeout ?: Config::get(Config::FILE_FETCH_TIMEOUT),
				GuzzleHttp\RequestOptions::ALLOW_REDIRECTS => ['max' => 10, 'track_redirects' => true],
				GuzzleHttp\RequestOptions::HTTP_ERRORS => false,
				GuzzleHttp\RequestOptions::HEADERS => [
					'User-Agent' => Config::get_user_agent(),
					'Connection' => 'close',
				],
			]);
		} catch (Exception $ex) {
			$span->setAttribute('error', (string) $ex);
			$span->end();
			return false;
		}

		// If a history header value doesn't exist there was no redirection and the original URL is fine.
		$history_header = $response->getHeader(GuzzleHttp\RedirectMiddleware::HISTORY_HEADER);
		$span->end();
		return ($history_header ? end($history_header) : $url);
	}

	/**
	 * @param array<string, bool|int|string>|string $options
	 * @return false|string false if something went wrong, otherwise string contents
	 */
	// TODO: max_size currently only works for CURL transfers
	// TODO: multiple-argument way is deprecated, first parameter is a hash now
	public static function fetch($options /* previously: 0: $url , 1: $type = false, 2: $login = false, 3: $pass = false,
				4: $post_query = false, 5: $timeout = false, 6: $timestamp = 0, 7: $useragent = false, 8: $retry_once_request = false,
				9: $auth_type = "basic" */) {
		$span = Tracer::start(__METHOD__);
		$span->setAttribute('func.args', json_encode(func_get_args()));

		self::$fetch_last_error = "";
		self::$fetch_last_error_code = -1;
		self::$fetch_last_error_content = "";
		self::$fetch_last_content_type = "";
		self::$fetch_last_modified = "";
		self::$fetch_effective_url = "";
		self::$fetch_effective_ip_addr = "";

		if (!is_array($options)) {

			// falling back on compatibility shim
			$option_names = [ "url", "type", "login", "pass", "post_query", "timeout", "last_modified", "useragent", "retry-once-request", "auth_type" ];
			$tmp = [];

			for ($i = 0; $i < func_num_args(); $i++) {
				$tmp[$option_names[$i]] = func_get_arg($i);
			}

			$options = $tmp;

			/*$options = array(
					"url" => func_get_arg(0),
					"type" => @func_get_arg(1),
					"login" => @func_get_arg(2),
					"pass" => @func_get_arg(3),
					"post_query" => @func_get_arg(4),
					"timeout" => @func_get_arg(5),
					"timestamp" => @func_get_arg(6),
					"useragent" => @func_get_arg(7),
					"retry-once-request" => @func_get_arg(8),
					"auth_type" => @func_get_arg(9),
			); */
		}

		$url = $options["url"];
		$type = isset($options["type"]) ? $options["type"] : false;
		$login = isset($options["login"]) ? $options["login"] : false;
		$pass = isset($options["pass"]) ? $options["pass"] : false;
		$auth_type = isset($options["auth_type"]) ? $options["auth_type"] : "basic";
		$post_query = isset($options["post_query"]) ? $options["post_query"] : false;
		$timeout = isset($options["timeout"]) ? $options["timeout"] : false;
		$last_modified = isset($options["last_modified"]) ? $options["last_modified"] : "";
		$useragent = isset($options["useragent"]) ? $options["useragent"] : false;
		$followlocation = isset($options["followlocation"]) ? $options["followlocation"] : true;
		$max_size = isset($options["max_size"]) ? $options["max_size"] : Config::get(Config::MAX_DOWNLOAD_FILE_SIZE); // in bytes
		$http_accept = isset($options["http_accept"]) ? $options["http_accept"] : false;
		$http_referrer = isset($options["http_referrer"]) ? $options["http_referrer"] : false;

		$url = ltrim($url, ' ');
		$url = str_replace(' ', '%20', $url);

		Debug::log("[UrlHelper] fetching: $url", Debug::LOG_EXTENDED);

		$url = self::validate($url, true);

		if (!$url) {
			self::$fetch_last_error = 'Requested URL failed extended validation.';
			$span->setAttribute('error', self::$fetch_last_error);
			$span->end();
			return false;
		}

		$url_host = parse_url($url, PHP_URL_HOST);
		$ip_addr = gethostbyname($url_host);

		if (!$ip_addr || strpos($ip_addr, '127.') === 0) {
			self::$fetch_last_error = "URL hostname failed to resolve or resolved to a loopback address ($ip_addr)";
			$span->setAttribute('error', self::$fetch_last_error);
			$span->end();
			return false;
		}

		$req_options = [
			GuzzleHttp\RequestOptions::CONNECT_TIMEOUT => $timeout ?: Config::get(Config::FILE_FETCH_CONNECT_TIMEOUT),
			GuzzleHttp\RequestOptions::TIMEOUT => $timeout ?: Config::get(Config::FILE_FETCH_TIMEOUT),
			GuzzleHttp\RequestOptions::ALLOW_REDIRECTS => $followlocation ? ['max' => 20, 'track_redirects' => true] : false,
			GuzzleHttp\RequestOptions::HEADERS => [
				'User-Agent' => $useragent ?: Config::get_user_agent(),
			],
			'curl' => [],
		];

		if ($last_modified && !$post_query)
			$req_options[GuzzleHttp\RequestOptions::HEADERS]['If-Modified-Since'] = $last_modified;

		if ($http_accept)
			$req_options[GuzzleHttp\RequestOptions::HEADERS]['Accept'] = $http_accept;

		if  ($http_referrer)
			$req_options[GuzzleHttp\RequestOptions::HEADERS]['Referer'] = $http_referrer;

		if ($login && $pass && in_array($auth_type, ['basic', 'digest', 'ntlm'])) {
			// Let Guzzle handle the details for auth types it supports
			$req_options[GuzzleHttp\RequestOptions::AUTH] = [$login, $pass];
		} elseif ($auth_type === 'any') {
			// https://docs.guzzlephp.org/en/stable/faq.html#how-can-i-add-custom-curl-options
			$req_options['curl'][\CURLOPT_HTTPAUTH] = \CURLAUTH_ANY;
			if ($login && $pass)
				$req_options['curl'][\CURLOPT_USERPWD] = "$login:$pass";
		}

		if ($post_query)
			$req_options[GuzzleHttp\RequestOptions::FORM_PARAMS] = $post_query;

		if ($max_size) {
			$req_options[GuzzleHttp\RequestOptions::PROGRESS] = function($download_size, $downloaded, $upload_size, $uploaded) use(&$max_size, $url) {
				//Debug::log("[curl progressfunction] $downloaded $max_size", Debug::$LOG_EXTENDED);

				if ($downloaded > $max_size) {
					Debug::log("[UrlHelper] fetch error: max size of $max_size bytes exceeded when downloading $url .  Aborting.", Debug::LOG_VERBOSE);
					throw new \LengthException("Download exceeded size limit");
				}
			};

			# Alternative/supplement to `progress` checking
			$req_options[GuzzleHttp\RequestOptions::ON_HEADERS] = function(Psr\Http\Message\ResponseInterface $response) use(&$max_size, $url) {
				$content_length = $response->getHeaderLine('Content-Length');
				if ($content_length > $max_size) {
					Debug::log("[UrlHelper] fetch error: server indicated (via 'Content-Length: {$content_length}') max size of $max_size bytes " .
							"would be exceeded when downloading $url .  Aborting.", Debug::LOG_VERBOSE);
						throw new \LengthException("Server sent 'Content-Length' exceeding download limit");
				}
			};
		}

		$client = self::get_client();

		try {
			if (($options['retry-once-request'] ?? null) instanceof Psr\Http\Message\RequestInterface) {
				$response = $client->send($options['retry-once-request']);
			} else {
				$response = $client->request($post_query ? 'POST' : 'GET', $url, $req_options);
			}
		} catch (\LengthException $ex) {
			// Either 'Content-Length' indicated the download limit would be exceeded, or the transfer actually exceeded the download limit.
			self::$fetch_last_error = (string) $ex;
			$span->setAttribute('error', self::$fetch_last_error);
			$span->end();
			return false;
		} catch (GuzzleHttp\Exception\GuzzleException $ex) {
			self::$fetch_last_error = (string) $ex;

			if ($ex instanceof GuzzleHttp\Exception\RequestException) {
				if ($ex instanceof GuzzleHttp\Exception\BadResponseException) {
					// 4xx or 5xx
					self::$fetch_last_error_code = $ex->getResponse()->getStatusCode();

					// If credentials were provided and we got a 403 back, retry once with auth type 'any'
					// to attempt compatibility with unusual configurations.
					if ($login && $pass && self::$fetch_last_error_code === 403
						&& isset($options['auth_type']) && $options['auth_type'] !== 'any') {
						$options['auth_type'] = 'any';
						$span->end();
						return self::fetch($options);
					}

					self::$fetch_last_content_type = $ex->getResponse()->getHeaderLine('content-type');

					if ($type && strpos(self::$fetch_last_content_type, "$type") === false)
						self::$fetch_last_error_content = (string) $ex->getResponse()->getBody();
				} elseif (array_key_exists('errno', $ex->getHandlerContext())) {
					$errno = (int) $ex->getHandlerContext()['errno'];

					// By default, all supported encoding types are sent via `Accept-Encoding` and decoding of
					// responses with `Content-Encoding` is automatically attempted.  If this fails, we do a
					// single retry with `Accept-Encoding: none` to try and force an unencoded response.
					if (($errno === \CURLE_WRITE_ERROR || $errno === \CURLE_BAD_CONTENT_ENCODING) &&
						!array_key_exists('retry-once-request', $options)) {
						$options['retry-once-request'] = $ex->getRequest()->withHeader('Accept-Encoding', 'none');
						$span->end();
						return self::fetch($options);
					}
				}
			}

			$span->setAttribute('error', self::$fetch_last_error);
			$span->end();

			return false;
		}

		// Keep setting expected 'fetch_last_error_code' and 'fetch_last_error' values
		self::$fetch_last_error_code = $response->getStatusCode();
		self::$fetch_last_error = "HTTP/{$response->getProtocolVersion()} {$response->getStatusCode()} {$response->getReasonPhrase()}";
		self::$fetch_last_modified = $response->getHeaderLine('last-modified');
		self::$fetch_last_content_type = $response->getHeaderLine('content-type');

		// If a history header value doesn't exist there was no redirection and the original URL is fine.
		$history_header = $response->getHeader(GuzzleHttp\RedirectMiddleware::HISTORY_HEADER);
		self::$fetch_effective_url = $history_header ? end($history_header) : $url;

		if (!self::validate(self::$fetch_effective_url, true)) {
			self::$fetch_last_error = "URL received after redirection failed extended validation.";
			$span->setAttribute('error', self::$fetch_last_error);
			$span->end();
			return false;
		}

		self::$fetch_effective_ip_addr = gethostbyname(parse_url(self::$fetch_effective_url, PHP_URL_HOST));

		if (!self::$fetch_effective_ip_addr || strpos(self::$fetch_effective_ip_addr, '127.') === 0) {
			self::$fetch_last_error = 'URL hostname received after redirection failed to resolve or resolved to a loopback address (' .
				self::$fetch_effective_ip_addr . ')';
			$span->setAttribute('error', self::$fetch_last_error);
			$span->end();
			return false;
		}

		$body = (string) $response->getBody();

		if (!$body) {
			self::$fetch_last_error = 'Successful response, but no content was received.';
			$span->setAttribute('error', self::$fetch_last_error);
			$span->end();
			return false;
		}

		$span->end();
		return $body;
	}

	/**
	 * @return false|string false if the provided URL didn't match expected patterns, otherwise the video ID string
	 */
	public static function url_to_youtube_vid(string $url) {
		$url = str_replace("youtube.com", "youtube-nocookie.com", $url);

		$regexps = [
			"/\/\/www\.youtube-nocookie\.com\/v\/([\w-]+)/",
			"/\/\/www\.youtube-nocookie\.com\/embed\/([\w-]+)/",
			"/\/\/www\.youtube-nocookie\.com\/watch?v=([\w-]+)/",
			"/\/\/youtu.be\/([\w-]+)/",
		];

		foreach ($regexps as $re) {
			$matches = [];

			if (preg_match($re, $url, $matches)) {
				return $matches[1];
			}
		}

		return false;
	}


}
