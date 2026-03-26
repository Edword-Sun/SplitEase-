package config

type DatabaseConfig struct {
	Host     string `json:"host"`
	Port     string `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
	DBName   string `json:"dbname"`
	Charset  string `json:"charset"`
}

func GetDatabaseConfig() DatabaseConfig {
	return DatabaseConfig{
		Host:     "localhost",
		Port:     "3306",
		User:     "root",
		Password: "root",
		DBName:   "backend_gorm_template_db",
		Charset:  "utf8mb4",
	}
}
