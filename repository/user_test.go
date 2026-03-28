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

func setupUserMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock, *sql.DB) {
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

func TestUserRepository_All(t *testing.T) {
	db, mock, sqlDB := setupUserMockDB(t)
	defer sqlDB.Close()

	repo := &UserRepository{DB: db}
	user := &model.User{ID: "all-test-id", Name: "All Test User"}

	// 1. Create
	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `user`").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// 2. Find
	rows := sqlmock.NewRows([]string{"id", "name"}).AddRow(user.ID, user.Name)
	mock.ExpectQuery("SELECT \\* FROM `user` WHERE id = \\?").WithArgs(user.ID, 1).WillReturnRows(rows)

	// 3. Update
	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `user` SET").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// 4. Delete
	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `user` WHERE id = \\?").WithArgs(user.ID).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	// Execute All
	assert.NoError(t, repo.Create(user))
	err, foundUser := repo.FindByID(user.ID)
	assert.NoError(t, err)
	assert.Equal(t, user.Name, foundUser.Name)
	assert.NoError(t, repo.UpdateByID(user))
	assert.NoError(t, repo.DeleteByID(user.ID))

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRepository_Create(t *testing.T) {
	db, mock, sqlDB := setupUserMockDB(t)
	defer sqlDB.Close()

	repo := &UserRepository{DB: db}
	user := &model.User{ID: "test-id", Name: "Test User"}

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `user`").
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.Create(user)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRepository_FindByID(t *testing.T) {
	db, mock, sqlDB := setupUserMockDB(t)
	defer sqlDB.Close()

	repo := &UserRepository{DB: db}
	userID := "test-id"

	rows := sqlmock.NewRows([]string{"id", "name"}).
		AddRow(userID, "Test User")

	mock.ExpectQuery("SELECT \\* FROM `user` WHERE id = \\?").
		WithArgs(userID, 1).
		WillReturnRows(rows)

	err, user := repo.FindByID(userID)
	assert.NoError(t, err)
	assert.NotNil(t, user)
	assert.Equal(t, userID, user.ID)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRepository_FindByIdentity(t *testing.T) {
	db, mock, sqlDB := setupUserMockDB(t)
	defer sqlDB.Close()

	repo := &UserRepository{DB: db}
	identity := "test-identity"

	rows := sqlmock.NewRows([]string{"id", "account_name", "email", "phone_number"}).
		AddRow("test-id", identity, "test@example.com", "1234567890")

	mock.ExpectQuery("SELECT \\* FROM `user` WHERE account_name = \\? OR email = \\? OR phone_number = \\?").
		WithArgs(identity, identity, identity, 1).
		WillReturnRows(rows)

	err, user := repo.FindByIdentity(identity)
	assert.NoError(t, err)
	assert.NotNil(t, user)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRepository_UpdateByID(t *testing.T) {
	db, mock, sqlDB := setupUserMockDB(t)
	defer sqlDB.Close()

	repo := &UserRepository{DB: db}
	user := &model.User{ID: "test-id", Name: "Updated User"}

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `user` SET").
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.UpdateByID(user)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRepository_DeleteByID(t *testing.T) {
	db, mock, sqlDB := setupUserMockDB(t)
	defer sqlDB.Close()

	repo := &UserRepository{DB: db}
	userID := "test-id"

	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `user` WHERE id = \\?").
		WithArgs(userID).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.DeleteByID(userID)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}
