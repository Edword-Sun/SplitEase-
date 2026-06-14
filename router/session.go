package router

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"split_ease/repository"
)

type SessionHandler struct {
	repo *repository.SessionRepository
}

func NewSessionHandler(repo *repository.SessionRepository) *SessionHandler {
	return &SessionHandler{
		repo: repo,
	}
}

func (h *SessionHandler) Init(engine *gin.Engine) {
	//g := engine.Group("/session")
	////g.Use(AuthRequired())
	//{
	//}
}

func (h *SessionHandler) Find(c *gin.Context) {
	req := struct {
		ID     string `json:"id"`
		UserID string `json:"user_id"`
	}{}
	err := c.ShouldBindJSON(&req)
	if err != nil {
		log.Println("传入参数错误")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// 用 id 查session
	if len(req.ID) > 0 {
		err, data := h.repo.FindByID(req.ID)
		if err != nil {
			log.Println("查找session错误用id: ", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		c.JSON(http.StatusOK, gin.H{"data": data})
		return
	}
	// 用 user id 查session
	if len(req.UserID) > 0 {
		err, data := h.repo.FindByUserID(req.UserID)
		if err != nil {
			log.Println("查找session错误用user id: ", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		c.JSON(http.StatusOK, gin.H{"data": data})
		return
	}

	// id user_id都为空，不查数据，直接返回
	if len(req.UserID) <= 0 && len(req.UserID) < 0 {
		log.Println("id user_id都为空，直接返回")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "id user_id都为空，直接返回"})
		return
	}

	// 正常不应该到这里来
	log.Println("未知错误，查看日志")
	c.JSON(http.StatusInternalServerError, gin.H{"error": "未知错误，查看日志"})
	return
}
