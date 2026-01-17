package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"github.com/hugolol/gamblefights/pkg/auth"
	"github.com/hugolol/gamblefights/pkg/db"
	"github.com/hugolol/gamblefights/pkg/models"
)

// WalletAuthRequest for Solana wallet authentication
type WalletAuthRequest struct {
	PublicKey string `json:"publicKey"`
	Signature string `json:"signature"`
	Message   string `json:"message"`
}

// WalletAuthResponse returned after successful auth
type WalletAuthResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

// UserResponse is the public user data
type UserResponse struct {
	ID               string `json:"id"`
	Username         string `json:"username"`
	WalletAddressSOL string `json:"walletAddressSOL"`
	ClientSeed       string `json:"clientSeed"`
	TotalWins        int64  `json:"totalWins"`
	TotalLosses      int64  `json:"totalLosses"`
}

// generateClientSeed creates a random client seed for new users
func generateClientSeed() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// generateUsername creates a username from wallet address
func generateUsername(walletAddress string) string {
	if len(walletAddress) > 8 {
		return "Player_" + walletAddress[:8]
	}
	return "Player_" + walletAddress
}

// WalletAuth handles Solana wallet signature authentication
// POST /auth/wallet
func WalletAuth(c echo.Context) error {
	var req WalletAuthRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	// Validate required fields
	if req.PublicKey == "" || req.Signature == "" || req.Message == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Missing required fields"})
	}

	// Verify the Solana signature
	if !auth.VerifySolanaSignature(req.PublicKey, req.Signature, req.Message) {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Invalid signature"})
	}

	// Look up or create user by wallet address
	var user models.User
	result := db.DB.Where("wallet_address_sol = ?", req.PublicKey).First(&user)

	if result.Error != nil {
		// User doesn't exist, create new one
		user = models.User{
			Username:         generateUsername(req.PublicKey),
			WalletAddressSOL: req.PublicKey,
			ClientSeed:       generateClientSeed(),
			Role:             models.RoleUser,
		}

		if err := db.DB.Create(&user).Error; err != nil {
			// Handle duplicate key error (race condition)
			if strings.Contains(err.Error(), "duplicate") {
				db.DB.Where("wallet_address_sol = ?", req.PublicKey).First(&user)
			} else {
				return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create user"})
			}
		}

		// Create default SOL wallet for new user with FREE test balance
		wallet := models.Wallet{
			UserID:   user.ID,
			Currency: models.CurrencySOL,
			Balance:  1_000_000_000, // 1 SOL free for testing
		}
		db.DB.Create(&wallet)
	}

	// Generate JWT token
	token, err := auth.GenerateToken(user.ID.String(), string(user.Role))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to generate token"})
	}

	return c.JSON(http.StatusOK, WalletAuthResponse{
		Token: token,
		User: UserResponse{
			ID:               user.ID.String(),
			Username:         user.Username,
			WalletAddressSOL: user.WalletAddressSOL,
			ClientSeed:       user.ClientSeed,
			TotalWins:        user.TotalWins,
			TotalLosses:      user.TotalLosses,
		},
	})
}

// GetProfile returns the authenticated user's profile
// GET /api/user/profile
func GetProfile(c echo.Context) error {
	uid := c.Get("uid").(string)

	userID, err := uuid.Parse(uid)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid user ID"})
	}

	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "User not found"})
	}

	return c.JSON(http.StatusOK, UserResponse{
		ID:               user.ID.String(),
		Username:         user.Username,
		WalletAddressSOL: user.WalletAddressSOL,
		ClientSeed:       user.ClientSeed,
		TotalWins:        user.TotalWins,
		TotalLosses:      user.TotalLosses,
	})
}

// UpdateClientSeedRequest for updating client seed
type UpdateClientSeedRequest struct {
	ClientSeed string `json:"clientSeed"`
}

// UpdateClientSeed updates the user's client seed
// PUT /api/user/client-seed
func UpdateClientSeed(c echo.Context) error {
	uid := c.Get("uid").(string)

	var req UpdateClientSeedRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
	}

	if req.ClientSeed == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Client seed cannot be empty"})
	}

	userID, err := uuid.Parse(uid)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid user ID"})
	}

	result := db.DB.Model(&models.User{}).Where("id = ?", userID).Update("client_seed", req.ClientSeed)
	if result.Error != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update client seed"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Client seed updated", "clientSeed": req.ClientSeed})
}
