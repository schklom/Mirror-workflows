package backend

import (
	conf "fmd-server/config"
	frontend "fmd-server/web"
	"fmt"
	"net/http"

	"github.com/spf13/viper"
)

var remoteIpHeaderName string = ""

func getRemoteIp(r *http.Request) string {
	remoteIp := r.Header.Get(remoteIpHeaderName)
	if remoteIp == "" {
		remoteIp = r.RemoteAddr
	}
	return remoteIp
}

// Create content for config.js from config
func createConfigJs(tileServerUrl string) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		const content = `
		/* js config from config.yml (or env-var or ...) */
		const tileServerUrl = "%s";
		`
		w.Header().Set(HEADER_CONTENT_TYPE, CT_TEXT_JAVASCRIPT)
		w.Write([]byte(fmt.Sprintf(content, tileServerUrl)))
	})
}

// Adds various security headers.
// Check your deployment with https://securityheaders.com.
func securityHeadersMiddleware(next http.Handler, tileServerOrigin string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Xss-Protection", "1; mode=block")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: "+tileServerOrigin+"; connect-src 'self' https://cloudflareinsights.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=()")
		w.Header().Set("Referrer-Policy", "same-origin")

		next.ServeHTTP(w, r)
	})
}

func buildServeMux(config *viper.Viper) http.Handler {
	// Workaround: cache value in global field to avoid needing to pass down the config into the API code
	remoteIpHeaderName = config.GetString(conf.CONF_REMOTE_IP_HEADER)

	tileServerUrl, tileServerOrigin := conf.ValidateTileServerUrl(config.GetString(conf.CONF_TILE_SERVER_URL))

	mainDeviceHandler := mainDeviceHandler{createDeviceHandler{config.GetString(conf.CONF_REGISTRATION_TOKEN)}}

	apiV1Mux := http.NewServeMux()
	apiV1Mux.HandleFunc("/command", mainCommand)
	apiV1Mux.HandleFunc("/command/", mainCommand)
	//Disabled Feature: CommandLogs
	//apiV1Mux.HandleFunc("/commandLogs", getCommandLog)
	//apiV1Mux.HandleFunc("/commandLogs/", getCommandLog)
	apiV1Mux.HandleFunc("/location", mainLocation)
	apiV1Mux.HandleFunc("/location/", mainLocation)
	apiV1Mux.HandleFunc("/locations", getAllLocations)
	apiV1Mux.HandleFunc("/locations/", getAllLocations)
	apiV1Mux.HandleFunc("/locationDataSize", getLocationDataSize)
	apiV1Mux.HandleFunc("/locationDataSize/", getLocationDataSize)
	apiV1Mux.HandleFunc("/picture", mainPicture)
	apiV1Mux.HandleFunc("/picture/", mainPicture)
	apiV1Mux.HandleFunc("/pictures", getAllPictures)
	apiV1Mux.HandleFunc("/pictures/", getAllPictures)
	apiV1Mux.HandleFunc("/pictureSize", getPictureSize)
	apiV1Mux.HandleFunc("/pictureSize/", getPictureSize)
	apiV1Mux.HandleFunc("/key", getPrivKey)
	apiV1Mux.HandleFunc("/key/", getPrivKey)
	apiV1Mux.HandleFunc("/pubKey", getPubKey)
	apiV1Mux.HandleFunc("/pubKey/", getPubKey)
	apiV1Mux.Handle("/device", mainDeviceHandler)
	apiV1Mux.Handle("/device/", mainDeviceHandler)
	apiV1Mux.HandleFunc("/password", postPassword)
	apiV1Mux.HandleFunc("/password/", postPassword)
	apiV1Mux.HandleFunc("/push", mainPushUrl)
	apiV1Mux.HandleFunc("/push/", mainPushUrl)
	apiV1Mux.HandleFunc("/salt", requestSalt)
	apiV1Mux.HandleFunc("/salt/", requestSalt)
	apiV1Mux.HandleFunc("/requestAccess", requestAccess)
	apiV1Mux.HandleFunc("/requestAccess/", requestAccess)
	apiV1Mux.HandleFunc("/version", getVersion)
	apiV1Mux.HandleFunc("/version/", getVersion)

	// Uncomment this once the API v1 is no longer hosted at the root "/" (because we cannot have two "/" in muxFinal).
	// Until then, as a side-effect, the static files are also served under /api/v1/.
	// staticFilesMux := http.NewServeMux()
	// staticFilesMux.Handle("/", http.FileServer(http.FS(frontend.WebDir())))
	// Handling --web-dir parameter/config
	if config.GetString(conf.CONF_WEB_DIR) == "" {
		apiV1Mux.Handle("/", http.FileServer(http.FS(frontend.WebDir())))
	} else {
		apiV1Mux.Handle("/", http.FileServer(http.Dir(config.GetString(conf.CONF_WEB_DIR))))
	}

	apiMux := http.NewServeMux()
	// muxFinal.Handle("/", staticFilesMux)
	apiMux.Handle("/", apiV1Mux) // deprecated
	apiMux.Handle("/api/v1/", http.StripPrefix("/api/v1", apiV1Mux))
	apiMux.Handle("/config.js", createConfigJs(tileServerUrl))

	// Apply to all endpoints
	handler := securityHeadersMiddleware(apiMux, tileServerOrigin)
	handler = http.MaxBytesHandler(handler, 15<<20) // 15 MB because 2^20 is a MB

	return handler
}
