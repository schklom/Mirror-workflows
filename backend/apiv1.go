package backend

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"fmd-server/user"

	"github.com/rs/zerolog/log"
)

const HEADER_CONTENT_TYPE = "Content-Type"
const CT_APPLICATION_JSON = "application/json"

const ERR_ACCESS_TOKEN_INVALID = "Access token not valid"
const ERR_JSON_INVALID = "Invalid JSON"

type registrationData struct {
	Salt              string
	HashedPassword    string
	PubKey            string
	PrivKey           string
	RequestedUsername string
	RegistrationToken string
}

type passwordUpdateData struct {
	IDT            string
	Salt           string
	HashedPassword string
	PrivKey        string
}

// This is historically grown, and was originally a DataPackage
type loginData struct {
	IDT                    string
	PasswordHash           string `json:"Data"`
	SessionDurationSeconds uint64
}

// suboptimal naming for backwards compatibility
type commandData struct {
	IDT      string // access token
	Data     string // plaintext command
	UnixTime uint64 // unix time in milliseconds
	CmdSig   string // base64-encoded signature over "UnixTime:Data"
}

// universal package for string transfer
// IDT = DeviceID or AccessToken
// If both will be send. ID is always IDT
type DataPackage struct {
	IDT  string
	Data string
}

// ------- Location -------

func getLocation(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(request.IDT)
	if err != nil {
		http.Error(w, ERR_ACCESS_TOKEN_INVALID, http.StatusUnauthorized)
		return
	}
	index, _ := strconv.Atoi(request.Data)
	if index == -1 {
		index = uio.GetLocationSize(user)
	}
	data := uio.GetLocation(user, index)
	w.Header().Set(HEADER_CONTENT_TYPE, CT_APPLICATION_JSON)
	w.Write([]byte(fmt.Sprint(string(data))))
}

func getAllLocations(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(request.IDT)
	if err != nil {
		http.Error(w, ERR_ACCESS_TOKEN_INVALID, http.StatusUnauthorized)
		return
	}
	data := uio.GetAllLocations(user)
	jsonData, err := json.Marshal(data)
	if err != nil {
		http.Error(w, "Failed to export data", http.StatusConflict)
		return
	}
	w.Header().Set(HEADER_CONTENT_TYPE, CT_APPLICATION_JSON)
	w.Write([]byte(fmt.Sprint(string(jsonData))))
}

func postLocation(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(request.IDT)
	if err != nil {
		http.Error(w, ERR_ACCESS_TOKEN_INVALID, http.StatusUnauthorized)
		return
	}

	locationAsString, _ := json.MarshalIndent(request, "", " ")
	uio.AddLocation(user, string(locationAsString))
	w.WriteHeader(http.StatusOK)
}

func getLocationDataSize(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(request.IDT)
	if err != nil {
		http.Error(w, ERR_ACCESS_TOKEN_INVALID, http.StatusUnauthorized)
		return
	}

	size := uio.GetLocationSize(user)

	dataSize := DataPackage{Data: strconv.Itoa(size)}
	result, _ := json.Marshal(dataSize)
	w.Header().Set(HEADER_CONTENT_TYPE, CT_APPLICATION_JSON)
	w.Write(result)
}

// ------- Picture -------

func getPicture(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(request.IDT)
	if err != nil {
		http.Error(w, ERR_ACCESS_TOKEN_INVALID, http.StatusUnauthorized)
		return
	}

	index, _ := strconv.Atoi(request.Data)
	if index == -1 {
		index = uio.GetPictureSize(user)
	}
	data := uio.GetPicture(user, index)
	w.Header().Set(HEADER_CONTENT_TYPE, "text/plain")
	w.Write([]byte(fmt.Sprint(string(data))))
}

func getAllPictures(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(request.IDT)
	if err != nil {
		http.Error(w, ERR_ACCESS_TOKEN_INVALID, http.StatusUnauthorized)
		return
	}
	data := uio.GetAllPictures(user)
	jsonData, err := json.Marshal(data)
	if err != nil {
		http.Error(w, "Failed to export data", http.StatusConflict)
		return
	}
	w.Header().Set(HEADER_CONTENT_TYPE, CT_APPLICATION_JSON)
	w.Write([]byte(fmt.Sprint(string(jsonData))))
}

