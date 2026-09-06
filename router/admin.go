package router

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	uuid "github.com/satori/go.uuid"

	"split_ease/model"
	"split_ease/repository"
	"split_ease/utils/crypto"
)

type AdminHandler struct {
	userRepo   *repository.UserRepository
	tripRepo   *repository.TripRepository
	billRepo   *repository.BillRepository
	hashCrypto *crypto.HashCrypto
}

func NewAdminHandler(userRepo *repository.UserRepository, tripRepo *repository.TripRepository, billRepo *repository.BillRepository, hashCrypto *crypto.HashCrypto) *AdminHandler {
	return &AdminHandler{
		userRepo:   userRepo,
		tripRepo:   tripRepo,
		billRepo:   billRepo,
		hashCrypto: hashCrypto,
	}
}

func (h *AdminHandler) Init(engine *gin.Engine) {
	g := engine.Group("/admin")
	// 管理员权限检查中间件
	g.Use(h.AdminAuthMiddleware())
	{
		g.POST("/user/list", h.ListUsers)
		g.POST("/user/create", h.CreateUser)
		g.POST("/user/update", h.UpdateUser)
		g.POST("/user/delete", h.DeleteUser)
		g.POST("/user/trips", h.GetUserTrips)
		g.POST("/trip/details", h.GetTripDetails)
	}
}

// AdminAuthMiddleware 检查是否为 admin 账号
func (h *AdminHandler) AdminAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		adminID := c.GetHeader("X-Admin-Account")
		if adminID != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "只有 admin 账号可以访问"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// ListUsers 获取所有用户列表（密码字段返回空，不显示）
func (h *AdminHandler) ListUsers(c *gin.Context) {
	users, err := h.userRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 统一不返回密码哈希，仅展示账号基本信息
	for i := range users {
		users[i].Password = "********"
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data":    users,
	})
}

// CreateUser 后台新增账号
func (h *AdminHandler) CreateUser(c *gin.Context) {
	var user model.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if user.AccountName == "" || user.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "账号名和密码不能为空"})
		return
	}

	// 检查重复
	_, exist := h.userRepo.FindByIdentity(user.AccountName)
	if exist != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "账号名已存在"})
		return
	}

	user.ID = uuid.NewV4().String()
	// 使用 bcrypt 哈希加密
	hashed, err := h.hashCrypto.HashPassword(user.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "加密失败"})
		return
	}
	user.Password = hashed

	if err := h.userRepo.Create(&user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": user})
}

// UpdateUser 后台修改账号
func (h *AdminHandler) UpdateUser(c *gin.Context) {
	var user model.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 如果修改了密码，需要重新哈希加密
	if user.Password != "" && user.Password != "********" {
		hashed, err := h.hashCrypto.HashPassword(user.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "加密失败"})
			return
		}
		user.Password = hashed
	} else {
		// 如果密码是占位符或为空，则不更新密码字段
		// 先获取原有数据以保持密码不变
		err, existing := h.userRepo.FindByID(user.ID)
		if err == nil && existing != nil {
			user.Password = existing.Password
		}
	}

	if err := h.userRepo.UpdateByID(&user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success"})
}

