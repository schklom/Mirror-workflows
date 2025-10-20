<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../classes/Debug.php';

/**
 * Tests for Debug class - Core debugging infrastructure
 * 
 * Focus: Log level validation, enable/disable state, log filtering logic
 */
final class DebugTest extends TestCase {
    
    protected function setUp(): void {
        // Reset Debug state between tests
        Debug::set_enabled(false);
        Debug::set_loglevel(Debug::LOG_NORMAL);
        Debug::set_quiet(false);
        Debug::enable_html(false);
        Debug::set_logfile('');
    }

    // ========================================
    // Log Level Validation Tests
    // ========================================

    #[\PHPUnit\Framework\Attributes\DataProvider('validLogLevelsProvider')]
    public function testMapLoglevelAcceptsValidLevels(int $level, int $expected): void {
        $result = Debug::map_loglevel($level);
        $this->assertSame($expected, $result);
    }

    public static function validLogLevelsProvider(): array {
        return [
            'LOG_DISABLED' => [Debug::LOG_DISABLED, Debug::LOG_DISABLED],
            'LOG_NORMAL' => [Debug::LOG_NORMAL, Debug::LOG_NORMAL],
            'LOG_VERBOSE' => [Debug::LOG_VERBOSE, Debug::LOG_VERBOSE],
            'LOG_EXTENDED' => [Debug::LOG_EXTENDED, Debug::LOG_EXTENDED],
        ];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('invalidLogLevelsProvider')]
    public function testMapLoglevelRejectsInvalidLevels(int $invalidLevel): void {
        set_error_handler(function($errno, $errstr) {
            $this->assertSame(E_USER_WARNING, $errno);
            $this->assertStringContainsString('Passed invalid debug log level', $errstr);
        });

        $result = Debug::map_loglevel($invalidLevel);
        
        restore_error_handler();
        
        $this->assertSame(Debug::LOG_DISABLED, $result);
    }

    public static function invalidLogLevelsProvider(): array {
        return [
            'negative invalid' => [-999],
            'positive invalid' => [999],
            'boundary below' => [-2],
            'boundary above' => [3],
        ];
    }

    // ========================================
    // Enable/Disable State Tests
    // ========================================

    public function testDebugDisabledByDefault(): void {
        // Fresh state from setUp()
        $this->assertFalse(Debug::enabled());
    }

    public function testSetEnabledChangesState(): void {
        Debug::set_enabled(true);
        $this->assertTrue(Debug::enabled());
        
        Debug::set_enabled(false);
        $this->assertFalse(Debug::enabled());
    }

    public function testLogReturnsFalseWhenDisabled(): void {
        Debug::set_enabled(false);
        
        $result = Debug::log('Test message');
        
        $this->assertFalse($result);
    }

    // ========================================
    // Log Level Filtering Tests
    // ========================================

    public function testSetAndGetLoglevel(): void {
        Debug::set_loglevel(Debug::LOG_VERBOSE);
        $this->assertSame(Debug::LOG_VERBOSE, Debug::get_loglevel());
        
        Debug::set_loglevel(Debug::LOG_EXTENDED);
        $this->assertSame(Debug::LOG_EXTENDED, Debug::get_loglevel());
    }

    public function testLogFiltersByLevel(): void {
        Debug::set_enabled(true);
        Debug::set_loglevel(Debug::LOG_NORMAL);
        
        // Should log NORMAL level messages
        ob_start();
        $result = Debug::log('Normal message', Debug::LOG_NORMAL);
        $output = ob_get_clean();
        
        $this->assertTrue($result);
        $this->assertStringContainsString('Normal message', $output);
        
        // Should NOT log VERBOSE messages when level is NORMAL
        ob_start();
        $result = Debug::log('Verbose message', Debug::LOG_VERBOSE);
        $output = ob_get_clean();
        
        $this->assertFalse($result);
        $this->assertEmpty($output);
    }

    public function testLogVerboseLevelIncludesNormalMessages(): void {
        Debug::set_enabled(true);
        Debug::set_loglevel(Debug::LOG_VERBOSE);
        
        // VERBOSE level should include NORMAL messages
        ob_start();
        $result = Debug::log('Normal message', Debug::LOG_NORMAL);
        $output = ob_get_clean();
        
        $this->assertTrue($result);
        $this->assertStringContainsString('Normal message', $output);
        
        // VERBOSE level should include VERBOSE messages
        ob_start();
        $result = Debug::log('Verbose message', Debug::LOG_VERBOSE);
        $output = ob_get_clean();
        
        $this->assertTrue($result);
        $this->assertStringContainsString('Verbose message', $output);
    }

