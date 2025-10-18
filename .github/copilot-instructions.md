# Tiny Tiny RSS (tt-rss) - AI Coding Agent Instructions

## Project Overview
Tiny Tiny RSS is a web-based RSS/Atom feed reader and aggregator built with PHP (backend) and JavaScript with Dojo Toolkit (frontend). Forked in October 2025 to continue development after original tt-rss.org shutdown.

## Architecture & Stack

### Backend (PHP 8.2+)
- **PHP Version**: Minimum version enforced in `Config::sanity_check()` (currently 8.2.0) - this is the source of truth
- **Database**: PostgreSQL exclusively (DB_TYPE constant deprecated)
- **ORM**: Idiorm (`ORM::for_table('table_name')`) - simple active record pattern
- **Config**: Environment variables prefixed with `TTRSS_` (e.g., `TTRSS_DB_HOST`) set in `.env` or `config.php`
- **Handlers**: Request routing via Handler classes (Handler → Handler_Protected → Handler_Administrative hierarchy)
  - Methods are public entry points accessed via `?op=ClassName&method=methodName`
  - Access control enforced by `before()` method:
    - `Handler`: No restrictions (returns true)
    - `Handler_Protected`: Requires authenticated user (`$_SESSION['uid']`)
    - `Handler_Administrative`: Requires admin access level
  - Methods starting with underscore (`_`) are blocked from external access
  - Methods with required parameters are blocked (security measure)
  - Use `csrf_ignore($method)` to bypass CSRF token validation for specific methods
  - Examples: `classes/Feeds.php`, `classes/Article.php`, `classes/RPC.php`
- **Plugin System**: Extensible via `PluginHost` with hooks (see `classes/PluginHost.php` for ~30 hook types)
  - Plugins extend `Plugin` class, implement `init($host)` and `about()`
  - Place in `plugins/` (official/bundled) or `plugins.local/` (personal/unbundled, separate repos at `https://github.com/tt-rss/tt-rss-plugin-*`)
  - Example: `plugins/note/init.php`

### Frontend (JavaScript + Dojo Toolkit)
- **Framework**: Legacy Dojo Toolkit (AMD modules: `define(["dojo/_base/declare", ...])`)
- **Widgets**: dijit (Dojo UI library) - `dojoType="dijit.form.TextBox"`, `dijit.Dialog`, etc.
- **Global Object**: `App` in `js/App.js` - contains utilities, translations, form helpers
- **Main Modules**: `Feeds.js`, `Headlines.js`, `Article.js`, `CommonDialogs.js`
- **Build**: Gulp for LESS compilation (`gulpfile.js`) - run `npx gulp` to watch/compile themes

### Database & ORM Patterns
```php
// Idiorm usage - fluent query builder
$user = ORM::for_table('ttrss_users')->find_one($user_id);
$feeds = ORM::for_table('ttrss_feeds')
    ->where('owner_uid', $_SESSION['uid'])
    ->find_many();
$feed->save();  // UPDATE if exists, INSERT if new
```

### Configuration System
- **Primary**: `classes/Config.php` defines all config constants (e.g., `Config::DB_HOST`)
- **Override**: Set via environment variables with `TTRSS_` prefix or in `config.php` via `putenv()`
- **User Prefs**: `classes/Prefs.php` - per-user settings stored in `ttrss_user_prefs2`
  - Most preferences are associated with a user profile (`$_SESSION['profile']`)
  - Some preferences in `_PROFILE_BLACKLIST` are user-level only (e.g., `ENABLE_API_ACCESS`, `USER_TIMEZONE`, `DIGEST_ENABLE`)
  - Profile-blacklisted preferences ignore profile parameter and always apply to the user

## Key Workflows

### Development Setup
```bash
# Local development with Docker (no persistence)
cp .env-dist .env  # Configure TTRSS_DB_* variables
docker-compose up  # Starts db, app, updater, web-nginx

# Install PHP dependencies
composer install

# Install JS dependencies & watch
npm install
npx gulp  # Watch LESS files and compile on changes
```

