//go:build !windows

package cmd

import (
	"fmt"
	"io"
	"log/syslog"

	"github.com/rs/zerolog"
)

func addPlatformLogWriters(writers *[]io.Writer) {
	syslog, err := syslog.New(syslog.LOG_INFO|syslog.LOG_USER, "fmd-server")
	if err != nil {
		fmt.Printf("Failed to connect to syslog: %s\n", err)
		return
	}
	*writers = append(*writers, zerolog.SyslogLevelWriter(syslog))
}
