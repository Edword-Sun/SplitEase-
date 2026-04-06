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
	"split_ease/utils/crypto"
)

func setupUserRouterMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock, *sql.DB) {
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

func TestUserRouter_All(t *testing.T) {
	// Call individual test functions
	t.Run("TestUserRouter_Register", TestUserRouter_Register)
	t.Run("TestUserRouter_Login", TestUserRouter_Login)
	t.Run("TestUserRouter_FindByID", TestUserRouter_FindByID)
	t.Run("TestUserRouter_UpdateByID", TestUserRouter_UpdateByID)
	t.Run("TestUserRouter_DeleteByID", TestUserRouter_DeleteByID)
	t.Run("TestUserRouter_List", TestUserRouter_List)
}

func TestUserRouter_Register(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupUserRouterMockDB(t)
	defer sqlDB.Close()

	repo := &repository.UserRepository{DB: db}
	handler := NewUserHandler(repo, crypto.NewHashCrypto())
	r := gin.Default()
	handler.Init(r)

	// 模拟带 IsSimple 的请求结构
	request := struct {
		User     model.User `json:"user"`
		IsSimple int        `json:"is_simple"`
	}{
		User: model.User{
			ID:          "test-register-id",
			AccountName: "test_register",
			Password:    "Password123!",
			Name:        "Test Register",
		},
		IsSimple: 1,
	}

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `user`").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	body, _ := json.Marshal(request)
	req, _ := http.NewRequest("POST", "/user/register", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "success", response["message"])
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRouter_Login(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupUserRouterMockDB(t)
	defer sqlDB.Close()

	repo := &repository.UserRepository{DB: db}
	handler := NewUserHandler(repo, crypto.NewHashCrypto())
	r := gin.Default()
	handler.Init(r)

	identity := "test-user"
	password := "Password123!"
	hashedPassword, _ := crypto.NewHashCrypto().HashPassword(password)

	requestBody := map[string]string{
		"identity": identity,
		"password": password,
	}
	body, _ := json.Marshal(requestBody)

	rows := sqlmock.NewRows([]string{"id", "account_name", "password"}).
		AddRow("test-id", identity, hashedPassword)

	mock.ExpectQuery("SELECT \\* FROM `user` WHERE account_name = \\? OR email = \\? OR phone_number = \\?").
		WithArgs(identity, identity, identity, 1).
		WillReturnRows(rows)

	req, _ := http.NewRequest("POST", "/user/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "success", response["message"])
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRouter_FindByID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupUserRouterMockDB(t)
	defer sqlDB.Close()

	repo := &repository.UserRepository{DB: db}
	handler := NewUserHandler(repo, crypto.NewHashCrypto())
	r := gin.Default()
	handler.Init(r)

	userID := "test-uuid"
	requestBody := map[string]string{"id": userID}
	body, _ := json.Marshal(requestBody)

	rows := sqlmock.NewRows([]string{"id", "name"}).AddRow(userID, "Test User")
	mock.ExpectQuery("SELECT \\* FROM `user` WHERE id = \\?").
		WithArgs(userID, 1).
		WillReturnRows(rows)

	req, _ := http.NewRequest("POST", "/user/find_by_id", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "success", response["message"])
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRouter_UpdateByID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupUserRouterMockDB(t)
	defer sqlDB.Close()

	repo := &repository.UserRepository{DB: db}
	handler := NewUserHandler(repo, crypto.NewHashCrypto())
	r := gin.Default()
	handler.Init(r)

	user := model.User{ID: "test-uuid", Name: "Updated User"}
	body, _ := json.Marshal(user)

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `user` SET").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	req, _ := http.NewRequest("POST", "/user/update_by_id", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "success", response["message"])
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRouter_DeleteByID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupUserRouterMockDB(t)
	defer sqlDB.Close()

	repo := &repository.UserRepository{DB: db}
	handler := NewUserHandler(repo, crypto.NewHashCrypto())
	r := gin.Default()
	handler.Init(r)

	userID := "test-uuid"
	requestBody := map[string]string{"id": userID}
	body, _ := json.Marshal(requestBody)

	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `user` WHERE id = \\?").
		WithArgs(userID).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	req, _ := http.NewRequest("POST", "/user/delete_by_id", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "success", response["message"])
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRouter_List(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupUserRouterMockDB(t)
	defer sqlDB.Close()

	repo := &repository.UserRepository{DB: db}
	handler := NewUserHandler(repo, crypto.NewHashCrypto())
	r := gin.Default()
	handler.Init(r)

	// Test case 1: List with keyword and pagination
	listRequest := map[string]interface{}{
		"keyword": "test",
		"page":    1,
		"size":    2,
	}

	mock.ExpectQuery("SELECT count(.+) FROM `user` WHERE \\(account_name LIKE \\? OR name LIKE \\? OR phone_number LIKE \\? OR email LIKE \\?\\)").
		WithArgs("%test%", "%test%", "%test%", "%test%").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(3))

	rows := sqlmock.NewRows([]string{"id", "name", "account_name", "email", "phone_number"}).
		AddRow("list-user-1", "List User 1", "list_user_1", "list1@example.com", "111").
		AddRow("list-user-2", "List User 2", "list_user_2", "list2@example.com", "222")

	mock.ExpectQuery("SELECT \\* FROM `user` WHERE \\(account_name LIKE \\? OR name LIKE \\? OR phone_number LIKE \\? OR email LIKE \\?\\) LIMIT \\?").
		WithArgs("%test%", "%test%", "%test%", "%test%", 2).
		WillReturnRows(rows)

	body, _ := json.Marshal(listRequest)
	req, _ := http.NewRequest("POST", "/user/list", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, float64(0), response["code"])
	assert.Equal(t, float64(3), response["total"])
	assert.Len(t, response["data"], 2)
	assert.NoError(t, mock.ExpectationsWereMet())

	// Test case 2: List without keyword (global search)
	listRequestNoKeyword := map[string]interface{}{
		"keyword": "",
		"page":    1,
		"size":    2,
	}

	mock.ExpectQuery("SELECT count(.+) FROM `user`").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(5))

	rowsNoKeyword := sqlmock.NewRows([]string{"id", "name", "account_name", "email", "phone_number"}).
		AddRow("userA", "User A", "userA_acc", "userA@example.com", "AAA").
		AddRow("userB", "User B", "userB_acc", "userB@example.com", "BBB")

	mock.ExpectQuery("SELECT \\* FROM `user` LIMIT \\?").
		WillReturnRows(rowsNoKeyword)

	bodyNoKeyword, _ := json.Marshal(listRequestNoKeyword)
	reqNoKeyword, _ := http.NewRequest("POST", "/user/list", bytes.NewBuffer(bodyNoKeyword))
	reqNoKeyword.Header.Set("Content-Type", "application/json")
	wNoKeyword := httptest.NewRecorder()
	r.ServeHTTP(wNoKeyword, reqNoKeyword)

	assert.Equal(t, http.StatusOK, wNoKeyword.Code)
	var responseNoKeyword map[string]interface{}
	json.Unmarshal(wNoKeyword.Body.Bytes(), &responseNoKeyword)
	assert.Equal(t, float64(0), responseNoKeyword["code"])
	assert.Equal(t, float64(5), responseNoKeyword["total"])
	assert.Len(t, responseNoKeyword["data"], 2)
	assert.NoError(t, mock.ExpectationsWereMet())

	// Test case 3: No records found
	listRequestNoResult := map[string]interface{}{
		"keyword": "nonexistent",
		"page":    1,
		"size":    10,
	}

	mock.ExpectQuery("SELECT count(.+) FROM `user` WHERE \\(account_name LIKE \\? OR name LIKE \\? OR phone_number LIKE \\? OR email LIKE \\?\\)").
		WithArgs("%nonexistent%", "%nonexistent%", "%nonexistent%", "%nonexistent%").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

	mock.ExpectQuery("SELECT \\* FROM `user` WHERE \\(account_name LIKE \\? OR name LIKE \\? OR phone_number LIKE \\? OR email LIKE \\?\\) LIMIT \\?").
		WithArgs("%nonexistent%", "%nonexistent%", "%nonexistent%", "%nonexistent%", 10).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "account_name", "email", "phone_number"}))

	bodyNoResult, _ := json.Marshal(listRequestNoResult)
	reqNoResult, _ := http.NewRequest("POST", "/user/list", bytes.NewBuffer(bodyNoResult))
	reqNoResult.Header.Set("Content-Type", "application/json")
	wNoResult := httptest.NewRecorder()
	r.ServeHTTP(wNoResult, reqNoResult)

	assert.Equal(t, http.StatusOK, wNoResult.Code)
	var responseNoResult map[string]interface{}
	json.Unmarshal(wNoResult.Body.Bytes(), &responseNoResult)
	assert.Equal(t, float64(0), responseNoResult["code"])
	assert.Equal(t, float64(0), responseNoResult["total"])
	assert.Len(t, responseNoResult["data"], 0)
	assert.NoError(t, mock.ExpectationsWereMet())
}
