package main

import (
	"log"

	"github.com/hugolol/gamblefights/pkg/db"
	"github.com/hugolol/gamblefights/pkg/models"
)

func main() {
	db.Connect()

	log.Println("Running Migrations...")
	err := db.DB.AutoMigrate(
		&models.User{},
		&models.Wallet{},
	)
	if err != nil {
		log.Fatal("Migration failed:", err)
	}

	log.Println("✅ Migrations completed successfully")
}
