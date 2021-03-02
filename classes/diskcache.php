<?php
class DiskCache {
	private $dir;

	// https://stackoverflow.com/a/53662733
	private $mimeMap = [
		'video/3gpp2'                                                               => '3g2',
		'video/3gp'                                                                 => '3gp',
		'video/3gpp'                                                                => '3gp',
		'application/x-compressed'                                                  => '7zip',
		'audio/x-acc'                                                               => 'aac',
		'audio/ac3'                                                                 => 'ac3',
		'application/postscript'                                                    => 'ai',
		'audio/x-aiff'                                                              => 'aif',
		'audio/aiff'                                                                => 'aif',
		'audio/x-au'                                                                => 'au',
		'video/x-msvideo'                                                           => 'avi',
		'video/msvideo'                                                             => 'avi',
		'video/avi'                                                                 => 'avi',
		'application/x-troff-msvideo'                                               => 'avi',
		'application/macbinary'                                                     => 'bin',
		'application/mac-binary'                                                    => 'bin',
		'application/x-binary'                                                      => 'bin',
		'application/x-macbinary'                                                   => 'bin',
		'image/bmp'                                                                 => 'bmp',
		'image/x-bmp'                                                               => 'bmp',
		'image/x-bitmap'                                                            => 'bmp',
		'image/x-xbitmap'                                                           => 'bmp',
		'image/x-win-bitmap'                                                        => 'bmp',
		'image/x-windows-bmp'                                                       => 'bmp',
		'image/ms-bmp'                                                              => 'bmp',
		'image/x-ms-bmp'                                                            => 'bmp',
		'application/bmp'                                                           => 'bmp',
		'application/x-bmp'                                                         => 'bmp',
		'application/x-win-bitmap'                                                  => 'bmp',
		'application/cdr'                                                           => 'cdr',
		'application/coreldraw'                                                     => 'cdr',
		'application/x-cdr'                                                         => 'cdr',
		'application/x-coreldraw'                                                   => 'cdr',
		'image/cdr'                                                                 => 'cdr',
		'image/x-cdr'                                                               => 'cdr',
		'zz-application/zz-winassoc-cdr'                                            => 'cdr',
		'application/mac-compactpro'                                                => 'cpt',
		'application/pkix-crl'                                                      => 'crl',
		'application/pkcs-crl'                                                      => 'crl',
		'application/x-x509-ca-cert'                                                => 'crt',
		'application/pkix-cert'                                                     => 'crt',
		'text/css'                                                                  => 'css',
		'text/x-comma-separated-values'                                             => 'csv',
		'text/comma-separated-values'                                               => 'csv',
		'application/vnd.msexcel'                                                   => 'csv',
		'application/x-director'                                                    => 'dcr',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document'   => 'docx',
		'application/x-dvi'                                                         => 'dvi',
		'message/rfc822'                                                            => 'eml',
		'application/x-msdownload'                                                  => 'exe',
		'video/x-f4v'                                                               => 'f4v',
		'audio/x-flac'                                                              => 'flac',
		'video/x-flv'                                                               => 'flv',
		'image/gif'                                                                 => 'gif',
		'application/gpg-keys'                                                      => 'gpg',
		'application/x-gtar'                                                        => 'gtar',
		'application/x-gzip'                                                        => 'gzip',
		'application/mac-binhex40'                                                  => 'hqx',
		'application/mac-binhex'                                                    => 'hqx',
		'application/x-binhex40'                                                    => 'hqx',
		'application/x-mac-binhex40'                                                => 'hqx',
		'text/html'                                                                 => 'html',
		'image/x-icon'                                                              => 'ico',
		'image/x-ico'                                                               => 'ico',
		'image/vnd.microsoft.icon'                                                  => 'ico',
		'text/calendar'                                                             => 'ics',
		'application/java-archive'                                                  => 'jar',
		'application/x-java-application'                                            => 'jar',
		'application/x-jar'                                                         => 'jar',
		'image/jp2'                                                                 => 'jp2',
		'video/mj2'                                                                 => 'jp2',
		'image/jpx'                                                                 => 'jp2',
		'image/jpm'                                                                 => 'jp2',
		'image/jpeg'                                                                => 'jpg',
		'image/pjpeg'                                                               => 'jpg',
		'application/x-javascript'                                                  => 'js',
		'application/json'                                                          => 'json',
		'text/json'                                                                 => 'json',
		'application/vnd.google-earth.kml+xml'                                      => 'kml',
		'application/vnd.google-earth.kmz'                                          => 'kmz',
		'text/x-log'                                                                => 'log',
		'audio/x-m4a'                                                               => 'm4a',
		'audio/mp4'                                                                 => 'm4a',
		'application/vnd.mpegurl'                                                   => 'm4u',
		'audio/midi'                                                                => 'mid',
		'application/vnd.mif'                                                       => 'mif',
		'video/quicktime'                                                           => 'mov',
		'video/x-sgi-movie'                                                         => 'movie',
		'audio/mpeg'                                                                => 'mp3',
		'audio/mpg'                                                                 => 'mp3',
		'audio/mpeg3'                                                               => 'mp3',
		'audio/mp3'                                                                 => 'mp3',
		'video/mp4'                                                                 => 'mp4',
		'video/mpeg'                                                                => 'mpeg',
		'application/oda'                                                           => 'oda',
		'audio/ogg'                                                                 => 'ogg',
		'video/ogg'                                                                 => 'ogg',
		'application/ogg'                                                           => 'ogg',
		'font/otf'                                                                  => 'otf',
		'application/x-pkcs10'                                                      => 'p10',
		'application/pkcs10'                                                        => 'p10',
		'application/x-pkcs12'                                                      => 'p12',
		'application/x-pkcs7-signature'                                             => 'p7a',
		'application/pkcs7-mime'                                                    => 'p7c',
		'application/x-pkcs7-mime'                                                  => 'p7c',
		'application/x-pkcs7-certreqresp'                                           => 'p7r',
		'application/pkcs7-signature'                                               => 'p7s',
		'application/pdf'                                                           => 'pdf',
		'application/octet-stream'                                                  => 'pdf',
		'application/x-x509-user-cert'                                              => 'pem',
		'application/x-pem-file'                                                    => 'pem',
		'application/pgp'                                                           => 'pgp',
		'application/x-httpd-php'                                                   => 'php',
		'application/php'                                                           => 'php',
		'application/x-php'                                                         => 'php',
		'text/php'                                                                  => 'php',
		'text/x-php'                                                                => 'php',
		'application/x-httpd-php-source'                                            => 'php',
		'image/png'                                                                 => 'png',
		'image/x-png'                                                               => 'png',
		'application/powerpoint'                                                    => 'ppt',
		'application/vnd.ms-powerpoint'                                             => 'ppt',
		'application/vnd.ms-office'                                                 => 'ppt',
		'application/msword'                                                        => 'ppt',
		'application/vnd.openxmlformats-officedocument.presentationml.presentation' => 'pptx',
		'application/x-photoshop'                                                   => 'psd',
		'image/vnd.adobe.photoshop'                                                 => 'psd',
		'audio/x-realaudio'                                                         => 'ra',
		'audio/x-pn-realaudio'                                                      => 'ram',
		'application/x-rar'                                                         => 'rar',
		'application/rar'                                                           => 'rar',
		'application/x-rar-compressed'                                              => 'rar',
		'audio/x-pn-realaudio-plugin'                                               => 'rpm',
		'application/x-pkcs7'                                                       => 'rsa',
		'text/rtf'                                                                  => 'rtf',
		'text/richtext'                                                             => 'rtx',
		'video/vnd.rn-realvideo'                                                    => 'rv',
		'application/x-stuffit'                                                     => 'sit',
		'application/smil'                                                          => 'smil',
		'text/srt'                                                                  => 'srt',
		'image/svg+xml'                                                             => 'svg',
		'application/x-shockwave-flash'                                             => 'swf',
		'application/x-tar'                                                         => 'tar',
		'application/x-gzip-compressed'                                             => 'tgz',
		'image/tiff'                                                                => 'tiff',
		'font/ttf'                                                                  => 'ttf',
		'text/plain'                                                                => 'txt',
		'text/x-vcard'                                                              => 'vcf',
		'application/videolan'                                                      => 'vlc',
		'text/vtt'                                                                  => 'vtt',
		'audio/x-wav'                                                               => 'wav',
		'audio/wave'                                                                => 'wav',
		'audio/wav'                                                                 => 'wav',
		'application/wbxml'                                                         => 'wbxml',
		'video/webm'                                                                => 'webm',
		'image/webp'                                                                => 'webp',
		'audio/x-ms-wma'                                                            => 'wma',
		'application/wmlc'                                                          => 'wmlc',
		'video/x-ms-wmv'                                                            => 'wmv',
		'video/x-ms-asf'                                                            => 'wmv',
		'font/woff'                                                                 => 'woff',
		'font/woff2'                                                                => 'woff2',
		'application/xhtml+xml'                                                     => 'xhtml',
		'application/excel'                                                         => 'xl',
		'application/msexcel'                                                       => 'xls',
		'application/x-msexcel'                                                     => 'xls',
		'application/x-ms-excel'                                                    => 'xls',
		'application/x-excel'                                                       => 'xls',
		'application/x-dos_ms_excel'                                                => 'xls',
		'application/xls'                                                           => 'xls',
		'application/x-xls'                                                         => 'xls',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'         => 'xlsx',
		'application/vnd.ms-excel'                                                  => 'xlsx',
		'application/xml'                                                           => 'xml',
		'text/xml'                                                                  => 'xml',
		'text/xsl'                                                                  => 'xsl',
		'application/xspf+xml'                                                      => 'xspf',
		'application/x-compress'                                                    => 'z',
		'application/x-zip'                                                         => 'zip',
		'application/zip'                                                           => 'zip',
		'application/x-zip-compressed'                                              => 'zip',
		'application/s-compressed'                                                  => 'zip',
		'multipart/x-zip'                                                           => 'zip',
		'text/x-scriptzsh'                                                          => 'zsh'
	];

