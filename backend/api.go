package backend

import (
	"embed"
	conf "fmd-server/config"
	"fmd-server/constants"
	frontend "fmd-server/web"
	"fmt"
	"io/fs"
	"net/http"

	"github.com/spf13/viper"
)

const HEADER_CONTENT_TYPE = "Content-Type"
const CT_APPLICATION_JSON = "application/json"

const ERR_JSON_INVALID = "Invalid JSON"

//go:embed swagger-ui
var swaggerUiFs embed.FS

//go:embed openapi-v2.yaml
var openApiSpec []byte

var remoteIpHeaderName string = ""

func getRemoteIp(r *http.Request) string {
	remoteIp := r.Header.Get(remoteIpHeaderName)
	if remoteIp == "" {
		remoteIp = r.RemoteAddr
	}
	return remoteIp
}

// Adds various security headers.
// Check your deployment with https://securityheaders.com.
func securityHeadersMiddleware(next http.Handler, tileServerOrigin string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Xss-Protection", "1; mode=block")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: "+tileServerOrigin+"; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=()")

		// OpenStreetMap requires Referrer headers to be sent:
		// https://operations.osmfoundation.org/policies/tiles/
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		next.ServeHTTP(w, r)
	})
}

func withSwaggerCsp(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// The bundled Swagger UI uses inline scripts
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: ; frame-ancestors 'none'; upgrade-insecure-requests")
		next.ServeHTTP(w, r)
	})
}

func getVersion(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, constants.VERSION)
}

func buildServeMux(config *viper.Viper) http.Handler {
	// Workaround: cache value in global field to avoid needing to pass down the config into the API code
	remoteIpHeaderName = config.GetString(conf.CONF_REMOTE_IP_HEADER)

	tileServerUrl, tileServerOrigin := conf.ValidateTileServerUrl(config.GetString(conf.CONF_TILE_SERVER_URL))
	tileServerUrlHandler := tileServerUrlHandler{tileServerUrl}

	mainDeviceHandler := mainDeviceHandler{createDeviceHandler{config.GetString(conf.CONF_REGISTRATION_TOKEN)}}

	apiV1Mux := http.NewServeMux()
	apiV1Mux.HandleFunc("/command", mainCommand)
	apiV1Mux.HandleFunc("/command/", mainCommand)
	apiV1Mux.HandleFunc("/location", mainLocation)
	apiV1Mux.HandleFunc("/location/", mainLocation)
	apiV1Mux.HandleFunc("/locations", getAllLocations)
	apiV1Mux.HandleFunc("/locations/", getAllLocations)
	apiV1Mux.HandleFunc("/locations/delete", deleteAllLocations)
	apiV1Mux.HandleFunc("/locations/delete/", deleteAllLocations)
	apiV1Mux.HandleFunc("/locationDataSize", getLocationDataSize)
	apiV1Mux.HandleFunc("/locationDataSize/", getLocationDataSize)
	apiV1Mux.HandleFunc("/picture", mainPicture)
	apiV1Mux.HandleFunc("/picture/", mainPicture)
	apiV1Mux.HandleFunc("/pictures", getAllPictures)
	apiV1Mux.HandleFunc("/pictures/", getAllPictures)
	apiV1Mux.HandleFunc("/pictures/delete", deleteAllPictures)
	apiV1Mux.HandleFunc("/pictures/delete/", deleteAllPictures)
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
	apiV1Mux.Handle("/tileServerUrl", tileServerUrlHandler)
	apiV1Mux.Handle("/tileServerUrl/", tileServerUrlHandler)
	apiV1Mux.HandleFunc("/version", getVersion)
	apiV1Mux.HandleFunc("/version/", getVersion)

	apiV2Mux := buildApiV2Mux(config)

	// Uncomment this once the API v1 is no longer hosted at the root "/" (because we cannot have two "/" in muxFinal).
	// Until then, as a side-effect, the static files are also served under /api/v1/.
	// staticFilesMux := http.NewServeMux()
	// staticFilesMux.Handle("/", http.FileServer(http.FS(frontend.WebDir())))
	// Handling --web-dir parameter/config
	if config.GetString(conf.CONF_WEB_DIR) == "" {
		apiV1Mux.Handle("/", frontend.FileServerWithFallback(frontend.WebDir()))
	} else {
		apiV1Mux.Handle("/", http.FileServer(http.Dir(config.GetString(conf.CONF_WEB_DIR))))
	}

	mux := http.NewServeMux()
	// mux.Handle("/", staticFilesMux)
	mux.Handle("/", apiV1Mux) // deprecated
	mux.Handle("/api/v1/", http.StripPrefix("/api/v1", apiV1Mux))
	mux.Handle("/api/v2/", http.StripPrefix("/api/v2", apiV2Mux))

	// Also serve the version in the root path
	mux.HandleFunc("/version", getVersion)
	mux.HandleFunc("/version/", getVersion)

	// Swagger YAML and UI
	// XXX: Swagger forces this to be at the root (instead of /api/v2/... )
	mux.HandleFunc("GET /openapi.yaml", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/yaml")
		w.Write(openApiSpec)
	})
	sub, _ := fs.Sub(swaggerUiFs, "swagger-ui")
	mux.Handle("/swagger-ui/", withSwaggerCsp(http.StripPrefix("/swagger-ui/", http.FileServer(http.FS(sub)))))

	// Apply to all endpoints
	handler := securityHeadersMiddleware(mux, tileServerOrigin)
	handler = http.MaxBytesHandler(handler, 15<<20) // 15 MB because 2^20 is a MB

	return handler
}
