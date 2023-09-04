package dbviewer

import (
	"bufio"
	"findmydeviceserver/user"
	"fmt"
	"os"
	"strconv"
	"strings"
)

func main() {
	var uio = user.UserIO{}
	uio.Init(".", 5, 1000, 10)
	reader := bufio.NewReader(os.Stdin)
	var run = true
	for run {
		fmt.Print("-> ")
		text, _ := reader.ReadString('\n')

		text = strings.Replace(text, "\n", "", -1)

		if strings.Compare("e", text) == 0 {
			run = false
		} else if strings.Compare("p", text) == 0 {
			users, _ := uio.UB.GetAll()
			for i := 0; i < len(users); i++ {
				fmt.Println(strconv.Itoa(i) + " - " + users[i].UID)
			}
		} else if strings.Compare("dp", text) == 0 {
			users, _ := uio.UB.GetAll()
			for i := 0; i < len(users); i++ {
				var dup = 0
				for z := 0; z < len(users); z++ {
					if users[i].HashedPassword == users[z].HashedPassword {
						dup += 1
					}
				}
				if dup > 1 {
					fmt.Println("___")
					fmt.Println(users[i].HashedPassword)
					fmt.Println("Amount of duplicates: " + strconv.Itoa(dup))
					fmt.Println("___")
				}
			}
		} else if strings.Compare("l", text) == 0 {
			/*fmt.Print("ID -> ")
			id, _ := reader.ReadString('\n')
			fmt.Print("PASSWORD -> ")
			password, _ := reader.ReadString('\n')
			user := uio.UB.GetByID(id)
			encryptedPrivKey := user.User_.PrivateKey

			print(user.User_.LocationData[len[LocationData-1]])*/

		} else {
			user := uio.UB.GetByID(text)
			if user != nil {
				fmt.Println(user.UID)
				fmt.Println("length loc: " + strconv.Itoa(len(user.LocationData)))
				fmt.Println("length pic: " + strconv.Itoa(len(user.Pictures)))
				fmt.Println("salt: " + user.Salt)
				fmt.Println("HPW: " + user.HashedPassword)
				fmt.Println("PrivKey: " + user.PrivateKey)
				fmt.Println("PushUrl: " + user.PushUrl)
			} else {
				fmt.Println("User does not exist.")
			}
		}

	}
}
