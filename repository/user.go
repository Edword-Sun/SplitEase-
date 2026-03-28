package repository

import (
	"errors"
	"log"

	"gorm.io/gorm"

	"split_ease/model"
)

type UserRepository struct {
	DB *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{
		DB: db,
	}
}

// Create creates a new record in the database.
func (r *UserRepository) Create(user *model.User) error {
	if user == nil {
		log.Println("nil pointer")
		return errors.New("nil pointer")
	}
	query := r.DB.Model(&model.User{})
	err := query.Create(user).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误")
	}
	return nil
}

func (r *UserRepository) FindByID(id string) (error, *model.User) {
	query := r.DB.Model(&model.User{})
	result := model.User{}
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

func (r *UserRepository) FindByIdentity(identity string) (error, *model.User) {
	query := r.DB.Model(&model.User{})
	result := model.User{}
	err := query.Where("account_name = ? OR email = ? OR phone_number = ?", identity, identity, identity).First(&result).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("用户不存在"), nil
		}
		log.Println(err)
		return errors.New("内部错误"), nil
	}
	return nil, &result
}

func (r *UserRepository) UpdateByID(user *model.User) error {
	if user == nil {
		log.Println("nil pointer")
		return errors.New("nil pointer")
	}
	query := r.DB.Model(&model.User{}).Where("id = ?", user.ID)
	err := query.Updates(user).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误")
	}
	return nil
}
func (r *UserRepository) DeleteByID(id string) error {
	query := r.DB.Model(&model.User{})
	query = query.Where("id = ?", id)
	err := query.Delete(&model.User{}).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误")
	}
	return nil
}
