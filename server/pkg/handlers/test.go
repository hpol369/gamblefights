package handlers

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"github.com/hugolol/gamblefights/pkg/db"
	"github.com/hugolol/gamblefights/pkg/fairness"
	"github.com/hugolol/gamblefights/pkg/models"
)

// FightEvent for test
type FightEvent struct {
	Time   float64 `json:"time"`
	Type   string  `json:"type"`
	Actor  string  `json:"actor"`
	Hit    bool    `json:"hit,omitempty"`
	Crit   bool    `json:"crit,omitempty"`
	Dodge  bool    `json:"dodge,omitempty"`
	Damage int     `json:"damage,omitempty"`
}

// FightScript for test
type FightScript struct {
	MatchID  string       `json:"matchId"`
	PlayerA  PlayerInfo   `json:"playerA"`
	PlayerB  PlayerInfo   `json:"playerB"`
	Winner   string       `json:"winner"`
	Duration float64      `json:"duration"`
	Events   []FightEvent `json:"events"`
}

// PlayerInfo for test
type PlayerInfo struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Character string `json:"character"`
	Skin      string `json:"skin"`
}

// TestFight simulates a complete fight for testing
// POST /api/test/fight
func TestFight(c echo.Context) error {
	uid := c.Get("uid").(string)

	userID, err := uuid.Parse(uid)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid user ID"})
	}

	// Get user
	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "User not found"})
	}

	// Create fake opponent
	botID := uuid.New()
	botUsername := "TestBot_" + botID.String()[:4]

	// Generate server seed and calculate outcome
	serverSeed, _ := fairness.GenerateServerSeed()
	clientSeed := user.ClientSeed + "-bot"
	nonce := user.Nonce

	playerAWins, outcomeHash := fairness.CalculateOutcome(serverSeed, clientSeed, nonce)

	// Determine winner
	var winnerID uuid.UUID
	var winnerStr string
	if playerAWins {
		winnerID = user.ID
		winnerStr = "playerA"
	} else {
		winnerID = botID
		winnerStr = "playerB"
	}

	// Generate fight script
	fightScript := generateTestFightScript(user.Username, botUsername, winnerStr)
	fightScriptJSON, _ := json.Marshal(fightScript)

	// Create match record (no wager for test)
	now := time.Now()
	match := models.Match{
		PlayerAID:        user.ID,
		PlayerBID:        user.ID, // Self-reference for test (bot doesn't exist in DB)
		WagerAmount:      0,       // Free test fight
		Currency:         models.CurrencySOL,
		ServerSeed:       serverSeed,
		ServerSeedHashed: fairness.HashServerSeed(serverSeed),
		ClientSeedA:      user.ClientSeed,
		ClientSeedB:      "bot",
		Nonce:            nonce,
		WinnerID:         &winnerID,
		Status:           models.MatchStatusCompleted,
		FightScript:      string(fightScriptJSON),
		FinishedAt:       &now,
	}

	db.DB.Create(&match)

	// Increment user nonce
	db.DB.Model(&user).Update("nonce", user.Nonce+1)

	// Update stats
	if playerAWins {
		db.DB.Model(&user).Updates(map[string]interface{}{
			"total_wins": user.TotalWins + 1,
		})
	} else {
		db.DB.Model(&user).Updates(map[string]interface{}{
			"total_losses": user.TotalLosses + 1,
		})
	}

	// Return match result
	return c.JSON(http.StatusOK, map[string]interface{}{
		"type":             "MATCH_RESULT",
		"matchId":          match.ID.String(),
		"winner":           winnerStr,
		"winnerId":         winnerID.String(),
		"serverSeed":       serverSeed,
		"serverSeedHashed": match.ServerSeedHashed,
		"clientSeedA":      user.ClientSeed,
		"clientSeedB":      "bot",
		"nonce":            nonce,
		"outcomeHash":      outcomeHash,
		"fightScript":      fightScript,
		"wagerAmount":      0,
		"totalPot":         0,
		"isTestFight":      true,
	})
}

func generateTestFightScript(playerAName, playerBName, predeterminedWinner string) FightScript {
	events := []FightEvent{}

	// Track health for both players
	playerAHealth := 100
	playerBHealth := 100

	// Initial approach
	events = append(events, FightEvent{Time: 0.2, Type: "move_fwd", Actor: "playerA"})
	events = append(events, FightEvent{Time: 0.3, Type: "move_fwd", Actor: "playerB"})

	currentTime := 0.5
	attackTypes := []string{"attack_light", "attack_heavy", "attack_special"}
	isPlayerATurn := true // Alternate turns, starting with Player A

	// Continue until one player reaches 0 health
	for playerAHealth > 0 && playerBHealth > 0 {
		attacker := "playerA"
		defender := "playerB"
		if !isPlayerATurn {
			attacker = "playerB"
			defender = "playerA"
		}

		attackType := attackTypes[rand.Intn(len(attackTypes))]

		// Bias hit chance towards predetermined winner
		hitChance := float32(0.70) // Base 70% hit chance
		if attacker == predeterminedWinner {
			hitChance = 0.80 // Winner hits more often
		} else {
			hitChance = 0.60 // Loser hits less often
		}

		hit := rand.Float32() < hitChance
		crit := hit && rand.Float32() > 0.85
		dodge := !hit && rand.Float32() > 0.5

		damage := 0
		if hit {
			baseDamage := 10 + rand.Intn(10) // 10-20 damage
			if attacker == predeterminedWinner {
				baseDamage += 3 // Winner does slightly more damage
			}
			damage = baseDamage
			if crit {
				damage = int(float64(damage) * 1.5)
			}
		}

		// Apply damage to defender's health
		if hit && damage > 0 {
			if attacker == "playerA" {
				playerBHealth -= damage
				if playerBHealth < 0 {
					playerBHealth = 0
				}
			} else {
				playerAHealth -= damage
				if playerAHealth < 0 {
					playerAHealth = 0
				}
			}
		}

		events = append(events, FightEvent{
			Time:   currentTime,
			Type:   attackType,
			Actor:  attacker,
			Hit:    hit,
			Crit:   crit,
			Damage: damage,
		})

		reactionType := "react_hit"
		if dodge {
			reactionType = "react_dodge"
		} else if !hit {
			reactionType = "react_block"
		}
		events = append(events, FightEvent{
			Time:  currentTime + 0.1,
			Type:  reactionType,
			Actor: defender,
			Dodge: dodge,
		})

		// Alternate turns
		isPlayerATurn = !isPlayerATurn
		currentTime += 0.6 + rand.Float64()*0.4 // Faster pace
	}

	// Determine actual winner based on health (should match predetermined due to bias)
	actualWinner := "playerA"
	loser := "playerB"
	if playerAHealth <= 0 {
		actualWinner = "playerB"
		loser = "playerA"
	}

	// Finish move
	events = append(events, FightEvent{Time: currentTime + 0.3, Type: "finish_move", Actor: actualWinner})
	events = append(events, FightEvent{Time: currentTime + 0.8, Type: "ko", Actor: loser})
	events = append(events, FightEvent{Time: currentTime + 1.3, Type: "victory", Actor: actualWinner})

	duration := currentTime + 1.5

	return FightScript{
		MatchID: uuid.New().String(),
		PlayerA: PlayerInfo{
			ID:        uuid.New().String(),
			Username:  playerAName,
			Character: "fighter",
			Skin:      "default",
		},
		PlayerB: PlayerInfo{
			ID:        uuid.New().String(),
			Username:  playerBName,
			Character: "fighter",
			Skin:      "default",
		},
		Winner:   actualWinner,
		Duration: duration,
		Events:   events,
	}
}
