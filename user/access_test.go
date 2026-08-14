package user

import (
	"testing"
)

func TestGenerateToken(t *testing.T) {
	token := generateToken(32)

	if len(token) != 64 {
		t.Errorf(`bad token length: %d != 64`, len(token))
	}
}
