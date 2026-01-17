package main

import (
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"github.com/hugolol/gamblefights/pkg/auth"
	"github.com/hugolol/gamblefights/pkg/db"
	"github.com/hugolol/gamblefights/pkg/game"
	"github.com/hugolol/gamblefights/pkg/handlers"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system env")
	}

	// Connect to Database
	db.Connect()

	// Initialize Echo instance
	e := echo.New()

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"http://localhost:3000", "*"},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, "Authorization"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
	}))

	// Initialize Game Hub
	hub := game.NewHub()
	go hub.Run()

	// Initialize Matchmaker
	mm := game.NewMatchmaker(hub)

	// ==================
	// Public Routes
	// ==================
	e.GET("/", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"name":    "GambleFights API",
			"version": "1.0.0",
			"status":  "running",
		})
	})

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"status":  "ok",
			"service": "gamblefights-api",
		})
	})

	// WebSocket Route (for game connections)
	e.GET("/ws", func(c echo.Context) error {
		return game.ServeWs(hub, mm, c)
	})

	// ==================
	// Auth Routes
	// ==================
	e.POST("/auth/wallet", handlers.WalletAuth)

	// ==================
	// Protected Routes
	// ==================
	api := e.Group("/api")
	api.Use(auth.Middleware())

	// User endpoints
	api.GET("/user/profile", handlers.GetProfile)
	api.PUT("/user/client-seed", handlers.UpdateClientSeed)

	// Wallet endpoints
	api.GET("/wallet/balance", handlers.GetBalances)
	api.POST("/wallet/deposit-address", handlers.GetDepositAddress)
	api.POST("/wallet/test-deposit", handlers.AddTestBalance) // Dev only

	// Match endpoints
	api.GET("/matches/history", handlers.GetMatchHistory)
	api.GET("/matches/:id", handlers.GetMatch)

	// Public match endpoints (no auth required)
	e.GET("/api/matches/live", handlers.GetLiveMatches)

	// Test endpoint - simulate a fight (dev only)
	api.POST("/test/fight", handlers.TestFight)

	// Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Starting GambleFights server on port %s", port)
	e.Logger.Fatal(e.Start(":" + port))
}