	public function __construct($dir) {
		$this->dir = Config::get(Config::CACHE_DIR) . "/" . basename(clean($dir));
	}

	public function get_dir() {
		return $this->dir;
	}

	public function make_dir() {
		if (!is_dir($this->dir)) {
			return mkdir($this->dir);
		}
	}

	public function is_writable($filename = "") {
		if ($filename) {
			if (file_exists($this->get_full_path($filename)))
				return is_writable($this->get_full_path($filename));
			else
				return is_writable($this->dir);
		} else {
			return is_writable($this->dir);
		}
	}

	public function exists($filename) {
		return file_exists($this->get_full_path($filename));
	}

	public function get_size($filename) {
		if ($this->exists($filename))
			return filesize($this->get_full_path($filename));
		else
			return -1;
	}

	public function get_full_path($filename) {
		return $this->dir . "/" . basename(clean($filename));
	}

	public function put($filename, $data) {
		return file_put_contents($this->get_full_path($filename), $data);
	}

	public function touch($filename) {
		return touch($this->get_full_path($filename));
	}

	public function get($filename) {
		if ($this->exists($filename))
			return file_get_contents($this->get_full_path($filename));
		else
			return null;
	}

	public function get_mime_type($filename) {
		if ($this->exists($filename))
			return mime_content_type($this->get_full_path($filename));
		else
			return null;
	}

