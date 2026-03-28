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

func setupBillRouterMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock, *sql.DB) {
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

func TestBillRouter_All(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupBillRouterMockDB(t)
	defer sqlDB.Close()

	repo := &repository.BillRepository{DB: db}
	handler := NewBillHandler(repo)
	r := gin.Default()
	handler.Init(r)

	billID := "all-test-id"
	bill := model.Bill{ID: billID, Name: "All Test Bill", CostCent: 100}

	// 1. Add
	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `bill`").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// 2. Find
	rows := sqlmock.NewRows([]string{"id", "name", "cost_cent"}).AddRow(billID, bill.Name, bill.CostCent)
	mock.ExpectQuery("SELECT \\* FROM `bill` WHERE id = \\?").WithArgs(billID, 1).WillReturnRows(rows)

	// 3. Update
	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `bill` SET").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// 4. Delete
	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `bill` WHERE id = \\?").WithArgs(billID).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// Run Add
	bodyAdd, _ := json.Marshal(bill)
	reqAdd, _ := http.NewRequest("POST", "/bill/add", bytes.NewBuffer(bodyAdd))
	wAdd := httptest.NewRecorder()
	r.ServeHTTP(wAdd, reqAdd)
	assert.Equal(t, http.StatusOK, wAdd.Code)

	// Run Find
	bodyFind, _ := json.Marshal(map[string]string{"id": billID})
	reqFind, _ := http.NewRequest("POST", "/bill/find_by_id", bytes.NewBuffer(bodyFind))
	wFind := httptest.NewRecorder()
	r.ServeHTTP(wFind, reqFind)
	assert.Equal(t, http.StatusOK, wFind.Code)

	// Run Update
	bodyUpdate, _ := json.Marshal(bill)
	reqUpdate, _ := http.NewRequest("POST", "/bill/update_by_id", bytes.NewBuffer(bodyUpdate))
	wUpdate := httptest.NewRecorder()
	r.ServeHTTP(wUpdate, reqUpdate)
	assert.Equal(t, http.StatusOK, wUpdate.Code)

	// Run Delete
	bodyDelete, _ := json.Marshal(map[string]string{"id": billID})
	reqDelete, _ := http.NewRequest("POST", "/bill/delete_by_id", bytes.NewBuffer(bodyDelete))
	wDelete := httptest.NewRecorder()
	r.ServeHTTP(wDelete, reqDelete)
	assert.Equal(t, http.StatusOK, wDelete.Code)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestBillRouter_Add(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupBillRouterMockDB(t)
	defer sqlDB.Close()

	repo := &repository.BillRepository{DB: db}
	handler := NewBillHandler(repo)
	r := gin.Default()
	handler.Init(r)

	bill := model.Bill{Name: "Test Bill", CostCent: 100}
	body, _ := json.Marshal(bill)

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `bill`").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	req, _ := http.NewRequest("POST", "/bill/add", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestBillRouter_FindByID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupBillRouterMockDB(t)
	defer sqlDB.Close()

	repo := &repository.BillRepository{DB: db}
	handler := NewBillHandler(repo)
	r := gin.Default()
	handler.Init(r)

	billID := "test-id"
	body, _ := json.Marshal(map[string]string{"id": billID})

	rows := sqlmock.NewRows([]string{"id", "name"}).AddRow(billID, "Test Bill")
	mock.ExpectQuery("SELECT \\* FROM `bill` WHERE id = \\?").WithArgs(billID, 1).WillReturnRows(rows)

	req, _ := http.NewRequest("POST", "/bill/find_by_id", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestBillRouter_UpdateByID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupBillRouterMockDB(t)
	defer sqlDB.Close()

	repo := &repository.BillRepository{DB: db}
	handler := NewBillHandler(repo)
	r := gin.Default()
	handler.Init(r)

	bill := model.Bill{ID: "test-id", Name: "Updated Bill"}
	body, _ := json.Marshal(bill)

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `bill` SET").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	req, _ := http.NewRequest("POST", "/bill/update_by_id", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestBillRouter_DeleteByID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupBillRouterMockDB(t)
	defer sqlDB.Close()

	repo := &repository.BillRepository{DB: db}
	handler := NewBillHandler(repo)
	r := gin.Default()
	handler.Init(r)

	billID := "test-id"
	body, _ := json.Marshal(map[string]string{"id": billID})

	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `bill` WHERE id = \\?").WithArgs(billID).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	req, _ := http.NewRequest("POST", "/bill/delete_by_id", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.NoError(t, mock.ExpectationsWereMet())
}