### Code Quality & Testing
```bash
# PHP Static Analysis
phpstan analyze --no-progress  # Level 6, config in phpstan.neon

# PHP Code Modernization
vendor/bin/rector process  # PHP 8.2 upgrades, config in rector.php

# JavaScript Linting
npx eslint js/**/*.js plugins/**/*.js  # Config in eslint.config.js

# Unit Tests
vendor/bin/phpunit  # Bootstrap: tests/autoload.php, config: phpunit.xml
```

### Translation Management
```bash
# Update translation template (messages.pot) from source
utils/rebase-translations.sh  # Extracts strings from PHP/JS files
# Note: .po/.mo files are managed via Weblate
```

### Dojo Toolkit Updates
```bash
# Rebuild customized Dojo layer (requires Java runtime)
cd lib/dojo-src
./rebuild-dojo.sh  # Downloads Dojo 1.17.3 source and builds custom layer
```

### Plugin Development
1. Create plugin directory:
   - `plugins/myplugin/init.php` for official/bundled plugins (included in main repo)
   - `plugins.local/myplugin/init.php` for personal/unbundled plugins (separate repo at `https://github.com/tt-rss/tt-rss-plugin-myplugin`)
2. Implement `init($host)` to register hooks: `$host->add_hook($host::HOOK_ARTICLE_BUTTON, $this)`
3. Add handler methods (e.g., `hook_article_button($article)`)
4. Optional: `get_js()`, `get_css()` for client-side assets
5. Enable in preferences: System → Preferences → Plugins

### Feed Update Process
- **Daemon**: `update_daemon2.php` or Docker updater service calls `RSSUtils::update_daemon_common()`
- **Core Logic**: `classes/RSSUtils.php` - fetches feeds, parses articles, applies filters
- **Scheduler**: `classes/Scheduler.php` - manages periodic tasks (stored in `ttrss_scheduled_tasks`)
- **Feed Parser**: `classes/FeedParser.php` - handles RSS/Atom with `FeedItem_RSS` and `FeedItem_Atom`

## Project-Specific Conventions

### PHP Style
- **Type Hints**: Required for method signatures (param and return types)
- **Doc Blocks**: Include `@param`, `@return`, `@var` annotations (PHPStan level 6)
- **Strict Types**: Not universally declared - check file headers
- **Namespaces**: None - all classes in global namespace, PSR-4 autoload from `classes/`
- **Legacy Functions**: `include/functions.php` has deprecated helpers (e.g., `get_pref()` → use `Prefs::get()`)

### JavaScript Patterns
- **AMD Modules**: Use `define()` for custom widgets/modules
- **Script Type**: Code uses `sourceType: 'script'` (not ES modules) - compatible with legacy Dojo AMD pattern
- **Dojo Queries**: `dojo.query()`, `dojo.queryToObject()`, `dijit.byId()`
- **XHR**: `xhr.json()` wrapper (custom) or `dojo.xhrPost()`
- **Dialogs**: Create via `App.dialogOf(this).hide()` or `new SingleUseDialog({})`

