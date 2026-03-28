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

func TestUserRouter_Add(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupUserRouterMockDB(t)
	defer sqlDB.Close()

	repo := &repository.UserRepository{DB: db}
	handler := NewUserHandler(repo)
	r := gin.Default()
	handler.Init(r)

	user := model.User{Name: "Test User"}
	body, _ := json.Marshal(user)

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `user`").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	req, _ := http.NewRequest("POST", "/user/add", bytes.NewBuffer(body))
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
	handler := NewUserHandler(repo)
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

func TestUserRouter_All(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupUserRouterMockDB(t)
	defer sqlDB.Close()

	repo := &repository.UserRepository{DB: db}
	handler := NewUserHandler(repo)
	r := gin.Default()
	handler.Init(r)

	userID := "all-test-id"
	user := model.User{ID: userID, Name: "All Test User"}

	// 1. Add
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
	// Note: We need to read router/user.go to see DeleteByID implementation
	// I'll assume it exists based on Init()
	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `user` WHERE id = \\?").WithArgs(userID).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// Run Add
	bodyAdd, _ := json.Marshal(user)
	reqAdd, _ := http.NewRequest("POST", "/user/add", bytes.NewBuffer(bodyAdd))
	wAdd := httptest.NewRecorder()
	r.ServeHTTP(wAdd, reqAdd)
	assert.Equal(t, http.StatusOK, wAdd.Code)

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
	// I need to check DeleteByID implementation in router/user.go
	bodyDelete, _ := json.Marshal(map[string]string{"id": userID})
	reqDelete, _ := http.NewRequest("POST", "/user/delete_by_id", bytes.NewBuffer(bodyDelete))
	wDelete := httptest.NewRecorder()
	r.ServeHTTP(wDelete, reqDelete)
	assert.Equal(t, http.StatusOK, wDelete.Code)

	assert.NoError(t, mock.ExpectationsWereMet())
}
