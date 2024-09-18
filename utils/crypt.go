package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
)

func encryptWithAESGCM(plaintext, key []byte) []byte {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil
	}
	iv := generateSecureRandomKey(12)

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return nil
	}
	ciphertext := aesGCM.Seal(nil, iv, plaintext, nil)
	result := append(iv, ciphertext...)

	return result
}

func wrapSessionKeyOAEP(publicKey *rsa.PublicKey, sessionKey []byte) ([]byte, error) {
	label := []byte("")
	hash := sha256.New()
	ciphertext, err := rsa.EncryptOAEP(hash, rand.Reader, publicKey, sessionKey, label)
	if err != nil {
		return nil, err
	}

	return ciphertext, nil
}

func concatByteArrays(arrays ...[]byte) []byte {
	result := []byte("")
	for _, arr := range arrays {
		result = append(result, arr...)
	}

	return result
}

func generateSecureRandomKey(size int) []byte {
	key := make([]byte, size)
	_, err := rand.Read(key)
	if err != nil {
		return nil
	}
	return key
}

func RsaEncrypt(publicKeyString string, message []byte) string {
	sessionKey := generateSecureRandomKey(32)
	ivAndAesCiphertext := encryptWithAESGCM(message, sessionKey)

	//pubKeyBytes := []byte(DecodeBase64(publicKeyString))
	publicKeyString = "-----BEGIN PUBLIC KEY-----\n" + publicKeyString + "\n-----END PUBLIC KEY-----"
	block, _ := pem.Decode([]byte(publicKeyString))
	if block == nil {
		return ""
	}
	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return ""
	}

	sessionKeyPacket, _ := wrapSessionKeyOAEP(pub.(*rsa.PublicKey), sessionKey)
	res := concatByteArrays(sessionKeyPacket, ivAndAesCiphertext)

	return EncodeBase64(res)
}

func DecodeBase64(encoded string) []byte {
	res, _ := base64.StdEncoding.DecodeString(encoded)
	return res
}

func EncodeBase64(something []byte) string {
	return base64.StdEncoding.EncodeToString(something)
}
