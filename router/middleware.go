package router

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"split_ease/repository"
)

// Cors 跨源资源共享中间件
// 解决浏览器的同源策略限制，允许前端（如 localhost:3000）跨域访问后端接口
func Cors() gin.HandlerFunc {
	return func(c *gin.Context) {
		method := c.Request.Method
		origin := c.Request.Header.Get("Origin")
		if origin != "" {
			// 允许发起的跨域请求源。当 Allow-Credentials 为 true 时，不能使用通配符 *
			c.Header("Access-Control-Allow-Origin", origin)
		}
		// 允许前端在请求头中携带的自定义字段
		c.Header("Access-Control-Allow-Headers", "Content-Type,AccessToken,X-CSRF-Token, Authorization, Token")
		// 允许的 HTTP 操作方法
		c.Header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, UPDATE")
		// 允许前端访问的响应头字段
		c.Header("Access-Control-Expose-Headers", "Content-Length, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Content-Type")
		// 关键：允许跨域请求携带凭证（如 Cookie 或 Session ID）
		c.Header("Access-Control-Allow-Credentials", "true")

		// 处理浏览器的预检请求 (Preflight Request)
		// 当请求包含自定义 Header 或方法时，浏览器会先发一个 OPTIONS 请求询问是否允许
		if method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
		}
		c.Next()
	}
}

func AuthRequired(sessionRepo *repository.SessionRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 获取 Session ID
		// 优先从 Header 获取 (适合移动端/API)，其次从 Cookie 获取 (适合浏览器)
		sessionID := c.GetHeader("Authorization")
		if sessionID == "" {
			sessionID, _ = c.Cookie("session_id")
		}

		if sessionID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
			c.Abort()
			return
		}

		// 2. 数据库查询验证
		err, session := sessionRepo.FindByID(sessionID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "登录已失效"})
			c.Abort()
			return
		}

		// 3. 校验过期时间
		if time.Now().After(session.ExpiresAt) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "登录已过期，请重新登录"})
			c.Abort()
			return
		}

		// 4. 将用户信息注入上下文
		c.Set("session_id", session.ID)
		c.Set("user_id", session.UserID)
		c.Set("user_name", session.UserName)
		c.Set("session", session)

		c.Next()
	}
}
