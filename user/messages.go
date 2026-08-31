package user

import (
	"errors"
	"fmd-server/metrics"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
)

const (
	CODE_OTHER          = 1
	CODE_ACCOUNT_LOCKED = 2
)

// Used by APIv2 for the on-the-wire JSON encoding. Defined here to avoid cyclic import.
type MessageDto struct {
	Uuid       string `json:"uuid"`
	UnixMillis uint64 `json:"unixMillis"`
	Code       uint64 `json:"code"`
	Text       string `json:"text"`
}

func (u *UserRepository) GetMessages(user *FMDUser) ([]MessageDto, error) {
	var messages []Message
	result := u.UB.DB.Where("user_id = ?", user.Id).Find(&messages)

	if result.Error != nil {
		return nil, result.Error
	}

	messageDtos := make([]MessageDto, len(messages))
	for idx, m := range messages {
		messageDtos[idx] = MessageDto{
			Uuid:       m.Uuid,
			UnixMillis: m.UnixMillis,
			Code:       m.Code,
			Text:       m.Text,
		}
	}
	return messageDtos, nil
}

func (u *UserRepository) DeleteSingleMessage(user *FMDUser, uuid string) error {
	result := u.UB.DB.Where(Message{UserId: user.Id, Uuid: uuid}).Delete(&Message{})
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	metrics.PendingMessages.Sub(float64(result.RowsAffected))
	return result.Error
}

func (u *UserRepository) AddMessage(user *FMDUser, code int, text string) error {
	if text != "" && code != CODE_OTHER {
		return errors.New("text is only allowed by CODE_OTHER")
	}

	// TODO: Switch to the stdlib's https://pkg.go.dev/uuid#NewV7 (requires go 1.27)
	id, err := uuid.NewRandom()
	if err != nil {
		log.Error().Err(err).Msg("uuid generation failed")
		return errors.New("uuid generation failed")
	}

	row := Message{
		UserId:     user.Id,
		Uuid:       id.String(),
		UnixMillis: uint64(time.Now().UnixMilli()),
		Code:       uint64(code),
		Text:       text,
	}
	result := u.UB.DB.Create(&row)
	if result.Error != nil {
		return result.Error
	}

	metrics.PendingMessages.Inc()
	u.PushUser(user)
	return nil
}
