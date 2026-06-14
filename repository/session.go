package repository

import (
	"errors"
	"log"
	"time"

	"gorm.io/gorm"

	"split_ease/model"
)

type SessionRepository struct {
	DB *gorm.DB
}

func NewSessionRepository(db *gorm.DB) *SessionRepository {
	return &SessionRepository{
		DB: db,
	}
}

// Create creates a new record in the database.
func (r *SessionRepository) Create(session *model.Session) error {
	if session == nil {
		log.Println("nil pointer")
		return errors.New("nil pointer")
	}
	query := r.DB.Model(&model.Session{})
	err := query.Create(session).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误")
	}
	return nil
}

func (r *SessionRepository) FindByID(id string) (error, *model.Session) {
	query := r.DB.Model(&model.Session{})
	result := model.Session{}
	err := query.Where("id = ?", id).First(&result).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("数据不存在"), nil
		}
		log.Println(err)
		return errors.New("内部错误"), nil
	}
	return nil, &result
}

func (r *SessionRepository) FindByUserID(userID string) (error, *model.Session) {
	query := r.DB.Model(&model.Session{})
	result := model.Session{}
	err := query.Where("user_id = ?", userID).First(&result).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("数据不存在"), nil
		}
		log.Println(err)
		return errors.New("内部错误"), nil
	}
	return nil, &result
}

func (r *SessionRepository) UpdateByID(session *model.Session) error {
	if session == nil {
		log.Println("指针为空")
		return errors.New("指针为空")
	}
	if len(session.ID) <= 0 {
		log.Println("session id 为空，无法更新")
		return errors.New("session id 为空，无法更新")
	}
	query := r.DB.Model(&model.Session{}).Where("id = ?", session.ID)
	err := query.Updates(session).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误")
	}
	return nil
}

func (r *SessionRepository) DeleteByID(id string) error {
	query := r.DB.Model(&model.Session{})
	query = query.Where("id = ?", id)
	err := query.Delete(&model.Session{}).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误")
	}
	return nil
}

func (r *SessionRepository) DeleteExpired() error {
	query := r.DB.Model(&model.Session{})
	query = query.Where("expires_at < ?", time.Now())
	result := query.Delete(&model.Session{})
	if result.Error != nil {
		log.Println("清理过期Session失败:", result.Error)
		return errors.New("内部错误")
	}
	log.Printf("成功清理了 %d 个过期Session", result.RowsAffected)
	return nil
}
