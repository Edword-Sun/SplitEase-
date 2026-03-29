package model

import (
	"time"

	"gorm.io/gorm"
)

// 以一次trip为一组记账的对象
type Trip struct {
	ID string `gorm:"primarykey type:text;default:gen_random_uuid()" json:"id"`

	Name        string `gorm:"type:text" json:"name"`
	Description string `gorm:"type:text" json:"description"`
	Creator     string `gorm:"type:text" json:"creator"` // 创建者

	Members []string `gorm:"type:json; serializer:json" json:"members"` // 成员

	CreateTime time.Time `gorm:"type:timestamp with time zone;not null" json:"create_time"`
	UpdateTime time.Time `gorm:"type:timestamp with time zone;not null" json:"update_time"`
}

func (t *Trip) TableName() string {
	return "trip"
}

func (t *Trip) BeforeCreate(tx *gorm.DB) (err error) {
	t.CreateTime = time.Now()
	t.UpdateTime = time.Now()
	return nil
}

func (t *Trip) BeforeUpdate(tx *gorm.DB) (err error) {
	t.UpdateTime = time.Now()
	return nil
}
