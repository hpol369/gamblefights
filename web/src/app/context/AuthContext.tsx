'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { User, WalletBalance, walletAuth, getProfile, getBalances, addTestDeposit } from '@/lib/api';
import bs58 from 'bs58';

interface AuthContextType {
  user: User | null;
  balances: WalletBalance[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signInAsGuest: () => void;
  signOut: () => void;
  refreshBalances: () => Promise<void>;
  addTestFunds: () => Promise<void>;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const [user, setUser] = useState<User | null>(null);
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  const isAuthenticated = !!user || isGuest;

  // Refresh balances
  const refreshBalances = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getBalances();
      setBalances(data.balances);
    } catch (err) {
      console.error('Failed to refresh balances:', err);
    }
  }, [user]);

  // Add test funds (dev only)
  const addTestFunds = useCallback(async () => {
    if (!user) return;
    try {
      await addTestDeposit();
      await refreshBalances();
    } catch (err) {
      console.error('Failed to add test funds:', err);
      setError('Failed to add test funds');
    }
  }, [user, refreshBalances]);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && connected) {
      // Try to restore session
      getProfile()
        .then((userData) => {
          setUser(userData);
          return getBalances();
        })
        .then((data) => {
          setBalances(data.balances);
        })
        .catch(() => {
          // Token expired or invalid
          localStorage.removeItem('token');
          setUser(null);
        });
    }
  }, [connected]);

  // Sign in with Solana wallet
  const signIn = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create message to sign
      const message = `Sign in to GambleFights\nTimestamp: ${Date.now()}`;
      const encodedMessage = new TextEncoder().encode(message);

      // Request signature from wallet
      const signature = await signMessage(encodedMessage);
      const signatureBase58 = bs58.encode(signature);

      // Authenticate with backend
      const response = await walletAuth(
        publicKey.toBase58(),
        signatureBase58,
        message
      );

      // Store token and user
      localStorage.setItem('token', response.token);
      setUser(response.user);

      // Fetch balances
      const balanceData = await getBalances();
      setBalances(balanceData.balances);
    } catch (err) {
      console.error('Sign in failed:', err);
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, signMessage]);

  // Sign in as guest (demo mode)
  const signInAsGuest = useCallback(() => {
    const guestUser: User = {
      id: 'guest-' + Math.random().toString(36).substr(2, 9),
      walletAddressSOL: 'DEMO',
      username: 'Gladiator_' + Math.floor(Math.random() * 9999),
      clientSeed: 'demo-seed',
      totalWins: 0,
      totalLosses: 0,
    };
    setUser(guestUser);
    setIsGuest(true);
    setBalances([{ currency: 'SOL', balance: 1.0, display: '1.00 SOL' }]);
  }, []);

  // Sign out
  const signOut = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    setBalances([]);
    setIsGuest(false);
    disconnect();
  }, [disconnect]);

  return (
    <AuthContext.Provider
      value={{
        user,
        balances,
        isAuthenticated,
        isLoading,
        error,
        signIn,
        signInAsGuest,
        signOut,
        refreshBalances,
        addTestFunds,
        isGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
