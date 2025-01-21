package backend

import (
	"findmydeviceserver/user"
	"io/fs"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/rs/zerolog/log"
	"gopkg.in/yaml.v3"
)

var uio user.UserRepository

type config struct {
	PortSecure        int    `yaml:"PortSecure"`
	PortInsecure      int    `yaml:"PortInsecure"`
	UnixSocketPath    string `yaml:"UnixSocketPath"`
	UnixSocketChmod   uint32 `yaml:"UnixSocketChmod"`
	UserIdLength      int    `yaml:"UserIdLength"`
	MaxSavedLoc       int    `yaml:"MaxSavedLoc"`
	MaxSavedPic       int    `yaml:"MaxSavedPic"`
	RegistrationToken string `yaml:"RegistrationToken"`
	ServerCrt         string `yaml:"ServerCrt"`
	ServerKey         string `yaml:"ServerKey"`
}

func handleRequests(webDir string, config config) {
	mux := buildServeMux(webDir, config)

	if len(config.UnixSocketPath) > 0 {
		_, err := os.Stat(config.UnixSocketPath)
		if err == nil { // socket already exists
			err = os.Remove(config.UnixSocketPath)
			if err != nil {
				log.Fatal().
					Str("UnixSocketPath", config.UnixSocketPath).
					Msg("could not remove existing unix socket")
			}
		}

		log.Info().
			Str("UnixSocketPath", config.UnixSocketPath).
			Msg("listening on unix socket")

		unixListener, err := net.Listen("unix", config.UnixSocketPath)
		if err != nil {
			if err != nil {
				log.Fatal().Err(err).Msg("cannot open unix socket")
				os.Exit(1) // make nilaway happy
			}
		}

		fm := fs.FileMode(config.UnixSocketChmod)
		err = os.Chmod(config.UnixSocketPath, fm)
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
		os.Remove(config.UnixSocketPath)

	} else if config.PortSecure > -1 && fileExists(config.ServerCrt) && fileExists(config.ServerKey) {
		log.Info().
			Int("PortSecure", config.PortSecure).
			Msg("listening on secure port")
		securePort := ":" + strconv.Itoa(config.PortSecure)
		err := http.ListenAndServeTLS(securePort, config.ServerCrt, config.ServerKey, mux)
		if err != nil {
			log.Fatal().Err(err).Msg("failed to serve with TLS")
		}

	} else if config.PortInsecure > -1 {
		log.Info().
			Int("PortInsecure", config.PortInsecure).
			Msg("listening on insecure port")
		insecureAddr := ":" + strconv.Itoa(config.PortInsecure)
		err := http.ListenAndServe(insecureAddr, mux)
		if err != nil {
			log.Fatal().Err(err).Msg("failed to serve with HTTP")
		}

	} else {
		log.Fatal().Msg("no address to listen on")
	}
}

func loadConfig(configPath string) config {
	log.Info().Msg("loading config")

	configRead := true
	configContent, err := os.ReadFile(configPath)
	if err != nil {
		log.Error().Err(err).Msg("cannot read config file")
		configRead = false
	}

	serverConfig := config{}
	err = yaml.Unmarshal(configContent, &serverConfig)
	if err != nil {
		log.Error().Err(err).Msg("cannot unmarshal config file")
		configRead = false
	}

	if !configRead {
		log.Warn().Msg("no config found, using defaults")
		serverConfig = config{PortSecure: 8443, PortInsecure: 8080, UserIdLength: 5, MaxSavedLoc: 1000, MaxSavedPic: 10, RegistrationToken: "", UnixSocketPath: "", UnixSocketChmod: 0660}
	}
	//fmt.Printf("INFO: Using config %+v\n", serverConfig)

	return serverConfig
}

func initDb(dbDir string, config config) {
	log.Info().Msg("loading database")
	uio = user.UserRepository{}
	uio.Init(dbDir, config.UserIdLength, config.MaxSavedLoc, config.MaxSavedPic)
}

func getCwd() string {
	executableFile, err := os.Executable()
	if err != nil {
		return "."
	} else {
		dir, _ := filepath.Split(executableFile)
		return dir
	}
}

func fileExists(filename string) bool {
	info, err := os.Stat(filename)
	if os.IsNotExist(err) || info == nil {
		return false
	}
	return !info.IsDir()
}

func RunServer(configPath string, dbDir string, webDir string) {
	log.Info().
		Str("version", VERSION).
		Str("configPath", configPath).
		Str("dbDir", dbDir).
		Str("webDir", webDir).
		Msg("starting FMD Server")

	// Initialisation
	config := loadConfig(configPath)
	initDb(dbDir, config)

	// Run server
	handleRequests(webDir, config)
}
