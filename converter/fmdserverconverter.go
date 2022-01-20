package main

import (
	"findmydeviceserver/user"
	"fmt"
	"strconv"
)

func main() {
	fmt.Println("FMD - ConvertingTool")
	fmt.Println("Convert a filebased DB to ObjectBoxDB")
	fmt.Println("Init OLDIO System")
	oio := user.OLDIO{}
	oio.Init(".", 5, 1000)
	fmt.Println("Registered IDs: " + strconv.Itoa(len(oio.Ids)))
	fmt.Println("Init ObjectBox DB")
	uio := user.UserIO{}
	uio.Init(5, 1000, 10)
	fmt.Println("Start convertingprocess")
	for i := 0; i < len(oio.Ids); i++ {
		fmt.Println("(" + strconv.Itoa(i) + "/" + strconv.Itoa(len(oio.Ids)) + ")")
		id := oio.Ids[i]
		uio.CreateNewUserCT(id, oio.GetPrivateKey(id), oio.GetPublicKey(id), oio.GetUserInfo(id).HashedPassword)
		uio.SetPushUrl(id, oio.GetUserInfo(id).Push)
		max, min := oio.GetLocationSize(id)
		for li := min; li <= max; li++ {
			uio.AddLocation(id, oio.GetLocation(id, li))
		}
	}
	fmt.Println("Finished!")
}
