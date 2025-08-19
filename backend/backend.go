package backend

import (
	"fmd-server/user"
	"io/fs"
	"net"
	"net/http"
	"os"
	"strconv"

	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

var uio user.UserRepository

func handleRequests(config *viper.Viper) {
	mux := buildServeMux(config)

	// Cache config values (to avoid re-reading them between usages, which has the risk of them changing)
	socketPath := config.GetString(CONF_UNIX_SOCKET_PATH)
	socketChmod := config.GetInt(CONF_UNIX_SOCKET_CHMOD)
	portSecure := config.GetInt(CONF_PORT_SECURE)
	portInsecure := config.GetInt(CONF_PORT_INSECURE)
	serverCrt := config.GetString(CONF_SERVER_CERT)
	serverKey := config.GetString(CONF_SERVER_KEY)

	if len(socketPath) > 0 {
		handleRequestsSocket(mux, socketPath, socketChmod)
	} else if portSecure > -1 && fileExists(serverCrt) && fileExists(serverKey) {
		log.Info().
			Int("PortSecure", portSecure).
			Msg("listening on secure port")
		securePort := ":" + strconv.Itoa(portSecure)
		err := http.ListenAndServeTLS(securePort, serverCrt, serverKey, mux)
		if err != nil {
			log.Fatal().Err(err).Msg("failed to serve with TLS")
		}
	} else if portInsecure > -1 {
		log.Info().
			Int("PortInsecure", portInsecure).
			Msg("listening on insecure port")
		insecureAddr := ":" + strconv.Itoa(portInsecure)
		err := http.ListenAndServe(insecureAddr, mux)
		if err != nil {
			log.Fatal().Err(err).Msg("failed to serve with HTTP")
		}

	} else {
		log.Fatal().Msg("no address to listen on")
	}
}

func handleRequestsSocket(mux *http.ServeMux, socketPath string, socketChmod int) {
	_, err := os.Stat(socketPath)
	if err == nil { // socket already exists
		err = os.Remove(socketPath)
		if err != nil {
			log.Fatal().
				Str("UnixSocketPath", socketPath).
				Msg("could not remove existing unix socket")
		}
	}

	log.Info().
		Str("UnixSocketPath", socketPath).
		Msg("listening on unix socket")

	unixListener, err := net.Listen("unix", socketPath)
	if err != nil {
		log.Fatal().Err(err).Msg("cannot open unix socket")
		os.Exit(1) // make nilaway happy
	}

	fm := fs.FileMode(socketChmod)
	err = os.Chmod(socketPath, fm)
	if err != nil {
		log.Error().
			Err(err).
			Str("fm", fm.String()).
			Msg("error modifying unix socket permissions")
	}

	server := http.Server{Handler: mux}
	err = server.Serve(unixListener)
	if err != nil {
		log.Error().Err(err).Msg("error serving unix server")
	}

	err = server.Close()
	if err != nil {
		log.Error().Err(err).Msg("error closing unix server")
	}

	err = unixListener.Close()
	if err != nil {
		log.Error().Err(err).Msg("error closing unix listener")
	}
	// ignore error for now
	os.Remove(socketPath)
}

func initDb(config *viper.Viper) {
	log.Info().Msg("loading database")
	uio = user.NewUserRepository(
		config.GetString(conf.CONF_DATABASE_DIR),
		config.GetInt(conf.CONF_USER_ID_LENGTH),
		config.GetInt(conf.CONF_MAX_SAVED_LOC),
		config.GetInt(conf.CONF_MAX_SAVED_PIC),
	)
}

func fileExists(filename string) bool {
	info, err := os.Stat(filename)
	if os.IsNotExist(err) || info == nil {
		return false
	}
	return !info.IsDir()
}

func RunServer(config *viper.Viper) {
	log.Info().
		Str("version", VERSION).
		Str("dbDir", config.GetString(CONF_DATABASE_DIR)).
		Str("webDir", config.GetString(CONF_WEB_DIR)).
		Msg("starting FMD Server")

	// Initialisation
	initDb(config)

	// Run server
	handleRequests(config)
}
