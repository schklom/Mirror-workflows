package utils

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
)

func RsaEncrypt(ciphertext string, publicKey string) string {
	cipherbytes := []byte(ciphertext)
	pubKey := []byte(publicKey)
	block, _ := pem.Decode(pubKey)
	if block == nil {
		return ""
	}
	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return ""
	}
	res, err := rsa.EncryptPKCS1v15(rand.Reader, pub.(*rsa.PublicKey), cipherbytes)
	if err != nil {
		return ""
	}
	return EncodeBase64(res)
}

func DecodeBase64(encoded string) []byte {
	res, _ := base64.StdEncoding.DecodeString(encoded)
	return res
}

func EncodeBase64(something []byte) string {
	return base64.StdEncoding.EncodeToString(something)
}
