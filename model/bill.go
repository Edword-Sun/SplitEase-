package model

import "time"

type Bill struct {
	ID          string `gorm:"primarykey type:text;default:gen_random_uuid()" json:"id"`
	Name        string `gorm:"type:text;default:''" json:"name"`
	Description string `gorm:"type:text" json:"description"`
	Category    int    `gorm:"type:int" json:"category"`     // 吃饭, 交通, 住宿...等
	CostCent    int64  `gorm:"type:bigint" json:"cost_cent"` // 费用(单位 角)

	TripID  string `gorm:"type:text" json:"trip_id"`    // 属于的trip
	TeamID  string `gorm:"type:text" json:"team_id"`    // 属于的team
	Creator string `gorm:"type:creator" json:"creator"` // 创建者

	CreatedTime time.Time `gorm:"type:timestamp with time zone;not null" json:"create_time"`
	UpdatedTime time.Time `gorm:"type:timestamp with time zone;not null" json:"update_time"`
}

func (b *Bill) TableName() string {
	return "bill"
}
