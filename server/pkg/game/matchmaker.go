package game

import (
	"log"
	"sync"

	"github.com/google/uuid"
)

// Matchmaker handles queuing players and forming matches.
type Matchmaker struct {
	Queue chan *Client
	Hub   *Hub
	m     sync.Mutex
}

func NewMatchmaker(hub *Hub) *Matchmaker {
	mm := &Matchmaker{
		Queue: make(chan *Client, 100),
		Hub:   hub,
	}
	go mm.Run()
	return mm
}

func (mm *Matchmaker) Add(client *Client) {
	mm.Queue <- client
	client.Send <- []byte(`{"type":"QUEUE_JOINED"}`)
}

func (mm *Matchmaker) Run() {
	var pending *Client

	for client := range mm.Queue {
		if pending == nil {
			// First player in pair
			pending = client
			log.Printf("Player %s waiting for match...", client.UserID)
		} else {
			// Second player found -> Match!
			opponent := client

			// Prevent matching with self (basic check)
			if pending == opponent {
				continue
			}

			// Verify both still connected
			if !mm.Hub.IsConnected(pending) {
				pending = opponent
				continue
			}

			mm.CreateMatch(pending, opponent)
			pending = nil
		}
	}
}

func (mm *Matchmaker) CreateMatch(p1, p2 *Client) {
	matchID := uuid.New().String()

	// Use the lower wager amount of the two players
	wagerAmount := p1.WagerAmount
	if p2.WagerAmount < wagerAmount {
		wagerAmount = p2.WagerAmount
	}

	log.Printf("Match created: %s vs %s (ID: %s, Wager: %d)", p1.UserID, p2.UserID, matchID, wagerAmount)

	// Notify players that match is found
	matchFoundMsg := []byte(`{"type":"MATCH_FOUND","matchId":"` + matchID + `","wagerAmount":` + intToStr(wagerAmount) + `}`)
	p1.Send <- matchFoundMsg
	p2.Send <- matchFoundMsg

	// Create and start the game room
	room := NewGameRoom(matchID, p1, p2, wagerAmount, mm.Hub)

	// Run match in goroutine
	go func() {
		// Small delay to allow clients to prepare
		// time.Sleep(500 * time.Millisecond)

		if err := room.StartMatch(wagerAmount); err != nil {
			log.Printf("Match %s failed: %v", matchID, err)
		}
	}()
}

func intToStr(n int64) string {
	if n == 0 {
		return "0"
	}
	if n < 0 {
		return "-" + intToStr(-n)
	}
	digits := []byte{}
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	return string(digits)
}
