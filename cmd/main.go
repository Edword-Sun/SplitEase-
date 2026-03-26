package main

import (
	"github.com/gin-gonic/gin"

	"backend_gorm_template/router"
)

func main() {
	// Initialize database connection
	//config.InitDB()

	r := gin.Default()

	// Initialize services

	// Initialize handlers and register routes
	healthHandler := router.NewHealthHandler()

	healthHandler.Init(r)

	r.Run(":8080") // listen and serve on 0.0.0.0:8080
}
