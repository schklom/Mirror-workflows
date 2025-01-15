package backend

import (
	"findmydeviceserver/user"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

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
				log.Fatalf("could not remove existing unix socket: %s", config.UnixSocketPath)
			}
		}
		fmt.Printf("Listening on unix socket %s \n", config.UnixSocketPath)
		unixListener, err := net.Listen("unix", config.UnixSocketPath)
		if err != nil {
			log.Fatalf("error on opening unix socket, %s", err.Error())
		}
		fm := fs.FileMode(config.UnixSocketChmod)
		err = os.Chmod(config.UnixSocketPath, fm)
		if err != nil {
			log.Fatalf("error modifying permissions %x on unix socket %s, %s", fm, config.UnixSocketPath, err.Error())
		}
		server := http.Server{Handler: mux}
		err = server.Serve(unixListener)
		if err != nil {
			fmt.Printf("error on serving %s, %s", config.UnixSocketPath, err.Error())
		}
		err = server.Close()
		if err != nil {
			fmt.Printf("error on closing unix server, %s", err.Error())
		}
		err = unixListener.Close()
		if err != nil {
			fmt.Printf("error on closing unix listener, %s", err.Error())
		}
		// ignore error for now
		os.Remove(config.UnixSocketPath)
	} else if config.PortSecure > -1 && fileExists(config.ServerCrt) && fileExists(config.ServerKey) {
		securePort := ":" + strconv.Itoa(config.PortSecure)
		fmt.Printf("Listening on port %d (secure)\n", config.PortSecure)
		err := http.ListenAndServeTLS(securePort, config.ServerCrt, config.ServerKey, mux)
		if err != nil {
			fmt.Println("HTTPS won't be available.", err)
		}
	} else if config.PortInsecure > -1 {
		fmt.Printf("Listening on port: %d (insecure)\n", config.PortInsecure)
		insecureAddr := ":" + strconv.Itoa(config.PortInsecure)
		log.Fatal(http.ListenAndServe(insecureAddr, mux))
	} else {
		log.Fatal("no address to listen on")
	}
}

func loadConfig(configPath string) config {
	fmt.Println("Init: Loading Config...")

	configRead := true
	configContent, err := os.ReadFile(configPath)
	if err != nil {
		fmt.Println("ERROR: reading config file: ", err)
		configRead = false
	}

	serverConfig := config{}
	err = yaml.Unmarshal(configContent, &serverConfig)
	if err != nil {
		fmt.Println("ERROR: unmarshaling config file: ", err)
		configRead = false
	}

	if !configRead {
		fmt.Println("WARN: No config found! Using defaults.")
		serverConfig = config{PortSecure: 8443, PortInsecure: 8080, UserIdLength: 5, MaxSavedLoc: 1000, MaxSavedPic: 10, RegistrationToken: "", UnixSocketPath: "", UnixSocketChmod: 0660}
	}
	//fmt.Printf("INFO: Using config %+v\n", serverConfig)

	return serverConfig
}

func initDb(dbDir string, config config) {
	fmt.Println("Init: Loading database")
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
	fmt.Println("Init: configPath: ", configPath)
	fmt.Println("Init: dbDir: ", dbDir)
	fmt.Println("Init: webDir: ", webDir)

	// Initialisation
	config := loadConfig(configPath)
	initDb(dbDir, config)

	// Run server
	fmt.Println("FMD Server ", VERSION)
	fmt.Println("Starting Server")
	handleRequests(webDir, config)
}
