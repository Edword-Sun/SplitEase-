package crypto

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/pem"
	"errors"
)

type RSACrypto struct {
}

func NewRSACrypto() *RSACrypto {
	return &RSACrypto{}
}

// GenerateKeys 生成 RSA 公私钥对
func (c *RSACrypto) GenerateKeys(bits int) (privateKeyPEM, publicKeyPEM string, err error) {
	// 生成私钥
	priv, err := rsa.GenerateKey(rand.Reader, bits)
	if err != nil {
		return "", "", err
	}

	// 编码私钥为 PEM 格式
	privBytes := x509.MarshalPKCS1PrivateKey(priv)
	privBlock := &pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: privBytes,
	}
	privateKeyPEM = string(pem.EncodeToMemory(privBlock))

	// 编码公钥为 PEM 格式
	pubBytes, err := x509.MarshalPKIXPublicKey(&priv.PublicKey)
	if err != nil {
		return "", "", err
	}
	pubBlock := &pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: pubBytes,
	}
	publicKeyPEM = string(pem.EncodeToMemory(pubBlock))

	return privateKeyPEM, publicKeyPEM, nil
}

// Encrypt 使用公钥进行非对称加密 (OAEP)
func (c *RSACrypto) Encrypt(plainText string, publicKeyPEM string) (string, error) {
	block, _ := pem.Decode([]byte(publicKeyPEM))
	if block == nil {
		return "", errors.New("failed to parse PEM block containing the public key")
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return "", err
	}

	rsaPub, ok := pub.(*rsa.PublicKey)
	if !ok {
		return "", errors.New("not an RSA public key")
	}

	// 使用 OAEP 填充
	cipherText, err := rsa.EncryptOAEP(sha256.New(), rand.Reader, rsaPub, []byte(plainText), nil)
	if err != nil {
		return "", err
	}

	return string(cipherText), nil
}

// Decrypt 使用私钥进行非对称解密 (OAEP)
func (c *RSACrypto) Decrypt(cipherText string, privateKeyPEM string) (string, error) {
	block, _ := pem.Decode([]byte(privateKeyPEM))
	if block == nil {
		return "", errors.New("failed to parse PEM block containing the private key")
	}

	priv, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		return "", err
	}

	// 解密
	plainText, err := rsa.DecryptOAEP(sha256.New(), rand.Reader, priv, []byte(cipherText), nil)
	if err != nil {
		return "", err
	}

	return string(plainText), nil
}
