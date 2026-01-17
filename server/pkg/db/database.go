package db

import (
	"fmt"
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/hugolol/gamblefights/pkg/models"
)

var DB *gorm.DB

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func Connect() {
	var dsn string
	if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
		dsn = dbURL
	} else {
		dsn = fmt.Sprintf(
			"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
			getEnv("DB_HOST", "localhost"),
			getEnv("DB_USER", "gamble"),
			getEnv("DB_PASSWORD", "password"),
			getEnv("DB_NAME", "gamblefights"),
			getEnv("DB_PORT", "5432"),
		)
	}

	config := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), config)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Connected to PostgreSQL database")

	// Skip auto-migrate if tables already exist (manual schema via Supabase)
	var count int64
	DB.Raw("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'").Scan(&count)

	if count == 0 {
		// Only migrate if tables don't exist
		err = DB.AutoMigrate(
			&models.User{},
			&models.Wallet{},
			&models.Match{},
			&models.Transaction{},
		)
		if err != nil {
			log.Fatal("Failed to migrate database:", err)
		}
		log.Println("Database migrations completed")
	} else {
		log.Println("Database tables already exist, skipping migration")
	}
}
