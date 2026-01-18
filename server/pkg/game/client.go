package game

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for now
	},
}

// Client is a middleman between the websocket connection and the hub.
type Client struct {
	Hub        *Hub
	Matchmaker *Matchmaker

	// The websocket connection.
	Conn *websocket.Conn

	// Buffered channel of outbound messages.
	Send chan []byte

	// User ID derived from Auth Middleware
	UserID string

	// Wager amount for matchmaking (in lamports)
	WagerAmount int64

	// Lobby State
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
	Character string  `json:"character"`
	InLobby   bool    `json:"in_lobby"`
}

// readPump pumps messages from the websocket connection to the hub.
func (c *Client) readPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()
	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error { c.Conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		// Handle Messages
		var msg IncomingMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("Invalid JSON: %v", err)
			continue
		}

		switch msg.Type {
		case MsgTypeJoinQueue:
			// Parse wager amount from payload
			wagerAmount := int64(100_000_000) // Default 0.1 SOL
			if msg.Payload != nil {
				if wa, ok := msg.Payload["wagerAmount"].(float64); ok {
					wagerAmount = int64(wa)
				}
			}
			c.WagerAmount = wagerAmount
			log.Printf("Player %s joined queue with wager %d lamports", c.UserID, wagerAmount)
			c.Matchmaker.Add(c)
		case MsgTypeLeaveQueue:
			log.Printf("Player %s left queue", c.UserID)
			// TODO: Remove from queue
		case MsgTypePing:
			c.Send <- []byte(`{"type":"PONG"}`)
		case MsgTypeLobbyEnter:
			if msg.Payload != nil {
				if char, ok := msg.Payload["character"].(string); ok {
					c.Character = char
				}
			}
			c.InLobby = true
			// Assign random start position near center
			c.X = 400.0 // Default center X
			c.Y = 300.0 // Default center Y
		case MsgTypeLobbyMove:
			if msg.Payload != nil {
				if x, ok := msg.Payload["x"].(float64); ok {
					c.X = x
				}
				if y, ok := msg.Payload["y"].(float64); ok {
					c.Y = y
				}
			}
		default:
			log.Printf("Unknown message type: %s", msg.Type)
		}
	}
}

// writePump pumps messages from the hub to the websocket connection.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// ServeWs handles websocket requests from the peer.
func ServeWs(hub *Hub, mm *Matchmaker, c echo.Context) error {
	conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		log.Println(err)
		return err
	}

	// Default to "guest" if no auth (or implementing strict auth check here)
	uid := "guest"
	if u := c.Get("uid"); u != nil {
		uid = u.(string)
	}

	client := &Client{Hub: hub, Matchmaker: mm, Conn: conn, Send: make(chan []byte, 256), UserID: uid}
	client.Hub.Register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.writePump()
	go client.readPump()

	return nil
}
