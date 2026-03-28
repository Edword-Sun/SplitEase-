package main

import (
	"github.com/gin-gonic/gin"

	"split_ease/config"
	"split_ease/repository"
	"split_ease/router"
	"split_ease/utils/crypto"
)

func main() {
	// Initialize database connection
	config.InitDB()

	r := gin.Default()

	// Initialize crypto
	hashCrypto := crypto.NewHashCrypto()

	// Initialize repositories
	userRepo := repository.NewUserRepository(config.DB)
	billRepo := repository.NewBillRepository(config.DB)
	teamRepo := repository.NewTeamRepository(config.DB)
	tripRepo := repository.NewTripRepository(config.DB)

	// Initialize handlers and register routes
	healthHandler := router.NewHealthHandler()
	userHandler := router.NewUserHandler(userRepo, hashCrypto)
	billHandler := router.NewBillHandler(billRepo)
	teamHandler := router.NewTeamHandler(teamRepo)
	tripHandler := router.NewTripHandler(tripRepo)

	healthHandler.Init(r)
	userHandler.Init(r)
	billHandler.Init(r)
	teamHandler.Init(r)
	tripHandler.Init(r)

	r.Run(":8080") // listen and serve on 0.0.0.0:8080
}
