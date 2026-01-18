package game

import (
	"encoding/json"
	"log"
	"time"
)

// Hub maintains the set of active clients and broadcasts messages to the
// clients.
type Hub struct {
	// Registered clients.
	Clients map[*Client]bool

	// Inbound messages from the clients.
	Broadcast chan []byte

	// Register requests from the clients.
	Register chan *Client

	// Unregister requests from clients.
	Unregister chan *Client
}

func NewHub() *Hub {
	return &Hub{
		Broadcast:  make(chan []byte),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Clients:    make(map[*Client]bool),
	}
}

func (h *Hub) IsConnected(c *Client) bool {
	_, ok := h.Clients[c]
	return ok
}

func (h *Hub) Run() {
	ticker := time.NewTicker(100 * time.Millisecond) // 10Hz snapshot rate
	defer ticker.Stop()

	for {
		select {
		case client := <-h.Register:
			h.Clients[client] = true
			log.Printf("Client registered: %s (Total: %d)", client.UserID, len(h.Clients))
		case client := <-h.Unregister:
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				close(client.Send)
				log.Printf("Client unregistered: %s (Total: %d)", client.UserID, len(h.Clients))
			}
		case message := <-h.Broadcast:
			for client := range h.Clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.Clients, client)
				}
			}
		case <-ticker.C:
			// Broadcast Lobby Snapshot
			players := make([]map[string]interface{}, 0)
			for client := range h.Clients {
				if client.InLobby {
					players = append(players, map[string]interface{}{
						"id":        client.UserID,
						"x":         client.X,
						"y":         client.Y,
						"character": client.Character,
					})
				}
			}

			if len(players) > 0 {
				snapshot := OutgoingMessage{
					Type: MsgTypeLobbySnapshot,
					Payload: map[string]interface{}{
						"players": players,
					},
				}
				jsonMsg, _ := json.Marshal(snapshot)
				for client := range h.Clients {
					if client.InLobby {
						select {
						case client.Send <- jsonMsg:
						default:
							close(client.Send)
							delete(h.Clients, client)
						}
					}
				}
			}
		}
	}
}
