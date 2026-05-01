package config

import (
	"os"
)

type DatabaseConfig struct {
	Host     string `json:"host"`
	Port     string `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
	DBName   string `json:"dbname"`
	Charset  string `json:"charset"`
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func GetDatabaseConfig() DatabaseConfig {
	return DatabaseConfig{
		Host:     getEnv("DB_HOST", "localhost"),
		Port:     getEnv("DB_PORT", "3306"),
		User:     getEnv("DB_USER", "edword"),
		Password: getEnv("DB_PASSWORD", "Dd95409540#"),
		DBName:   getEnv("DB_NAME", "split_ease"),
		Charset:  getEnv("DB_CHARSET", "utf8mb4"),
	}
}
