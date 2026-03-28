package crypto

import (
	"crypto/sha256"
	"encoding/hex"

	"golang.org/x/crypto/bcrypt"
)

type HashCrypto struct {
}

func NewHashCrypto() *HashCrypto {
	return &HashCrypto{}
}

// HashPassword 使用 bcrypt 算法对密码进行哈希 (用于用户登录)
func (c *HashCrypto) HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// CheckPasswordHash 验证明文密码与哈希值是否匹配 (即你想要的“解密”验证)
func (c *HashCrypto) CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// private: SHA256 对数据进行 SHA256 哈希 (用于数据指纹/校验)
func processSha256(data string) string {
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

// VerifySHA256 验证数据是否与 SHA256 哈希值匹配
func (c *HashCrypto) VerifySHA256(data, hash string) bool {
	return processSha256(data) == hash
}
