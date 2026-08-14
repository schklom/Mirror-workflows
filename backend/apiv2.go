package backend

import (
	"context"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	conf "fmd-server/config"
	"fmd-server/constants"
	"fmd-server/user"
	"fmt"
	"net/http"
	"strings"

	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
	"gorm.io/gorm"
)

/* ------- General ------- */

func buildApiV2Mux(config *viper.Viper) *http.ServeMux {
	mux := http.NewServeMux()

	auth := func(pattern string, h http.HandlerFunc) {
		mux.Handle(pattern, authMiddleware(h))
	}

	registerHandler2 := registerHandler2{config.GetString(conf.CONF_REGISTRATION_TOKEN)}

	tileServerUrl, _ := conf.ValidateTileServerUrl(config.GetString(conf.CONF_TILE_SERVER_URL))

	// Account management
	mux.HandleFunc("GET /account/{name}/salt", getSalt2)
	mux.HandleFunc("POST /account/login", postLogin2)
	mux.Handle("POST /account/register", registerHandler2)
	auth("POST /account/logout", postLogout2)
	auth("DELETE /account", deleteAccount2)

	// Account settings
	auth("GET /account/push_url", getPushUrl2)
	auth("POST /account/push_url", postPushUrl2)
	auth("POST /account/password", postPassword2)

	// Encrypted data
	// {type} is one of the types defined in constants.go
	auth("GET /data/{type}", getData2)
	auth("POST /data/{type}", postData2)
	auth("DELETE /data/{type}/all", deleteAllData2)
	auth("DELETE /data/{type}/{id}", deleteSingleDatum2)

	// Other
	mux.HandleFunc("GET /tileServerUrl", func(w http.ResponseWriter, r *http.Request) { fmt.Fprint(w, tileServerUrl) })
	mux.HandleFunc("GET /version", getVersion)

	return mux
}

type contextKey int

const userKey contextKey = iota

// Validate the access token in the Authorization header field.
// If valid, add the User ID of the request to the context.
func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "missing or malformed Authorization header", http.StatusBadRequest)
			return
		}

		providedAccessToken := strings.TrimPrefix(authHeader, "Bearer ")

		user, err := uio.CheckAccessTokenAndGetUser(providedAccessToken)
		if err != nil {
			http.Error(w, "invalid or expired access token", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), userKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func userFromContext(r *http.Request) *user.FMDUser {
	u, _ := r.Context().Value(userKey).(*user.FMDUser)
	return u
}

func writeAsJson(w http.ResponseWriter, val any) {
	body, err := json.Marshal(val)
	if err != nil {
		http.Error(w, "error marshalling json", http.StatusInternalServerError)
		return
	}

	w.Header().Set(HEADER_CONTENT_TYPE, CT_APPLICATION_JSON)
	w.WriteHeader(http.StatusOK)
	w.Write(body)
}

/* ------- Account management ------- */

type saltResponse struct {
	Salt         string `json:"salt64"`
	ProtoVersion uint16 `json:"protoVersion"`
}

// Migration behaviour:
// Updated clients should get the salt via APIv2 first, since they
// don't know a priori which crypto protocol version the account uses.
// Then they may fall back to APIv1 for the login if `protoVersion` indicates v1.
func getSalt2(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("name")

	user, err := uio.UB.GetByName(username)
	if err != nil {
		http.Error(w, "account not found", http.StatusNotFound)
		return
	}

	writeAsJson(w, saltResponse{Salt: user.Salt, ProtoVersion: user.CryptoProtoVersion})
}

type loginRequest struct {
	Username               string `json:"username"`
	PasswordHash64         string `json:"passwordHash64"`
	SessionDurationSeconds uint64 `json:"sessionDurationSeconds"`
}

type loginResponse struct {
	AccessToken  string `json:"accessToken"`
	EncMasterKey string `json:"encMasterKey64"`
}

func postLogin2(w http.ResponseWriter, r *http.Request) {
	var data loginRequest
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}

	// Sanity check
	if !user.IsUsernameValid(data.Username) {
		http.Error(w, "Invalid user id", http.StatusBadRequest)
		return
	}

	passwordString, err := sanityCheckPasswordData("", data.PasswordHash64, "")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	u, accessToken, err := uio.RequestAccess(data.Username, passwordString, data.SessionDurationSeconds, getRemoteIp(r))

	if err == user.ErrNotFound {
		http.Error(w, "Account not found", http.StatusNotFound)
		return
	}
	if err == user.ErrAccountLocked {
		http.Error(w, "Account is locked", http.StatusLocked)
		return
	}
	if err != nil {
		log.Warn().Err(err).Str("user", data.Username).Msg("login failed")
		http.Error(w, "Access denied", http.StatusForbidden)
		return
	}

	out := loginResponse{
		AccessToken:  accessToken.Token,
		EncMasterKey: u.EncMasterKeyV2, // may be empty if protoV1
	}
	writeAsJson(w, out)
}

