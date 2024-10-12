package crypto

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/pem"
	"fmt"

	"golang.org/x/crypto/pbkdf2"
)

const IV_SIZE = 128
const IV_LENGTH = IV_SIZE / 4
const keySize = 256
const iterationCount = 1867

func CreateKeys() (string, string) {
	pubKey := bytes.NewBuffer([]byte{})
	priKey := bytes.NewBuffer([]byte{})
	privateKey, err := rsa.GenerateKey(rand.Reader, 1024)
	if err != nil {
		return "", ""
	}
	derStream := x509.MarshalPKCS1PrivateKey(privateKey)
	block := &pem.Block{
		Type:  "PRIVATE KEY",
		Bytes: derStream,
	}
	err = pem.Encode(priKey, block)
	if err != nil {
		return "", ""
	}

	publicKey := &privateKey.PublicKey
	derPkix, err := x509.MarshalPKIXPublicKey(publicKey)
	if err != nil {
		return "", ""
	}
	block = &pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: derPkix,
	}
	err = pem.Encode(pubKey, block)
	if err != nil {
		return "", ""
	}

	return priKey.String(), pubKey.String()
}

func RsaDecrypt(cipherbytes []byte, privateKey string) []byte {
	privKey := []byte(privateKey)
	block, _ := pem.Decode(privKey)
	if block == nil {
		return nil
	}
	priv, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		return nil
	}
	res, err := rsa.DecryptPKCS1v15(rand.Reader, priv, cipherbytes)
	if err != nil {
		return nil
	}
	return res
}

func RsaEncrypt(ciphertext string, publicKey string) []byte {
	cipherbytes := []byte(ciphertext)
	pubKey := []byte(publicKey)
	block, _ := pem.Decode(pubKey)
	if block == nil {
		return nil
	}
	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil
	}
	res, err := rsa.EncryptPKCS1v15(rand.Reader, pub.(*rsa.PublicKey), cipherbytes)
	if err != nil {
		return nil
	}
	return res
}

func HashedPassword(password string, salt string) string {
	key := pbkdf2.Key([]byte(password), fromHex(salt), iterationCount*2, keySize/8, sha1.New)
	return toHex(key)
}

func DecodeBase64(encoded string) []byte {
	res, _ := base64.StdEncoding.DecodeString(encoded)
	return res
}

func EncodeBase64(something []byte) string {
	return base64.StdEncoding.EncodeToString(something)
}

func toHex(b []byte) string {
	return hex.EncodeToString(b)
}

func fromHex(str string) []byte {
	res, _ := hex.DecodeString(str)
	return res
}

func AESEncrypt(src string, keyString string) string {
	salt := toHex(GenRandomBytes(keySize / 8))
	iv := toHex(GenRandomBytes(IV_SIZE / 8))
	key := pbkdf2.Key([]byte(keyString), fromHex(salt), iterationCount, keySize/8, sha1.New)

	block, err := aes.NewCipher(key)
	if err != nil {
		fmt.Println("key error1", err)
		return ""
	}
	ecb := cipher.NewCBCEncrypter(block, fromHex(iv))
	content := []byte(src)
	content = PKCS5Padding(content, block.BlockSize())
	crypted := make([]byte, len(content))
	ecb.CryptBlocks(crypted, content)

	return salt + iv + EncodeBase64(crypted)
}

func AESDecrypt(src string, keyString string) string {
	salt := src[:keySize/8]
	// iv := src[keySize/8 : keySize/8+IV_SIZE/8]
	msg := src[(keySize/8)+(IV_SIZE/8) : len(src)]

	key := pbkdf2.Key([]byte(keyString), fromHex(salt), iterationCount, keySize/8, sha1.New)

	ciphertext, _ := hex.DecodeString(msg)
	block, err := aes.NewCipher(key)
	if err != nil {
		fmt.Println("key error1", err)
		return ""
	}
	// dcb := cipher.NewCBCDecrypter(block, fromHex(iv))

	pt := make([]byte, len(ciphertext))
	block.Decrypt(pt, ciphertext)

	s := string(pt[:])

	return s
}

func PKCS5Padding(ciphertext []byte, blockSize int) []byte {
	padding := blockSize - len(ciphertext)%blockSize
	padtext := bytes.Repeat([]byte{byte(padding)}, padding)
	return append(ciphertext, padtext...)
}

func GenRandomBytes(size int) []byte {
	blk := make([]byte, size)
	_, _ = rand.Read(blk)
	return blk
}
