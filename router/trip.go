package router

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	uuid "github.com/satori/go.uuid"

	"split_ease/model"
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
		g.POST("/update_by_id", h.UpdateByID)
		g.POST("/delete_by_id", h.DeleteByID)

	}
}

func (h *TripHandler) Add(c *gin.Context) {
	request := model.Trip{}
	if err := c.ShouldBindJSON(&request); err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	id := uuid.NewV4().String()
	request.ID = id
	//request.CreateTime = time.Now()
	//request.UpdateTime = time.Now()

	if err := h.repo.Create(&request); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data":    request,
	})
}

func (h *TripHandler) FindByID(c *gin.Context) {
	var request = struct {
		ID string `json:"id"`
	}{}

	if err := c.ShouldBindJSON(&request); err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err, result := h.repo.FindByID(request.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": result})
}

func (h *TripHandler) UpdateByID(c *gin.Context) {
	var request = struct {
		Trip *model.Trip `json:"trip"`
	}{}

	if err := c.ShouldBindJSON(&request.Trip); err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	} else if request.Trip == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "data is required"})
	}

	err := h.repo.UpdateByID(request.Trip)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": request.Trip})
}

func (h *TripHandler) DeleteByID(c *gin.Context) {
	var request = struct {
		ID string `json:"id"`
	}{}

	if err := c.ShouldBindJSON(&request); err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.repo.DeleteByID(request.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": request})
}
