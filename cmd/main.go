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

	// 托管前端静态文件 (在生产环境下使用)
	// 使用更精确的路径，避免与 API 路由冲突
	// Vite 编译后的资源通常在 assets 目录下
	r.Static("/assets", "./web/dist/assets")
	r.StaticFile("/favicon.ico", "./web/dist/favicon.ico")

	// 处理单页应用 (SPA) 路由，将所有未匹配的路径（包括根路径 /）重定向到 index.html
	r.NoRoute(func(c *gin.Context) {
		c.File("./web/dist/index.html")
	})

	r.Run(":8080") // listen and serve on 0.0.0.0:8080
}