// GetTripDetails 获取旅行的账单和转账详情
func (h *AdminHandler) GetTripDetails(c *gin.Context) {
	var req struct {
		TripID string `json:"trip_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. 获取 Trip 信息
	err, trip := h.tripRepo.FindByID(req.TripID)
	if err != nil || trip == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "旅行不存在"})
		return
	}

	// 2. 获取该 Trip 下的所有账单
	err, bills := h.billRepo.FindByTripID(req.TripID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取账单失败"})
		return
	}

	// 3. 获取所有成员信息以便显示名称
	userNameMap := make(map[string]string)
	for _, mID := range trip.Members {
		if strings.Contains(mID, "virtual") {
			userNameMap[mID] = mID
			continue
		}
		err, u := h.userRepo.FindByID(mID)
		if err == nil && u != nil {
			userNameMap[mID] = u.Name
		} else {
			userNameMap[mID] = "未知用户"
		}
	}

	// 4. 计算分账和转账逻辑 (复用 Split 核心逻辑)
	balanceMap := make(map[string]int64)
	paidMap := make(map[string]int64)
	owedMap := make(map[string]int64)
	for _, mID := range trip.Members {
		balanceMap[mID] = 0
		paidMap[mID] = 0
		owedMap[mID] = 0
	}

	var totalCosts int64 = 0
	for _, bill := range bills {
		participants := bill.InvolvedMembers
		if len(participants) == 0 {
			participants = trip.Members
		}
		if len(participants) == 0 {
			continue
		}

		totalCosts += bill.CostCent
		count := int64(len(participants))
		share := bill.CostCent / count
		remainder := bill.CostCent % count

		var memberTotalShare int64 = 0
		for i, pID := range participants {
			s := share
			if int64(i) < remainder {
				s += 1
			}
			if _, ok := balanceMap[pID]; ok {
				balanceMap[pID] -= s
				owedMap[pID] += s
				memberTotalShare += s
			}
		}

		if _, ok := balanceMap[bill.PayerID]; ok {
			balanceMap[bill.PayerID] += memberTotalShare
			paidMap[bill.PayerID] += memberTotalShare
		}
	}

	// 贪心算法计算转账
	type memberBal struct {
		id      string
		name    string
		balance int64
	}
	debtors := []memberBal{}
	creditors := []memberBal{}
	for _, mID := range trip.Members {
		bal := balanceMap[mID]
		name := userNameMap[mID]
		if bal > 0 {
			creditors = append(creditors, memberBal{mID, name, bal})
		} else if bal < 0 {
			debtors = append(debtors, memberBal{mID, name, -bal})
		}
	}

	transactions := []string{}
	i, j := 0, 0
	for i < len(debtors) && j < len(creditors) {
		d, c := &debtors[i], &creditors[j]
		amount := d.balance
		if c.balance < amount {
			amount = c.balance
		}
		if amount > 0 {
			transactions = append(transactions, fmt.Sprintf("%s 支付给 %s: %.2f 元",
				strings.TrimPrefix(d.name, "virtual/"),
				strings.TrimPrefix(c.name, "virtual/"),
				float64(amount)/100.0))
		}
		d.balance -= amount
		c.balance -= amount
		if d.balance == 0 {
			i++
		}
		if c.balance == 0 {
			j++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"trip":         trip,
			"bills":        bills,
			"transactions": transactions,
			"total_costs":  fmt.Sprintf("%.2f", float64(totalCosts)/100.0),
			"user_names":   userNameMap,
		},
	})
}

// GetUserTrips 获取用户关联的 Trip（创建的与参与的）
func (h *AdminHandler) GetUserTrips(c *gin.Context) {
	var req struct {
		UserID string `json:"user_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.UserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户 ID 不能为空"})
		return
	}

	// 1. 获取创建的 Trip
	err, createdTrips := h.tripRepo.FindByCreatorID(req.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取创建的旅行失败"})
		return
	}
	if createdTrips == nil {
		createdTrips = make([]*model.Trip, 0)
	}

	// 2. 获取参与的 Trip
	err, participatedTrips := h.tripRepo.FindByMemberID(req.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取参与的旅行失败"})
		return
	}

	// 3. 排除掉自己创建的（因为 FindByMemberID 可能会包含创建者）
	finalParticipated := make([]*model.Trip, 0)
	for _, t := range participatedTrips {
		if t.Creator != req.UserID {
			finalParticipated = append(finalParticipated, t)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"created":      createdTrips,
			"participated": finalParticipated,
		},
	})
}

// DeleteUser 后台删除账号
func (h *AdminHandler) DeleteUser(c *gin.Context) {
	var req struct {
		ID string `json:"id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.userRepo.DeleteByID(req.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success"})
}
