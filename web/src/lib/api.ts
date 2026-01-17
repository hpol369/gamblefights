const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Helper to get auth token
function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

// Helper for authenticated requests
async function authFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
}

// Types
export interface HealthResponse {
  status: string;
  service: string;
}

export interface User {
  id: string;
  username: string;
  walletAddressSOL: string;
  clientSeed: string;
  totalWins: number;
  totalLosses: number;
}

export interface WalletAuthResponse {
  token: string;
  user: User;
}

export interface WalletBalance {
  currency: string;
  balance: number;
  display: string;
}

export interface Match {
  id: string;
  playerA: string;
  playerAUsername: string;
  playerB: string;
  playerBUsername: string;
  wagerAmount: number;
  wagerDisplay: string;
  currency: string;
  winner: string | null;
  winnerUsername: string | null;
  status: string;
  serverSeedHashed: string;
  serverSeed?: string;
  fightScript?: string;
  createdAt: string;
  finishedAt?: string;
}

// API Functions

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}/health`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error('Failed to fetch health');
  }
  return res.json();
}

export async function walletAuth(
  publicKey: string,
  signature: string,
  message: string
): Promise<WalletAuthResponse> {
  const res = await fetch(`${API_URL}/auth/wallet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicKey, signature, message }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Authentication failed');
  }

  return res.json();
}

export async function getProfile(): Promise<User> {
  const res = await authFetch('/api/user/profile');
  if (!res.ok) {
    throw new Error('Failed to fetch profile');
  }
  return res.json();
}

export async function getBalances(): Promise<{ balances: WalletBalance[] }> {
  const res = await authFetch('/api/wallet/balance');
  if (!res.ok) {
    throw new Error('Failed to fetch balances');
  }
  return res.json();
}

export async function addTestDeposit(): Promise<{ message: string; amount: number; newBalance: number }> {
  const res = await authFetch('/api/wallet/test-deposit', {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error('Failed to add test deposit');
  }
  return res.json();
}

export async function updateClientSeed(clientSeed: string): Promise<{ message: string; clientSeed: string }> {
  const res = await authFetch('/api/user/client-seed', {
    method: 'PUT',
    body: JSON.stringify({ clientSeed }),
  });
  if (!res.ok) {
    throw new Error('Failed to update client seed');
  }
  return res.json();
}

export async function getMatchHistory(): Promise<{ matches: Match[] }> {
  const res = await authFetch('/api/matches/history');
  if (!res.ok) {
    throw new Error('Failed to fetch match history');
  }
  return res.json();
}

export async function getLiveMatches(): Promise<{ matches: Match[] }> {
  const res = await authFetch('/api/matches/live');
  if (!res.ok) {
    throw new Error('Failed to fetch live matches');
  }
  return res.json();
}

export async function getMatch(id: string): Promise<Match> {
  const res = await authFetch(`/api/matches/${id}`);
  if (!res.ok) {
    throw new Error('Failed to fetch match');
  }
  return res.json();
}

// Format lamports to SOL
export function formatSOL(lamports: number): string {
  const sol = lamports / 1_000_000_000;
  return sol.toFixed(sol < 0.01 ? 4 : 2) + ' SOL';
}

// Parse SOL to lamports
export function parseSOL(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}
