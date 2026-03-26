package model

import "time"

// 以一次trip为一组记账的对象
type Trip struct {
	ID string `gorm:"primarykey type:text;default:gen_random_uuid()" json:"id"`

	Name        string `gorm:"type:text" json:"name"`
	Description string `gorm:"type:text" json:"description"`
	Creator     string `gorm:"type:text" json:"creator"` // 创建者

	CreatedTime time.Time `gorm:"type:timestamp with time zone;not null" json:"create_time"`
	UpdatedTime time.Time `gorm:"type:timestamp with time zone;not null" json:"update_time"`
}

func (t *Trip) TableName() string {
	return "trip"
}
