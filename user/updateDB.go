package user

import (
	"fmt"
	"strconv"
)

var CurrentVersion = 1

func (db *DBBox) updateDB(u *UserBox) {
	fmt.Println("DB: Migrating datatabase ...")
	dbquery := db.Query(DB_.Setting.Equals("version", true))
	foundSettings, _ := dbquery.Find()
	if len(foundSettings) == 0 {
		db.Put(&DB{Setting: "version", Value: "0"})
		dbquery := db.Query(DB_.Setting.Equals("version", true))
		foundSettings, _ = dbquery.Find()
	}

	versionString := foundSettings[0].Value
	versionInt, err := strconv.Atoi(versionString)
	if err != nil {
		fmt.Println("DB: Invalid DB version: ", versionString)
		return
	}

	if versionInt < 1 {
		db.migrateToV1(u)
	}
	foundSettings[0].Value = strconv.Itoa(CurrentVersion)
	db.Update(foundSettings[0])
	fmt.Println("DB: Migration finished")
}

func (db *DBBox) migrateToV1(u *UserBox) {
	fmt.Println("DB: Migrating to v1 ...")
	ids, _ := u.Query().FindIds()

	for _, id := range ids {
		user, _ := u.Get(id)
		user.Salt = "cafe"
		u.Update(user)
	}

}
