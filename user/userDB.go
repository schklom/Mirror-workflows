package user

import (
	"github.com/objectbox/objectbox-go/objectbox"
)

//go:generate go run github.com/objectbox/objectbox-go/cmd/objectbox-gogen

type User struct {
	Id             uint64
	UID            string `objectbox:"unique"`
	HashedPassword string
	PrivateKey     string
	PublicKey      string
	CommandToUser  string
	PushUrl        string
	LocationData   []string
	Pictures       []string
}

func initDB(path string) *UserBox {
	ob, _ := objectbox.NewBuilder().Model(ObjectBoxModel()).Directory(path).Build()

	u := BoxForUser(ob)

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
