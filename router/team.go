package router

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"split_ease/repository"
)

type TeamHandler struct {
	repo *repository.TeamRepository
}

func NewTeamHandler(repo *repository.TeamRepository) *TeamHandler {
	return &TeamHandler{
		repo: repo,
	}
}

func (h *TeamHandler) Init(engine *gin.Engine) {
	g := engine.Group("/team")
	{
		g.POST("/add", h.Add)
		g.POST("/find_by_id", h.FindByID)
		g.POST("/update", h.Update)
		g.POST("/delete", h.Delete)

	}
}

func (h *TeamHandler) Add(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "health"})
}

func (h *TeamHandler) FindByID(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "health"})
}

func (h *TeamHandler) Update(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "health"})
}

func (h *TeamHandler) Delete(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "health"})
}