	public function get_fake_extension($filename) {
		$mimetype = $this->get_mime_type($filename);

		if ($mimetype)
			return isset($this->mimeMap[$mimetype]) ? $this->mimeMap[$mimetype] : "";
		else
			return "";
	}

	public function send($filename) {
		$fake_extension = $this->get_fake_extension($filename);

		if ($fake_extension)
			$fake_extension = ".$fake_extension";

		header("Content-Disposition: inline; filename=\"${filename}${fake_extension}\"");

		return $this->send_local_file($this->get_full_path($filename));
	}

	public function get_url($filename) {
		return Config::get_self_url() . "/public.php?op=cached&file=" . basename($this->dir) . "/" . basename($filename);
	}

	// check for locally cached (media) URLs and rewrite to local versions
	// this is called separately after sanitize() and plugin render article hooks to allow
	// plugins work on original source URLs used before caching
	// NOTE: URLs should be already absolutized because this is called after sanitize()
	static public function rewrite_urls($str)
	{
		$res = trim($str);
		if (!$res) return '';

		$doc = new DOMDocument();
		if (@$doc->loadHTML('<?xml encoding="UTF-8">' . $res)) {
			$xpath = new DOMXPath($doc);
			$cache = new DiskCache("images");

			$entries = $xpath->query('(//img[@src]|//source[@src|@srcset]|//video[@poster|@src])');

			$need_saving = false;

			foreach ($entries as $entry) {
				foreach (array('src', 'poster') as $attr) {
					if ($entry->hasAttribute($attr)) {
						$url = $entry->getAttribute($attr);
						$cached_filename = sha1($url);

						if ($cache->exists($cached_filename)) {
							$url = $cache->get_url($cached_filename);

							$entry->setAttribute($attr, $url);
							$entry->removeAttribute("srcset");

							$need_saving = true;
						}
					}
				}

				if ($entry->hasAttribute("srcset")) {
					$matches = RSSUtils::decode_srcset($entry->getAttribute('srcset'));

					for ($i = 0; $i < count($matches); $i++) {
						$cached_filename = sha1($matches[$i]["url"]);

						if ($cache->exists($cached_filename)) {
							$matches[$i]["url"] = $cache->get_url($cached_filename);

							$need_saving = true;
						}
					}

					$entry->setAttribute("srcset", RSSUtils::encode_srcset($matches));
				}
			}

			if ($need_saving) {
				if (isset($doc->firstChild))
					$doc->removeChild($doc->firstChild); //remove doctype

				$res = $doc->saveHTML();
			}
		}
		return $res;
	}