type registerHandler2 struct {
	RegistrationToken string `json:"registrationToken"`
}

type registerRequest struct {
	Username          string `json:"username"`
	Salt64            string `json:"salt64"`
	PasswordHash64    string `json:"passwordHash64"`
	ProtoVersion      uint16 `json:"protoVersion"`
	EncMasterKey64    string `json:"encMasterKey64"`
	RegistrationToken string `json:"registrationToken"`
}

type registerResponse struct {
	AccessToken string `json:"accessToken"`
}

func (h registerHandler2) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var data registerRequest
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}

	if h.RegistrationToken != "" && h.RegistrationToken != data.RegistrationToken {
		log.Error().Msg("invalid RegistrationToken")
		http.Error(w, "Registration Token not valid", http.StatusUnauthorized)
		return
	}

	if data.ProtoVersion != constants.CryptoProtoV2 {
		msg := fmt.Sprintf("invalid protoVersion: %d, expected %d", data.ProtoVersion, constants.CryptoProtoV2)
		http.Error(w, msg, http.StatusBadRequest)
		return
	}

	passwordString, err := sanityCheckPasswordData(data.Salt64, data.PasswordHash64, data.EncMasterKey64)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err = uio.CreateNewUser(constants.CryptoProtoV2, data.EncMasterKey64, "", "", data.Salt64, passwordString, data.Username)
	if err != nil {
		log.Error().Err(err).Msg("failed to create account")
		// pass the error message through
		http.Error(w, fmt.Sprintf("Failed to create user: %s", err.Error()), http.StatusBadRequest)
		return
	}

	// Automatically log the user in and give them a session with an access token
	_, accessToken, err := uio.RequestAccess(data.Username, passwordString, user.DEFAULT_TOKEN_VALID_SECS, getRemoteIp(r))
	if err != nil {
		log.Error().Err(err).Msg("failed to create initial session")
		http.Error(w, "failed to create initial session", http.StatusInternalServerError)
		return
	}

	out := registerResponse{
		AccessToken: accessToken.Token,
	}
	writeAsJson(w, out)
}

// Sanity check the base64 encoded fields
func sanityCheckPasswordData(salt64 string, passwordHash64 string, encMasterKey64 string) (string, error) {
	_, err := base64.StdEncoding.DecodeString(salt64)
	if err != nil {
		return "", errors.New("salt is invalid base64")
	}

	passwordBytes, err := base64.StdEncoding.DecodeString(passwordHash64)
	if err != nil {
		return "", errors.New("password hash is invalid base64")
	}

	_, err = base64.StdEncoding.DecodeString(encMasterKey64)
	if err != nil {
		return "", errors.New("encrypted master key is invalid base64")
	}

	// Re-encode the password server side. This is because base64 is not unique,
	// so clients might send different PasswordHash64 values that all decode to the same byte array.
	// In order for the server-side password comparison to still match, we base64-decode and hex-reencode it.
	// This is necessary because historically, the server-side password hashing expects a string.
	passwordString := hex.EncodeToString(passwordBytes)

	return passwordString, nil
}

func postLogout2(w http.ResponseWriter, r *http.Request) {
	// Same as in the auth middleware.
	// Since the middleware passed, the header should exist.
	authHeader := r.Header.Get("Authorization")
	token := strings.TrimPrefix(authHeader, "Bearer ")

	uio.ACC.RevokeAccessToken(token)
	w.WriteHeader(http.StatusOK)
}

