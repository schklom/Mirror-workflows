package constants

const VERSION = "0.16.0"

const (
	CryptoProtoV1 uint16 = 1
	CryptoProtoV2 uint16 = 2
)

// Data types in the crypto protocol v2
const (
	DataTypeCommand  = "command"  // 1
	DataTypeLocation = "location" // 2
	DataTypePicture  = "picture"  // 3
)
