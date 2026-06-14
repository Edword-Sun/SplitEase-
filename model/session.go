package model

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Session struct {
	ID       string `json:"id" gorm:"primaryKey;column:id;default:gen_random_uuid()"`
	UserID   string `json:"user_id" gorm:"column:user_id;"`
	UserName string `json:"user_name" gorm:"column:user_name;"`
	Role     string `json:"role" gorm:"column:role;"` // 角色: admin/finance/viewer....

	Permissions datatypes.JSON `json:"permissions" gorm:"column:permissions;"` // 权限列表，JSON格式
	IPAddress   string         `json:"ip_address" gorm:"column:ip_address;"`
	UserAgent   string         `json:"user_agent" gorm:"column:user_agent;"` // 使用的浏览器

	ExpiresAt  time.Time `json:"expires_at" gorm:"column:expires_at;"` // 过期时间
	CreateTime time.Time `json:"create_time" gorm:"column:create_time;"`
	UpdateTime time.Time `json:"update_time" gorm:"column:update_time;"`
}

func (s *Session) TableName() string { return "session" }

func (s *Session) BeforeCreate(tx *gorm.DB) error {
	s.CreateTime = time.Now()
	s.UpdateTime = time.Now()
	// 过期时间 1小时
	s.ExpiresAt = time.Now().Add(SessionExpiresTime * time.Second)
	return nil
}

func (s *Session) BeforeUpdate(tx *gorm.DB) (err error) {
	s.UpdateTime = time.Now()
	return nil
}

const (
	SessionExpiresTime = 3600 // 秒
)
