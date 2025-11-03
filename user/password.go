package user

import (
	"crypto/sha512"
	"encoding/base64"
	"strings"
)

/*
 * The password is hashed first by the client: twice, with two different context strings.
 * This provides separation: One to use for encryption, the other to send to the server for authentication.
 *
 * The server hashes this "inner" password hash again to produce an outer password hash.
 * This outer hash is stored in the database.
 *
 * In a traditional web application, the client would send the plaintext password (our innerHash),
 * the server hashes it, and stores the hash (our outer hash).
 *
 * To allow a new client to recompute the innerHash, the server needs to store the innerSalt.
 */

const ContextServerSidePasswordHash = "context:serverSidePasswordHash"

const PwPrefixV2 = "pw-v2:sha-512:"

func getSaltFromArgon2EncodedHash(encodedHash string) string {
	// Argon2 encoded hashes have the form: `$argon2<T>[$v=<num>]$m=<num>,t=<num>,p=<num>$<saltBase64>$<hashBase64>`
	// See https://github.com/P-H-C/phc-winner-argon2/blob/master/src/encoding.c#L244
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 {
		return ""
	}
	return parts[4]
}

func hashPasswordForLogin(password string) string {
	input := ContextServerSidePasswordHash + password

	// Security: SHA-512 is sufficient because the "password" has already
	// been hashed client-side with Argon2. Thus the "slow" hash
	// (for brute-force protection) was already computer client-side.
	// Therefore, a normal pre-image resistant hash function is enough.
	// See https://crypto.stackexchange.com/q/119013/82783.
	hasher := sha512.New()
	hasher.Write([]byte(input))
	hashBytes := hasher.Sum(nil)

	hashStr := base64.StdEncoding.WithPadding(base64.NoPadding).EncodeToString(hashBytes)

	// Prepend version to allow for possible future migrations.
	return PwPrefixV2 + hashStr
}

// Sets the password-related field on the FMDUser.
//
// Takes the provided inner salt and inner password hash.
// Hashes the `innerPwHash` again for storage in the database.
// See the explanation at the top of this file.
//
// This function does NOT save the FMDUser to the database!
// This is the responsibility of the caller.
func (user *FMDUser) setPasswordData(saltInner string, innerPwHash string) {
	// Historically (with PBKDF2), the salt was provided explicitly.
	// With Argon2 the salt is encoded in the hash (but _could_ be passed explicitly).
	if len(saltInner) == 0 {
		saltInner = getSaltFromArgon2EncodedHash(innerPwHash)
	}

	// Hash the "password" and store the hash.
	user.HashedPassword = hashPasswordForLogin(innerPwHash)
	user.Salt = saltInner
}
