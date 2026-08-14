package user

import (
	"strings"
	"testing"
)

/* ------- IsUsernameValid ------- */

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

/* ------- Account management ------- */

const pwHash = "$argon2id$v=19$m=131072,t=1,p=4$y5ZDQVAOsGClahi4m4M8rw$Wz27J/wlJDl4vv8+Ulimd34hjhWaSkXvkzwbF42CtmY"
const pwHashNew = "$argon2id$v=19$m=131072,t=1,p=4$b3HqrdAiogBK1xlAMYoZGg$jpZWNJsMc8zjfHUhXy2EnLmFeGLWVBNaSAvA20tMOYc"
const alice = "alice"

func TestCreateAccount(t *testing.T) {
	repo := NewUserRepository(t.TempDir(), 5, 5)

	username, err := repo.CreateNewUser("", "", "", pwHash, alice)
	if err != nil {
		t.Fatal(err)
	}
	if username != alice {
		t.Errorf("got username %s != %s", username, alice)
	}
}

func TestLogin(t *testing.T) {
	repo := NewUserRepository(t.TempDir(), 5, 5)
	repo.CreateNewUser("", "", "", pwHash, alice)

	u, token, err := repo.RequestAccess(alice, pwHash, 3600, "10.0.0.10")
	if err != nil {
		t.Fatal(err)
	}
	if u.Username != alice {
		t.Errorf("got username %s != %s", u.Username, alice)
	}
	if token.Username != alice {
		t.Errorf("got token for username %s != %s", token.Username, alice)
	}
	if len(token.Token) != 64 {
		t.Errorf("bad token length %d != %d", len(token.Token), 64)
	}
}

func TestAccountLocks(t *testing.T) {
	repo := NewUserRepository(t.TempDir(), 5, 5)
	repo.CreateNewUser("", "", "", pwHash, alice)

	for range MAX_ALLOWED_ATTEMPTS {
		_, _, err := repo.RequestAccess(alice, "not the password", 3600, "10.0.0.10")
		if err != ErrWrongPassword {
			t.Errorf("got wrong error: %s != ErrWrongPassword", err)
		}
	}

	_, _, err := repo.RequestAccess(alice, "not the password", 3600, "10.0.0.10")
	if err != ErrAccountLocked {
		t.Errorf("got wrong error: %s != ErrAccountLocked", err)
	}
}

func TestUpdatePassword(t *testing.T) {
	repo := NewUserRepository(t.TempDir(), 5, 5)
	repo.CreateNewUser("", "", "", pwHash, alice)

	u, _, err := repo.RequestAccess(alice, pwHash, 3600, "10.0.0.10")
	if err != nil {
		t.Errorf("unexpected error: %s", err)
	}

	repo.UpdateUserPassword(u, "", "", pwHashNew)

	_, _, err = repo.RequestAccess(alice, pwHash, 3600, "10.0.0.10")
	if err != ErrWrongPassword {
		t.Errorf("got wrong error: %s != ErrWrongPassword", err)
	}

	_, _, err = repo.RequestAccess(alice, pwHashNew, 3600, "10.0.0.10")
	if err != nil {
		t.Errorf("unexpected error: %s", err)
	}
}

func TestPushUrl(t *testing.T) {
	repo := NewUserRepository(t.TempDir(), 5, 5)
	repo.CreateNewUser("", "", "", pwHash, alice)

	url := "http://push.server.invalid/topic"
	u, _, _ := repo.RequestAccess(alice, pwHash, 3600, "10.0.0.10")
	repo.SetPushUrl(u, url)

	// Separate session in order to get a separate user object
	u, _, _ = repo.RequestAccess(alice, pwHash, 3600, "10.0.0.10")
	actual := repo.GetPushUrl(u)
	if actual != url {
		t.Errorf("got wrong push url: %s != %s", actual, url)
	}
}

func TestAccountDelete(t *testing.T) {
	repo := NewUserRepository(t.TempDir(), 5, 5)
	repo.CreateNewUser("", "", "", pwHash, alice)

	u, _, err := repo.RequestAccess(alice, pwHash, 3600, "10.0.0.10")
	if err != nil {
		t.Errorf("unexpected error: %s", err)
	}

	err = repo.DeleteUser(u)
	if err != nil {
		t.Errorf("unexpected error: %s", err)
	}

	_, _, err = repo.RequestAccess(alice, pwHash, 3600, "10.0.0.10")
	if err != ErrNotFound {
		t.Errorf("got wrong error: %s != ErrNotFound", err)
	}
}
