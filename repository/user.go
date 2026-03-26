package repository

import (
	"errors"
	"gorm.io/gorm"
	"log"

	"split_ease/config"
	"split_ease/model"
)

type UserRepository struct {
	DB *gorm.DB
}

func NewUserRepository() *UserRepository {
	return &UserRepository{
		DB: config.DB,
	}
}

// Create creates a new record in the database.
func (r *UserRepository) Create(user *model.User) error {
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
		log.Println(err)
		return errors.New("内部错误"), nil
	}
	return nil, &result
}
func (r *UserRepository) Update(user *model.User) error {
	query := r.DB.Model(&model.User{})
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
