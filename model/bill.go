package model

import (
	"time"

	"gorm.io/gorm"
)

type Bill struct {
	ID          string `gorm:"primarykey type:text;default:gen_random_uuid()" json:"id"`
	Name        string `gorm:"type:text;default:''" json:"name"`
	Description string `gorm:"type:text" json:"description"`
	Category    int    `gorm:"type:int" json:"category"`     // 吃饭, 交通, 住宿...等
	CostCent    int64  `gorm:"type:bigint" json:"cost_cent"` // 费用(单位 角)

	TripID  string `gorm:"type:text" json:"trip_id"`    // 属于的trip
	TeamID  string `gorm:"type:text" json:"team_id"`    // 属于的team
	Creator string `gorm:"type:creator" json:"creator"` // 创建者

	CreateTime time.Time `gorm:"type:timestamp with time zone;not null" json:"create_time"`
	UpdateTime time.Time `gorm:"type:timestamp with time zone;not null" json:"update_time"`

	// new
	InvolvedMembers []string `gorm:"type:json; serializer:json" json:"involved_members"` // 参与者
	PayerID         string   `gorm:"type:text" json:"payer_id"`                          // 付款人
}

func (b *Bill) TableName() string {
	return "bill"
}

func (b *Bill) BeforeCreate(tx *gorm.DB) (err error) {
	b.CreateTime = time.Now()
	b.UpdateTime = time.Now()
	return nil
}

func (b *Bill) BeforeUpdate(tx *gorm.DB) (err error) {
	b.UpdateTime = time.Now()
	return nil
}
