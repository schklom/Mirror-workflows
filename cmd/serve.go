package cmd

import (
	"findmydeviceserver/backend"
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
			if !jsonLog {
				writer := zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339}
				log.Logger = log.Output(writer)
			}
			backend.RunServer(configPath, dbDir, webDir)
		},
	}
)

func init() {
	rootCmd.AddCommand(serveCmd)

	serveCmd.Flags().StringVarP(&configPath, "config", "c", "config.yml", "Path to the config file")

	serveCmd.Flags().StringVarP(&dbDir, "db-dir", "d", "db/", "Path to the database directory")
	serveCmd.Flags().StringVarP(&webDir, "web-dir", "w", "web/", "Path to the web static files directory")

	serveCmd.Flags().BoolVar(&jsonLog, "log-json", false, "Print log messages as JSON")
}
