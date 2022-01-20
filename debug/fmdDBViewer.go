package main

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
	uio.Init(5, 1000, 10)
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
		} else {
			user := uio.UB.GetByID(text)
			if user != nil {
				fmt.Println(user.UID)
				fmt.Println("length loc: " + strconv.Itoa(len(user.LocationData)))
				fmt.Println("length pic: " + strconv.Itoa(len(user.Pictures)))
			} else {
				fmt.Println("User does not exist.")
			}
		}

	}
}