    public function testLogExtendedLevelIncludesAllMessages(): void {
        Debug::set_enabled(true);
        Debug::set_loglevel(Debug::LOG_EXTENDED);
        
        foreach ([Debug::LOG_NORMAL, Debug::LOG_VERBOSE, Debug::LOG_EXTENDED] as $level) {
            ob_start();
            $result = Debug::log('Test message', $level);
            $output = ob_get_clean();
            
            $this->assertTrue($result, "Should log level $level when loglevel is EXTENDED");
            $this->assertStringContainsString('Test message', $output);
        }
    }

    // ========================================
    // HTML vs Plain Text Output Tests
    // ========================================

    public function testPlainTextOutputFormatsByDefault(): void {
        Debug::set_enabled(true);
        
        ob_start();
        Debug::log('Test message');
        $output = ob_get_clean();
        
        // Plain text format: [HH:MM:SS] message or [HH:MM:SS/PID] message
        $this->assertMatchesRegularExpression('/^\[\d{2}:\d{2}:\d{2}(?:\/\d+)?\] Test message\n$/', $output);
        $this->assertStringNotContainsString('<span', $output);
    }

    public function testHtmlOutputFormatsWithSpanTags(): void {
        Debug::set_enabled(true);
        Debug::enable_html(true);
        
        ob_start();
        Debug::log('Test message');
        $output = ob_get_clean();
        
        $this->assertStringContainsString('<span class=\'log-timestamp\'>', $output);
        $this->assertStringContainsString('<span class=\'log-message\'>Test message</span>', $output);
    }

    public function testSeparatorRendersAsHrInHtmlMode(): void {
        Debug::set_enabled(true);
        Debug::enable_html(true);
        
        ob_start();
        Debug::log(Debug::SEPARATOR);
        $output = ob_get_clean();
        
        $this->assertStringContainsString('<hr/>', $output);
    }

    public function testSeparatorRendersAsEqualsInPlainTextMode(): void {
        Debug::set_enabled(true);
        Debug::enable_html(false);
        
        ob_start();
        Debug::log(Debug::SEPARATOR);
        $output = ob_get_clean();
        
        // Plain text separator includes timestamp prefix: [HH:MM:SS] ===...===
        $this->assertMatchesRegularExpression('/^\[\d{2}:\d{2}:\d{2}(?:\/\d+)?\] =+\n$/', $output);
        $this->assertStringNotContainsString('<hr/>', $output);
    }

    // ========================================
    // Quiet Mode Tests
    // ========================================

    public function testQuietModeWithLogfileStillLogsToFile(): void {
        $tempfile = tempnam(sys_get_temp_dir(), 'debug_test_');
        
        Debug::set_enabled(true);
        Debug::set_logfile($tempfile);
        Debug::set_quiet(true);
        
        ob_start();
        $result = Debug::log('Quiet test message');
        $stdout = ob_get_clean();
        
        // Quiet mode with logfile returns false (no stdout)
        $this->assertFalse($result);
        
        // But message should be in the logfile
        $logcontents = file_get_contents($tempfile);
        $this->assertStringContainsString('Quiet test message', $logcontents);
        
        unlink($tempfile);
    }

    public function testQuietModeWithoutLogfileStillPrintsToStdout(): void {
        Debug::set_enabled(true);
        Debug::set_quiet(true);
        // No logfile set
        
        ob_start();
        $result = Debug::log('Not quiet without logfile');
        $stdout = ob_get_clean();
        
        // Without logfile, quiet mode is ignored - still prints
        $this->assertTrue($result);
        $this->assertStringContainsString('Not quiet without logfile', $stdout);
    }

    // ========================================
    // Logfile Writing Tests
    // ========================================

    public function testLogfileWritesMessages(): void {
        $tempfile = tempnam(sys_get_temp_dir(), 'debug_test_');
        
        Debug::set_enabled(true);
        Debug::set_logfile($tempfile);
        
        ob_start();
        Debug::log('First message');
        Debug::log('Second message');
        ob_end_clean();
        
        $contents = file_get_contents($tempfile);
        $this->assertStringContainsString('First message', $contents);
        $this->assertStringContainsString('Second message', $contents);
        
        // Should be formatted with timestamps
        $this->assertMatchesRegularExpression('/\[\d{2}:\d{2}:\d{2}(?:\/\d+)?\] First message/', $contents);
        
        unlink($tempfile);
    }

    public function testLogfileAppendsNotOverwrites(): void {
        $tempfile = tempnam(sys_get_temp_dir(), 'debug_test_');
        file_put_contents($tempfile, "Existing content\n");
        
        Debug::set_enabled(true);
        Debug::set_logfile($tempfile);
        
        ob_start();
        Debug::log('New message');
        ob_end_clean();
        
        $contents = file_get_contents($tempfile);
        $this->assertStringContainsString('Existing content', $contents);
        $this->assertStringContainsString('New message', $contents);
        
        unlink($tempfile);
    }
}