func getPictureSize(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(request.IDT)
	if err != nil {
		http.Error(w, ERR_ACCESS_TOKEN_INVALID, http.StatusUnauthorized)
		return
	}

	highest := uio.GetPictureSize(user)

	dataSize := DataPackage{Data: strconv.Itoa(highest)}
	result, _ := json.Marshal(dataSize)
	w.Header().Set(HEADER_CONTENT_TYPE, CT_APPLICATION_JSON)
	w.Write(result)
}

func postPicture(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(data.IDT)
	if err != nil {
		http.Error(w, ERR_ACCESS_TOKEN_INVALID, http.StatusUnauthorized)
		return
	}

	picture := data.Data
	uio.AddPicture(user, picture)
	w.WriteHeader(http.StatusOK)
}

// ------- Public/Private Keys -------

func getPrivKey(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(request.IDT)
	if err != nil {
		http.Error(w, ERR_ACCESS_TOKEN_INVALID, http.StatusUnauthorized)
		return
	}

	dataReply := DataPackage{IDT: request.IDT, Data: uio.GetPrivateKey(user)}
	result, _ := json.Marshal(dataReply)
	w.Header().Set(HEADER_CONTENT_TYPE, CT_APPLICATION_JSON)
	w.Write(result)
}

func getPubKey(w http.ResponseWriter, r *http.Request) {
	var request DataPackage
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(request.IDT)
	if err != nil {
		http.Error(w, ERR_ACCESS_TOKEN_INVALID, http.StatusUnauthorized)
		return
	}

	dataReply := DataPackage{IDT: request.IDT, Data: uio.GetPublicKey(user)}
	result, _ := json.Marshal(dataReply)
	w.Header().Set(HEADER_CONTENT_TYPE, CT_APPLICATION_JSON)
	w.Write(result)
}

// ------- Commands -------

func getCommand(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(data.IDT)
	if err != nil {
		http.Error(w, ERR_ACCESS_TOKEN_INVALID, http.StatusUnauthorized)
		return
	}
	cmd, time, sig := uio.GetCommandToUser(user)

	// commandAsString may be an empty string, that's fine
	reply := commandData{IDT: data.IDT, Data: cmd, UnixTime: time, CmdSig: sig}
	result, _ := json.Marshal(reply)
	w.Header().Set(HEADER_CONTENT_TYPE, CT_APPLICATION_JSON)
	w.Write([]byte(result))

	// Clear the command so that the app only GETs it once
	uio.SetCommandToUser(user, "", 0, "")
}

func postCommand(w http.ResponseWriter, r *http.Request) {
	var data commandData
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(data.IDT)
	if err != nil {
		http.Error(w, ERR_ACCESS_TOKEN_INVALID, http.StatusUnauthorized)
		return
	}
	uio.SetCommandToUser(user, data.Data, data.UnixTime, data.CmdSig)
	w.WriteHeader(http.StatusOK)
}

func getCommandLog(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(data.IDT)
	if err != nil {
		http.Error(w, ERR_ACCESS_TOKEN_INVALID, http.StatusUnauthorized)
		return
	}

	commandLog := uio.GetCommandLog(user)

	// commandLogs may be empty, that's fine
	reply := DataPackage{IDT: data.IDT, Data: commandLog}
	result, _ := json.Marshal(reply)
	w.Header().Set(HEADER_CONTENT_TYPE, CT_APPLICATION_JSON)
	w.Write([]byte(result))
}

// ------- Push -------

func getPushUrl(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, "Meeep!, Error - getIsPushRegistered 1", http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(data.IDT)
	if err != nil {
		http.Error(w, ERR_ACCESS_TOKEN_INVALID, http.StatusUnauthorized)
		return
	}

	url := uio.GetPushUrl(user)
	w.Write([]byte(fmt.Sprint(url)))
}

func postPushUrl(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(data.IDT)
	if err != nil {
		http.Error(w, ERR_ACCESS_TOKEN_INVALID, http.StatusUnauthorized)
		return
	}

	uio.SetPushUrl(user, data.Data)
	w.WriteHeader(http.StatusOK)
}

// ------- Authentication, Login -------

