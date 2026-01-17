package handlers

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"github.com/hugolol/gamblefights/pkg/db"
	"github.com/hugolol/gamblefights/pkg/models"
)

// MatchResponse is the public match data
type MatchResponse struct {
	ID               string  `json:"id"`
	PlayerA          string  `json:"playerA"`
	PlayerAUsername  string  `json:"playerAUsername"`
	PlayerB          string  `json:"playerB"`
	PlayerBUsername  string  `json:"playerBUsername"`
	WagerAmount      int64   `json:"wagerAmount"`
	WagerDisplay     string  `json:"wagerDisplay"`
	Currency         string  `json:"currency"`
	Winner           *string `json:"winner"`
	WinnerUsername   *string `json:"winnerUsername"`
	Status           string  `json:"status"`
	ServerSeedHashed string  `json:"serverSeedHashed"`
	ServerSeed       *string `json:"serverSeed,omitempty"` // Only revealed after match
	FightScript      *string `json:"fightScript,omitempty"`
	CreatedAt        string  `json:"createdAt"`
	FinishedAt       *string `json:"finishedAt,omitempty"`
}

// GetMatchHistory returns the user's match history
// GET /api/matches/history
func GetMatchHistory(c echo.Context) error {
	uid := c.Get("uid").(string)

	userID, err := uuid.Parse(uid)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid user ID"})
	}

	var matches []models.Match
	err = db.DB.
		Preload("PlayerA").
		Preload("PlayerB").
		Where("player_a_id = ? OR player_b_id = ?", userID, userID).
		Order("created_at DESC").
		Limit(50).
		Find(&matches).Error

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch matches"})
	}

	response := make([]MatchResponse, len(matches))
	for i, m := range matches {
		response[i] = matchToResponse(m, true) // Include server seed for own matches
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"matches": response,
	})
}

// GetMatch returns a specific match by ID
// GET /api/matches/:id
func GetMatch(c echo.Context) error {
	matchID := c.Param("id")

	parsedID, err := uuid.Parse(matchID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid match ID"})
	}

	var match models.Match
	err = db.DB.
		Preload("PlayerA").
		Preload("PlayerB").
		First(&match, parsedID).Error

	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Match not found"})
	}

	// Only reveal server seed if match is completed
	includeServerSeed := match.Status == models.MatchStatusCompleted

	return c.JSON(http.StatusOK, matchToResponse(match, includeServerSeed))
}

// GetLiveMatches returns recent/live matches for the live feed
// GET /api/matches/live
func GetLiveMatches(c echo.Context) error {
	var matches []models.Match
	err := db.DB.
		Preload("PlayerA").
		Preload("PlayerB").
		Where("status IN ?", []models.MatchStatus{
			models.MatchStatusInProgress,
			models.MatchStatusCompleted,
		}).
		Order("created_at DESC").
		Limit(20).
		Find(&matches).Error

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch matches"})
	}

	response := make([]MatchResponse, len(matches))
	for i, m := range matches {
		// Don't reveal server seed for other users' matches unless completed
		includeServerSeed := m.Status == models.MatchStatusCompleted
		response[i] = matchToResponse(m, includeServerSeed)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"matches": response,
	})
}

// matchToResponse converts a Match model to MatchResponse
func matchToResponse(m models.Match, includeServerSeed bool) MatchResponse {
	resp := MatchResponse{
		ID:               m.ID.String(),
		PlayerA:          m.PlayerAID.String(),
		PlayerAUsername:  m.PlayerA.Username,
		PlayerB:          m.PlayerBID.String(),
		PlayerBUsername:  m.PlayerB.Username,
		WagerAmount:      m.WagerAmount,
		WagerDisplay:     formatBalance(m.WagerAmount, m.Currency),
		Currency:         string(m.Currency),
		Status:           string(m.Status),
		ServerSeedHashed: m.ServerSeedHashed,
		CreatedAt:        m.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}

	if m.WinnerID != nil {
		winnerStr := m.WinnerID.String()
		resp.Winner = &winnerStr

		// Determine winner username
		if *m.WinnerID == m.PlayerAID {
			resp.WinnerUsername = &m.PlayerA.Username
		} else {
			resp.WinnerUsername = &m.PlayerB.Username
		}
	}

	if m.FinishedAt != nil {
		finishedStr := m.FinishedAt.Format("2006-01-02T15:04:05Z")
		resp.FinishedAt = &finishedStr
	}

	// Only reveal server seed for completed matches
	if includeServerSeed && m.Status == models.MatchStatusCompleted {
		resp.ServerSeed = &m.ServerSeed
		resp.FightScript = &m.FightScript
	}

	return resp
}
