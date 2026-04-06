package repository

import (
	"database/sql"
	"split_ease/model"
	filter2 "split_ease/router/filter"
	"testing"
	"time"

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

	// 3. FindByIdentity
	identity := "test-identity"
	identityRows := sqlmock.NewRows([]string{"id", "account_name", "email", "phone_number"}).
		AddRow(user.ID, identity, "test@example.com", "1234567890")
	mock.ExpectQuery("SELECT \\* FROM `user` WHERE account_name = \\? OR email = \\? OR phone_number = \\?").
		WithArgs(identity, identity, identity, 1).
		WillReturnRows(identityRows)

	// Execute All
	start := time.Now()
	err := repo.Create(user)
	logRepoCall(t, "UserRepository.Create", start, err)
	assert.NoError(t, err)

	start = time.Now()
	err, _ = repo.FindByID(user.ID)
	logRepoCall(t, "UserRepository.FindByID", start, err)
	assert.NoError(t, err)

	start = time.Now()
	err, foundUserByIdentity := repo.FindByIdentity(identity)
	logRepoCall(t, "UserRepository.FindByIdentity", start, err)
	assert.NoError(t, err)
	assert.NotNil(t, foundUserByIdentity)

	// 6. List
	listFilter := filter2.UserListFilter{
		Keyword: "test",
		Offset:  0,
		Limit:   10,
	}
	mock.ExpectQuery("SELECT count(.+) FROM `user` WHERE \\(id = \\? OR account_name LIKE \\? OR name LIKE \\? OR phone_number LIKE \\? OR email LIKE \\?\\)").
		WithArgs("test", "%test%", "%test%", "%test%", "%test%").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))
	mock.ExpectQuery("SELECT \\* FROM `user` WHERE \\(id = \\? OR account_name LIKE \\? OR name LIKE \\? OR phone_number LIKE \\? OR email LIKE \\?\\) LIMIT \\?").
		WithArgs("test", "%test%", "%test%", "%test%", "%test%", 10).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name"}).AddRow("list-test-id", "List Test User"))

	start = time.Now()
	err, users, total := repo.List(listFilter)
	logRepoCall(t, "UserRepository.List", start, err)
	assert.NoError(t, err)
	assert.Len(t, users, 1)
	assert.Equal(t, int64(1), total)
	assert.Equal(t, "List Test User", users[0].Name)

	// 4. Update
	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `user` SET").WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	start = time.Now()
	err = repo.UpdateByID(user)
	logRepoCall(t, "UserRepository.UpdateByID", start, err)
	assert.NoError(t, err)

	// 5. Delete
	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `user` WHERE id = \\?").WithArgs(user.ID).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	start = time.Now()
	err = repo.DeleteByID(user.ID)
	logRepoCall(t, "UserRepository.DeleteByID", start, err)
	assert.NoError(t, err)

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

	start := time.Now()
	err := repo.Create(user)
	logRepoCall(t, "UserRepository.Create", start, err)
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

	start := time.Now()
	err, user := repo.FindByID(userID)
	logRepoCall(t, "UserRepository.FindByID", start, err)
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

	start := time.Now()
	err, user := repo.FindByIdentity(identity)
	logRepoCall(t, "UserRepository.FindByIdentity", start, err)
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

	start := time.Now()
	err := repo.UpdateByID(user)
	logRepoCall(t, "UserRepository.UpdateByID", start, err)
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

	start := time.Now()
	err := repo.DeleteByID(userID)
	logRepoCall(t, "UserRepository.DeleteByID", start, err)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRepository_List(t *testing.T) {
	db, mock, sqlDB := setupUserMockDB(t)
	defer sqlDB.Close()

	repo := &UserRepository{DB: db}

	// Test case 1: List with keyword and pagination
	filter := filter2.UserListFilter{
		Keyword: "test",
		Offset:  0,
		Limit:   2,
	}

	mock.ExpectQuery("SELECT count(.+) FROM `user` WHERE \\(id = \\? OR account_name LIKE \\? OR name LIKE \\? OR phone_number LIKE \\? OR email LIKE \\?\\)").
		WithArgs("test", "%test%", "%test%", "%test%", "%test%").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(3)) // Total 3 users

	rows := sqlmock.NewRows([]string{"id", "name", "account_name", "email", "phone_number"}).
		AddRow("user1", "Test User1", "testuser1", "test1@example.com", "111").
		AddRow("user2", "Test User2", "testuser2", "test2@example.com", "222")

	mock.ExpectQuery("SELECT \\* FROM `user` WHERE \\(id = \\? OR account_name LIKE \\? OR name LIKE \\? OR phone_number LIKE \\? OR email LIKE \\?\\) LIMIT \\?").
		WithArgs("test", "%test%", "%test%", "%test%", "%test%", 2).
		WillReturnRows(rows)

	start := time.Now()
	err, users, total := repo.List(filter)
	logRepoCall(t, "UserRepository.List (with keyword)", start, err)
	assert.NoError(t, err)
	assert.Len(t, users, 2)
	assert.Equal(t, int64(3), total)
	assert.Equal(t, "Test User1", users[0].Name)
	assert.Equal(t, "Test User2", users[1].Name)
	assert.NoError(t, mock.ExpectationsWereMet())

	// Test case 2: List without keyword (global search)
	filterNoKeyword := filter2.UserListFilter{
		Keyword: "",
		Offset:  0,
		Limit:   2,
	}

	mock.ExpectQuery("SELECT count(.+) FROM `user`").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(5)) // Total 5 users

	rowsNoKeyword := sqlmock.NewRows([]string{"id", "name", "account_name", "email", "phone_number"}).
		AddRow("userA", "User A", "userA_acc", "userA@example.com", "AAA").
		AddRow("userB", "User B", "userB_acc", "userB@example.com", "BBB")

	mock.ExpectQuery("SELECT \\* FROM `user` LIMIT \\?").
		WithArgs(2).
		WillReturnRows(rowsNoKeyword)

	start = time.Now()
	err, usersNoKeyword, totalNoKeyword := repo.List(filterNoKeyword)
	logRepoCall(t, "UserRepository.List (no keyword)", start, err)
	assert.NoError(t, err)
	assert.Len(t, usersNoKeyword, 2)
	assert.Equal(t, int64(5), totalNoKeyword)
	assert.Equal(t, "User A", usersNoKeyword[0].Name)
	assert.Equal(t, "User B", usersNoKeyword[1].Name)
	assert.NoError(t, mock.ExpectationsWereMet())

	// Test case 3: No records found
	filterNoResult := filter2.UserListFilter{
		Keyword: "nonexistent",
		Offset:  0,
		Limit:   10,
	}

	mock.ExpectQuery("SELECT count(.+) FROM `user` WHERE \\(id = \\? OR account_name LIKE \\? OR name LIKE \\? OR phone_number LIKE \\? OR email LIKE \\?\\)").
		WithArgs("nonexistent", "%nonexistent%", "%nonexistent%", "%nonexistent%", "%nonexistent%").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

	// No subsequent SELECT should happen because total is 0

	start = time.Now()
	err, usersNoResult, totalNoResult := repo.List(filterNoResult)
	logRepoCall(t, "UserRepository.List (no result)", start, err)
	assert.NoError(t, err)
	assert.Len(t, usersNoResult, 0)
	assert.Equal(t, int64(0), totalNoResult)
	assert.NoError(t, mock.ExpectationsWereMet())

	// Test case 4: Search "123" with no matches
	filter123 := filter2.UserListFilter{
		Keyword: "123",
		Offset:  0,
		Limit:   10,
	}

	mock.ExpectQuery("SELECT count(.+) FROM `user` WHERE \\(id = \\? OR account_name LIKE \\? OR name LIKE \\? OR phone_number LIKE \\? OR email LIKE \\?\\)").
		WithArgs("123", "%123%", "%123%", "%123%", "%123%").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

	// No subsequent SELECT should happen because total is 0

	start = time.Now()
	err, users123, total123 := repo.List(filter123)
	logRepoCall(t, "UserRepository.List (search 123 - no match)", start, err)
	assert.NoError(t, err)
	assert.Len(t, users123, 0)
	assert.Equal(t, int64(0), total123)
	assert.NoError(t, mock.ExpectationsWereMet())
}
