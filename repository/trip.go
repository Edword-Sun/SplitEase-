package repository

import (
	"errors"
	"log"

	"gorm.io/gorm"

	"split_ease/config"
	"split_ease/model"
)

type TripRepository struct {
	DB *gorm.DB
}

func NewTripRepository() *TripRepository {
	return &TripRepository{
		DB: config.DB,
	}
}

// Create creates a new record in the database.
func (r *TripRepository) Create(trip *model.Trip) error {
	if trip == nil {
		log.Println("nil pointer")
		return errors.New("nil pointer")
	}
	query := r.DB.Model(&model.Trip{})
	err := query.Create(trip).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误")
	}
	return nil
}

func (r *TripRepository) FindByID(id string) (error, *model.Trip) {
	query := r.DB.Model(&model.Trip{})
	result := model.Trip{}
	err := query.Where("id = ?", id).First(&result).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误"), nil
	}
	return nil, &result
}
func (r *TripRepository) UpdateByID(trip *model.Trip) error {
	if trip == nil {
		log.Println("nil pointer")
		return errors.New("nil pointer")
	}
	query := r.DB.Model(&model.Trip{}).Where("id = ?", trip.ID)
	err := query.Updates(trip).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误")
	}
	return nil
}
func (r *TripRepository) DeleteByID(id string) error {
	query := r.DB.Model(&model.Trip{})
	query = query.Where("id = ?", id)
	err := query.Delete(&model.Trip{}).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误")
	}
	return nil
}
