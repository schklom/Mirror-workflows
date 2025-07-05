package user

import (
	"strings"
)

func getSaltFromArgon2EncodedHash(encodedHash string) string {
	// Argon2 encoded hashes have the form: `$argon2<T>[$v=<num>]$m=<num>,t=<num>,p=<num>$<saltBase64>$<hashBase64>`
	// See https://github.com/P-H-C/phc-winner-argon2/blob/master/src/encoding.c#L244
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 {
		return ""
	}
	return parts[4]
}
