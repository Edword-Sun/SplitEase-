package repository

import (
	"database/sql"
	"split_ease/model"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func setupTripMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock, *sql.DB) {
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

func TestTripRepository_All(t *testing.T) {
	db, mock, sqlDB := setupTripMockDB(t)
	defer sqlDB.Close()

	repo := &TripRepository{DB: db}
	trip := &model.Trip{ID: "all-test-id", Name: "All Test Trip"}

	// 1. Create
	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `trip`").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// 2. Find
	rows := sqlmock.NewRows([]string{"id", "name"}).AddRow(trip.ID, trip.Name)
	mock.ExpectQuery("SELECT \\* FROM `trip` WHERE id = \\?").WithArgs(trip.ID, 1).WillReturnRows(rows)

	// 3. Update
	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `trip` SET").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// 4. Delete
	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `trip` WHERE id = \\?").WithArgs(trip.ID).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// Execute All
	start := time.Now()
	err := repo.Create(trip)
	logRepoCall(t, "TripRepository.Create", start, err)
	assert.NoError(t, err)

	start = time.Now()
	err, foundTrip := repo.FindByID(trip.ID)
	logRepoCall(t, "TripRepository.FindByID", start, err)
	assert.NoError(t, err)
	assert.Equal(t, trip.Name, foundTrip.Name)

	start = time.Now()
	err = repo.UpdateByID(trip)
	logRepoCall(t, "TripRepository.UpdateByID", start, err)
	assert.NoError(t, err)

	start = time.Now()
	err = repo.DeleteByID(trip.ID)
	logRepoCall(t, "TripRepository.DeleteByID", start, err)
	assert.NoError(t, err)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTripRepository_Create(t *testing.T) {
	db, mock, sqlDB := setupTripMockDB(t)
	defer sqlDB.Close()

	repo := &TripRepository{DB: db}
	trip := &model.Trip{ID: "test-id", Name: "Test Trip"}

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `trip`").
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	start := time.Now()
	err := repo.Create(trip)
	logRepoCall(t, "TripRepository.Create", start, err)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTripRepository_FindByID(t *testing.T) {
	db, mock, sqlDB := setupTripMockDB(t)
	defer sqlDB.Close()

	repo := &TripRepository{DB: db}
	tripID := "test-id"

	rows := sqlmock.NewRows([]string{"id", "name"}).
		AddRow(tripID, "Test Trip")

	mock.ExpectQuery("SELECT \\* FROM `trip` WHERE id = \\?").
		WithArgs(tripID, 1).
		WillReturnRows(rows)

	start := time.Now()
	err, trip := repo.FindByID(tripID)
	logRepoCall(t, "TripRepository.FindByID", start, err)
	assert.NoError(t, err)
	assert.NotNil(t, trip)
	assert.Equal(t, tripID, trip.ID)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTripRepository_UpdateByID(t *testing.T) {
	db, mock, sqlDB := setupTripMockDB(t)
	defer sqlDB.Close()

	repo := &TripRepository{DB: db}
	trip := &model.Trip{ID: "test-id", Name: "Updated Trip"}

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `trip` SET").
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	start := time.Now()
	err := repo.UpdateByID(trip)
	logRepoCall(t, "TripRepository.UpdateByID", start, err)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTripRepository_DeleteByID(t *testing.T) {
	db, mock, sqlDB := setupTripMockDB(t)
	defer sqlDB.Close()

	repo := &TripRepository{DB: db}
	tripID := "test-id"

	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `trip` WHERE id = \\?").
		WithArgs(tripID).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	start := time.Now()
	err := repo.DeleteByID(tripID)
	logRepoCall(t, "TripRepository.DeleteByID", start, err)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}
