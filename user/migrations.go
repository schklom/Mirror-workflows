package user

import (
	"fmt"
	"strconv"
)

const CurrentObjectBoxVersion = 2
const CurrentSqlVersion = 1

func (db *DBBox) MigrateObjectbox(u *UserBox) {
	fmt.Println("DB: Migrating objextbox ...")
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
	foundSettings[0].Value = strconv.Itoa(CurrentObjectBoxVersion)
	db.Update(foundSettings[0])
	fmt.Println("DB: Migrating Objectbox finished")
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

func migrateObjectboxToSQL(box *UserBox, sql *FMDDB) {
	fmt.Println("DB: Migrating Objectbox to SQL ...")
	ids, _ := box.Query().FindIds()

	for i, id := range ids {
		fmt.Printf("Migrating user %d/%d\n", i, len(ids)-1)
		oldUser, _ := box.Get(id)
		newUser := FMDUser{
			UID:            oldUser.UID,
			Salt:           oldUser.Salt,
			HashedPassword: oldUser.HashedPassword,
			PrivateKey:     oldUser.PrivateKey,
			PublicKey:      oldUser.PublicKey,
			CommandToUser:  oldUser.CommandToUser,
			PushUrl:        oldUser.PushUrl,
		}

		for _, location := range oldUser.LocationData {
			newLoc := Location{Position: location}
			newUser.Locations = append(newUser.Locations, newLoc)
		}

		for _, picture := range oldUser.Pictures {
			newPic := Picture{Content: picture}
			newUser.Pictures = append(newUser.Pictures, newPic)
		}
		sql.Create(&newUser)
	}
	sql.Create(&DBSetting{Setting: "version", Value: fmt.Sprint(CurrentSqlVersion)})
}
