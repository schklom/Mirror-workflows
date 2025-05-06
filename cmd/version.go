package cmd

import (
	"fmd-server/backend"
	"fmt"

	"github.com/spf13/cobra"
)

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print the FMD Server version",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println(backend.VERSION)
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)
}
