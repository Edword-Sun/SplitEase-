package router

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"unicode"

	"github.com/gin-gonic/gin"
	uuid "github.com/satori/go.uuid"

	"split_ease/model"
	"split_ease/repository"
	filter2 "split_ease/router/filter"
	"split_ease/utils/crypto"
)

type UserHandler struct {
	repo   *repository.UserRepository
	crypto *crypto.HashCrypto
}

func NewUserHandler(repo *repository.UserRepository, crypto *crypto.HashCrypto) *UserHandler {
	return &UserHandler{
		repo:   repo,
		crypto: crypto,
	}
}

func (h *UserHandler) Init(engine *gin.Engine) {
	g := engine.Group("/user")
	{
		//g.POST("/add", h.Add)
		g.POST("/register", h.Register)
		g.POST("/login", h.Login)
		g.POST("/find_by_id", h.FindByID)
		g.POST("/update_by_id", h.UpdateByID)
		g.POST("/delete_by_id", h.DeleteByID)

		// new
		g.POST("/list", h.List)
	}
}

func (h *UserHandler) Add(c *gin.Context) {
	request := model.User{}
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

// 注册
func (h *UserHandler) Register(c *gin.Context) {
	request := struct {
		User     model.User `json:"user"`
		IsSimple int        `json:"is_simple"` // 1: false, 2: true
	}{}
	if err := c.ShouldBindJSON(&request); err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	id := uuid.NewV4().String()
	request.User.ID = id
	//request.CreateTime = time.Now()
	//request.UpdateTime = time.Now()

	if request.IsSimple == 1 {
		// 验证密码规范
		if err := validatePassword(request.User.Password); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	// 密码哈希加密
	hashedPassword, err := h.crypto.HashPassword(request.User.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "密码加密失败"})
		return
	}
	request.User.Password = hashedPassword

	if err = h.repo.Create(&request.User); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data":    request,
	})
}

// 登入
func (h *UserHandler) Login(c *gin.Context) {
	var request = struct {
		Identity string `json:"identity"` // 可以是用户名、邮箱或手机号
		Password string `json:"password"`
	}{}

	if err := c.ShouldBindJSON(&request); err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. 查找用户 (支持多种身份标识)
	err, user := h.repo.FindByIdentity(request.Identity)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// 2. 验证密码
	if !h.crypto.CheckPasswordHash(request.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "密码错误"})
		return
	}

	// 登录成功，清除敏感信息后返回
	user.Password = ""
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data":    user,
	})
}

func (h *UserHandler) FindByID(c *gin.Context) {
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

func (h *UserHandler) UpdateByID(c *gin.Context) {
	var request = struct {
		User *model.User `json:"user"`
	}{}

	if err := c.ShouldBindJSON(&request.User); err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	} else if request.User == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "data is required"})
	}

	err := h.repo.UpdateByID(request.User)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": request.User})
}

func (h *UserHandler) DeleteByID(c *gin.Context) {
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

// validatePassword 验证密码规范：至少8位，包含大小写、数字和特殊字符
func validatePassword(password string) error {
	if len(password) < 8 {
		return errors.New("密码长度至少为8位")
	}

	var hasUpper, hasLower, hasNumber, hasSpecial bool
	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsDigit(char):
			hasNumber = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	if !hasUpper {
		return errors.New("密码必须包含大写字母")
	}
	if !hasLower {
		return errors.New("密码必须包含小写字母")
	}
	if !hasNumber {
		return errors.New("密码必须包含数字")
	}
	if !hasSpecial {
		return errors.New("密码必须包含特殊字符")
	}

	return nil
}

// new todo 测试
func (h *UserHandler) List(c *gin.Context) {
	var request = struct {
		Keyword string `json:"keyword"`
		Page    int    `json:"page"`
		Size    int    `json:"size"`
	}{}

	if err := c.ShouldBindJSON(&request); err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	filter := filter2.UserListFilter{}

	filter.Keyword = request.Keyword
	filter.Limit = request.Size
	filter.Offset = (request.Page - 1) * request.Size
	fmt.Println(filter) // todo debug
	err, res, tol := h.repo.List(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "data": res, "total": tol})
}
