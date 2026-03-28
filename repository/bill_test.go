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

	// 3. Update
	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `bill` SET").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// 4. Delete
	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `bill` WHERE id = \\?").WithArgs(bill.ID).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// Execute All
	assert.NoError(t, repo.Create(bill))
	err, foundBill := repo.FindByID(bill.ID)
	assert.NoError(t, err)
	assert.Equal(t, bill.Name, foundBill.Name)
	assert.NoError(t, repo.UpdateByID(bill))
	assert.NoError(t, repo.DeleteByID(bill.ID))

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

	err := repo.Create(bill)
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

	err, bill := repo.FindByID(billID)
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

	err := repo.UpdateByID(bill)
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

	err := repo.DeleteByID(billID)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}
