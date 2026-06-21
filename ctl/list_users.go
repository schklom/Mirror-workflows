package main

import (
	conf "fmd-server/config"
	"fmd-server/ctl/internal"
	"fmd-server/user"
	"fmt"
	"strings"

	"os"
	"time"

	"github.com/spf13/cobra"

	"github.com/rs/zerolog/log"
)

var (
	limit       int
	lastSeenAgo string
	raw         bool
)

var listUsersCmd = &cobra.Command{
	Use:   "listusers",
	Short: "List users registered on the server",
	Long:  "List users registered on the server.\nThis is useful to e.g. find users who have not logged in for a long time.",
	Run: func(cmd *cobra.Command, args []string) {
		setupLogging()
		conf.ReadConfigFile(&config, configPath)
		runQuery()
	},
}

func init() {
	rootCmd.AddCommand(listUsersCmd)

	listUsersCmd.Flags().IntVarP(&limit, "limit", "l", 50, "Limit the number of users shown.")

	// DurationVarP would be nice, but Duration only supports shorthands up to 'h' (hour).
	listUsersCmd.Flags().StringVarP(&lastSeenAgo, "last-seen-ago", "a", "", "List users seen more than this time ago. Takes shorthand values such as: 7d, 2w, 3m.")

	listUsersCmd.Flags().BoolVarP(&raw, "raw", "r", false, "Return the usernames as a space-separated list instead of as a table.")
}

func runQuery() {
	agoSeconds, err := internal.ParseDurationShortHand(lastSeenAgo)
	if err != nil {
		log.Fatal().Err(err).Msg("invalid last-seen-ago")
		os.Exit(1)
	}

	db := user.NewFMDDB(config.GetString(conf.CONF_DATABASE_DIR))

	userCount, err := db.GetUsersCount()
	if err != nil {
		log.Fatal().Err(err).Msg("user count query failed")
		os.Exit(1)
	}

	cutOffSeconds := time.Now().Unix() - int64(agoSeconds)

	users, err := db.GetUsersLastSeenBefore(cutOffSeconds)
	if err != nil || users == nil { // make nilaway happy
		log.Fatal().Err(err).Msg("last seen query failed")
		os.Exit(1)
	}

	fmt.Printf("Found %d users (out of %d).\n", len(users), userCount)

	// Limit the CLI output. TODO: limit the query output in SQL as well?
	max := len(users)
	if len(users) > limit {
		fmt.Printf("Showing the first %d users only.\n", limit)
		max = limit
	}
	println()

	if raw {
		printSpaceSeparatedList(max, users)
	} else {
		printTable(max, users)
	}
}

func printSpaceSeparatedList(max int, users []user.FMDUser) {
	for i := range max {
		print(users[i].Username)
		print(" ")
	}
	println()
}

func printTable(max int, users []user.FMDUser) {
	fmt.Printf("%-24s %-28s %-24s\n", "Username", "Last Seen Time", "Push URL")
	fmt.Println(strings.Repeat("-", 78))

	for i := range max {
		t := time.Unix(users[i].LastSeenTime, 0)

		pushUrl := ""
		if len(users[i].PushUrl) < 24 {
			pushUrl = users[i].PushUrl
		} else {
			pushUrl = users[i].PushUrl[:24]
		}

		fmt.Printf("%-24s %-28s %-24s\n", users[i].Username, t.Format(time.RFC3339), pushUrl)
	}
}