func deleteAccount2(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r)
	err := uio.DeleteUser(user)
	if err != nil {
		log.Error().Str("user", user.Username).Err(err).Msg("failed to delete account")
		http.Error(w, "failed to delete account", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

/* ------- Account settings ------- */

type pushUrlRequestResponse struct {
	Url string `json:"url"`
}

func getPushUrl2(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r)
	url := uio.GetPushUrl(user)
	writeAsJson(w, pushUrlRequestResponse{url})
}

func postPushUrl2(w http.ResponseWriter, r *http.Request) {
	var data pushUrlRequestResponse
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}

	user := userFromContext(r)
	uio.SetPushUrl(user, data.Url)
	w.WriteHeader(http.StatusOK)
}

type passwordRequest struct {
	NewSalt64         string `json:"newSalt64"`
	NewPasswordHash64 string `json:"newPasswordHash64"`
	NewEncMasterKey64 string `json:"newEncMasterKey64"`
}

type passwordResponse struct {
	AccessToken string `json:"accessToken"`
}

func postPassword2(w http.ResponseWriter, r *http.Request) {
	var data passwordRequest
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}

	passwordString, err := sanityCheckPasswordData(data.NewSalt64, data.NewPasswordHash64, data.NewEncMasterKey64)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	u := userFromContext(r)
	uio.UpdateUserPasswordV2(u, data.NewEncMasterKey64, data.NewSalt64, passwordString)

	// Automatically log the user in and give them a new session with an access token.
	// The other sessions have been revoked.
	_, accessToken, err := uio.RequestAccess(u.Username, passwordString, user.DEFAULT_TOKEN_VALID_SECS, getRemoteIp(r))
	if err != nil {
		log.Error().Err(err).Msg("failed to create initial session")
		http.Error(w, "failed to create initial session", http.StatusInternalServerError)
		return
	}

	out := passwordResponse{
		AccessToken: accessToken.Token,
	}
	writeAsJson(w, out)
}

/* ------- Encrypted data ------- */

type dataRequestResponse struct {
	Items []user.EncryptedItemDtoV2 `json:"items"`
}

func getData2(w http.ResponseWriter, r *http.Request) {
	typ := r.PathValue("type")

	user := userFromContext(r)
	items, err := uio.GetAllDataV2(user, typ)

	if err != nil {
		log.Error().Str("user", user.Username).Str("type", typ).Err(err).Msg("failed to get data")
		http.Error(w, "failed to get data", http.StatusInternalServerError)
		return
	}
	writeAsJson(w, dataRequestResponse{items})
}

func postData2(w http.ResponseWriter, r *http.Request) {
	var data dataRequestResponse
	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		http.Error(w, ERR_JSON_INVALID, http.StatusBadRequest)
		return
	}
	typ := r.PathValue("type")

	user := userFromContext(r)
	err = uio.AddDataV2(user, typ, data.Items)

	if err != nil {
		log.Error().Str("user", user.Username).Str("type", typ).Err(err).Msg("failed to add data")
		http.Error(w, "failed to add data", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func deleteAllData2(w http.ResponseWriter, r *http.Request) {
	typ := r.PathValue("type")

	user := userFromContext(r)
	err := uio.DeleteAllDataV2(user, typ)

	if err != nil {
		log.Error().Str("user", user.Username).Str("type", typ).Err(err).Msg("failed to delete all data")
		http.Error(w, "failed to delete all data", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func deleteSingleDatum2(w http.ResponseWriter, r *http.Request) {
	typ := r.PathValue("type")
	idHex := r.PathValue("id")

	user := userFromContext(r)
	err := uio.DeleteSingleDatumV2(user, typ, idHex)

	if err == gorm.ErrRecordNotFound {
		http.Error(w, "message not found", http.StatusNotFound)
		return
	}

	if err != nil {
		log.Error().Str("user", user.Username).Str("type", typ).Err(err).Msg("failed to delete single datum")
		http.Error(w, "failed to delete single datum", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}
