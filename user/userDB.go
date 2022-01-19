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

var uQuery *UserQuery

func initDB() *UserBox {
	ob, _ := objectbox.NewBuilder().Model(ObjectBoxModel()).Build()

	u := BoxForUser(ob)
	uQuery = u.Query(User_.UID.Equals("", true))

	return u
}

func (u *UserBox) GetByID(id string) *User {
	uQuery.SetStringParams(User_.UID, id)
	foundUser, _ := uQuery.Find()
	if len(foundUser) == 0 {
		return nil
	}
	return foundUser[0]
}
