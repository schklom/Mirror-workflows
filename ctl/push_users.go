package main

import (
	"fmt"

	conf "fmd-server/config"
	"fmd-server/user"

	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"
)

var pushUsersCmd = &cobra.Command{
	Use:   "pushusers [...username]",
	Short: "Push users to wake up their app",
	Long: "Push users to wake up their app.\n\n" +
		"This is useful to find users who still have FMD installed but don't use actively use the server. " +
		"Running this command will wake up the app and the app will contact the server. " +
		"It will NOT EXECUTE any command on the device! " +
		// This is impossible without the user's password!
		"However, because the device now logged into the server again, the last_seen_time will be updated.",
	Args: cobra.MinimumNArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		setupLogging()
		conf.ReadConfigFile(&config, configPath)
		runPush(args)
	},
}

func init() {
	rootCmd.AddCommand(pushUsersCmd)
}

func runPush(args []string) {
	uio := user.NewUserRepository(
		config.GetString(conf.CONF_DATABASE_DIR),
		config.GetInt(conf.CONF_MAX_SAVED_LOC),
		config.GetInt(conf.CONF_MAX_SAVED_PIC),
	)

	log.Info().Msg(fmt.Sprintf("pushing %d users", len(args)))

	for _, username := range args {
		user, err := uio.UB.GetByName(username)
		if err != nil {
			// No log message, GetByID already logs one.
			continue
		}

		log.Info().Str("user", username).Msg("pushing user")
		uio.PushUser(user)
	}

}
