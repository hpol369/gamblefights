package handlers

import (
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"github.com/hugolol/gamblefights/pkg/db"
	"github.com/hugolol/gamblefights/pkg/models"
)

// WalletBalance represents a wallet's balance
type WalletBalance struct {
	Currency string `json:"currency"`
	Balance  int64  `json:"balance"`      // In atomic units (lamports)
	Display  string `json:"display"`      // Human readable (e.g., "1.5 SOL")
}

// GetBalances returns all wallet balances for the authenticated user
// GET /api/wallet/balance
func GetBalances(c echo.Context) error {
	uid := c.Get("uid").(string)

	userID, err := uuid.Parse(uid)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid user ID"})
	}

	var wallets []models.Wallet
	if err := db.DB.Where("user_id = ?", userID).Find(&wallets).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch wallets"})
	}

	// If no wallets exist, create a default SOL wallet with 1 SOL free for testing
	if len(wallets) == 0 {
		wallet := models.Wallet{
			UserID:   userID,
			Currency: models.CurrencySOL,
			Balance:  1_000_000_000, // 1 SOL free for testing
		}
		db.DB.Create(&wallet)
		wallets = append(wallets, wallet)
	}

	balances := make([]WalletBalance, len(wallets))
	for i, w := range wallets {
		balances[i] = WalletBalance{
			Currency: string(w.Currency),
			Balance:  w.Balance,
			Display:  formatBalance(w.Balance, w.Currency),
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"balances": balances,
	})
}

// formatBalance converts atomic units to human readable format
func formatBalance(amount int64, currency models.Currency) string {
	switch currency {
	case models.CurrencySOL:
		// 1 SOL = 1,000,000,000 lamports
		sol := float64(amount) / 1_000_000_000
		return fmt.Sprintf("%.2f SOL", sol)
	case models.CurrencyTON:
		// 1 TON = 1,000,000,000 nanotons
		ton := float64(amount) / 1_000_000_000
		return fmt.Sprintf("%.2f TON", ton)
	case models.CurrencyUSDT:
		// 1 USDT = 1,000,000 (6 decimals)
		usdt := float64(amount) / 1_000_000
		return fmt.Sprintf("%.2f USDT", usdt)
	default:
		return "0"
	}
}

// GetDepositAddress returns a deposit address for the specified currency
// POST /api/wallet/deposit-address
func GetDepositAddress(c echo.Context) error {
	uid := c.Get("uid").(string)

	userID, err := uuid.Parse(uid)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid user ID"})
	}

	// Get the user's wallet address (for SOL, the deposit address is their wallet)
	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "User not found"})
	}

	// For MVP, we use a custodial model where users deposit to a master wallet
	// In production, you'd generate unique deposit addresses per user
	return c.JSON(http.StatusOK, map[string]interface{}{
		"currency":       "SOL",
		"depositAddress": "MASTER_WALLET_ADDRESS_PLACEHOLDER", // Replace with real master wallet
		"memo":           user.ID.String(), // User ID as memo for tracking
		"note":           "Send SOL to this address with your user ID as memo",
	})
}

// AddTestBalance adds test balance for development (remove in production)
// POST /api/wallet/test-deposit
func AddTestBalance(c echo.Context) error {
	uid := c.Get("uid").(string)

	userID, err := uuid.Parse(uid)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid user ID"})
	}

	// Add 1 SOL (in lamports) for testing
	testAmount := int64(1_000_000_000) // 1 SOL

	var wallet models.Wallet
	result := db.DB.Where("user_id = ? AND currency = ?", userID, models.CurrencySOL).First(&wallet)

	if result.Error != nil {
		// Create wallet if doesn't exist
		wallet = models.Wallet{
			UserID:   userID,
			Currency: models.CurrencySOL,
			Balance:  testAmount,
		}
		db.DB.Create(&wallet)
	} else {
		// Update existing wallet
		db.DB.Model(&wallet).Update("balance", wallet.Balance+testAmount)
	}

	// Create transaction record
	tx := models.Transaction{
		UserID:   userID,
		WalletID: wallet.ID,
		Type:     models.TxTypeDeposit,
		Amount:   testAmount,
		Currency: models.CurrencySOL,
		Status:   models.TxStatusCompleted,
	}
	db.DB.Create(&tx)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":    "Test deposit successful",
		"amount":     testAmount,
		"newBalance": wallet.Balance + testAmount,
	})
}
