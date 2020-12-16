<?php
class UrlHelper {
	static function build_url($parts) {
		$tmp = $parts['scheme'] . "://" . $parts['host'];

		if (isset($parts['path'])) $tmp .= $parts['path'];
		if (isset($parts['query'])) $tmp .= '?' . $parts['query'];
		if (isset($parts['fragment'])) $tmp .= '#' . $parts['fragment'];

		return $tmp;
	}

	/**
	 * Converts a (possibly) relative URL to a absolute one.
	 *
	 * @param string $url     Base URL (i.e. from where the document is)
	 * @param string $rel_url Possibly relative URL in the document
	 *
	 * @return string Absolute URL
	 */
	public static function rewrite_relative($url, $rel_url) {

		$rel_parts = parse_url($rel_url);

		if ($rel_parts['host'] && $rel_parts['scheme']) {
			return self::validate($rel_url);
		} else if (strpos($rel_url, "//") === 0) {
			# protocol-relative URL (rare but they exist)
			return self::validate("https:" . $rel_url);
		} else if (strpos($rel_url, "magnet:") === 0) {
			# allow magnet links
			return $rel_url;
		} else {
			$parts = parse_url($url);

			$rel_parts['host'] = $parts['host'];
			$rel_parts['scheme'] = $parts['scheme'];

			if (isset($rel_parts['path'])) {
				if (strpos($rel_parts['path'], '/') !== 0)
					$rel_parts['path'] = '/' . $rel_parts['path'];

				$rel_parts['path'] = str_replace("/./", "/", $rel_parts['path']);
				$rel_parts['path'] = str_replace("//", "/", $rel_parts['path']);
			}

			return self::validate(self::build_url($rel_parts));
		}
	}

