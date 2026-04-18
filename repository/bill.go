package repository

import (
	"errors"
	"log"

	"gorm.io/gorm"

	"split_ease/model"
)

type BillRepository struct {
	DB *gorm.DB
}

func NewBillRepository(db *gorm.DB) *BillRepository {
	return &BillRepository{
		DB: db,
	}
}

// Create creates a new record in the database.
func (r *BillRepository) Create(bill *model.Bill) error {
	if bill == nil {
		log.Println("nil pointer")
		return errors.New("nil pointer")
	}
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
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("数据不存在"), nil
		}
		log.Println(err)
		return errors.New("内部错误"), nil
	}
	return nil, &result
}

func (r *BillRepository) FindByTripID(tripID string) (error, []*model.Bill) {
	result := []*model.Bill{}

	err := r.DB.Where("trip_id = ?", tripID).Order("create_time DESC").Find(&result).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误"), nil
	}

	return nil, result
}

func (r *BillRepository) UpdateByID(bill *model.Bill) error {
	if bill == nil {
		log.Println("指针为空")
		return errors.New("指针为空")
	}
	query := r.DB.Model(&model.Bill{}).Where("id = ?", bill.ID)
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

func (r *BillRepository) DeleteByTripID(tripID string) error {
	query := r.DB.Model(&model.Bill{})
	query = query.Where("trip_id = ?", tripID)
	err := query.Delete(&model.Bill{}).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误")
	}
	return nil
}
