package repository

import (
	"database/sql"
	"split_ease/model"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func setupTeamMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock, *sql.DB) {
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

func TestTeamRepository_All(t *testing.T) {
	db, mock, sqlDB := setupTeamMockDB(t)
	defer sqlDB.Close()

	repo := &TeamRepository{DB: db}
	team := &model.Team{ID: "all-test-id", Name: "All Test Team"}

	// 1. Create
	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `team`").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// 2. Find
	rows := sqlmock.NewRows([]string{"id", "name"}).AddRow(team.ID, team.Name)
	mock.ExpectQuery("SELECT \\* FROM `team` WHERE id = \\?").WithArgs(team.ID, 1).WillReturnRows(rows)

	// 3. Update
	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `team` SET").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// 4. Delete
	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `team` WHERE id = \\?").WithArgs(team.ID).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// Execute All
	assert.NoError(t, repo.Create(team))
	err, foundTeam := repo.FindByID(team.ID)
	assert.NoError(t, err)
	assert.Equal(t, team.Name, foundTeam.Name)
	assert.NoError(t, repo.UpdateByID(team))
	assert.NoError(t, repo.DeleteByID(team.ID))

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTeamRepository_Create(t *testing.T) {
	db, mock, sqlDB := setupTeamMockDB(t)
	defer sqlDB.Close()

	repo := &TeamRepository{DB: db}
	team := &model.Team{ID: "test-id", Name: "Test Team"}

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `team`").
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.Create(team)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTeamRepository_FindByID(t *testing.T) {
	db, mock, sqlDB := setupTeamMockDB(t)
	defer sqlDB.Close()

	repo := &TeamRepository{DB: db}
	teamID := "test-id"

	rows := sqlmock.NewRows([]string{"id", "name"}).
		AddRow(teamID, "Test Team")

	mock.ExpectQuery("SELECT \\* FROM `team` WHERE id = \\?").
		WithArgs(teamID, 1).
		WillReturnRows(rows)

	err, team := repo.FindByID(teamID)
	assert.NoError(t, err)
	assert.NotNil(t, team)
	assert.Equal(t, teamID, team.ID)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTeamRepository_UpdateByID(t *testing.T) {
	db, mock, sqlDB := setupTeamMockDB(t)
	defer sqlDB.Close()

	repo := &TeamRepository{DB: db}
	team := &model.Team{ID: "test-id", Name: "Updated Team"}

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `team` SET").
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.UpdateByID(team)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTeamRepository_DeleteByID(t *testing.T) {
	db, mock, sqlDB := setupTeamMockDB(t)
	defer sqlDB.Close()

	repo := &TeamRepository{DB: db}
	teamID := "test-id"

	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `team` WHERE id = \\?").
		WithArgs(teamID).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.DeleteByID(teamID)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}
