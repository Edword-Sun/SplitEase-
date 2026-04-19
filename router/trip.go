package router

import (
	"fmt"
	"log"
	"net/http"
	"strings"

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
		// new
		g.POST("/find_by_member", h.FindByMember)
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

// for debug
//type FBCIDReq struct {
//	CreatorID string `json:"creator_id"`
//}

func (h *TripHandler) FindByCreatorID(c *gin.Context) {
	var request = struct {
		CreatorID string `json:"creator_id"`
	}{}
	//var request FBCIDReq

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

	// 级联删除：先删除该旅行下的所有账单
	if err := h.billRepo.DeleteByTripID(request.ID); err != nil {
		log.Println("级联删除账单失败:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "级联删除账单失败"})
		return
	}

	// 删除旅行
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
	virtualMembers := []string{}
	for _, id := range curMembersID {
		if strings.Contains(id, "virtual") {
			virtualMembers = append(virtualMembers, id)
			log.Println("虚拟成员: ", id)
			continue
		}
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

	// 1. 使用 Map 记录每个人的净差额 (balance = 已付 - 应付)
	balanceMap := make(map[string]int64)
	userNameMap := make(map[string]string)
	paidMap := make(map[string]int64) // 总支出
	owedMap := make(map[string]int64) // 总应付

	for _, user := range curMembers {
		balanceMap[user.ID] = 0
		userNameMap[user.ID] = user.Name
		paidMap[user.ID] = 0
		owedMap[user.ID] = 0
	}
	for _, v := range virtualMembers {
		balanceMap[v] = 0
		userNameMap[v] = v
		paidMap[v] = 0
		owedMap[v] = 0
	}

	type BillSplitMemberDetail struct {
		Name  string `json:"name"`
		Share string `json:"share"`
	}
	type BillSplitDetail struct {
		BillName   string                  `json:"bill_name"`
		PayerName  string                  `json:"payer_name"`
		TotalCosts string                  `json:"total_costs"`
		Splits     []BillSplitMemberDetail `json:"splits"`
	}
	type UserSummary struct {
		Name         string `json:"name"`
		TotalPaid    string `json:"total_paid"`    // 总支出
		TotalShould  string `json:"total_should"`  // 总应付
		FinalBalance string `json:"final_balance"` // 最终差额
	}
	billDetails := []BillSplitDetail{}

	var tripAllCosts int64 = 0
	for _, bill := range curBills {
		// 参与者分摊：如果未指定参与者，默认全员分摊
		participants := bill.InvolvedMembers
		if len(participants) == 0 {
			participants = curTrip.Members
		}

		if len(participants) == 0 {
			continue
		}

		// 累加总支出
		tripAllCosts += bill.CostCent

		// 计算份额
		count := int64(len(participants))
		share := bill.CostCent / count
		remainder := bill.CostCent % count

		// 记录当前账单的详细分摊
		currentBillSplits := []BillSplitMemberDetail{}

		// 只有当分摊者是当前成员时，这部分钱才计入内部结算
		var memberTotalShare int64 = 0
		for i, pID := range participants {
			s := share
			if int64(i) < remainder {
				s += 1
			}

			// 如果是当前成员，记录分摊详情
			if name, ok := userNameMap[pID]; ok {
				balanceMap[pID] -= s
				owedMap[pID] += s // 记录总应付
				memberTotalShare += s
				currentBillSplits = append(currentBillSplits, BillSplitMemberDetail{
					Name:  name,
					Share: fmt.Sprintf("%.2f", float64(s)/100.0),
				})
			}
		}

		// 如果付款人是当前成员，他获得的信用仅限于他为“当前组成员”垫付的部分
		if _, ok := balanceMap[bill.PayerID]; ok {
			balanceMap[bill.PayerID] += memberTotalShare
			paidMap[bill.PayerID] += memberTotalShare // 记录他为团队垫付的总额
		}

		// 添加账单明细
		payerName := userNameMap[bill.PayerID]
		if payerName == "" {
			payerName = "外部人员"
		}
		billDetails = append(billDetails, BillSplitDetail{
			BillName:   bill.Name,
			PayerName:  payerName,
			TotalCosts: fmt.Sprintf("%.2f", float64(bill.CostCent)/100.0),
			Splits:     currentBillSplits,
		})
	}

	// 生成用户财务汇总
	userSummaries := []UserSummary{}
	for _, mID := range curTrip.Members {
		name := userNameMap[mID]
		if name == "" {
			continue
		}
		userSummaries = append(userSummaries, UserSummary{
			Name:         strings.TrimPrefix(name, "virtual/"),
			TotalPaid:    fmt.Sprintf("%.2f", float64(paidMap[mID])/100.0),
			TotalShould:  fmt.Sprintf("%.2f", float64(owedMap[mID])/100.0),
			FinalBalance: fmt.Sprintf("%.2f", float64(balanceMap[mID])/100.0),
		})
	}

	// 2. 收集债务人和债权人
	type memberBalance struct {
		id      string
		name    string
		balance int64
	}
	debtors := []memberBalance{}   // 欠钱的人 (负值)
	creditors := []memberBalance{} // 该收钱的人 (正值)

	// 按 Trip 成员顺序遍历，保证稳定性并涵盖虚拟成员
	for _, mID := range curTrip.Members {
		balance := balanceMap[mID]
		name := userNameMap[mID]
		if name == "" {
			continue
		}

		if balance > 0 {
			creditors = append(creditors, memberBalance{id: mID, name: name, balance: balance})
		} else if balance < 0 {
			debtors = append(debtors, memberBalance{id: mID, name: name, balance: -balance})
		}
	}

	// 3. 贪心算法匹配转账逻辑
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
			// 格式化输出：A 支付给 B 多少钱
			// 处理虚拟成员名称显示：去掉 virtual/ 前缀
			displayNameFrom := strings.TrimPrefix(debtor.name, "virtual/")
			displayNameTo := strings.TrimPrefix(creditor.name, "virtual/")

			transaction := fmt.Sprintf("%s 支付给 %s: %.2f 元",
				displayNameFrom,
				displayNameTo,
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
			"trip_name":    curTrip.Name,
			"total_costs":  toYuan(tripAllCosts),
			"details":      transactions,
			"bill_details": billDetails,
			"user_summary": userSummaries,
		},
	})
}

// 在 router/trip.go 中添加或直接在逻辑中使用
func toYuan(jiao int64) string {
	return fmt.Sprintf("%d.%02d", jiao/100, jiao%100)
}

// new todo 测试
func (h *TripHandler) FindByMember(c *gin.Context) {
	request := struct {
		MemberID string `json:"member_id"`
	}{}

	if err := c.ShouldBindJSON(&request); err != nil {
		log.Println(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err, trips := h.repo.FindByMemberID(request.MemberID)
	if err != nil {
		log.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": trips})
}
