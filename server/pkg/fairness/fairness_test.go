package fairness

import (
	"testing"
)

func TestGenerateServerSeed(t *testing.T) {
	seed1, err := GenerateServerSeed()
	if err != nil {
		t.Fatalf("Failed to generate seed: %v", err)
	}
	if len(seed1) != 64 { // 32 bytes hex encoded = 64 chars
		t.Errorf("Expected seed length 64, got %d", len(seed1))
	}

	seed2, _ := GenerateServerSeed()
	if seed1 == seed2 {
		t.Error("Generated duplicate seeds")
	}
}

func TestCalculateOutcome(t *testing.T) {
	// Deterministic test case
	// Server Seed: "a" (sha256 of "a") -> but function takes raw seed string
	serverSeed := "server-seed-test"
	clientSeed := "client-seed-test"
	nonce := int64(1)

	// Expected outcome needs to be calculated or verified manually first.
	// But here we test consistency.

	win1, hash1 := CalculateOutcome(serverSeed, clientSeed, nonce)
	win2, hash2 := CalculateOutcome(serverSeed, clientSeed, nonce)

	if win1 != win2 {
		t.Error("Outcome not deterministic")
	}
	if hash1 != hash2 {
		t.Error("Hash not deterministic")
	}

	// Test sensitivity
	_, _ = CalculateOutcome(serverSeed, clientSeed, nonce+1)
	// Can't guarantee it flips, but hash should change
	_, hash3 := CalculateOutcome(serverSeed, clientSeed, nonce+1)

	if hash1 == hash3 {
		t.Error("Hash did not change with nonce")
	}
}

func TestHashServerSeed(t *testing.T) {
	seed := "test-seed"
	hash := HashServerSeed(seed)

	// sha256 of "test-seed" is ...
	// echo -n "test-seed" | shasum -a 256
	// 139e60248ab03c15560c5ddf1d820067q...

	if len(hash) != 64 {
		t.Error("Hash length incorrect")
	}

	// Check idempotency
	hash2 := HashServerSeed(seed)
	if hash != hash2 {
		t.Error("Hashing not consistent")
	}
}
