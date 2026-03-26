package model

import "time"

// 多个人形成一个team
type Team struct {
	ID string `gorm:"primarykey type:text;default:gen_random_uuid()" json:"id"`

	Name        string `gorm:"type:text" json:"name"`
	Description string `gorm:"type:text" json:"description"`
	Creator     string `gorm:"type:text" json:"creator"` // 创建者

	Leaders []string `gorm:"type:json; serializer:json" json:"leaders"` // 领队
	Members []string `gorm:"type:json; serializer:json" json:"members"` // 成员

	CreatedTime time.Time `gorm:"type:timestamp with time zone;not null" json:"create_time"`
	UpdatedTime time.Time `gorm:"type:timestamp with time zone;not null" json:"update_time"`
}

func (t *Team) TableName() string {
	return "team"
}
