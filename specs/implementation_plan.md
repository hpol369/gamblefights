# GambleFights - Technical Implementation Plan

**Objective**: Build "GambleFights," a provably fair, high-stakes 50/50 animated battle game.
**Target Audience**: Crypto gamblers, high-rollers, gamers.
**Core Value**: 100% Transparency (Provably Fair), Visually Stunning (Animation), Instant Settlements.

---

## 1. System Architecture

### Tech Stack Recommendation
We optimize for **real-time performance**, **type safety**, and **scalability**.

*   **Frontend**: **Next.js 14+ (React)**
    *   *Why*: SEO optimization for landing pages, server-side rendering for fast initial load, vast ecosystem.
    *   *Styling*: **Tailwind CSS** (Utility-first, rapid UI dev).
    *   *State*: **Zustand** (Lightweight, cleanly separates game state).
    *   *Visuals*: **Framer Motion** (UI animations) + **Unity WebGL** (The Fight Engine).
        *   *Note*: Unity is chosen over raw Three.js because of the requirement for "skinned character customization" and complex animation trees (blending idle -> attack -> hit). Unity's Animator controller is superior for this.

*   **Backend**: **Go (Golang)**
    *   *Why*: "Battle-ready" performance. excellent for WebSocket concurrency (thousands of connected players), strong typing, fast compile times, and binary deployment.
    *   *Framework*: **Echo** or **Fiber** (Fast HTTP/WS).

*   **Database**:
    *   **PostgreSQL**: Primary source of truth (Users, Wallets, Transactions, Match History). ACID compliance is non-negotiable for money.
    *   **Redis**: Hot storage. Session management, WebSocket pub/sub (matchmaking events), live leaderboards, active game states.

*   **Infrastructure**:
    *   **Frontend**: **Vercel** (Global CDN, edge functions).
    *   **Backend**: **Dockerized containers** on **AWS EKS** (Kubernetes) or **Railway** (for MVP simplicity).
    *   **Protection**: **Cloudflare** (DDOS protection, WAF).

### High-Level Architecture Diagram
```mermaid
graph TD
    User[User Client \n(Next.js + Unity)] -->|HTTPS| CF[Cloudflare]
    CF -->|Static Assets| Vercel[Vercel Frontend]
    CF -->|API / WebSocket| LB[Load Balancer]
    
    subgraph "Backend Cluster (Go)"
        LB --> API[REST API Service \n(Auth, User, Wallet)]
        LB --> WS[Game Server / WS \n(Matchmaking, Live Feed)]
        
        API -->|Transactions| DB[(PostgreSQL)]
        API -->|Cache| Cache[(Redis)]
        WS -->|Pub/Sub| Cache
        WS -->|Persist| DB
    end
    
    subgraph "Blockchain Integrations"
        WalletNode[Solana/TON RPC Nodes]
        PaymentGate[Stripe API]
    end
    
    API --> WalletNode
    API --> PaymentGate
```

---

## 2. Database Schema (ERD)

Selected standard: **PostgreSQL**.

### Core Tables

**1. Users**
*   `id` (UUID, PK)
*   `username` (VARCHAR, Unique)
*   `email` (VARCHAR, Optional)
*   `password_hash` (VARCHAR)
*   `wallet_address_sol` (VARCHAR)
*   `wallet_address_ton` (VARCHAR)
*   `role` (ENUM: USER, ADMIN, MOD)
*   `client_seed` (VARCHAR) - *For Provably Fair*
*   `is_banned` (BOOLEAN)
*   `created_at`, `updated_at`

**2. Wallets**
*   `id` (UUID, PK)
*   `user_id` (UUID, FK)
*   `currency` (ENUM: SOL, USDT, TON)
*   `balance` (DECIMAL/BIGINT) - *Stored in lowest atomic unit (e.g., Lamports)*
*   `deposit_address` (VARCHAR)

**3. CosmeticInventory**
*   `id` (UUID, PK)
*   `user_id` (UUID, FK)
*   `item_id` (VARCHAR) - *Refers to static data config*
*   `equipped` (BOOLEAN)
*   `acquired_at` (TIMESTAMP)

**4. Matches**
*   `id` (UUID, PK)
*   `player_a_id` (UUID, FK)
*   `player_b_id` (UUID, FK)
*   `wager_amount` (DECIMAL)
*   `currency` (ENUM)
*   `server_seed` (VARCHAR) - *The hidden seed*
*   `server_seed_hashed` (VARCHAR) - *Public before match*
*   `nonce` (BIGINT)
*   `winner_id` (UUID, FK)
*   `status` (ENUM: WAITING, IN_PROGRESS, COMPLETED, CANCELLED)
*   `animation_log` (JSONB) - *Stores what happened (crits, dodge) for replay*
*   `created_at`, `finished_at`

**5. Transactions**
*   `id` (UUID, PK)
*   `user_id` (UUID, FK)
*   `type` (ENUM: DEPOSIT, WITHDRAWAL, BET, WIN, REFERRAL)
*   `amount` (DECIMAL)
*   `currency` (ENUM)
*   `tx_hash` (VARCHAR) - *Blockchain hash*
*   `status` (ENUM: PENDING, COMPLETED, FAILED)

