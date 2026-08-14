package backend

import (
	"context"
	conf "fmd-server/config"
	"fmd-server/constants"
	"fmd-server/metrics"
	"fmd-server/user"
	"io/fs"
	"net"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

var uio user.UserRepository
var server *http.Server

// Generous, to allow for image upload/download on slow connections
const readTimeout = 60 * time.Second
const writeTimeout = 60 * time.Second

func handleRequests(config *viper.Viper) {
	mux := buildServeMux(config)

	// Cache config values (to avoid re-reading them between usages, which has the risk of them changing)
	socketPath := config.GetString(conf.CONF_UNIX_SOCKET_PATH)
	socketChmod := config.GetInt(conf.CONF_UNIX_SOCKET_CHMOD)
	addrSecure := portToListenAddr(config.GetString(conf.CONF_PORT_SECURE))
	addrInsecure := portToListenAddr(config.GetString(conf.CONF_PORT_INSECURE))
	serverCrt := config.GetString(conf.CONF_SERVER_CERT)
	serverKey := config.GetString(conf.CONF_SERVER_KEY)

	if len(socketPath) > 0 {
		handleRequestsSocket(mux, socketPath, socketChmod)
	} else if addrSecure != "" && (serverCrt != "" || serverKey != "") {
		handleSecure(mux, addrSecure, serverKey, serverCrt)
	} else if addrInsecure != "" {
		handleInsecure(mux, addrInsecure)
	} else {
		log.Fatal().Msg("no address to listen on")
	}
}

func portToListenAddr(portStr string) string {
	portInt, err := strconv.Atoi(portStr)
	if err == nil {
		// Old way to disable the (in)secure port
		if portInt == -1 {
			return ""
		} else {
			return ":" + strconv.Itoa(portInt)
		}
	}
	return portStr
}

func handleRequestsSocket(handler http.Handler, socketPath string, socketChmod int) {
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

	server = &http.Server{
		Handler:      handler,
		ReadTimeout:  readTimeout,
		WriteTimeout: writeTimeout,
	}

	err = server.Serve(unixListener)
	if err != nil && err != http.ErrServerClosed {
		log.Error().Err(err).Msg("error serving unix server")
	}

	err = server.Close()
	if err != nil {
		log.Error().Err(err).Msg("error closing unix server")
	}

	err = unixListener.Close()
	if err != nil {
		// Log error only when socket wasn't closed
		if opErr, ok := err.(*net.OpError); !ok || opErr.Err != net.ErrClosed {
			log.Error().Err(err).Msg("error closing unix listener")
		}
	}
	// ignore error for now
	os.Remove(socketPath)
}

func handleSecure(handler http.Handler, addrSecure string, serverKey, serverCrt string) {
	if !fileExists(serverCrt) {
		log.Fatal().Str(conf.CONF_SERVER_CERT, serverCrt).Msg("TLS certificate file not found")
	}
	if !fileExists(serverKey) {
		log.Fatal().Str(conf.CONF_SERVER_KEY, serverKey).Msg("TLS key file not found")
	}
	log.Info().
		Str(conf.CONF_SERVER_KEY, serverKey).
		Str(conf.CONF_SERVER_CERT, serverCrt).
		Str("AddrSecure", addrSecure).
		Msg("listening on secure port")

	server = &http.Server{
		Addr:         addrSecure,
		Handler:      handler,
		ReadTimeout:  readTimeout,
		WriteTimeout: writeTimeout,
	}

	err := server.ListenAndServeTLS(serverCrt, serverKey)
	if err != nil && err != http.ErrServerClosed {
		log.Fatal().Err(err).Msg("failed to serve with TLS")
	}
}

func handleInsecure(handler http.Handler, addrInsecure string) {
	log.Info().
		Str("AddrInsecure", addrInsecure).
		Msg("listening on insecure port")

	server = &http.Server{
		Addr:         addrInsecure,
		Handler:      handler,
		ReadTimeout:  readTimeout,
		WriteTimeout: writeTimeout,
	}

	err := server.ListenAndServe()
	if err != nil && err != http.ErrServerClosed {
		log.Fatal().Err(err).Msg("failed to serve with HTTP")
	}
}

func initDb(config *viper.Viper) {
	log.Info().Msg("loading database")
	uio = user.NewUserRepository(
		config.GetString(conf.CONF_DATABASE_DIR),
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
		Str("version", constants.VERSION).
		Str("dbDir", config.GetString(conf.CONF_DATABASE_DIR)).
		Str("webDir", config.GetString(conf.CONF_WEB_DIR)).
		Msg("starting FMD Server")

	// Initialisation
	initDb(config)

	// Run server
	go metrics.HandleMetrics(config)
	go handleRequests(config)
}

func StopServer() {
	metrics.StopMetrics()

	if server != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		server.Shutdown(ctx)
	}

	db, err := uio.UB.DB.DB()
	if err != nil {
		db.Close()
	}

	log.Info().Msg("Stopped fmd-server")
}
