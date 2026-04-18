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

func setupBillMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock, *sql.DB) {
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

func TestBillRepository_All(t *testing.T) {
	db, mock, sqlDB := setupBillMockDB(t)
	defer sqlDB.Close()

	repo := &BillRepository{DB: db}
	bill := &model.Bill{ID: "all-test-id", Name: "All Test Bill", CostCent: 200}

	// 1. Create
	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `bill`").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// 2. Find
	rows := sqlmock.NewRows([]string{"id", "name", "cost_cent"}).AddRow(bill.ID, bill.Name, bill.CostCent)
	mock.ExpectQuery("SELECT \\* FROM `bill` WHERE id = \\?").WithArgs(bill.ID, 1).WillReturnRows(rows)

	// 3. FindByTripID
	tripID := "all-test-trip-id"
	rowsTrip := sqlmock.NewRows([]string{"id", "name", "cost_cent", "trip_id"}).AddRow(bill.ID, bill.Name, bill.CostCent, tripID)
	mock.ExpectQuery("SELECT \\* FROM `bill` WHERE trip_id = \\?").WithArgs(tripID).WillReturnRows(rowsTrip)

	// 4. Update
	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `bill` SET").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// 5. DeleteByTripID
	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `bill` WHERE trip_id = \\?").WithArgs(tripID).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// 6. Delete
	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `bill` WHERE id = \\?").WithArgs(bill.ID).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// Execute All
	start := time.Now()
	err := repo.Create(bill)
	logRepoCall(t, "BillRepository.Create", start, err)
	assert.NoError(t, err)

	start = time.Now()
	err, foundBill := repo.FindByID(bill.ID)
	logRepoCall(t, "BillRepository.FindByID", start, err)
	assert.NoError(t, err)
	assert.Equal(t, bill.Name, foundBill.Name)

	start = time.Now()
	err, billsByTrip := repo.FindByTripID(tripID)
	logRepoCall(t, "BillRepository.FindByTripID", start, err)
	assert.NoError(t, err)
	assert.Len(t, billsByTrip, 1)

	start = time.Now()
	err = repo.UpdateByID(bill)
	logRepoCall(t, "BillRepository.UpdateByID", start, err)
	assert.NoError(t, err)

	start = time.Now()
	err = repo.DeleteByTripID(tripID)
	logRepoCall(t, "BillRepository.DeleteByTripID", start, err)
	assert.NoError(t, err)

	start = time.Now()
	err = repo.DeleteByID(bill.ID)
	logRepoCall(t, "BillRepository.DeleteByID", start, err)
	assert.NoError(t, err)

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestBillRepository_Create(t *testing.T) {
	db, mock, sqlDB := setupBillMockDB(t)
	defer sqlDB.Close()

	repo := &BillRepository{DB: db}
	bill := &model.Bill{ID: "test-id", Name: "Test Bill", CostCent: 100}

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `bill`").
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	start := time.Now()
	err := repo.Create(bill)
	logRepoCall(t, "BillRepository.Create", start, err)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestBillRepository_FindByID(t *testing.T) {
	db, mock, sqlDB := setupBillMockDB(t)
	defer sqlDB.Close()

	repo := &BillRepository{DB: db}
	billID := "test-id"

	rows := sqlmock.NewRows([]string{"id", "name", "cost_cent"}).
		AddRow(billID, "Test Bill", 100)

	mock.ExpectQuery("SELECT \\* FROM `bill` WHERE id = \\?").
		WithArgs(billID, 1).
		WillReturnRows(rows)

	start := time.Now()
	err, bill := repo.FindByID(billID)
	logRepoCall(t, "BillRepository.FindByID", start, err)
	assert.NoError(t, err)
	assert.NotNil(t, bill)
	assert.Equal(t, billID, bill.ID)
	assert.Equal(t, int64(100), bill.CostCent)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestBillRepository_UpdateByID(t *testing.T) {
	db, mock, sqlDB := setupBillMockDB(t)
	defer sqlDB.Close()

	repo := &BillRepository{DB: db}
	bill := &model.Bill{ID: "test-id", Name: "Updated Bill"}

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `bill` SET").
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	start := time.Now()
	err := repo.UpdateByID(bill)
	logRepoCall(t, "BillRepository.UpdateByID", start, err)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestBillRepository_DeleteByID(t *testing.T) {
	db, mock, sqlDB := setupBillMockDB(t)
	defer sqlDB.Close()

	repo := &BillRepository{DB: db}
	billID := "test-id"

	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `bill` WHERE id = \\?").
		WithArgs(billID).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	start := time.Now()
	err := repo.DeleteByID(billID)
	logRepoCall(t, "BillRepository.DeleteByID", start, err)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestBillRepository_DeleteByTripID(t *testing.T) {
	db, mock, sqlDB := setupBillMockDB(t)
	defer sqlDB.Close()

	repo := &BillRepository{DB: db}
	tripID := "test-trip-id"

	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `bill` WHERE trip_id = \\?").
		WithArgs(tripID).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	start := time.Now()
	err := repo.DeleteByTripID(tripID)
	logRepoCall(t, "BillRepository.DeleteByTripID", start, err)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestBillRepository_FindByTripID(t *testing.T) {
	db, mock, sqlDB := setupBillMockDB(t)
	defer sqlDB.Close()

	repo := &BillRepository{DB: db}
	tripID := "trip-123"

	rows := sqlmock.NewRows([]string{"id", "name", "cost_cent", "trip_id"}).
		AddRow("bill-1", "Lunch", 5000, tripID).
		AddRow("bill-2", "Taxi", 3000, tripID)

	mock.ExpectQuery("SELECT \\* FROM `bill` WHERE trip_id = \\?").
		WithArgs(tripID).
		WillReturnRows(rows)

	start := time.Now()
	err, bills := repo.FindByTripID(tripID)
	logRepoCall(t, "BillRepository.FindByTripID", start, err)

	assert.NoError(t, err)
	assert.Len(t, bills, 2)
	assert.Equal(t, "Lunch", bills[0].Name)
	assert.Equal(t, int64(5000), bills[0].CostCent)
	assert.NoError(t, mock.ExpectationsWereMet())
}