---

## 3. Provably Fair System

**Philosophy**: "Trust, but verify."
The outcome is determined **before** the animation starts.

### The Algorithm
1.  **Server Seed**: Generated server-side, random 64-byte hex string.
2.  **Server Seed Hash**: `SHA256(server_seed)`. Displayed to the user *before* they bet.
3.  **Client Seed**: User can change this at any time in settings. Defaults to random.
4.  **Nonce**: Increments by 1 for every bet the user makes.
5.  **Calculation**:
    ```go
    // Pseudo-code
    hmacResult := HMAC_SHA256(server_seed, client_seed + "-" + nonce)
    // Take first 8 digits of hex, convert to int
    outcome := parseInt(hmacResult.substring(0, 8), 16)
    // If outcome % 2 == 0 -> Player A wins, else Player B wins
    // OR: 0-50 = Player A, 51-100 = Player B (normalized)
    ```

### Verification Tool
*   A standalone page `/fairness` where users can input Server Seed (revealed after match), Client Seed, and Nonce to verify the output matches the game result.

---

## 4. Animation Engine (Unity WebGL)

**Architecture**: "Dumb Client, Smart Server"
The Unity client is purely a **renderer**. It receives a `FightScript` JSON and plays it back.

### FightScript JSON Structure
Generated by the server upon match start.
```json
{
  "matchId": "uuid",
  "playerA": { "character": "robot", "skin": "gold", "weapon": "laser_sword" },
  "playerB": { "character": "alien", "skin": "standard", "weapon": "hammer" },
  "winner": "playerA",
  "duration": 30, // seconds
  "events": [
    { "time": 0.5, "type": "move_fwd", "actor": "playerA" },
    { "time": 1.2, "type": "attack_light", "actor": "playerA", "hit": true, "crit": false },
    { "time": 1.2, "type": "react_hit", "actor": "playerB" },
    { "time": 3.4, "type": "attack_heavy", "actor": "playerB", "hit": false, "dodge": true },
    { "time": 29.0, "type": "finish_move", "actor": "playerA" },
    { "time": 30.0, "type": "ko", "actor": "playerB" }
  ]
}
```

### Assets Needed
1.  **Base Character Rig**: Humanoid compatible with Mixamo or custom animations.
2.  **Modular Parts**: Separate meshes for Head, Torso, Legs, Weapon Hand.
3.  **Animation Controller**: Blend tree for smooth transitions (Idle <-> Walk <-> Attack).

---

## 5. Security & Anti-Cheat

1.  **Rate Limiting**: Strict middleware on all API endpoints (Redis-based leaky bucket).
2.  **Wallet Management**:
    *   **Hot Wallet**: For automated payouts (holds ~5% of funds).
    *   **Cold Wallet**: Offline storage for profits/oversupply.
    *   **Withdrawal Review**: Any withdrawal > $2500 triggers a `PENDING_REVIEW` state requiring admin approval.
3.  **Multi-Account Detection**:
    *   FingerprintJS for device ID.
    *   IP Logging & Clustering.
    *   If multiple accounts match same Fingerprint/IP -> Flag as "High Risk".
4.  **No Client Authoritative Logic**: All game outcomes are calculated on the server. The client simply asks "Who won?" and the server replies "You won".

---

## 6. Development Roadmap & Team

### Phase 1: MVP (Months 1-2)
*   **Goal**: Playable 1v1 coinflip with basic animation.
*   **Features**:
    *   User Auth (Email + Wallet Connect).
    *   Deposit/Withdraw (SOL/TON).
    *   Provably Fair logic implemented.
    *   Basic "Live Arena" feed.
    *   One Character, no customization.
    *   Fixed stakes ($1 - $100).
*   **Team**:
    *   1x Senior Backend (Go).
    *   1x Senior Frontend (Next.js).
    *   1x Unity Developer (Animation/WebGL).

### Phase 2: V1 - The Product (Months 3-4)
*   **Goal**: Customization & Sticky Features.
*   **Features**:
    *   Cosmetic Shop & Inventory.
    *   Highroller Challenges.
    *   Chat system.
    *   Leaderboards.
    *   Sound FX & polished UI.
*   **Team**: Add 1x Designer/Animator.

### Phase 3: Scaling (Month 5+)
*   **Goal**: 100k DAU.
*   **Focus**: Horizontal scaling (K8s), Marketing, Mobile App.

### Cost Estimate (MVP)
*   **Development**: $40k - $80k (depending on agency vs. freelance rates).
*   **Infrastructure**: ~$500/mo initially (scaling with users).
*   **Audit**: ~$10k (Smart contracts if using on-chain escrow, logic audit if off-chain).

---

## 7. Next Steps for You (Verification)

1.  **Approve Architecture**: Confirm Go + Next.js + Unity.
2.  **Setup workspace**: We will initialize the repo with this structure.
3.  **Prototype**: We will build the "Provably Fair" engine first to prove reliability.
