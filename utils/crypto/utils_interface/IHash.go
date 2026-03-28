package utils_interface

type IHash interface {
	HashPassword(password string) (string, error)
	CheckPasswordHash(password, hash string) bool
	VerifySHA256(data, hash string) bool
}
