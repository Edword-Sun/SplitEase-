package router

import (
	"fmt"
	"log"
	"net/http"

	uuid "github.com/satori/go.uuid"

	"split_ease/model"
	"split_ease/repository"

	"github.com/gin-gonic/gin"
)

type TripHandler struct {
	repo     *repository.TripRepository
	userRepo *repository.UserRepository // for Split
	billRepo *repository.BillRepository // for Split
}

func NewTripHandler(repo *repository.TripRepository,
	userRepo *repository.UserRepository,
	billRepo *repository.BillRepository,
) *TripHandler {
	return &TripHandler{
		repo:     repo,
		userRepo: userRepo,
		billRepo: billRepo,
	}
}

func (h *TripHandler) Init(engine *gin.Engine) {
	g := engine.Group("/trip")
	{
		g.POST("/add", h.Add)
		g.POST("/find_by_id", h.FindByID)
		g.POST("/find_by_creator_id", h.FindByCreatorID)
		g.POST("/update_by_id", h.UpdateByID)
		g.POST("/delete_by_id", h.DeleteByID)

		// split: 分账
		g.POST("/split", h.Split)
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

type FBCIDReq struct {
	CreatorID string `json:"id"`
}

func (h *TripHandler) FindByCreatorID(c *gin.Context) {
	//var request = struct {
	//	CreatorID string `json:"creator_id"`
	//}{}
	var request FBCIDReq

	if err := c.ShouldBindJSON(&request); err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err, res := h.repo.FindByCreatorID(request.CreatorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "trips": res})
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

	c.JSON(http.StatusOK, gin.H{"message": "success"})
}

func (h *TripHandler) Split(c *gin.Context) {
	request := struct {
		TripID string `json:"trip_id"`
	}{}

	if err := c.ShouldBindJSON(&request); err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err, curTrip := h.repo.FindByID(request.TripID)
	if err != nil {
		log.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if curTrip == nil {
		log.Println("数据不存在")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据不存在"})
		return
	}
	curBills := []*model.Bill{}
	err, curBills = h.billRepo.FindByTripID(curTrip.ID)
	if err != nil {
		log.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if len(curBills) == 0 {
		log.Println("该trip没有bill")
		c.JSON(http.StatusOK, gin.H{"message": "该trip没有bill"})
		return
	}

	curMembersID := curTrip.Members
	curMembers := []*model.User{}
	for _, id := range curMembersID {
		var user *model.User
		err, user = h.userRepo.FindByID(id)
		if err != nil {
			log.Println(err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		if user == nil {
			log.Println("从trip-members获取到的user_id查找的user不存在")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "从trip-members获取到的user_id查找的user不存在"})
			return
		}
		curMembers = append(curMembers, user)
	}
	// todo lo.Filter写法
	//curMembers = lo.FilterMap(curMembersID,
	//	func(id string, _ int) (*model.User, bool) {
	//		var user *model.User
	//		err, user = h.userRepo.FindByID(id)
	//		if err != nil {
	//			return nil, false
	//		}
	//		if user == nil {
	//			return nil, false
	//		}
	//		return user, true
	//	})
	//if len(curMembers) != len(curMembersID) {
	//	log.Println("从trip-members获取到的user_id查找的user不存在")
	//	c.JSON(http.StatusInternalServerError, gin.H{"error": "从trip-members获取到的user_id查找的user不存在"})
	//	return
	//}

	// 1. 计算总花费和每个人的支付情况
	var tripAllCosts int64 = 0
	type userPayInfo struct {
		user *model.User
		paid int64
	}
	userPayments := make([]userPayInfo, 0, len(curMembers))

	for _, user := range curMembers {
		var userPaid int64 = 0
		for _, bill := range curBills {
			if bill.Creator == user.ID {
				userPaid += bill.CostCent
			}
		}
		userPayments = append(userPayments, userPayInfo{user: user, paid: userPaid})
		tripAllCosts += userPaid
	}

	// 2. 计算人均及余数 (处理除不尽的情况)
	memberCount := int64(len(curMembers))
	avgCosts := tripAllCosts / memberCount
	remainder := tripAllCosts % memberCount

	// 3. 计算每个人的差额 (balance = 已付 - 应付)
	type userBalance struct {
		user    *model.User
		balance int64
	}
	debtors := []userBalance{}   // 欠钱的人 (负值)
	creditors := []userBalance{} // 该收钱的人 (正值)

	for i, up := range userPayments {
		// 分摊金额：前 remainder 个人多摊 1 分钱 (1角)
		share := avgCosts
		if int64(i) < remainder {
			share += 1
		}

		diff := up.paid - share
		if diff > 0 {
			creditors = append(creditors, userBalance{user: up.user, balance: diff})
		} else if diff < 0 {
			debtors = append(debtors, userBalance{user: up.user, balance: -diff}) // 存正数方便计算
		}
	}

	// 4. 贪心算法匹配转账逻辑
	transactions := []string{}
	i, j := 0, 0
	for i < len(debtors) && j < len(creditors) {
		debtor := &debtors[i]
		creditor := &creditors[j]

		// 取最小值进行转账
		amount := debtor.balance
		if creditor.balance < amount {
			amount = creditor.balance
		}

		if amount > 0 {
			// 格式化输出：A 支付给 B 多少钱 (单位从角转为元显示，100角=1元)
			transaction := fmt.Sprintf("%s 支付给 %s: %.2f 元",
				debtor.user.Name,
				creditor.user.Name,
				float64(amount)/100.0)
			transactions = append(transactions, transaction)
		}

		debtor.balance -= amount
		creditor.balance -= amount

		if debtor.balance == 0 {
			i++
		}
		if creditor.balance == 0 {
			j++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"trip_name":   curTrip.Name,
			"total_costs": toYuan(tripAllCosts), // 结果是字符串 "123.45"
			"avg_costs":   toYuan(avgCosts),
			"details":     transactions,
		},
	})
}

// 在 router/trip.go 中添加或直接在逻辑中使用
func toYuan(jiao int64) string {
	return fmt.Sprintf("%d.%02d", jiao/100, jiao%100)
}
