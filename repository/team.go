package repository

import (
	"errors"
	"log"

	"gorm.io/gorm"

	"split_ease/config"
	"split_ease/model"
)

type TeamRepository struct {
	DB *gorm.DB
}

func NewTeamRepository() *TeamRepository {
	return &TeamRepository{
		DB: config.DB,
	}
}

// Create creates a new record in the database.
func (r *TeamRepository) Create(team *model.Team) error {
	query := r.DB.Model(&model.Team{})
	err := query.Create(team).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误")
	}
	return nil
}

func (r *TeamRepository) FindByID(id string) (error, *model.Team) {
	query := r.DB.Model(&model.Team{})
	result := model.Team{}
	err := query.Where("id = ?", id).First(&result).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误"), nil
	}
	return nil, &result
}
func (r *TeamRepository) Update(team *model.Team) error {
	query := r.DB.Model(&model.Team{})
	err := query.Updates(team).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误")
	}
	return nil
}
func (r *TeamRepository) DeleteByID(id string) error {
	query := r.DB.Model(&model.Team{})
	query = query.Where("id = ?", id)
	err := query.Delete(&model.Team{}).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误")
	}
	return nil
}
