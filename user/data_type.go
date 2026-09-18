package user

import (
	"fmd-server/metrics"
	"fmt"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
)

type DataType uint8

const (
	DataTypeCommand  DataType = 0
	DataTypeLocation DataType = 1
	DataTypePicture  DataType = 2
)

func ParseDataType(s string) (DataType, error) {
	switch s {
	case "command":
		return DataTypeCommand, nil
	case "location":
		return DataTypeLocation, nil
	case "picture":
		return DataTypePicture, nil
	default:
		return 0, fmt.Errorf("unknown data type %s", s)
	}
}

func getDataMetric(typ DataType) prometheus.Gauge {
	switch typ {
	case DataTypeCommand:
		return metrics.PendingCommands
	case DataTypeLocation:
		return metrics.Locations
	case DataTypePicture:
		return metrics.Pictures
	default:
		log.Warn().Int("type", int(typ)).Msg("unhandled data type for metrics")
		return promauto.NewGauge(prometheus.GaugeOpts{
			Name: "fmd_dummy_metric",
			Help: "Dummy metric to avoid returning nil",
		})
	}
}

func (u *UserRepository) getNumToKeep(typ DataType) int {
	switch typ {
	case DataTypeCommand:
		return KEEP_ALL
	case DataTypeLocation:
		return u.maxSavedLoc
	case DataTypePicture:
		return u.maxSavedPic
	default:
		log.Warn().Int("type", int(typ)).Msg("unhandled data type for numToKeep")
		return KEEP_ALL
	}
}

// ----------
// Access wrapper to the DataV2 table, to ensure that all accesses are scoped to a data type
// ----------

type TypedStore struct {
	db     *gorm.DB
	userId uint64 // the database ID, not the username!!
	typ    DataType
}

func (db *FMDDB) GetTypedStore(userId uint64, typ DataType) TypedStore {
	return TypedStore{db: db.DB, userId: userId, typ: typ}
}

func (s TypedStore) scope() *gorm.DB {
	// This must be freshly called for each query to ensure the condition is re-added.
	return s.db.Where("user_id = ? AND type = ?", s.userId, s.typ)
}

func (s TypedStore) All() ([]DataV2, error) {
	var items []DataV2
	err := s.scope().Order("id ASC").Find(&items).Error
	return items, err
}

func (s TypedStore) DeleteAll() (int64, error) {
	res := s.scope().Delete(&DataV2{})
	return res.RowsAffected, res.Error
}

func (s TypedStore) DeleteByClientItemId(itemId []byte) (int64, error) {
	res := s.scope().Where("client_item_id = ?", itemId).Delete(&DataV2{})
	return res.RowsAffected, res.Error
}

const KEEP_ALL = 0

func (s TypedStore) Prune(numToKeep int) (int64, error) {
	if numToKeep == KEEP_ALL {
		return 0, nil // keep all
	}

	var rowsAffected int64

	err := s.db.Transaction(func(tx *gorm.DB) error {
		keepIds := tx.Model(&DataV2{}).
			Where("user_id = ? AND type = ?", s.userId, s.typ).
			Order("id DESC").
			Limit(int(numToKeep)).
			Select("id")
		res := tx.Where("user_id = ? AND type = ?", s.userId, s.typ).
			Where("id NOT IN (?)", keepIds).
			Delete(&DataV2{})
		rowsAffected = res.RowsAffected
		return res.Error
	})
	return rowsAffected, err
}

// Create new entries in the DB.
//
// Note: callers must ensure that userId and typ are correctly set on all items!
func (s TypedStore) Create(items *[]DataV2) (int64, error) {
	res := s.db.Create(items) // no need to scope creates
	return res.RowsAffected, res.Error
}
