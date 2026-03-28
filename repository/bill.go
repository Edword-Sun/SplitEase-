package repository

import (
	"errors"
	"log"

	"gorm.io/gorm"

	"split_ease/config"
	"split_ease/model"
)

type BillRepository struct {
	DB *gorm.DB
}

func NewBillRepository() *BillRepository {
	return &BillRepository{
		DB: config.DB,
	}
}

// Create creates a new record in the database.
func (r *BillRepository) Create(bill *model.Bill) error {
	query := r.DB.Model(&model.Bill{})
	err := query.Create(bill).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误")
	}
	return nil
}

func (r *BillRepository) FindByID(id string) (error, *model.Bill) {
	query := r.DB.Model(&model.Bill{})
	result := model.Bill{}
	err := query.Where("id = ?", id).First(&result).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误"), nil
	}
	return nil, &result
}
func (r *BillRepository) Update(bill *model.Bill) error {
	query := r.DB.Model(&model.Bill{})
	err := query.Updates(bill).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误")
	}
	return nil
}
func (r *BillRepository) DeleteByID(id string) error {
	query := r.DB.Model(&model.Bill{})
	query = query.Where("id = ?", id)
	err := query.Delete(&model.Bill{}).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误")
	}
	return nil
}
