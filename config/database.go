package config

import (
	"fmt"
	"log"

	gorm_mysql "gorm.io/driver/mysql"
	gorm "gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	dbConfig := GetDatabaseConfig()
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=%s&parseTime=True&loc=Local",
		dbConfig.User,
		dbConfig.Password,
		dbConfig.Host,
		dbConfig.Port,
		dbConfig.DBName,
		dbConfig.Charset)

	var err error
	DB, err = gorm.Open(gorm_mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	fmt.Println("Database connection established")
}
