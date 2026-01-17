package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Role string

const (
	RoleUser  Role = "USER"
	RoleAdmin Role = "ADMIN"
	RoleMod   Role = "MOD"
)

type User struct {
	ID       uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Username string    `gorm:"uniqueIndex;not null"`
	Email    string    `gorm:"uniqueIndex"`
	Role     Role      `gorm:"type:varchar(20);default:'USER'"`

	// Wallet addresses
	WalletAddressSOL string `gorm:"type:varchar(64);uniqueIndex"`
	WalletAddressTON string `gorm:"type:varchar(64);uniqueIndex"`

	// Provably Fair
	ClientSeed string `gorm:"default:''"`
	Nonce      int64  `gorm:"default:0"` // Global nonce for user

	// Stats
	TotalWins   int64 `gorm:"default:0"`
	TotalLosses int64 `gorm:"default:0"`
	TotalWagered int64 `gorm:"default:0"` // In lamports

	// Relations
	Wallets []Wallet `gorm:"foreignKey:UserID"`

	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

type Currency string

const (
	CurrencySOL  Currency = "SOL"
	CurrencyTON  Currency = "TON"
	CurrencyUSDT Currency = "USDT"
)

type Wallet struct {
	ID             uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID         uuid.UUID `gorm:"type:uuid;not null;index"`
	Currency       Currency  `gorm:"type:varchar(10);not null"`
	Balance        int64     `gorm:"not null;default:0"` // Lowest atomic unit (lamports for SOL)
	DepositAddress string    `gorm:"type:varchar(255)"`

	CreatedAt time.Time
	UpdatedAt time.Time
}

// Match Status
type MatchStatus string

const (
	MatchStatusWaiting    MatchStatus = "WAITING"
	MatchStatusInProgress MatchStatus = "IN_PROGRESS"
	MatchStatusCompleted  MatchStatus = "COMPLETED"
	MatchStatusCancelled  MatchStatus = "CANCELLED"
)

// Match represents a 1v1 battle between two players
type Match struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	PlayerAID uuid.UUID `gorm:"type:uuid;not null;index"`
	PlayerBID uuid.UUID `gorm:"type:uuid;not null;index"`

	// Wager details
	WagerAmount int64    `gorm:"not null"`          // In atomic units
	Currency    Currency `gorm:"type:varchar(10);not null"`

	// Provably fair data
	ServerSeed       string `gorm:"type:varchar(128);not null"`
	ServerSeedHashed string `gorm:"type:varchar(128);not null"`
	ClientSeedA      string `gorm:"type:varchar(128)"`
	ClientSeedB      string `gorm:"type:varchar(128)"`
	Nonce            int64  `gorm:"not null;default:0"`

	// Result
	WinnerID    *uuid.UUID  `gorm:"type:uuid;index"`
	Status      MatchStatus `gorm:"type:varchar(20);default:'WAITING'"`
	FightScript string      `gorm:"type:jsonb"` // JSON animation script

	// Timestamps
	CreatedAt  time.Time
	FinishedAt *time.Time

	// Relations
	PlayerA User `gorm:"foreignKey:PlayerAID"`
	PlayerB User `gorm:"foreignKey:PlayerBID"`
}

// Transaction Type
type TransactionType string

const (
	TxTypeDeposit    TransactionType = "DEPOSIT"
	TxTypeWithdrawal TransactionType = "WITHDRAWAL"
	TxTypeBet        TransactionType = "BET"
	TxTypeWin        TransactionType = "WIN"
	TxTypeRefund     TransactionType = "REFUND"
)

// Transaction Status
type TransactionStatus string

const (
	TxStatusPending   TransactionStatus = "PENDING"
	TxStatusCompleted TransactionStatus = "COMPLETED"
	TxStatusFailed    TransactionStatus = "FAILED"
)

// Transaction represents a wallet transaction
type Transaction struct {
	ID       uuid.UUID         `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID   uuid.UUID         `gorm:"type:uuid;not null;index"`
	WalletID uuid.UUID         `gorm:"type:uuid;not null;index"`
	MatchID  *uuid.UUID        `gorm:"type:uuid;index"` // Optional, for bet/win transactions
	Type     TransactionType   `gorm:"type:varchar(20);not null"`
	Amount   int64             `gorm:"not null"` // Positive for credit, negative for debit
	Currency Currency          `gorm:"type:varchar(10);not null"`
	TxHash   string            `gorm:"type:varchar(128)"` // Blockchain tx hash
	Status   TransactionStatus `gorm:"type:varchar(20);default:'PENDING'"`

	CreatedAt time.Time
	UpdatedAt time.Time
}
