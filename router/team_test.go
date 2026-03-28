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

func setupTeamRouterMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock, *sql.DB) {
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

func TestTeamRouter_All(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock, sqlDB := setupTeamRouterMockDB(t)
	defer sqlDB.Close()

	repo := &repository.TeamRepository{DB: db}
	handler := NewTeamHandler(repo)
	r := gin.Default()
	handler.Init(r)

	teamID := "all-test-id"
	team := model.Team{ID: teamID, Name: "All Test Team"}

	// 1. Add
	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `team`").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// 2. Find
	rows := sqlmock.NewRows([]string{"id", "name"}).AddRow(teamID, team.Name)
	mock.ExpectQuery("SELECT \\* FROM `team` WHERE id = \\?").WithArgs(teamID, 1).WillReturnRows(rows)

	// 3. Update
	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `team` SET").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// 4. Delete
	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `team` WHERE id = \\?").WithArgs(teamID).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// Run Add
	bodyAdd, _ := json.Marshal(team)
	reqAdd, _ := http.NewRequest("POST", "/team/add", bytes.NewBuffer(bodyAdd))
	wAdd := httptest.NewRecorder()
	r.ServeHTTP(wAdd, reqAdd)
	assert.Equal(t, http.StatusOK, wAdd.Code)

	// Run Find
	bodyFind, _ := json.Marshal(map[string]string{"id": teamID})
	reqFind, _ := http.NewRequest("POST", "/team/find_by_id", bytes.NewBuffer(bodyFind))
	wFind := httptest.NewRecorder()
	r.ServeHTTP(wFind, reqFind)
	assert.Equal(t, http.StatusOK, wFind.Code)

	// Run Update
	bodyUpdate, _ := json.Marshal(team)
	reqUpdate, _ := http.NewRequest("POST", "/team/update_by_id", bytes.NewBuffer(bodyUpdate))
	wUpdate := httptest.NewRecorder()
	r.ServeHTTP(wUpdate, reqUpdate)
	assert.Equal(t, http.StatusOK, wUpdate.Code)

	// Run Delete
	bodyDelete, _ := json.Marshal(map[string]string{"id": teamID})
	reqDelete, _ := http.NewRequest("POST", "/team/delete_by_id", bytes.NewBuffer(bodyDelete))
	wDelete := httptest.NewRecorder()
	r.ServeHTTP(wDelete, reqDelete)
	assert.Equal(t, http.StatusOK, wDelete.Code)

	assert.NoError(t, mock.ExpectationsWereMet())
}
