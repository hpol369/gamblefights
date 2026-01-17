package auth

import (
	"crypto/ed25519"
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/mr-tron/base58"
)

func getSecretKey() []byte {
	key := os.Getenv("JWT_SECRET")
	if key == "" {
		key = "gamblefights-dev-secret-key-change-in-production"
	}
	return []byte(key)
}

type Claims struct {
	UserID string `json:"uid"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// VerifySolanaSignature checks if the message was signed by the wallet's private key.
func VerifySolanaSignature(publicKeyBase58, signatureBase58, message string) bool {
	pubKey, err := base58.Decode(publicKeyBase58)
	if err != nil || len(pubKey) != 32 {
		return false
	}

	sig, err := base58.Decode(signatureBase58)
	if err != nil || len(sig) != 64 {
		return false
	}

	return ed25519.Verify(pubKey, []byte(message), sig)
}

// GenerateToken creates a JWT for the authenticated user.
func GenerateToken(userID string, role string) (string, error) {
	claims := &Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getSecretKey())
}

// ValidateToken parses and validates the JWT.
func ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return getSecretKey(), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
