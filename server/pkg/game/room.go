package game

import (
	"encoding/json"
	"log"
	"math/rand"
	"time"

	"github.com/google/uuid"

	"github.com/hugolol/gamblefights/pkg/db"
	"github.com/hugolol/gamblefights/pkg/fairness"
	"github.com/hugolol/gamblefights/pkg/models"
)

// FightEvent represents a single event in the fight animation
type FightEvent struct {
	Time   float64 `json:"time"`   // Seconds from start
	Type   string  `json:"type"`   // Event type
	Actor  string  `json:"actor"`  // "playerA" or "playerB"
	Hit    bool    `json:"hit,omitempty"`
	Crit   bool    `json:"crit,omitempty"`
	Dodge  bool    `json:"dodge,omitempty"`
	Damage int     `json:"damage,omitempty"`
}

// FightScript is the complete animation script sent to clients
type FightScript struct {
	MatchID  string       `json:"matchId"`
	PlayerA  PlayerInfo   `json:"playerA"`
	PlayerB  PlayerInfo   `json:"playerB"`
	Winner   string       `json:"winner"` // "playerA" or "playerB"
	Duration float64      `json:"duration"`
	Events   []FightEvent `json:"events"`
}

// PlayerInfo for the fight script
type PlayerInfo struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Character string `json:"character"`
	Skin      string `json:"skin"`
}

// GameRoom manages a single match between two players
type GameRoom struct {
	ID        string
	PlayerA   *Client
	PlayerB   *Client
	Match     *models.Match
	Hub       *Hub
}

// NewGameRoom creates a new game room for two matched players
func NewGameRoom(id string, p1, p2 *Client, wagerAmount int64, hub *Hub) *GameRoom {
	return &GameRoom{
		ID:      id,
		PlayerA: p1,
		PlayerB: p2,
		Hub:     hub,
	}
}

// StartMatch initializes and runs the match
func (gr *GameRoom) StartMatch(wagerAmount int64) error {
	// Get user records
	var userA, userB models.User
	if err := db.DB.Where("id = ?", gr.PlayerA.UserID).First(&userA).Error; err != nil {
		gr.notifyError("Failed to find player A")
		return err
	}
	if err := db.DB.Where("id = ?", gr.PlayerB.UserID).First(&userB).Error; err != nil {
		gr.notifyError("Failed to find player B")
		return err
	}

	// Lock wagers from both players
	if err := gr.lockWager(userA.ID, wagerAmount); err != nil {
		gr.notifyError("Player A has insufficient balance")
		return err
	}
	if err := gr.lockWager(userB.ID, wagerAmount); err != nil {
		// Refund player A
		gr.refundWager(userA.ID, wagerAmount)
		gr.notifyError("Player B has insufficient balance")
		return err
	}

	// Generate server seed
	serverSeed, err := fairness.GenerateServerSeed()
	if err != nil {
		gr.refundWager(userA.ID, wagerAmount)
		gr.refundWager(userB.ID, wagerAmount)
		gr.notifyError("Failed to generate server seed")
		return err
	}

	// Combine client seeds
	combinedClientSeed := userA.ClientSeed + "-" + userB.ClientSeed
	nonce := userA.Nonce // Use player A's nonce

	// Calculate outcome
	playerAWins, outcomeHash := fairness.CalculateOutcome(serverSeed, combinedClientSeed, nonce)

	// Determine winner
	var winnerID uuid.UUID
	var winnerStr string
	if playerAWins {
		winnerID = userA.ID
		winnerStr = "playerA"
	} else {
		winnerID = userB.ID
		winnerStr = "playerB"
	}

	// Generate fight script
	fightScript := gr.generateFightScript(userA, userB, winnerStr)
	fightScriptJSON, _ := json.Marshal(fightScript)

	// Create match record
	now := time.Now()
	match := models.Match{
		PlayerAID:        userA.ID,
		PlayerBID:        userB.ID,
		WagerAmount:      wagerAmount,
		Currency:         models.CurrencySOL,
		ServerSeed:       serverSeed,
		ServerSeedHashed: fairness.HashServerSeed(serverSeed),
		ClientSeedA:      userA.ClientSeed,
		ClientSeedB:      userB.ClientSeed,
		Nonce:            nonce,
		WinnerID:         &winnerID,
		Status:           models.MatchStatusCompleted,
		FightScript:      string(fightScriptJSON),
		FinishedAt:       &now,
	}

	if err := db.DB.Create(&match).Error; err != nil {
		gr.refundWager(userA.ID, wagerAmount)
		gr.refundWager(userB.ID, wagerAmount)
		log.Printf("Failed to create match: %v", err)
		return err
	}

	// Payout winner (gets both wagers minus house edge)
	// For MVP: 0% house edge, winner gets full pot
	totalPot := wagerAmount * 2
	gr.payoutWinner(winnerID, totalPot, match.ID)

	// Update user stats
	gr.updateStats(userA.ID, userB.ID, winnerID, wagerAmount)

	// Increment nonce for player A
	db.DB.Model(&userA).Update("nonce", userA.Nonce+1)

	// Notify players with match result
	matchResult := map[string]interface{}{
		"type":             "MATCH_RESULT",
		"matchId":          match.ID.String(),
		"winner":           winnerStr,
		"winnerId":         winnerID.String(),
		"serverSeed":       serverSeed,
		"serverSeedHashed": match.ServerSeedHashed,
		"clientSeedA":      userA.ClientSeed,
		"clientSeedB":      userB.ClientSeed,
		"nonce":            nonce,
		"outcomeHash":      outcomeHash,
		"fightScript":      fightScript,
		"wagerAmount":      wagerAmount,
		"totalPot":         totalPot,
	}

	resultJSON, _ := json.Marshal(matchResult)
	gr.PlayerA.Send <- resultJSON
	gr.PlayerB.Send <- resultJSON

	log.Printf("Match %s completed: %s wins (outcome hash: %s)", match.ID, winnerStr, outcomeHash[:16])

	return nil
}

