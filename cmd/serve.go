package cmd

import (
	"github.com/spf13/cobra"
)

var (
	configPath string
	dbDir      string
	webDir     string

	serveCmd = &cobra.Command{
		Use:   "serve",
		Short: "Run the server",
		Run: func(cmd *cobra.Command, args []string) {
			RunServer(configPath, dbDir, webDir)
		},
	}
)

func init() {
	rootCmd.AddCommand(serveCmd)

	serveCmd.Flags().StringVarP(&configPath, "config", "c", "config.yml", "Path to the config file")

	serveCmd.Flags().StringVarP(&dbDir, "db-dir", "d", "db/", "Path to the database directory")
	serveCmd.Flags().StringVarP(&webDir, "web-dir", "w", "web/", "Path to the web static files directory")
}
