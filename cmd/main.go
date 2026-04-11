package main

import (
	"os"
	"path/filepath"

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

	userHandler := router.NewUserHandler(userRepo, hashCrypto)
	billHandler := router.NewBillHandler(billRepo)
	teamHandler := router.NewTeamHandler(teamRepo)
	tripHandler := router.NewTripHandler(tripRepo, userRepo, billRepo)

	userHandler.Init(r)
	billHandler.Init(r)
	teamHandler.Init(r)
	tripHandler.Init(r)

	// 服务检查
	healthHandler := router.NewHealthHandler()
	healthHandler.Init(r)

	// 仅当存在本地构建的前端目录时托管 SPA（前后端分镜像部署时通常不存在）
	staticRoot := filepath.Join("web", "dist")
	indexPath := filepath.Join(staticRoot, "index.html")
	if st, err := os.Stat(indexPath); err == nil && !st.IsDir() {
		r.Static("/assets", filepath.Join(staticRoot, "assets"))
		r.StaticFile("/favicon.ico", filepath.Join(staticRoot, "favicon.ico"))
		r.NoRoute(func(c *gin.Context) {
			c.File(indexPath)
		})
	}

	r.Run(":8080") // listen and serve on 0.0.0.0:8080
}
