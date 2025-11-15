package user

import (
	"fmd-server/metrics"
	"fmt"
	"strings"
)

// This cannot be in the metrics package because it needs the DB code, and would have circular imports.

const LABEL_PUSH_CONVERSATIONS = "conversations"
const LABEL_PUSH_FCM = "fcm"
const LABEL_PUSH_MOZILLA = "mozilla"
const LABEL_PUSH_NEXTCLOUD = "nextcloud"
const LABEL_PUSH_NTFYSH = "ntfysh"
const LABEL_PUSH_OTHER = "other"

const PUSH_URL_CONVERSATIONS = "https://up.conversations.im/push/"
const PUSH_URL_FCM = "https://fcm.distributor.unifiedpush.org/"
const PUSH_URL_MOZILLA = "https://updates.push.services.mozilla.com/wpush/"
const PUSH_URL_NEXTCLOUD = "/index.php/apps/uppush/" // sic
const PUSH_URL_NTFY_SH = "https://ntfy.sh/"

func InitializePushServerMetrics(db *FMDDB) {
	// Conversations
	var conversationsCount int64
	db.DB.Model(&FMDUser{}).Where(fmt.Sprintf("push_url LIKE '%s%%'", PUSH_URL_CONVERSATIONS)).Count(&conversationsCount)
	metrics.PushServers.WithLabelValues(LABEL_PUSH_CONVERSATIONS).Set(float64(conversationsCount))

	// FCM
	var fcmCount int64
	db.DB.Model(&FMDUser{}).Where(fmt.Sprintf("push_url LIKE '%s%%'", PUSH_URL_FCM)).Count(&fcmCount)
	metrics.PushServers.WithLabelValues(LABEL_PUSH_FCM).Set(float64(fcmCount))

	// Mozilla
	var mozillaCount int64
	db.DB.Model(&FMDUser{}).Where(fmt.Sprintf("push_url LIKE '%s%%'", PUSH_URL_MOZILLA)).Count(&mozillaCount)
	metrics.PushServers.WithLabelValues(LABEL_PUSH_MOZILLA).Set(float64(mozillaCount))

	// Nextcloud
	var nextcloudCount int64
	db.DB.Model(&FMDUser{}).Where(fmt.Sprintf("push_url LIKE '%%%s%%'", PUSH_URL_NEXTCLOUD)).Count(&nextcloudCount) // sic
	metrics.PushServers.WithLabelValues(LABEL_PUSH_NEXTCLOUD).Set(float64(nextcloudCount))

	// ntfy.sh
	var ntfyShCount int64
	db.DB.Model(&FMDUser{}).Where(fmt.Sprintf("push_url LIKE '%s%%'", PUSH_URL_NTFY_SH)).Count(&ntfyShCount)
	metrics.PushServers.WithLabelValues(LABEL_PUSH_NTFYSH).Set(float64(ntfyShCount))

	// Total
	// Note that we don't set the total count as a metric. This is discouraged by Prometheus.
	var totalCount int64
	db.DB.Model(&FMDUser{}).Where("push_url IS NOT NULL AND push_URL <> ''").Count(&totalCount)

	// Other
	otherCount := totalCount - conversationsCount - fcmCount - mozillaCount - nextcloudCount - ntfyShCount
	metrics.PushServers.WithLabelValues(LABEL_PUSH_OTHER).Set(float64(otherCount))
}

func UpdatePushServerMetrics(old string, new string) {
	if old != "" {
		label := getLabelForUrl(old)
		metrics.PushServers.WithLabelValues(label).Dec()
	}

	if new != "" {
		label := getLabelForUrl(new)
		metrics.PushServers.WithLabelValues(label).Inc()
	}
}

func getLabelForUrl(url string) string {
	if url == "" {
		panic("url must be non-empty")
	}

	if strings.HasPrefix(url, PUSH_URL_CONVERSATIONS) {
		return LABEL_PUSH_CONVERSATIONS
	} else if strings.HasPrefix(url, PUSH_URL_FCM) {
		return LABEL_PUSH_FCM
	} else if strings.HasPrefix(url, PUSH_URL_MOZILLA) {
		return LABEL_PUSH_MOZILLA
	} else if strings.Contains(url, PUSH_URL_NEXTCLOUD) { // sic
		return LABEL_PUSH_NEXTCLOUD
	} else if strings.HasPrefix(url, PUSH_URL_NTFY_SH) {
		return LABEL_PUSH_NTFYSH
	} else {
		return LABEL_PUSH_OTHER
	}
}
