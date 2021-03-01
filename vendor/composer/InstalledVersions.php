<?php











namespace Composer;

use Composer\Autoload\ClassLoader;
use Composer\Semver\VersionParser;






class InstalledVersions
{
private static $installed = array (
  'root' => 
  array (
    'pretty_version' => 'dev-master',
    'version' => 'dev-master',
    'aliases' => 
    array (
    ),
    'reference' => 'f96abd2b52b9de5eac3651594ca32c6a4023c3e3',
    'dev-requirement' => true,
    'name' => '__root__',
  ),
  'versions' => 
  array (
    '__root__' => 
    array (
      'pretty_version' => 'dev-master',
      'version' => 'dev-master',
      'aliases' => 
      array (
      ),
      'reference' => 'f96abd2b52b9de5eac3651594ca32c6a4023c3e3',
      'dev-requirement' => false,
    ),
    'beberlei/assert' => 
    array (
      'pretty_version' => 'v3.2.7',
      'version' => '3.2.7.0',
      'aliases' => 
      array (
      ),
      'reference' => 'd63a6943fc4fd1a2aedb65994e3548715105abcf',
      'dev-requirement' => false,
    ),
    'chillerlan/php-qrcode' => 
    array (
      'pretty_version' => '3.4.0',
      'version' => '3.4.0.0',
      'aliases' => 
      array (
      ),
      'reference' => 'd8bf297e6843a53aeaa8f3285ce04fc349d133d6',
      'dev-requirement' => false,
    ),
    'chillerlan/php-settings-container' => 
    array (
      'pretty_version' => '1.2.1',
      'version' => '1.2.1.0',
      'aliases' => 
      array (
      ),
      'reference' => 'b9b0431dffd74102ee92348a63b4c33fc8ba639b',
      'dev-requirement' => false,
    ),
    'j4mie/idiorm' => 
    array (
      'pretty_version' => 'v1.5.7',
      'version' => '1.5.7.0',
      'aliases' => 
      array (
      ),
      'reference' => 'd23f97053ef5d0b988a02c6a71eb5c6118b2f5b4',
      'dev-requirement' => false,
    ),
    'mervick/material-design-icons' => 
    array (
      'pretty_version' => '2.2.0',
      'version' => '2.2.0.0',
      'aliases' => 
      array (
      ),
      'reference' => '635435c8d3df3a6da3241648caf8a65d1c07cc1a',
      'dev-requirement' => false,
    ),
    'paragonie/constant_time_encoding' => 
    array (
      'pretty_version' => 'v2.4.0',
      'version' => '2.4.0.0',
      'aliases' => 
      array (
      ),
      'reference' => 'f34c2b11eb9d2c9318e13540a1dbc2a3afbd939c',
      'dev-requirement' => false,
    ),
    'spomky-labs/otphp' => 
    array (
      'pretty_version' => 'v10.0.1',
      'version' => '10.0.1.0',
      'aliases' => 
      array (
      ),
      'reference' => 'f44cce5a9db4b8da410215d992110482c931232f',
      'dev-requirement' => false,
    ),
    'thecodingmachine/safe' => 
    array (
      'pretty_version' => 'v1.3.3',
      'version' => '1.3.3.0',
      'aliases' => 
      array (
      ),
      'reference' => 'a8ab0876305a4cdaef31b2350fcb9811b5608dbc',
      'dev-requirement' => false,
    ),
  ),
);
private static $canGetVendors;
private static $installedByVendor = array();







public static function getInstalledPackages()
{
$packages = array();
foreach (self::getInstalled() as $installed) {
$packages[] = array_keys($installed['versions']);
}

if (1 === \count($packages)) {
return $packages[0];
}

return array_keys(array_flip(\call_user_func_array('array_merge', $packages)));
}










public static function isInstalled($packageName, $includeDevRequirements = true)
{
foreach (self::getInstalled() as $installed) {
if (isset($installed['versions'][$packageName])) {
return $includeDevRequirements || empty($installed['versions'][$packageName]['dev-requirement']);
}
}

return false;
}













public static function satisfies(VersionParser $parser, $packageName, $constraint)
{
$constraint = $parser->parseConstraints($constraint);
$provided = $parser->parseConstraints(self::getVersionRanges($packageName));

return $provided->matches($constraint);
}










public static function getVersionRanges($packageName)
{
foreach (self::getInstalled() as $installed) {
if (!isset($installed['versions'][$packageName])) {
continue;
}

$ranges = array();
if (isset($installed['versions'][$packageName]['pretty_version'])) {
$ranges[] = $installed['versions'][$packageName]['pretty_version'];
}
if (array_key_exists('aliases', $installed['versions'][$packageName])) {
$ranges = array_merge($ranges, $installed['versions'][$packageName]['aliases']);
}
if (array_key_exists('replaced', $installed['versions'][$packageName])) {
$ranges = array_merge($ranges, $installed['versions'][$packageName]['replaced']);
}
if (array_key_exists('provided', $installed['versions'][$packageName])) {
$ranges = array_merge($ranges, $installed['versions'][$packageName]['provided']);
}

return implode(' || ', $ranges);
}

throw new \OutOfBoundsException('Package "' . $packageName . '" is not installed');
}





public static function getVersion($packageName)
{
foreach (self::getInstalled() as $installed) {
if (!isset($installed['versions'][$packageName])) {
continue;
}

if (!isset($installed['versions'][$packageName]['version'])) {
return null;
}

return $installed['versions'][$packageName]['version'];
}

throw new \OutOfBoundsException('Package "' . $packageName . '" is not installed');
}





public static function getPrettyVersion($packageName)
{
foreach (self::getInstalled() as $installed) {
if (!isset($installed['versions'][$packageName])) {
continue;
}

if (!isset($installed['versions'][$packageName]['pretty_version'])) {
return null;
}

return $installed['versions'][$packageName]['pretty_version'];
}

throw new \OutOfBoundsException('Package "' . $packageName . '" is not installed');
}





public static function getReference($packageName)
{
foreach (self::getInstalled() as $installed) {
if (!isset($installed['versions'][$packageName])) {
continue;
}

if (!isset($installed['versions'][$packageName]['reference'])) {
return null;
}

return $installed['versions'][$packageName]['reference'];
}

throw new \OutOfBoundsException('Package "' . $packageName . '" is not installed');
}





public static function getRootPackage()
{
$installed = self::getInstalled();

return $installed[0]['root'];
}







public static function getRawData()
{
return self::$installed;
}



















public static function reload($data)
{
self::$installed = $data;
self::$installedByVendor = array();
}




private static function getInstalled()
{
if (null === self::$canGetVendors) {
self::$canGetVendors = method_exists('Composer\Autoload\ClassLoader', 'getRegisteredLoaders');
}

$installed = array();

if (self::$canGetVendors) {
foreach (ClassLoader::getRegisteredLoaders() as $vendorDir => $loader) {
if (isset(self::$installedByVendor[$vendorDir])) {
$installed[] = self::$installedByVendor[$vendorDir];
} elseif (is_file($vendorDir.'/composer/installed.php')) {
$installed[] = self::$installedByVendor[$vendorDir] = require $vendorDir.'/composer/installed.php';
}
}
}

$installed[] = self::$installed;

return $installed;
}
}
