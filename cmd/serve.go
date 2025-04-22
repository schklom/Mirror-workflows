package cmd

import (
	"findmydeviceserver/backend"
	"fmt"
	"io"
	"log/syslog"
	"os"
	"time"

	"github.com/spf13/cobra"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

var (
	configPath string
	dbDir      string
	webDir     string
	jsonLog    bool

	serveCmd = &cobra.Command{
		Use:   "serve",
		Short: "Run the server",
		Run: func(cmd *cobra.Command, args []string) {
			setupLogging(jsonLog)
			backend.RunServer(configPath, dbDir, webDir)
		},
	}
)

func setupLogging(jsonLog bool) {
	writers := []io.Writer{}

	// stderr
	if jsonLog {
		// json is the default in zerolog
		writers = append(writers, os.Stderr)
	} else {
		// not json => use ConsoleWriter to have pretty-print
		writers = append(writers, zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339})
	}

	// syslog
	syslog, err := syslog.New(syslog.LOG_INFO|syslog.LOG_USER, "fmd-server")
	if err != nil {
		// failed to connect to syslog
		fmt.Printf("Failed to connect to syslog: %s\n", err)
	} else {
		writers = append(writers, zerolog.SyslogLevelWriter(syslog))
	}

	multi := zerolog.MultiLevelWriter(writers...)
	log.Logger = log.Output(multi)
}

func init() {
	rootCmd.AddCommand(serveCmd)

	serveCmd.Flags().StringVarP(&configPath, "config", "c", "config.yml", "Path to the config file")

	serveCmd.Flags().StringVarP(&dbDir, "db-dir", "d", "db/", "Path to the database directory")
	serveCmd.Flags().StringVarP(&webDir, "web-dir", "w", "web/", "Path to the web static files directory")

	serveCmd.Flags().BoolVar(&jsonLog, "log-json", false, "Print log messages as JSON. This only affects stderr. Syslog always uses JSON.")
}