func requestSalt(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}
	if !user.IsUserIdValid(data.IDT) {
		http.Error(w, "Invalid FMD ID", http.StatusBadRequest)
		return
	}
	salt := uio.GetSalt(data.IDT)
	dataReply := DataPackage{IDT: data.IDT, Data: salt}
	result, _ := json.Marshal(dataReply)
	w.Header().Set(HEADER_CONTENT_TYPE, CT_APPLICATION_JSON)
	w.Write(result)

}

func requestAccess(w http.ResponseWriter, r *http.Request) {
	var data loginData
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}
	if !user.IsUserIdValid(data.IDT) {
		http.Error(w, "Invalid FMD ID", http.StatusBadRequest)
		return
	}

	accessToken, err := uio.RequestAccess(data.IDT, data.PasswordHash, data.SessionDurationSeconds, getRemoteIp(r))

	if err == user.ErrAccountLocked {
		http.Error(w, "Account is locked", http.StatusLocked)
		return
	}
	if err != nil {
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	accessTokenReply := DataPackage{IDT: data.IDT, Data: accessToken.Token}
	result, _ := json.Marshal(accessTokenReply)
	w.Header().Set(HEADER_CONTENT_TYPE, CT_APPLICATION_JSON)
	w.Write(result)
}

func postPassword(w http.ResponseWriter, r *http.Request) {
	var data passwordUpdateData
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(data.IDT)
	if err != nil {
		http.Error(w, ERR_ACCESS_TOKEN_INVALID, http.StatusUnauthorized)
		return
	}

	uio.UpdateUserPassword(user, data.PrivKey, data.Salt, data.HashedPassword)

	dataReply := DataPackage{IDT: data.IDT, Data: "true"}
	result, _ := json.Marshal(dataReply)
	w.Header().Set(HEADER_CONTENT_TYPE, CT_APPLICATION_JSON)
	w.Write(result)
}

// ------- (De-) Registration -------

func deleteDevice(w http.ResponseWriter, r *http.Request) {
	var data DataPackage
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}
	user, err := uio.CheckAccessTokenAndGetUser(data.IDT)
	if err != nil {
		http.Error(w, ERR_ACCESS_TOKEN_INVALID, http.StatusUnauthorized)
		return
	}
	uio.DeleteUser(user)
	w.WriteHeader(http.StatusOK)
}

type createDeviceHandler struct {
	RegistrationToken string
}

func (h createDeviceHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var reg registrationData
	err := json.NewDecoder(r.Body).Decode(&reg)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}

	if h.RegistrationToken != "" && h.RegistrationToken != reg.RegistrationToken {
		log.Error().Msg("invalid RegistrationToken")
		http.Error(w, "Registration Token not valid", http.StatusUnauthorized)
		return
	}

	id, err := uio.CreateNewUser(reg.PrivKey, reg.PubKey, reg.Salt, reg.HashedPassword, reg.RequestedUsername)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create username: %s", err.Error()), http.StatusBadRequest)
		return
	}

	accessToken := user.AccessToken{DeviceId: id, Token: ""}
	result, _ := json.Marshal(accessToken)
	w.Header().Set(HEADER_CONTENT_TYPE, CT_APPLICATION_JSON)
	w.Write(result)
}

// ------- Main Web Request Handling -------

func getVersion(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, VERSION)
}

func mainLocation(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPut:
		getLocation(w, r)
	case http.MethodPost:
		postLocation(w, r)
	}
}

func mainPicture(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPut:
		getPicture(w, r)
	case http.MethodPost:
		postPicture(w, r)
	}
}

func mainCommand(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPut:
		getCommand(w, r)
	case http.MethodPost:
		postCommand(w, r)
	}
}

func mainPushUrl(w http.ResponseWriter, r *http.Request) {
	// This is inverted, and not nice, but it has grown historically...
	// Ideally the HTTP methods would be GET and PUT (or possibly POST).
	// But the app is using PUT to set the URL, so we need to keep that.
	// And we cannot have a body in GET requests, so we need to use POST.
	switch r.Method {
	case http.MethodPost:
		getPushUrl(w, r)
	case http.MethodPut:
		postPushUrl(w, r)
	}
}

type mainDeviceHandler struct {
	createDeviceHandler createDeviceHandler
}

func (h mainDeviceHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		deleteDevice(w, r)
	case http.MethodPut:
		h.createDeviceHandler.ServeHTTP(w, r)
	}
}
