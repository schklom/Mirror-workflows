<?php
interface Logger_Adapter {
   function log_error(int $errno, string $errstr, string $file, int $line, string $context): bool;
}
