package fairness

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
)

// GenerateServerSeed creates a cryptographically secure random seed.
func GenerateServerSeed() (string, error) {
	bytes := make([]byte, 32) // 32 bytes = 256 bits
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// HashServerSeed creates a SHA256 hash of the server seed for public display.
func HashServerSeed(serverSeed string) string {
	hash := sha256.Sum256([]byte(serverSeed))
	return hex.EncodeToString(hash[:])
}

// CalculateOutcome determines the winner based on seeds and nonce.
// Returns true for Player A (User), false for Player B (Opponent/House).
// Also returns the raw HMAC hash for verification.
func CalculateOutcome(serverSeed string, clientSeed string, nonce int64) (bool, string) {
	message := fmt.Sprintf("%s-%d", clientSeed, nonce)
	
	h := hmac.New(sha256.New, []byte(serverSeed))
	h.Write([]byte(message))
	hashBytes := h.Sum(nil)
	hashString := hex.EncodeToString(hashBytes)

	// Take the first 8 characters (32 bits) of the hex string
	// This gives us a number between 0 and 4,294,967,295
	subHash := hashString[:8]
	decValue, _ := strconv.ParseUint(subHash, 16, 64)

	// Determine winner: Simple boolean 50/50
	// Even = Player A, Odd = Player B
	isPlayerAWin := decValue%2 == 0

	return isPlayerAWin, hashString
}
