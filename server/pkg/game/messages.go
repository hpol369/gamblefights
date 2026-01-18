package game

// Incoming Message Types
const (
	MsgTypeJoinQueue     = "JOIN_QUEUE"
	MsgTypeLeaveQueue    = "LEAVE_QUEUE"
	MsgTypePing          = "PING"
	MsgTypeLobbyEnter    = "LOBBY_ENTER"
	MsgTypeLobbyMove     = "LOBBY_MOVE"
	MsgTypeLobbySnapshot = "LOBBY_SNAPSHOT"
)

// Outgoing Message Types
const (
	MsgTypeQueueJoined = "QUEUE_JOINED"
	MsgTypeMatchFound  = "MATCH_FOUND"
	MsgTypeMatchStart  = "MATCH_START"
	MsgTypeMatchResult = "MATCH_RESULT"
	MsgTypeMatchError  = "MATCH_ERROR"
	MsgTypePong        = "PONG"
	MsgTypeError       = "ERROR"
)

// Incoming Message Structure
type IncomingMessage struct {
	Type    string                 `json:"type"`
	Payload map[string]interface{} `json:"payload,omitempty"`
}

// JoinQueuePayload contains wager info when joining queue
type JoinQueuePayload struct {
	WagerAmount int64  `json:"wagerAmount"` // In lamports
	Currency    string `json:"currency"`    // "SOL", "TON", etc.
}

// Outgoing Message Structure
type OutgoingMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload,omitempty"`
}
