package user

import (
	"strings"
	"testing"
)

func TestEmptyUsername(t *testing.T) {
	if IsUsernameValid("") {
		t.Errorf("Empty username should NOT be valid")
	}
}

func TestShortUsername(t *testing.T) {
	if !IsUsernameValid("abc") {
		t.Errorf("Short username should be valid")
	}
}

func TestNormalUsername(t *testing.T) {
	if !IsUsernameValid("Pi-xel_10") {
		t.Errorf("Normal username should be valid")
	}
}

func TestTooLongUsername(t *testing.T) {
	if IsUsernameValid(strings.Repeat("A", 65)) {
		t.Errorf("Too long username should NOT be valid")
	}
}

func TestInvalidCharsUsername(t *testing.T) {
	if IsUsernameValid("fmd.fo ss?#!@") {
		t.Errorf("Invalid chars username should NOT be valid")
	}
}
