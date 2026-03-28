package router

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	uuid "github.com/satori/go.uuid"

	"split_ease/model"
	"split_ease/repository"
)

type BillHandler struct {
	repo *repository.BillRepository
}

func NewBillHandler(repo *repository.BillRepository) *BillHandler {
	return &BillHandler{
		repo: repo,
	}
}

func (h *BillHandler) Init(engine *gin.Engine) {
	g := engine.Group("/bill")
	{
		g.POST("/add", h.Add)
		g.POST("/find_by_id", h.FindByID)
		g.POST("/update_by_id", h.UpdateByID)
		g.POST("/delete_by_id", h.DeleteByID)

		// todo list: creator, create_time, category,
	}
}

func (h *BillHandler) Add(c *gin.Context) {
	request := model.Bill{}
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

func (h *BillHandler) FindByID(c *gin.Context) {
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

func (h *BillHandler) UpdateByID(c *gin.Context) {
	var request = struct {
		Bill *model.Bill `json:"bill"`
	}{}

	if err := c.ShouldBindJSON(&request.Bill); err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	} else if request.Bill == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "data is required"})
	}

	err := h.repo.UpdateByID(request.Bill)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": request.Bill})
}

func (h *BillHandler) DeleteByID(c *gin.Context) {
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

	c.JSON(http.StatusOK, gin.H{"message": "success"})
}
