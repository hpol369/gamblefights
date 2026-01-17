-- GambleFights Supabase Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(20) DEFAULT 'USER',
    wallet_address_sol VARCHAR(64) UNIQUE,
    wallet_address_ton VARCHAR(64) UNIQUE,
    client_seed VARCHAR(255) DEFAULT '',
    nonce BIGINT DEFAULT 0,
    total_wins BIGINT DEFAULT 0,
    total_losses BIGINT DEFAULT 0,
    total_wagered BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Wallets table
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(10) NOT NULL,
    balance BIGINT NOT NULL DEFAULT 0,
    deposit_address VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_a_id UUID NOT NULL REFERENCES users(id),
    player_b_id UUID NOT NULL REFERENCES users(id),
    wager_amount BIGINT NOT NULL,
    currency VARCHAR(10) NOT NULL,
    server_seed VARCHAR(128) NOT NULL,
    server_seed_hashed VARCHAR(128) NOT NULL,
    client_seed_a VARCHAR(128),
    client_seed_b VARCHAR(128),
    nonce BIGINT DEFAULT 0,
    winner_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'WAITING',
    fight_script JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    match_id UUID REFERENCES matches(id),
    type VARCHAR(20) NOT NULL,
    amount BIGINT NOT NULL,
    currency VARCHAR(10) NOT NULL,
    tx_hash VARCHAR(128),
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_wallet_sol ON users(wallet_address_sol);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_matches_player_a ON matches(player_a_id);
CREATE INDEX idx_matches_player_b ON matches(player_b_id);
CREATE INDEX idx_matches_winner ON matches(winner_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_match ON transactions(match_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