### Code Generation & Templates
- **PHP HTML Helpers**: Prefer `\Controls\*` functions (e.g., `\Controls\submit_tag()`, `\Controls\hidden_tag()`, `\Controls\select_tag()`)
  - Only use raw HTML when helper functions don't support required functionality (explain why to user)
  - Example: `plugins/note/init.php` uses `\Controls\` namespace functions
- **JavaScript HTML Helpers**: Prefer `App.FormFields.*` methods (e.g., `App.FormFields.submit_tag()`, `App.FormFields.checkbox_tag()`)
- **Templates**: Use inline PHP/HTML (with `<?= ?>` short tags) rather than `Templator` class
  - Inline approach is preferred for maintainability and readability

### Deprecation & Migration
- **Active Refactoring**: When modifying code, replace deprecated usage with best practice equivalents
  - Apply to tt-rss deprecations (e.g., `get_pref()` → `Prefs::get()`, avoid `DB_TYPE` constant)
  - Apply to dependency deprecations and language-level deprecations (PHP, JavaScript)
- **No Timeline Pressure**: tt-rss deprecations have no deadline unless explicitly stated in deprecation comments
- **Examples**: `include/functions.php` contains deprecated helpers - use modern equivalents in new/modified code

### Frontend State Management
- **Context-Specific Module Loading**: Entry point files determine which modules are available
  - `index.php` loads `js/tt-rss.js` → includes `Feeds`, `Headlines`, `Article` modules (main app)
  - `prefs.php` loads `js/prefs.js` → includes `PrefUsers`, `PrefHelpers`, preference-specific modules
  - Check module availability with `typeof ModuleName !== 'undefined'` before use
- **Context Detection**: Use `App.isPrefs()` to check if code is running in preferences vs main app
  - Returns `true` in preferences context, `false` in main app
  - Example: `CommonDialogs.js` uses this to determine post-action behavior (reload feeds vs refresh prefs)
- **Plugin Context**: Plugins load via `get_js()` (main app) or `get_prefs_js()` (preferences)
- **Shared Code**: `js/common.js` and `js/App.js` loaded in both contexts

### XHR Communication Patterns
- **Response Format**: Backend handlers return JSON via `print json_encode($data)` - format varies by method
  - Simple responses: `{"wide": 0}`, `{"param": "key", "value": true}`
  - Counter updates: `{"message": "UPDATE_COUNTERS", "feeds": [...], "labels": [...]}`
  - Runtime info: `{"runtime-info": {...}}`
  - Errors: Use `Errors::to_json()` → `{"error": {"code": "E_UNAUTHORIZED", "params": {...}}}`
- **Frontend Processing**: `xhr.json()` wrapper automatically calls `App.handleRpcJson()`
  - Processes standard fields: `error`, `seq`, `counters`, `runtime-info`, `message`
  - `message: "UPDATE_COUNTERS"` triggers `Feeds.requestCounters()` for specified feeds/labels
  - Fatal errors (non-`E_SUCCESS`) are handled centrally by `App.Error.fatal()`
- **No Strict Schema**: Response structure is method-specific - handlers return whatever data frontend needs
  - Check existing handlers in same class for patterns
  - Frontend typically expects specific fields based on the action performed

### Transaction & Data Consistency
- **PDO Transactions**: Use `Db::pdo()` for transactions (Idiorm doesn't provide transaction methods)
  ```php
  $pdo = Db::pdo();
  $pdo->beginTransaction();
  // ... database operations ...
  $pdo->commit();  // or $pdo->rollBack() on error
  ```
- **Handler Instance PDO**: Handlers have `$this->pdo` available (initialized in `Handler` base class)
- **ORM Access**: Idiorm uses `ORM::get_db()` to access PDO - acceptable alternative if it simplifies code and avoids unnecessary `Db::pdo()` calls
- **Plugin Data Separation**: `PluginHost` uses separate `$pdo_data` instance for plugin storage
  - Prevents transaction conflicts between plugin data saves and main app operations
  - Only initialized when first needed
  - Comment in code: "separate handle for plugin data so transaction while saving wouldn't clash with possible main tt-rss code transactions"
- **Multi-table Operations**: Always use transactions when updating related tables (e.g., articles + labels + counters)

### Database Schema
- **Migrations**: Tracked via `Config::SCHEMA_VERSION` (currently 151)
  - When making schema changes:
    1. Update `sql/pgsql/schema.sql` to reflect the desired end state (for new installations)
    2. Increment `Config::SCHEMA_VERSION` in `classes/Config.php`
    3. Create migration file `sql/pgsql/migrations/{new_version}.sql` with ALTER statements
  - Example: Incrementing from 151→152 requires updating `schema.sql`, setting `SCHEMA_VERSION = 152`, and creating `migrations/152.sql`
- **Conventions**: Tables prefixed `ttrss_` (e.g., `ttrss_feeds`, `ttrss_entries`, `ttrss_user_entries`)
- **Special Feeds**: Negative IDs (constants in `classes/Feeds.php`): -1 (Starred), -2 (Published), -3 (Fresh), -4 (All), -6 (Recently Read)

### Input Validation & Sanitization
- **HTML Content**: Use `Sanitizer::sanitize()` for user-generated HTML (e.g., feed content, article text)
  ```php
  $clean_html = Sanitizer::sanitize($content, $strip_images = false, $owner_uid, $site_url);
  ```
- **User Input**: Use `clean()` function for HTTP parameters where HTML is not needed
  ```php
  $feed_id = clean($_REQUEST['id']);  // Strips tags, trims whitespace
  // For arrays:
  $selected_ids = clean($_REQUEST['ids']);  // Applies to each element
  ```
- **Prefer Centralized Helpers**: Avoid duplicating validation logic - use existing helpers or add to appropriate utility class
- **Type Casting**: Validate and cast types explicitly (e.g., `(int)$id`, `(bool)$flag`) after cleaning
- **Examples**: See `classes/Feeds.php`, `classes/Article.php` for typical sanitization patterns

### Translation & Internationalization
- **PHP Backend**: Use `__($msgid)` function for translatable strings (from `lib/gettext/gettext.inc.php`)
  ```php
  echo __("Hello, world!");  // Returns translated string
  // Plural forms:
  $msg = _ngettext("article", "articles", $count);
  ```
- **JavaScript Frontend**: Use global `__()` function (defined in `js/common.js`)
  ```javascript
  alert(__("This function is only available in combined mode."));
  // Fallback to English if App.l10n not available
  ```
- **Plugin Translations**: Plugins use `_dgettext()` via `Plugin::__()` method
  ```php
  $this->__("Plugin-specific string");  // Uses plugin's translation domain
  ```
- **Best Practice**: Always use translated strings for user-facing messages; English fallback acceptable for internal logging/debugging
- **Translation Files**: Managed via Weblate, extracted with `utils/rebase-translations.sh` (updates `messages.pot`)

### Security Patterns
- **CSRF**: Token in `$_SESSION["csrf_token"]`, validated unless `csrf_ignore()` returns true
- **Auth**: Session-based, sequence in `UserHelper::login_sequence()`
- **Sanitization**: See "Input Validation & Sanitization" section above

### Logging & Debugging
- **Debug Logging**: Use `Debug::log()` for development/diagnostic output (feed updates, plugin execution)
  ```php
  Debug::log("Processing feed: $feed_url", Debug::LOG_VERBOSE);
  Debug::log("Article data:", Debug::LOG_EXTENDED);
  if (Debug::get_loglevel() >= Debug::LOG_EXTENDED) {
      print_r($data);  // Only shown at extended level
  }
  ```
  - Log levels: `Debug::LOG_DISABLED` (-1), `Debug::LOG_NORMAL` (0), `Debug::LOG_VERBOSE` (1), `Debug::LOG_EXTENDED` (2)
  - Controlled via command-line options: `--log-level 1`, `--log /path/to/file.log`
  - Check if enabled: `Debug::enabled()`
- **Error Logging**: Use `Logger::log_error()` for production error tracking (logs to SQL/syslog/stdout)
  ```php
  Logger::log_error(E_USER_WARNING, "Failed to process feed: $error", __FILE__, __LINE__, $context);
  // Or shorter form:
  Logger::log(E_USER_NOTICE, "User logged in: $username");
  ```
- **User Errors**: Use `user_error()` for error conditions that should be logged and optionally displayed
  ```php
  user_error("Invalid parameter: $param", E_USER_WARNING);
  ```
- **Plugin Error Handling**: Hooks wrap plugin calls in try/catch - exceptions/errors automatically logged as `E_USER_WARNING`
- **Context**: Debug output includes timestamp and PID; Logger includes backtrace via `format_backtrace()`

## Critical Files & Entry Points
- **Main App**: `index.php` → loads session, plugins, renders main UI
- **API**: `api/index.php` → JSON API (see `classes/API.php`)
- **Prefs**: `prefs.php` → admin/preferences UI
- **Public**: `public.php` → unauthenticated endpoints (e.g., RSS feed publishing)
- **Update**: `update.php`, `update_daemon2.php` → feed updating

## Docker & Deployment

### Official Docker Images
- **Images**: Built via GitHub Actions (`.github/workflows/publish.yml`)
  - GitHub Container Registry: `ghcr.io/tt-rss/tt-rss` (app) and `ghcr.io/tt-rss/tt-rss-web-nginx` (web)
  - Docker Hub: `supahgreg/tt-rss` (app) and `supahgreg/tt-rss-web-nginx` (web)
- **PHP Version Strategy**: 
  - Docker images use `PHP_SUFFIX` env var (currently `84`) to determine PHP version → runs on PHP 8.4
  - Codebase maintains backward compatibility with PHP 8.2 for non-Docker users
  - Source of truth for minimum version: `Config::sanity_check()` checks PHP 8.2.0
  - When updating Docker PHP version: change `ENV PHP_SUFFIX=84` in `.docker/app/Dockerfile`
- **Architecture**: Multi-container setup
  - **app**: Alpine-based PHP-FPM container (`.docker/app/Dockerfile`)
    - Installs PHP extensions via Alpine packages: `php${PHP_SUFFIX}-<extension>`
    - Environment variables: `OWNER_UID/GID`, `PHP_WORKER_MAX_CHILDREN`, `PHP_WORKER_MEMORY_LIMIT`
    - Auto-configuration: `ADMIN_USER_PASS`, `AUTO_CREATE_USER`, etc.
    - Plugins: Automatically clones `nginx_xaccel` to `plugins.local/` on build
  - **web-nginx**: Nginx reverse proxy (`.docker/web-nginx/Dockerfile`)
    - Configurable via `APP_UPSTREAM`, `APP_WEB_ROOT`, `APP_BASE` env vars
    - To run tt-rss on root instead of `/tt-rss`: set `APP_WEB_ROOT=/var/www/html/tt-rss` and `APP_BASE=`
- **Volumes**: Map `/var/www/html/tt-rss` for persistent data and development
- **Environment**: `.env` file with `TTRSS_*` variables (see `config.php-dist`)
  - Database: `TTRSS_DB_HOST`, `TTRSS_DB_PORT`, `TTRSS_DB_USER`, `TTRSS_DB_PASS`
  - Docker Secrets: Support `<VAR>__FILE` suffix (e.g., `TTRSS_DB_PASS__FILE=/run/secrets/db_password`)
  - XDebug: `TTRSS_XDEBUG_ENABLED`, `TTRSS_XDEBUG_HOST`, `TTRSS_XDEBUG_PORT`

## Testing Notes
- **Unit Tests**: Limited coverage (see `tests/` directory)
- **Integration Tests**: `tests/integration/` - require database setup
- **Manual Testing**: Use Docker Compose setup with local source mounted

## Common Gotchas
- **Config Changes**: Restart Docker containers after modifying `.env`
- **Plugin State**: Plugin data cached in `ttrss_plugin_storage` - may need DB clear for dev
- **Theme Changes**: Run `npx gulp` to recompile LESS after CSS edits
- **ORM Caching**: Idiorm uses identity map - call `ORM::reset_db()` to clear
- **Database-Only**: PostgreSQL is the only supported database (MySQL support removed)
