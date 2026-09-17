package user

import (
	"fmd-server/constants"
	"fmt"
	"reflect"
	"strings"
	"testing"

	"gorm.io/gorm"
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

	username, err := repo.CreateNewUser(constants.CryptoProtoV2, "encKey", "", "", "", pwHash, alice)
	if err != nil {
		t.Fatal(err)
	}
	if username != alice {
		t.Errorf("got username %s != %s", username, alice)
	}
}

func TestLogin(t *testing.T) {
	repo := NewUserRepository(t.TempDir(), 5, 5)
	repo.CreateNewUser(constants.CryptoProtoV2, "encKey", "", "", "", pwHash, alice)

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
	repo.CreateNewUser(constants.CryptoProtoV2, "encKey", "", "", "", pwHash, alice)

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
	repo.CreateNewUser(constants.CryptoProtoV2, "encKey", "", "", "", pwHash, alice)

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
	repo.CreateNewUser(constants.CryptoProtoV2, "encKey", "", "", "", pwHash, alice)

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
	repo.CreateNewUser(constants.CryptoProtoV2, "encKey", "", "", "", pwHash, alice)

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

/* ------- APIv2 Encrypted Data ------- */

func TestAddGetDeleteData(t *testing.T) {
	repo := NewUserRepository(t.TempDir(), 5, 5)
	repo.CreateNewUser(constants.CryptoProtoV2, "encKey", "", "", "", pwHash, alice)
	u, _, _ := repo.RequestAccess(alice, pwHash, 3600, "10.0.0.10")

	itemA := EncryptedItemDtoV2{"dead", 10, "bm90IGEgcmVhbCBjaXBoZXJ0ZXh0"}
	itemB := EncryptedItemDtoV2{"beef", 10, "bm90IGEgcmVhbCBjaXBoZXJ0ZXh0"}
	items := []EncryptedItemDtoV2{itemA, itemB}

	typ := "location"

	err := repo.AddDataV2(u, typ, items)
	if err != nil {
		t.Errorf("unexpected error: %s", err)
	}

	returnItems, _ := repo.GetAllDataV2(u, typ)
	if !reflect.DeepEqual(returnItems, items) {
		t.Errorf("arrays are not equal:\n   %+v\n!= %+v", returnItems, items)
	}

	err = repo.DeleteSingleDatumV2(u, typ, itemA.ClientItemIdHex)
	if err != nil {
		t.Errorf("unexpected error: %s", err)
	}

	err = repo.DeleteSingleDatumV2(u, typ, itemA.ClientItemIdHex)
	if err != gorm.ErrRecordNotFound {
		t.Errorf("unexpected error: %s", err)
	}

	itemsAfterDeletion := []EncryptedItemDtoV2{itemB}
	returnItems, _ = repo.GetAllDataV2(u, typ)
	if !reflect.DeepEqual(returnItems, itemsAfterDeletion) {
		t.Errorf("arrays are not equal:\n   %+v\n!= %+v", returnItems, itemsAfterDeletion)
	}

	err = repo.DeleteAllDataV2(u, typ)
	if err != nil {
		t.Errorf("unexpected error: %s", err)
	}

	returnItems, _ = repo.GetAllDataV2(u, typ)
	if len(returnItems) != 0 {
		t.Errorf("returned items are not empty, len=%d", len(returnItems))
	}
}

func TestClientItemIdMustBeHex(t *testing.T) {
	repo := NewUserRepository(t.TempDir(), 5, 5)
	repo.CreateNewUser(constants.CryptoProtoV2, "encKey", "", "", "", pwHash, alice)
	u, _, _ := repo.RequestAccess(alice, pwHash, 3600, "10.0.0.10")

	itemA := EncryptedItemDtoV2{"nothex", 10, "bm90IGEgcmVhbCBjaXBoZXJ0ZXh0"}
	items := []EncryptedItemDtoV2{itemA}

	err := repo.AddDataV2(u, "location", items)
	if !strings.Contains(fmt.Sprint(err), "encoding/hex: invalid byte") {
		t.Errorf("unexpected error: %s", err)
	}
}

func TestCannotAddDuplicateClientItemId(t *testing.T) {
	repo := NewUserRepository(t.TempDir(), 5, 5)
	repo.CreateNewUser(constants.CryptoProtoV2, "encKey", "", "", "", pwHash, alice)
	u, _, _ := repo.RequestAccess(alice, pwHash, 3600, "10.0.0.10")

	itemA := EncryptedItemDtoV2{"deadbeef", 10, "bm90IGEgcmVhbCBjaXBoZXJ0ZXh0"}
	items := []EncryptedItemDtoV2{itemA, itemA}

	err := repo.AddDataV2(u, "location", items)
	if !strings.Contains(fmt.Sprint(err), "UNIQUE constraint failed") {
		t.Errorf("unexpected error: %s", err)
	}
}

/* ------- Server Messages ------- */

func TestAddGetDeleteMessages(t *testing.T) {
	repo := NewUserRepository(t.TempDir(), 5, 5)
	repo.CreateNewUser(constants.CryptoProtoV2, "encKey", "", "", "", pwHash, alice)
	u, _, _ := repo.RequestAccess(alice, pwHash, 3600, "10.0.0.10")

	messages, err := repo.GetMessages(u)
	if len(messages) != 0 || err != nil {
		t.Errorf("messages is not empty: %d OR err: %s", len(messages), err)
	}

	repo.AddMessage(u, CODE_ACCOUNT_LOCKED, "")
	repo.AddMessage(u, CODE_OTHER, "hello world")

	messages, _ = repo.GetMessages(u)
	if len(messages) != 2 {
		t.Errorf("wrong len(messages) %d != %d", len(messages), 2)
	}

	repo.DeleteSingleMessage(u, messages[0].Uuid)
	repo.DeleteSingleMessage(u, messages[1].Uuid)

	err = repo.DeleteSingleMessage(u, messages[0].Uuid)
	if err != gorm.ErrRecordNotFound {
		t.Errorf("unexpected error: %s", err)
	}

	messages, err = repo.GetMessages(u)
	if len(messages) != 0 || err != nil {
		t.Errorf("messages is not empty: %d OR err: %s", len(messages), err)
	}
}
