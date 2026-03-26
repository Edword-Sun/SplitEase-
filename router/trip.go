package router

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"split_ease/repository"
)

type TripHandler struct {
	repo *repository.TripRepository
}

func NewTripHandler(repo *repository.TripRepository) *TripHandler {
	return &TripHandler{
		repo: repo,
	}
}

func (h *TripHandler) Init(engine *gin.Engine) {
	g := engine.Group("/trip")
	{
		g.POST("/add", h.Add)
		g.POST("/find_by_id", h.FindByID)
		g.POST("/update", h.Update)
		g.POST("/delete", h.Delete)

	}
}

func (h *TripHandler) Add(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "health"})
}

func (h *TripHandler) FindByID(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "health"})
}

func (h *TripHandler) Update(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "health"})
}

func (h *TripHandler) Delete(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "health"})
}