// lockWager deducts wager from user's wallet
func (gr *GameRoom) lockWager(userID uuid.UUID, amount int64) error {
	var wallet models.Wallet
	err := db.DB.Where("user_id = ? AND currency = ?", userID, models.CurrencySOL).First(&wallet).Error
	if err != nil {
		return err
	}

	if wallet.Balance < amount {
		return err
	}

	// Deduct balance
	return db.DB.Model(&wallet).Update("balance", wallet.Balance-amount).Error
}

// refundWager returns wager to user's wallet
func (gr *GameRoom) refundWager(userID uuid.UUID, amount int64) {
	var wallet models.Wallet
	err := db.DB.Where("user_id = ? AND currency = ?", userID, models.CurrencySOL).First(&wallet).Error
	if err != nil {
		return
	}
	db.DB.Model(&wallet).Update("balance", wallet.Balance+amount)
}

// payoutWinner credits the winner's wallet
func (gr *GameRoom) payoutWinner(winnerID uuid.UUID, amount int64, matchID uuid.UUID) {
	var wallet models.Wallet
	err := db.DB.Where("user_id = ? AND currency = ?", winnerID, models.CurrencySOL).First(&wallet).Error
	if err != nil {
		return
	}
	db.DB.Model(&wallet).Update("balance", wallet.Balance+amount)

	// Create transaction record
	tx := models.Transaction{
		UserID:   winnerID,
		WalletID: wallet.ID,
		MatchID:  &matchID,
		Type:     models.TxTypeWin,
		Amount:   amount,
		Currency: models.CurrencySOL,
		Status:   models.TxStatusCompleted,
	}
	db.DB.Create(&tx)
}

