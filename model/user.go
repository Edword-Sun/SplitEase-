package model

import (
	"gorm.io/gorm"
	"time"
)

type User struct {
	ID string `gorm:"primarykey type:text;default:gen_random_uuid()" json:"id"`

	Name        string  `gorm:"type:text" json:"name"`
	AccountName string  `gorm:"type:text" json:"account_name"`
	Password    string  `gorm:"type:text" json:"password"`
	Email       *string `gorm:"type:text" json:"email"`
	PhoneNumber *string `gorm:"type:text" json:"phone_number"`

	CreateTime time.Time `gorm:"type:timestamp with time zone;not null" json:"create_time"`
	UpdateTime time.Time `gorm:"type:timestamp with time zone;not null" json:"update_time"`
}

func (u *User) TableName() string {
	return "user"
}

func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
	u.CreateTime = time.Now()
	u.UpdateTime = time.Now()
	return nil
}

func (u *User) BeforeUpdate(tx *gorm.DB) (err error) {
	u.UpdateTime = time.Now()
	return nil
}
