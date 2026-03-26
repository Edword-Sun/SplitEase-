package router

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"split_ease/repository"
)

type UserHandler struct {
	repo *repository.UserRepository
}

func NewUserHandler(repo *repository.UserRepository) *UserHandler {
	return &UserHandler{
		repo: repo,
	}
}

func (h *UserHandler) Init(engine *gin.Engine) {
	g := engine.Group("/user")
	{
		g.POST("/add", h.Add)
		g.POST("/find_by_id", h.FindByID)
		g.POST("/update", h.Update)
		g.POST("/delete", h.Delete)

	}
}

func (h *UserHandler) Add(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "health"})
}

func (h *UserHandler) FindByID(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "health"})
}

func (h *UserHandler) Update(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "health"})
}

func (h *UserHandler) Delete(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "health"})
}
