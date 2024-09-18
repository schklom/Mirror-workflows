package user

import (
	"fmt"
	"strconv"
)

var CurrentVersion = 2

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
	fmt.Println("DB: DB version: ", versionString)

	if versionInt < 1 {
		db.migrateToV1(u)
	}
	if versionInt < 2 {
		db.migrateToV2(u)
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

func (db *DBBox) migrateToV2(u *UserBox) {
	fmt.Println("DB: Migrating to v2 ...")
	ids, _ := u.Query().FindIds()

	// Remove dummy salts
	for _, id := range ids {
		user, _ := u.Get(id)
		if user.Salt == "cafe" {
			user.Salt = ""
		}
		u.Update(user)
	}
}

func migrateObjectboxToSQL(u *UserBox, newDB *FMDDB) {
	fmt.Println("DB: Migrating to v3 ...")
	ids, _ := u.Query().FindIds()

	// Migrate to SQL Database

	for i, id := range ids {
		fmt.Println("Migrating " + fmt.Sprint(i) + "/" + fmt.Sprint(len(ids)-1))
		user, _ := u.Get(id)
		newUser := FMDUser{UID: user.UID, Salt: user.Salt, HashedPassword: user.HashedPassword,
			PrivateKey: user.PrivateKey, PublicKey: user.PublicKey, CommandToUser: user.CommandToUser, PushUrl: user.PushUrl}
		for _, location := range user.LocationData {
			newLoc := Location{Position: location}
			newUser.Locations = append(newUser.Locations, newLoc)
		}
		for _, picture := range user.Pictures {
			newPic := Picture{Content: picture}
			newUser.Pictures = append(newUser.Pictures, newPic)
		}
		newDB.Create(&newUser)
	}
	newDB.Create(&DBSetting{Setting: "version", Value: "3"})
}
