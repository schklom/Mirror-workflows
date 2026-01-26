//go:build windows

package cmd

import "io"

// Windows does not provide a syslog-equivalent facility.
// Logging is therefore limited to stderr, which can be
// captured by service managers or wrappers if needed.
func addPlatformLogWriters(writers *[]io.Writer) {
	// no-op
}