	// extended filtering involves validation for safe ports and loopback
	static function validate($url, $extended_filtering = false) {

		$url = clean($url);

		# fix protocol-relative URLs
		if (strpos($url, "//") === 0)
			$url = "https:" . $url;

		$tokens = parse_url($url);

		// this isn't really necessary because filter_var(... FILTER_VALIDATE_URL) requires host and scheme
		// as per https://php.watch/versions/7.3/filter-var-flag-deprecation but it might save time
		if (!$tokens['host'])
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
			}
		}

		// separate set of tokens with urlencoded 'path' because filter_var() rightfully fails on non-latin characters
		// (used for validation only, we actually request the original URL, in case of urlencode breaking it)
		$tokens_filter_var = $tokens;

		if ($tokens['path']) {
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
			if (!in_array($tokens['port'], [80, 443, '']))
				return false;

			if (strtolower($tokens['host']) == 'localhost' || $tokens['host'] == '::1' || strpos($tokens['host'], '127.') === 0)
				return false;
		}

		return $url;
	}

	static function resolve_redirects($url, $timeout, $nest = 0) {

		// too many redirects
		if ($nest > 10)
			return false;

		if (version_compare(PHP_VERSION, '7.1.0', '>=')) {
			$context_options = array(
				'http' => array(
					 'header' => array(
						 'Connection: close'
					 ),
					 'method' => 'HEAD',
					 'timeout' => $timeout,
					 'protocol_version'=> 1.1)
				);

			if (defined('_HTTP_PROXY')) {
				$context_options['http']['request_fulluri'] = true;
				$context_options['http']['proxy'] = _HTTP_PROXY;
			}

			$context = stream_context_create($context_options);

			$headers = get_headers($url, 0, $context);
		} else {
			$headers = get_headers($url, 0);
		}

		if (is_array($headers)) {
			$headers = array_reverse($headers); // last one is the correct one

			foreach($headers as $header) {
				if (stripos($header, 'Location:') === 0) {
					$url = self::rewrite_relative($url, trim(substr($header, strlen('Location:'))));

					return self::resolve_redirects($url, $timeout, $nest + 1);
				}
			}

			return $url;
		}

		// request failed?
		return false;
	}

		// TODO: max_size currently only works for CURL transfers
	// TODO: multiple-argument way is deprecated, first parameter is a hash now
	public static function fetch($options /* previously: 0: $url , 1: $type = false, 2: $login = false, 3: $pass = false,
				4: $post_query = false, 5: $timeout = false, 6: $timestamp = 0, 7: $useragent = false*/) {

		global $fetch_last_error;
		global $fetch_last_error_code;
		global $fetch_last_error_content;
		global $fetch_last_content_type;
		global $fetch_last_modified;
		global $fetch_effective_url;
		global $fetch_effective_ip_addr;
		global $fetch_curl_used;
		global $fetch_domain_hits;

		$fetch_last_error = false;
		$fetch_last_error_code = -1;
		$fetch_last_error_content = "";
		$fetch_last_content_type = "";
		$fetch_curl_used = false;
		$fetch_last_modified = "";
		$fetch_effective_url = "";
		$fetch_effective_ip_addr = "";

		if (!is_array($fetch_domain_hits))
			$fetch_domain_hits = [];

		if (!is_array($options)) {

			// falling back on compatibility shim
			$option_names = [ "url", "type", "login", "pass", "post_query", "timeout", "last_modified", "useragent" ];
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
					"useragent" => @func_get_arg(7)
			); */
		}

		$url = $options["url"];
		$type = isset($options["type"]) ? $options["type"] : false;
		$login = isset($options["login"]) ? $options["login"] : false;
		$pass = isset($options["pass"]) ? $options["pass"] : false;
		$post_query = isset($options["post_query"]) ? $options["post_query"] : false;
		$timeout = isset($options["timeout"]) ? $options["timeout"] : false;
		$last_modified = isset($options["last_modified"]) ? $options["last_modified"] : "";
		$useragent = isset($options["useragent"]) ? $options["useragent"] : false;
		$followlocation = isset($options["followlocation"]) ? $options["followlocation"] : true;
		$max_size = isset($options["max_size"]) ? $options["max_size"] : MAX_DOWNLOAD_FILE_SIZE; // in bytes
		$http_accept = isset($options["http_accept"]) ? $options["http_accept"] : false;
		$http_referrer = isset($options["http_referrer"]) ? $options["http_referrer"] : false;

		$url = ltrim($url, ' ');
		$url = str_replace(' ', '%20', $url);

		$url = self::validate($url, true);

		if (!$url) {
			$fetch_last_error = "Requested URL failed extended validation.";
			return false;
		}

		$url_host = parse_url($url, PHP_URL_HOST);
		$ip_addr = gethostbyname($url_host);

		if (!$ip_addr || strpos($ip_addr, "127.") === 0) {
			$fetch_last_error = "URL hostname failed to resolve or resolved to a loopback address ($ip_addr)";
			return false;
		}

		$fetch_domain_hits[$url_host] += 1;

		/*if ($fetch_domain_hits[$url_host] > MAX_FETCH_REQUESTS_PER_HOST) {
			user_error("Exceeded fetch request quota for $url_host: " . $fetch_domain_hits[$url_host], E_USER_WARNING);
			#return false;
		}*/

		if (!defined('NO_CURL') && function_exists('curl_init') && !ini_get("open_basedir")) {

			$fetch_curl_used = true;

			$ch = curl_init($url);

			$curl_http_headers = [];

			if ($last_modified && !$post_query)
				array_push($curl_http_headers, "If-Modified-Since: $last_modified");

			if ($http_accept)
				array_push($curl_http_headers, "Accept: " . $http_accept);

			if (count($curl_http_headers) > 0)
				curl_setopt($ch, CURLOPT_HTTPHEADER, $curl_http_headers);

			curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, $timeout ? $timeout : FILE_FETCH_CONNECT_TIMEOUT);
			curl_setopt($ch, CURLOPT_TIMEOUT, $timeout ? $timeout : FILE_FETCH_TIMEOUT);
			curl_setopt($ch, CURLOPT_FOLLOWLOCATION, !ini_get("open_basedir") && $followlocation);
			curl_setopt($ch, CURLOPT_MAXREDIRS, 20);
			curl_setopt($ch, CURLOPT_BINARYTRANSFER, true);
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
			curl_setopt($ch, CURLOPT_HEADER, true);
			curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_ANY);
			curl_setopt($ch, CURLOPT_USERAGENT, $useragent ? $useragent :
				SELF_USER_AGENT);
			curl_setopt($ch, CURLOPT_ENCODING, "");

			if  ($http_referrer)
				curl_setopt($ch, CURLOPT_REFERER, $http_referrer);

			if ($max_size) {
				curl_setopt($ch, CURLOPT_NOPROGRESS, false);
				curl_setopt($ch, CURLOPT_BUFFERSIZE, 16384); // needed to get 5 arguments in progress function?

				// holy shit closures in php
				// download & upload are *expected* sizes respectively, could be zero
				curl_setopt($ch, CURLOPT_PROGRESSFUNCTION, function($curl_handle, $download_size, $downloaded, $upload_size, $uploaded) use( &$max_size) {
					Debug::log("[curl progressfunction] $downloaded $max_size", Debug::$LOG_EXTENDED);

					return ($downloaded > $max_size) ? 1 : 0; // if max size is set, abort when exceeding it
				});

			}

			if (!ini_get("open_basedir")) {
				curl_setopt($ch, CURLOPT_COOKIEJAR, "/dev/null");
			}

			if (defined('_HTTP_PROXY')) {
				curl_setopt($ch, CURLOPT_PROXY, _HTTP_PROXY);
			}

			if ($post_query) {
				curl_setopt($ch, CURLOPT_POST, true);
				curl_setopt($ch, CURLOPT_POSTFIELDS, $post_query);
			}

			if ($login && $pass)
				curl_setopt($ch, CURLOPT_USERPWD, "$login:$pass");

			$ret = @curl_exec($ch);

			$headers_length = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
			$headers = explode("\r\n", substr($ret, 0, $headers_length));
			$contents = substr($ret, $headers_length);

			foreach ($headers as $header) {
				if (strstr($header, ": ") !== false) {
					list ($key, $value) = explode(": ", $header);

					if (strtolower($key) == "last-modified") {
						$fetch_last_modified = $value;
					}
				}

				if (substr(strtolower($header), 0, 7) == 'http/1.') {
					$fetch_last_error_code = (int) substr($header, 9, 3);
					$fetch_last_error = $header;
				}
			}

			if (curl_errno($ch) === 23 || curl_errno($ch) === 61) {
				curl_setopt($ch, CURLOPT_ENCODING, 'none');
				$contents = @curl_exec($ch);
			}

			$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
			$fetch_last_content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

			$fetch_effective_url = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);

			if (!self::validate($fetch_effective_url, true)) {
				$fetch_last_error = "URL received after redirection failed extended validation.";

				return false;
			}

			$fetch_effective_ip_addr = gethostbyname(parse_url($fetch_effective_url, PHP_URL_HOST));

			if (!$fetch_effective_ip_addr || strpos($fetch_effective_ip_addr, "127.") === 0) {
				$fetch_last_error = "URL hostname received after redirection failed to resolve or resolved to a loopback address ($fetch_effective_ip_addr)";

				return false;
			}

			$fetch_last_error_code = $http_code;

			if ($http_code != 200 || $type && strpos($fetch_last_content_type, "$type") === false) {

				if (curl_errno($ch) != 0) {
					$fetch_last_error .=  "; " . curl_errno($ch) . " " . curl_error($ch);
				}

				$fetch_last_error_content = $contents;
				curl_close($ch);
				return false;
			}

			if (!$contents) {
				$fetch_last_error = curl_errno($ch) . " " . curl_error($ch);
				curl_close($ch);
				return false;
			}

			curl_close($ch);

			$is_gzipped = RSSUtils::is_gzipped($contents);

			if ($is_gzipped) {
				$tmp = @gzdecode($contents);

				if ($tmp) $contents = $tmp;
			}

			return $contents;
		} else {

			$fetch_curl_used = false;

			if ($login && $pass){
				$url_parts = array();

				preg_match("/(^[^:]*):\/\/(.*)/", $url, $url_parts);

				$pass = urlencode($pass);

				if ($url_parts[1] && $url_parts[2]) {
					$url = $url_parts[1] . "://$login:$pass@" . $url_parts[2];
				}
			}

			// TODO: should this support POST requests or not? idk

			 $context_options = array(
				  'http' => array(
						'header' => array(
							'Connection: close'
						),
						'method' => 'GET',
						'ignore_errors' => true,
						'timeout' => $timeout ? $timeout : FILE_FETCH_TIMEOUT,
						'protocol_version'=> 1.1)
				  );

			if (!$post_query && $last_modified)
				array_push($context_options['http']['header'], "If-Modified-Since: $last_modified");

			if ($http_accept)
				array_push($context_options['http']['header'], "Accept: $http_accept");

			if ($http_referrer)
				array_push($context_options['http']['header'], "Referer: $http_referrer");

			if (defined('_HTTP_PROXY')) {
				$context_options['http']['request_fulluri'] = true;
				$context_options['http']['proxy'] = _HTTP_PROXY;
			}

			$context = stream_context_create($context_options);

			$old_error = error_get_last();

			$fetch_effective_url = self::resolve_redirects($url, $timeout ? $timeout : FILE_FETCH_CONNECT_TIMEOUT);

			if (!self::validate($fetch_effective_url, true)) {
				$fetch_last_error = "URL received after redirection failed extended validation.";

				return false;
			}

			$fetch_effective_ip_addr = gethostbyname(parse_url($fetch_effective_url, PHP_URL_HOST));

			if (!$fetch_effective_ip_addr || strpos($fetch_effective_ip_addr, "127.") === 0) {
				$fetch_last_error = "URL hostname received after redirection failed to resolve or resolved to a loopback address ($fetch_effective_ip_addr)";

				return false;
			}

			$data = @file_get_contents($url, false, $context);

			if (isset($http_response_header) && is_array($http_response_header)) {
				foreach ($http_response_header as $header) {
					if (strstr($header, ": ") !== false) {
						list ($key, $value) = explode(": ", $header);

						$key = strtolower($key);

						if ($key == 'content-type') {
							$fetch_last_content_type = $value;
							// don't abort here b/c there might be more than one
							// e.g. if we were being redirected -- last one is the right one
						} else if ($key == 'last-modified') {
							$fetch_last_modified = $value;
						} else if ($key == 'location') {
							$fetch_effective_url = $value;
						}
					}

					if (substr(strtolower($header), 0, 7) == 'http/1.') {
						$fetch_last_error_code = (int) substr($header, 9, 3);
						$fetch_last_error = $header;
					}
				}
			}

			if ($fetch_last_error_code != 200) {
				$error = error_get_last();

				if ($error['message'] != $old_error['message']) {
					$fetch_last_error .= "; " . $error["message"];
				}

				$fetch_last_error_content = $data;

				return false;
			}

			$is_gzipped = RSSUtils::is_gzipped($data);

			if ($is_gzipped) {
				$tmp = @gzdecode($data);

				if ($tmp) $data = $tmp;
			}

			return $data;
		}
	}

}
