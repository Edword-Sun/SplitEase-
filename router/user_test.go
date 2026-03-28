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
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupUserRouterMockDB(t)
	defer sqlDB.Close()

	repo := &repository.UserRepository{DB: db}
	handler := NewUserHandler(repo, crypto.NewHashCrypto())
	r := gin.Default()
	handler.Init(r)

	userID := "all-test-id"
	user := model.User{ID: userID, Name: "All Test User", Password: "Password123!"}

	// 1. Register
	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `user`").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// 2. Find
	rows := sqlmock.NewRows([]string{"id", "name"}).AddRow(userID, user.Name)
	mock.ExpectQuery("SELECT \\* FROM `user` WHERE id = \\?").WithArgs(userID, 1).WillReturnRows(rows)

	// 3. Update
	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `user` SET").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// 4. Delete
	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `user` WHERE id = \\?").WithArgs(userID).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// 5. Login
	hashedPassword, _ := crypto.NewHashCrypto().HashPassword(user.Password)
	rowsLogin := sqlmock.NewRows([]string{"id", "account_name", "password"}).AddRow(userID, user.AccountName, hashedPassword)
	mock.ExpectQuery("SELECT \\* FROM `user` WHERE account_name = \\? OR email = \\? OR phone_number = \\?").
		WithArgs(user.AccountName, user.AccountName, user.AccountName, 1).
		WillReturnRows(rowsLogin)

	// Run Register
	request := struct {
		User     model.User `json:"user"`
		IsSimple int        `json:"is_simple"`
	}{
		User:     user,
		IsSimple: 1,
	}
	bodyRegister, _ := json.Marshal(request)
	reqRegister, _ := http.NewRequest("POST", "/user/register", bytes.NewBuffer(bodyRegister))
	wRegister := httptest.NewRecorder()
	r.ServeHTTP(wRegister, reqRegister)
	assert.Equal(t, http.StatusOK, wRegister.Code)

	// Run Find
	bodyFind, _ := json.Marshal(map[string]string{"id": userID})
	reqFind, _ := http.NewRequest("POST", "/user/find_by_id", bytes.NewBuffer(bodyFind))
	wFind := httptest.NewRecorder()
	r.ServeHTTP(wFind, reqFind)
	assert.Equal(t, http.StatusOK, wFind.Code)

	// Run Update
	bodyUpdate, _ := json.Marshal(user)
	reqUpdate, _ := http.NewRequest("POST", "/user/update_by_id", bytes.NewBuffer(bodyUpdate))
	wUpdate := httptest.NewRecorder()
	r.ServeHTTP(wUpdate, reqUpdate)
	assert.Equal(t, http.StatusOK, wUpdate.Code)

	// Run Delete
	bodyDelete, _ := json.Marshal(map[string]string{"id": userID})
	reqDelete, _ := http.NewRequest("POST", "/user/delete_by_id", bytes.NewBuffer(bodyDelete))
	wDelete := httptest.NewRecorder()
	r.ServeHTTP(wDelete, reqDelete)
	assert.Equal(t, http.StatusOK, wDelete.Code)

	// Run Login
	bodyLogin, _ := json.Marshal(map[string]string{
		"identity": user.AccountName,
		"password": user.Password,
	})
	reqLogin, _ := http.NewRequest("POST", "/user/login", bytes.NewBuffer(bodyLogin))
	wLogin := httptest.NewRecorder()
	r.ServeHTTP(wLogin, reqLogin)
	assert.Equal(t, http.StatusOK, wLogin.Code)

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
		User:     model.User{Name: "Test User", Password: "Password123!"},
		IsSimple: 1, // 1: 需要校验
	}
	body, _ := json.Marshal(request)

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `user`").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

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
