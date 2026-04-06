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

	db := r.DB.Model(&model.User{})
	// 如果关键字不为空，则添加模糊查询条件；如果为空，则执行全局无条件搜索
	if len(keyword) > 0 {
		k := "%" + keyword + "%"
		// todo 展示去掉条件: OR phone_number LIKE ? OR email LIKE ?
		db = db.Where("(id = ? OR account_name LIKE ? OR name LIKE ?)", keyword, k, k)
	}

	// 使用 Session 隔离 Count 操作，避免修改原查询对象的内部状态导致后续 Find 出错
	if err := db.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		log.Println(err)
		return errors.New("内部错误"), nil, 0
	}

	if total == 0 {
		return nil, res, 0
	}

	// 使用原查询对象执行分页查询
	err := db.Offset(filter.Offset).Limit(filter.Limit).Find(&res).Error
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
	if len(id) == 0 {
		log.Println("id is empty")
		return errors.New("id is empty")
	}
	query := r.DB.Model(&model.User{})
	query = query.Where("id = ?", id)
	err := query.Delete(&model.User{}).Error
	if err != nil {
		log.Println(err)
		return errors.New("内部错误")
	}
	return nil
}
