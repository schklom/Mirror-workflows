package backend

import (
	"testing"
)

func testValidateTileServerUrl(t *testing.T, input string, expectedOrigin string) {
	actualRaw, actualOrigin := validateTileServerUrl(input)

	expectedRaw := input
	if input == "" {
		expectedRaw = DEF_TILE_SERVER_URL
	}

	if actualRaw != expectedRaw {
		t.Errorf(`actualRaw=%s != expectedRaw=%s`, actualRaw, expectedRaw)
	}
	if actualOrigin != expectedOrigin {
		t.Errorf(`actualOrigin=%s != expectedOrigin=%s`, actualOrigin, expectedOrigin)
	}
}

func TestValidateTileServerUrlNotSet(t *testing.T) {
	testValidateTileServerUrl(t, "", "https://*.tile.openstreetmap.org")
}

func TestValidateTileServerUrlStandard(t *testing.T) {
	testValidateTileServerUrl(t, "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://*.tile.openstreetmap.org")
}

func TestValidateTileServerUrlWithPort(t *testing.T) {
	testValidateTileServerUrl(t, "https://{s}.tile.openstreetmap.org:443/{z}/{x}/{y}.png", "https://*.tile.openstreetmap.org:443")
}

func TestValidateTileServerUrlNoS(t *testing.T) {
	testValidateTileServerUrl(t, "https://tile.openstreetmap.org/{z}/{x}/{y}.png", "https://tile.openstreetmap.org")
}

func TestValidateTileServerUrlSubDirectory(t *testing.T) {
	testValidateTileServerUrl(t, "https://tile.openstreetmap.org/subdirectory/{z}/{x}/{y}.png", "https://tile.openstreetmap.org")
}
