package cmd

import (
	"fmd-server/backend"
	conf "fmd-server/config"

	"fmt"
	"io"
	"log/syslog"
	"os"
	"time"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

var (
	config viper.Viper = conf.InitConfig()

	configPath string
	dbDir      string // used indirectly via config.BindPFlag
	webDir     string // same as dbDir
	jsonLog    bool

	serveCmd = &cobra.Command{
		Use:   "serve",
		Short: "Run the server",
		Run: func(cmd *cobra.Command, args []string) {
			setupLogging(jsonLog)
			conf.ReadConfigFile(&config, configPath)
			backend.RunServer(&config)
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

	// No default values as those are handled by the config
	serveCmd.Flags().StringVarP(&configPath, "config", "c", "", "Path to the config file")

	serveCmd.Flags().StringVarP(&dbDir, "db-dir", "d", "", "Path to the database directory")
	serveCmd.Flags().StringVarP(&webDir, "web-dir", "w", "", "Optional path to the web static files directory. If unset, the embedded static files are used")

	config.BindPFlag(conf.CONF_DATABASE_DIR, serveCmd.Flags().Lookup("db-dir"))
	config.BindPFlag(conf.CONF_WEB_DIR, serveCmd.Flags().Lookup("web-dir"))

	serveCmd.Flags().BoolVar(&jsonLog, "log-json", false, "Print log messages as JSON. This only affects stderr. Syslog always uses JSON.")
}
