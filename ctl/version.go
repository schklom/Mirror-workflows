package main

import (
	"fmd-server/constants"
	"fmt"

	"github.com/spf13/cobra"
)

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print the FMD Server CTL version",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println(constants.VERSION)
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)
}
