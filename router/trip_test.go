package router

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"split_ease/model"
	"split_ease/repository"
)

func setupTripRouterMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock, *sql.DB) {
	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to open sqlmock database: %v", err)
	}

	gormDB, err := gorm.Open(mysql.New(mysql.Config{
		Conn:                      sqlDB,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open gorm database: %v", err)
	}

	return gormDB, mock, sqlDB
}

func TestTripRouter_All(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupTripRouterMockDB(t)
	defer sqlDB.Close()

	tripRepo := &repository.TripRepository{DB: db}
	userRepo := &repository.UserRepository{DB: db}
	billRepo := &repository.BillRepository{DB: db}
	handler := NewTripHandler(tripRepo, userRepo, billRepo)
	r := gin.Default()
	handler.Init(r)

	tripID := "all-test-id"
	trip := model.Trip{ID: tripID, Name: "All Test Trip"}

	// 1. Add
	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `trip`").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// 2. Find
	rows := sqlmock.NewRows([]string{"id", "name"}).AddRow(tripID, trip.Name)
	mock.ExpectQuery("SELECT \\* FROM `trip` WHERE id = \\?").WithArgs(tripID, 1).WillReturnRows(rows)

	// 2.1 FindByCreatorID
	creatorID := "all-test-creator-id"
	rowsCreator := sqlmock.NewRows([]string{"id", "name", "creator_id"}).AddRow(tripID, trip.Name, creatorID)
	mock.ExpectQuery("SELECT \\* FROM `trip` WHERE creator_id = \\?").WithArgs(creatorID).WillReturnRows(rowsCreator)

	// 3. Update
	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `trip` SET").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// 4. Split
	mock.ExpectQuery("SELECT \\* FROM `trip` WHERE id = \\?").WithArgs(tripID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "members"}).AddRow(tripID, trip.Name, `["user-1"]`))
	mock.ExpectQuery("SELECT \\* FROM `bill` WHERE trip_id = \\?").WithArgs(tripID).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "cost_cent", "trip_id"}).
			AddRow("bill-1", "Test Bill", 1000, tripID))
	mock.ExpectQuery("SELECT \\* FROM `user` WHERE id = \\?").WithArgs("user-1", 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name"}).AddRow("user-1", "Test User"))

	// 5. Delete
	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `trip` WHERE id = \\?").WithArgs(tripID).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// Run Add
	bodyAdd, _ := json.Marshal(trip)
	reqAdd, _ := http.NewRequest("POST", "/trip/add", bytes.NewBuffer(bodyAdd))
	wAdd := httptest.NewRecorder()
	r.ServeHTTP(wAdd, reqAdd)
	assert.Equal(t, http.StatusOK, wAdd.Code)

	// Run Find
	bodyFind, _ := json.Marshal(map[string]string{"id": tripID})
	reqFind, _ := http.NewRequest("POST", "/trip/find_by_id", bytes.NewBuffer(bodyFind))
	wFind := httptest.NewRecorder()
	r.ServeHTTP(wFind, reqFind)
	assert.Equal(t, http.StatusOK, wFind.Code)

	// Run FindByCreatorID
	bodyFindCreator, _ := json.Marshal(map[string]string{"creator_id": creatorID})
	reqFindCreator, _ := http.NewRequest("POST", "/trip/find_by_creator_id", bytes.NewBuffer(bodyFindCreator))
	wFindCreator := httptest.NewRecorder()
	r.ServeHTTP(wFindCreator, reqFindCreator)
	assert.Equal(t, http.StatusOK, wFindCreator.Code)

	// Run Update
	bodyUpdate, _ := json.Marshal(trip)
	reqUpdate, _ := http.NewRequest("POST", "/trip/update_by_id", bytes.NewBuffer(bodyUpdate))
	wUpdate := httptest.NewRecorder()
	r.ServeHTTP(wUpdate, reqUpdate)
	assert.Equal(t, http.StatusOK, wUpdate.Code)

	// Run Split
	bodySplit, _ := json.Marshal(map[string]string{"trip_id": tripID})
	reqSplit, _ := http.NewRequest("POST", "/trip/split", bytes.NewBuffer(bodySplit))
	wSplit := httptest.NewRecorder()
	r.ServeHTTP(wSplit, reqSplit)
	assert.Equal(t, http.StatusOK, wSplit.Code)

	// Run Delete
	bodyDelete, _ := json.Marshal(map[string]string{"id": tripID})
	reqDelete, _ := http.NewRequest("POST", "/trip/delete_by_id", bytes.NewBuffer(bodyDelete))
	wDelete := httptest.NewRecorder()
	r.ServeHTTP(wDelete, reqDelete)
	assert.Equal(t, http.StatusOK, wDelete.Code)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTripHandler_FindByCreatorID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupTripRouterMockDB(t)
	defer sqlDB.Close()

	tripRepo := &repository.TripRepository{DB: db}
	userRepo := &repository.UserRepository{DB: db}
	billRepo := &repository.BillRepository{DB: db}
	handler := NewTripHandler(tripRepo, userRepo, billRepo)
	r := gin.Default()
	handler.Init(r)

	creatorID := "test-creator-id"
	rows := sqlmock.NewRows([]string{"id", "name", "creator"}).
		AddRow("trip-1", "Trip 1", creatorID).
		AddRow("trip-2", "Trip 2", creatorID)

	mock.ExpectQuery("SELECT \\* FROM `trip` WHERE creator_id = \\?").
		WithArgs(creatorID).
		WillReturnRows(rows)

	body, _ := json.Marshal(map[string]string{"creator_id": creatorID})
	req, _ := http.NewRequest("POST", "/trip/find_by_creator_id", bytes.NewBuffer(body))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "success", response["message"])
	assert.NotNil(t, response["trips"])
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTripHandler_Add(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupTripRouterMockDB(t)
	defer sqlDB.Close()

	tripRepo := &repository.TripRepository{DB: db}
	userRepo := &repository.UserRepository{DB: db}
	billRepo := &repository.BillRepository{DB: db}
	handler := NewTripHandler(tripRepo, userRepo, billRepo)
	r := gin.Default()
	handler.Init(r)

	trip := model.Trip{Name: "Test Trip"}
	body, _ := json.Marshal(trip)

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `trip`").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	req, _ := http.NewRequest("POST", "/trip/add", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTripRouter_FindByID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupTripRouterMockDB(t)
	defer sqlDB.Close()

	tripRepo := &repository.TripRepository{DB: db}
	userRepo := &repository.UserRepository{DB: db}
	billRepo := &repository.BillRepository{DB: db}
	handler := NewTripHandler(tripRepo, userRepo, billRepo)
	r := gin.Default()
	handler.Init(r)

	tripID := "test-id"
	body, _ := json.Marshal(map[string]string{"id": tripID})

	rows := sqlmock.NewRows([]string{"id", "name"}).AddRow(tripID, "Test Trip")
	mock.ExpectQuery("SELECT \\* FROM `trip` WHERE id = \\?").WithArgs(tripID, 1).WillReturnRows(rows)

	req, _ := http.NewRequest("POST", "/trip/find_by_id", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTripRouter_UpdateByID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupTripRouterMockDB(t)
	defer sqlDB.Close()

	tripRepo := &repository.TripRepository{DB: db}
	userRepo := &repository.UserRepository{DB: db}
	billRepo := &repository.BillRepository{DB: db}
	handler := NewTripHandler(tripRepo, userRepo, billRepo)
	r := gin.Default()
	handler.Init(r)

	trip := model.Trip{ID: "test-id", Name: "Updated Trip"}
	body, _ := json.Marshal(trip)

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `trip` SET").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	req, _ := http.NewRequest("POST", "/trip/update_by_id", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTripRouter_DeleteByID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupTripRouterMockDB(t)
	defer sqlDB.Close()

	tripRepo := &repository.TripRepository{DB: db}
	userRepo := &repository.UserRepository{DB: db}
	billRepo := &repository.BillRepository{DB: db}
	handler := NewTripHandler(tripRepo, userRepo, billRepo)
	r := gin.Default()
	handler.Init(r)

	tripID := "test-id"
	body, _ := json.Marshal(map[string]string{"id": tripID})

	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `trip` WHERE id = \\?").WithArgs(tripID).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	req, _ := http.NewRequest("POST", "/trip/delete_by_id", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTripRouter_Split(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupTripRouterMockDB(t)
	defer sqlDB.Close()

	// 1. 初始化 Mock Repositories
	tripRepo := &repository.TripRepository{DB: db}
	userRepo := &repository.UserRepository{DB: db}
	billRepo := &repository.BillRepository{DB: db}

	handler := NewTripHandler(tripRepo, userRepo, billRepo)
	r := gin.Default()
	handler.Init(r)

	// 2. 准备测试数据
	tripID := "trip-123"
	user1ID := "user-1"
	user2ID := "user-2"

	curTrip := &model.Trip{
		ID:      tripID,
		Name:    "Test Trip",
		Members: []string{user1ID, user2ID},
	}

	user1 := &model.User{ID: user1ID, Name: "Alice"}
	user2 := &model.User{ID: user2ID, Name: "Bob"}

	// 3. 设置 Mock 期望
	// 3.1 查找 Trip
	rowsTrip := sqlmock.NewRows([]string{"id", "name", "members"}).
		AddRow(curTrip.ID, curTrip.Name, `["user-1", "user-2"]`)
	mock.ExpectQuery("SELECT \\* FROM `trip` WHERE id = \\?").WithArgs(tripID, 1).WillReturnRows(rowsTrip)

	// 3.2 查找 Bills
	rowsBills := sqlmock.NewRows([]string{"id", "name", "cost_cent", "trip_id", "creator"}).
		AddRow("bill-1", "Dinner", 10000, tripID, user1ID). // Alice 支付 10000 (100元)
		AddRow("bill-2", "Drink", 2000, tripID, user2ID)    // Bob 支付 2000 (20元)
	mock.ExpectQuery("SELECT \\* FROM `bill` WHERE trip_id = \\?").WithArgs(tripID).WillReturnRows(rowsBills)

	// 3.3 查找 Users
	rowsUser1 := sqlmock.NewRows([]string{"id", "name"}).AddRow(user1.ID, user1.Name)
	mock.ExpectQuery("SELECT \\* FROM `user` WHERE id = \\?").WithArgs(user1ID, 1).WillReturnRows(rowsUser1)

	rowsUser2 := sqlmock.NewRows([]string{"id", "name"}).AddRow(user2.ID, user2.Name)
	mock.ExpectQuery("SELECT \\* FROM `user` WHERE id = \\?").WithArgs(user2ID, 1).WillReturnRows(rowsUser2)

	// 4. 执行请求
	body, _ := json.Marshal(map[string]string{"trip_id": tripID})
	req, _ := http.NewRequest("POST", "/trip/split", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// 5. 验证结果
	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	data := response["data"].(map[string]interface{})

	// 总花费：10000 + 2000 = 12000 (120元)
	assert.Equal(t, "120.00", data["total_costs"])
	// 人均：12000 / 2 = 6000 (60元)
	assert.Equal(t, "60.00", data["avg_costs"])

	// 验证明细：Bob 需要支付给 Alice 40元 (60 - 20 = 40)
	details := data["details"].([]interface{})
	assert.Len(t, details, 1)
	assert.Contains(t, details[0], "Bob 支付给 Alice: 40.00 元")

	assert.NoError(t, mock.ExpectationsWereMet())
}