// updateStats updates win/loss stats for both players
func (gr *GameRoom) updateStats(playerAID, playerBID, winnerID uuid.UUID, wagerAmount int64) {
	if winnerID == playerAID {
		db.DB.Model(&models.User{}).Where("id = ?", playerAID).Updates(map[string]interface{}{
			"total_wins":    db.DB.Raw("total_wins + 1"),
			"total_wagered": db.DB.Raw("total_wagered + ?", wagerAmount),
		})
		db.DB.Model(&models.User{}).Where("id = ?", playerBID).Updates(map[string]interface{}{
			"total_losses":  db.DB.Raw("total_losses + 1"),
			"total_wagered": db.DB.Raw("total_wagered + ?", wagerAmount),
		})
	} else {
		db.DB.Model(&models.User{}).Where("id = ?", playerBID).Updates(map[string]interface{}{
			"total_wins":    db.DB.Raw("total_wins + 1"),
			"total_wagered": db.DB.Raw("total_wagered + ?", wagerAmount),
		})
		db.DB.Model(&models.User{}).Where("id = ?", playerAID).Updates(map[string]interface{}{
			"total_losses":  db.DB.Raw("total_losses + 1"),
			"total_wagered": db.DB.Raw("total_wagered + ?", wagerAmount),
		})
	}
}

// notifyError sends error message to both players
func (gr *GameRoom) notifyError(message string) {
	errMsg, _ := json.Marshal(map[string]string{
		"type":  "MATCH_ERROR",
		"error": message,
	})
	if gr.PlayerA != nil {
		gr.PlayerA.Send <- errMsg
	}
	if gr.PlayerB != nil {
		gr.PlayerB.Send <- errMsg
	}
}

// generateFightScript creates an entertaining fight animation sequence
func (gr *GameRoom) generateFightScript(userA, userB models.User, winner string) FightScript {
	events := []FightEvent{}

	// Fight duration between 8-15 seconds
	duration := 8.0 + rand.Float64()*7.0

	// Generate a sequence of attacks leading to the outcome
	currentTime := 0.5
	playerAHealth := 100
	playerBHealth := 100

	// Initial approach
	events = append(events, FightEvent{Time: 0.2, Type: "move_fwd", Actor: "playerA"})
	events = append(events, FightEvent{Time: 0.3, Type: "move_fwd", Actor: "playerB"})

	// Combat exchanges
	attackTypes := []string{"attack_light", "attack_heavy", "attack_special"}

	for currentTime < duration-2.0 {
		attacker := "playerA"
		defender := "playerB"
		if rand.Float32() > 0.5 {
			attacker = "playerB"
			defender = "playerA"
		}

		attackType := attackTypes[rand.Intn(len(attackTypes))]
		hit := rand.Float32() > 0.3 // 70% hit rate
		crit := hit && rand.Float32() > 0.8 // 20% crit on hit
		dodge := !hit && rand.Float32() > 0.5 // 50% dodge on miss

		damage := 0
		if hit {
			damage = 10 + rand.Intn(15)
			if crit {
				damage *= 2
			}
			// Apply damage
			if attacker == "playerA" {
				playerBHealth -= damage
			} else {
				playerAHealth -= damage
			}
		}

		// Attack event
		events = append(events, FightEvent{
			Time:   currentTime,
			Type:   attackType,
			Actor:  attacker,
			Hit:    hit,
			Crit:   crit,
			Damage: damage,
		})

		// Reaction event
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

		currentTime += 0.8 + rand.Float64()*0.6
	}

	// Finish move
	events = append(events, FightEvent{
		Time:  duration - 1.0,
		Type:  "finish_move",
		Actor: winner,
	})

	// KO
	loser := "playerB"
	if winner == "playerB" {
		loser = "playerA"
	}
	events = append(events, FightEvent{
		Time:  duration - 0.5,
		Type:  "ko",
		Actor: loser,
	})

	// Victory pose
	events = append(events, FightEvent{
		Time:  duration,
		Type:  "victory",
		Actor: winner,
	})

	return FightScript{
		MatchID: gr.ID,
		PlayerA: PlayerInfo{
			ID:        userA.ID.String(),
			Username:  userA.Username,
			Character: "fighter",
			Skin:      "default",
		},
		PlayerB: PlayerInfo{
			ID:        userB.ID.String(),
			Username:  userB.Username,
			Character: "fighter",
			Skin:      "default",
		},
		Winner:   winner,
		Duration: duration,
		Events:   events,
	}
}
