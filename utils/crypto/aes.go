package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
)

type AESCrypto struct {
}

func NewAESCrypto() *AESCrypto {
	return &AESCrypto{}
}

// Encrypt 使用 AES-GCM 算法进行对称加密
func (c *AESCrypto) Encrypt(plainText string, key []byte) (string, error) {
	cipherText, err := processAESEncrypt(plainText, key)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(cipherText), nil
}

// Decrypt 使用 AES-GCM 算法进行对称解密
func (c *AESCrypto) Decrypt(cipherTextBase64 string, key []byte) (string, error) {
	cipherText, err := base64.StdEncoding.DecodeString(cipherTextBase64)
	if err != nil {
		return "", err
	}
	plainText, err := processAESDecrypt(cipherText, key)
	if err != nil {
		return "", err
	}
	return string(plainText), nil
}

// private: 核心加密逻辑
func processAESEncrypt(plainText string, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, aesGCM.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	return aesGCM.Seal(nonce, nonce, []byte(plainText), nil), nil
}

// private: 核心解密逻辑
func processAESDecrypt(cipherText []byte, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := aesGCM.NonceSize()
	if len(cipherText) < nonceSize {
		return nil, errors.New("ciphertext too short")
	}

	nonce, cipherText := cipherText[:nonceSize], cipherText[nonceSize:]
	return aesGCM.Open(nil, nonce, cipherText, nil)
}