	static function expire() {
		$dirs = array_filter(glob(Config::get(Config::CACHE_DIR) . "/*"), "is_dir");

		foreach ($dirs as $cache_dir) {
			$num_deleted = 0;

			if (is_writable($cache_dir) && !file_exists("$cache_dir/.no-auto-expiry")) {
				$files = glob("$cache_dir/*");

				if ($files) {
					foreach ($files as $file) {
						if (time() - filemtime($file) > 86400*Config::get(Config::CACHE_MAX_DAYS)) {
							unlink($file);

							++$num_deleted;
						}
					}
				}

				Debug::log("Expired $cache_dir: removed $num_deleted files.");
			}
		}
	}

	/*	this is essentially a wrapper for readfile() which allows plugins to hook
		output with httpd-specific "fast" implementation i.e. X-Sendfile or whatever else

		hook function should return true if request was handled (or at least attempted to)

		note that this can be called without user context so the plugin to handle this
		should be loaded systemwide in config.php */
	function send_local_file($filename) {
		if (file_exists($filename)) {

			if (is_writable($filename)) touch($filename);

			$mimetype = mime_content_type($filename);

			// this is hardly ideal but 1) only media is cached in images/ and 2) seemingly only mp4
			// video files are detected as octet-stream by mime_content_type()

			if ($mimetype == "application/octet-stream")
				$mimetype = "video/mp4";

			# block SVG because of possible embedded javascript (.....)
			$mimetype_blacklist = [ "image/svg+xml" ];

			/* only serve video and images */
			if (!preg_match("/(image|audio|video)\//", (string)$mimetype) || in_array($mimetype, $mimetype_blacklist)) {
				http_response_code(400);
				header("Content-type: text/plain");

				print "Stored file has disallowed content type ($mimetype)";
				return false;
			}

			$tmppluginhost = new PluginHost();

			$tmppluginhost->load(Config::get(Config::PLUGINS), PluginHost::KIND_SYSTEM);
			//$tmppluginhost->load_data();

			if ($tmppluginhost->run_hooks_until(PluginHost::HOOK_SEND_LOCAL_FILE, true, $filename))
				return true;

			header("Content-type: $mimetype");

			$stamp = gmdate("D, d M Y H:i:s", (int)filemtime($filename)) . " GMT";
			header("Last-Modified: $stamp", true);

			return readfile($filename);
		} else {
			return false;
		}
	}
}
