package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	conf "fmd-server/config"
	"fmd-server/user"

	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"
)

var deleteUsersCmd = &cobra.Command{
	Use:   "deleteusers [...username]",
	Short: "Delete users",
	Long: "Delete users\n\n" +
		"THIS COMMAND IS DESTRUCTIVE! " +
		"It is recommended to run 'listusers' first to find out which user account are unused and can be deleted. " +
		"Additionally, run 'pushusers' to find accounts that are still active but don't have the regular connectivity check enabled.",
	Args: cobra.MinimumNArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		setupLogging()
		conf.ReadConfigFile(&config, configPath)
		runDelete(args)
	},
}

func init() {
	rootCmd.AddCommand(deleteUsersCmd)
}

func runDelete(args []string) {
	uio := user.NewUserRepository(
		config.GetString(conf.CONF_DATABASE_DIR),
		config.GetInt(conf.CONF_MAX_SAVED_LOC),
		config.GetInt(conf.CONF_MAX_SAVED_PIC),
	)

	log.Info().Msg(fmt.Sprintf("deleting %d users", len(args)))

	println("Do you really want to delete the following accounts? THIS CANNOT BE UNDONE!")
	println("Accounts to be deleted:")
	fmt.Printf("%s\n", strings.Join(args, " "))
	println("Type 'delete' to confirm.")

	reader := bufio.NewReader(os.Stdin)
	line, err := reader.ReadString('\n')
	if err != nil {
		log.Fatal().Err(err).Msg("failed to read stdin")
		os.Exit(1)
	}
	line = strings.TrimSpace(line)

	if line != "delete" {
		println("Aborted.")
		return
	}

	for _, username := range args {
		user, err := uio.UB.GetByName(username)
		if err != nil {
			// No log message, GetByID already logs one.
			continue
		}

		uio.DeleteUser(user)
	}
}
