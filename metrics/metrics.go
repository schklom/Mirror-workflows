package metrics

import (
	conf "fmd-server/config"
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

// Metrics that we expose
var (
	ActiveSessions = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "fmd_active_sessions",
		Help: "Number of active sessions",
	})
	FailedLoginAccounts = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "fmd_failed_login_accounts",
		Help: "Number of accounts with recently failed logins",
	})

	Accounts = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "fmd_accounts",
		Help: "Number of registered accounts",
	})
	Locations = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "fmd_locations",
		Help: "Number of stored locations",
	})
	Pictures = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "fmd_pictures",
		Help: "Number of stored pictures",
	})

	PendingCommands = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "fmd_pending_commands",
		Help: "Number of pending commands",
	})
)

// Run the metrics server.
// This is blocking, consider calling it in a goroutine.
func HandleMetrics(config *viper.Viper) {
	addrPort := config.GetString(conf.CONF_METRICS_ADDR_PORT)

	if addrPort == "" {
		log.Warn().Msg("not listening for metrics, MetricsAddrPort is empty")
		return
	}

	mux := http.NewServeMux()
	mux.Handle("/metrics", promhttp.Handler())

	// Simple landing page
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write([]byte(`<!DOCTYPE html>
<html lang="en">
	<head><title>FMD Server Prometheus Exporter</title></head>
	<body>
		<h1>FMD Server Prometheus Exporter</h1>
		<p>Metrics are available at <a href="/metrics">/metrics</a></p>
	</body>
</html>`))
	})

	log.Info().
		Str("MetricsAddrPort", addrPort).
		Msg("listening for metrics")

	err := http.ListenAndServe(addrPort, mux)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to serve with HTTP")
	}
}
