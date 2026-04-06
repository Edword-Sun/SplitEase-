package repository

import (
	"errors"
	"log"
	filter2 "split_ease/router/filter"

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

func (r *UserRepository) List(filter filter2.UserListFilter) (error, []*model.User, int64) {
	keyword := filter.Keyword
	res := []*model.User{}
	var total int64

	query := r.DB.Model(&model.User{})
	if len(keyword) > 0 {
		k := "%" + keyword + "%"
		query = query.Where("(account_name LIKE ? OR name LIKE ? OR phone_number LIKE ? OR email LIKE ?)", k, k, k, k)
	}

	// 先执行 Count 获取总数
	if err := query.Count(&total).Error; err != nil {
		log.Println(err)
		return errors.New("内部错误"), nil, 0
	}

	// 再执行分页查询数据
	err := query.Offset(filter.Offset).Limit(filter.Limit).Find(&res).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误"), nil, 0
	}
	return nil, res, total
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
