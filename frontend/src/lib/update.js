// Update check — compares the installed version (__APP_VERSION__) against
// the latest release tag on GitLab and optionally downloads + installs the APK.
//
// The GitLab releases API is public for this project, so no token is needed.
// On Android (Capacitor), the APK asset is downloaded to the cache directory
// and handed to the system installer via a content:// URI.

import { MOBILE } from './mobile.js'

const GITLAB_PROJECT_ID = 'DuarteSantos8%2Fopengym'
const RELEASES_URL = `https://gitlab.com/api/v4/projects/${GITLAB_PROJECT_ID}/releases`

/**
 * Compares two semver strings (e.g. "1.2.11" vs "1.3.0").
 * Returns  1 if a > b, -1 if a < b, 0 if equal.
 */
function compareSemver(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff > 0) return 1
    if (diff < 0) return -1
  }
  return 0
}

/**
 * Checks the GitLab releases API for a newer version.
 * Returns { hasUpdate, latestVersion, apkUrl } or throws on network failure.
 *   - hasUpdate: true if the latest release tag is newer than the running build
 *   - latestVersion: the semver string of the latest release (without "v" prefix)
 *   - apkUrl: direct download URL of the first .apk asset, or null
 */
export async function checkForUpdate() {
  const res = await fetch(RELEASES_URL + '?per_page=1')
  if (!res.ok) throw new Error(`GitLab API ${res.status}`)
  const releases = await res.json()
  if (!releases.length) return { hasUpdate: false, latestVersion: __APP_VERSION__, apkUrl: null }

  const latest = releases[0]
  const latestVersion = latest.tag_name.replace(/^v/, '')
  const hasUpdate = compareSemver(latestVersion, __APP_VERSION__) > 0

  // Find the APK asset among the release links (generic package links) or assets.sources
  let apkUrl = null
  if (latest.assets?.links?.length) {
    const apkLink = latest.assets.links.find(l => /\.apk$/i.test(l.url) || /\.apk$/i.test(l.direct_asset_url))
    if (apkLink) apkUrl = apkLink.direct_asset_url || apkLink.url
  }

  return { hasUpdate, latestVersion, apkUrl }
}

/**
 * Downloads the APK from `url` and triggers the Android installer.
 * Only works on the MOBILE (Capacitor) build with Android.
 */
export async function downloadAndInstall(url) {
  if (!MOBILE) {
    // On web, just open the release page
    window.open('https://gitlab.com/DuarteSantos8/opengym/-/releases', '_blank', 'noopener')
    return
  }

  const { Filesystem, Directory } = await import('@capacitor/filesystem')

  // Download the file as a blob, then write to cache as base64
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const blob = await res.blob()

  // Convert blob to base64
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

  const fileName = 'opengym-update.apk'
  const written = await Filesystem.writeFile({
    path: fileName,
    directory: Directory.Cache,
    data: base64,
  })

  // Use the Capacitor App plugin or an intent to open the APK for installation.
  // FileOpener is not bundled, so we use the @capacitor/filesystem URI with an intent.
  // The approach: open the file URI which triggers the Android package installer.
  const { App: CapApp } = await import('@capacitor/app')
  // Capacitor's Filesystem.getUri gives us the content URI needed for install
  const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache })

  // On Android, we need to trigger an install intent. Since we don't have a dedicated
  // plugin, we open the URI which — on Android with the right content type — prompts install.
  // Use the native intent via a custom URL scheme or window.open as fallback.
  try {
    // Try using the Capacitor App plugin to open the URI
    // This works if the device has a handler for APK content URIs
    window.open(uri, '_system')
  } catch (e) {
    // Fallback: just inform the user where the file is
    throw new Error('APK downloaded but could not start installer. Check your Downloads folder.')
  }
}
