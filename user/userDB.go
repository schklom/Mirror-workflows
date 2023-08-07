package user

import (
	"github.com/objectbox/objectbox-go/objectbox"
)

//go:generate go run github.com/objectbox/objectbox-go/cmd/objectbox-gogen

type User struct {
	Id             uint64
	UID            string `objectbox:"unique"`
	Salt           string // may be empty. In Argon2 the HashedPassword contains the salt.
	HashedPassword string
	PrivateKey     string
	PublicKey      string
	CommandToUser  string
	PushUrl        string
	LocationData   []string // elements must be string-encoded JSON structures
	Pictures       []string // elements are base64 encoded encrypted images
}

type DB struct {
	Id      uint64
	Setting string `objectbox:"unique"`
	Value   string
}

func initDB(path string) *UserBox {
	ob, _ := objectbox.NewBuilder().MaxSizeInKb(10 * 1048576).Model(ObjectBoxModel()).Directory(path).Build()

	u := BoxForUser(ob)
	dbc := BoxForDB(ob)
	dbc.updateDB(u)

	return u
}

func (u *UserBox) GetByID(id string) *User {
	uQuery := u.Query(User_.UID.Equals(id, true))
	foundUser, _ := uQuery.Find()
	if len(foundUser) == 0 {
		return nil
	}
	return foundUser[0]
}
