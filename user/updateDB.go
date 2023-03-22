package user

import "fmt"

var CurrentVersion = 1

func (db *DBBox) updateDB(u *UserBox) {
	dbquery := db.Query(DB_.Setting.Equals("version", true))
	foundSettings, _ := dbquery.Find()
	if len(foundSettings) == 0 {
		db.Put(&DB{Setting: "version", Value: "0"})
		dbquery := db.Query(DB_.Setting.Equals("version", true))
		foundSettings, _ = dbquery.Find()
	}
	if foundSettings[0].Value == "0" {
		fmt.Println("DB: Updating DB ...")

		ids, _ := u.Query().FindIds()

		for _, id := range ids {
			user, _ := u.Get(id)
			user.Salt = "cafe"
			u.Update(user)
		}

		fmt.Println("DB: Update finished")
		foundSettings[0].Value = "1"
		db.Update(foundSettings[0])
	}
}
