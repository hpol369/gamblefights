'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAuth } from './context/AuthContext';
import { useGame } from './context/GameContext';
import { BettingPanel } from './components/BettingPanel';
import { MatchViewer } from './components/MatchViewer';
import { LiveFeed } from './components/LiveFeed';
import { UserStats } from './components/UserStats';

export default function Home() {
  const { connected } = useWallet();
  const { user, isAuthenticated, isLoading, error, signIn, signOut, balances, addTestFunds } = useAuth();
  const { isConnected, gameState } = useGame();

  // Get SOL balance
  const solBalance = balances.find((b) => b.currency === 'SOL');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              GambleFights
            </h1>
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span className="text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated && solBalance && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg">
                <span className="text-gray-400">Balance:</span>
                <span className="font-mono font-bold text-green-400">
                  {solBalance.display}
                </span>
                <button
                  onClick={addTestFunds}
                  className="ml-2 text-xs text-gray-500 hover:text-gray-300"
                  title="Add test funds (dev only)"
                >
                  +
                </button>
              </div>
            )}

            {!connected ? (
              <WalletMultiButton className="!bg-gradient-to-r !from-red-600 !to-orange-600 hover:!from-red-500 hover:!to-orange-500" />
            ) : !isAuthenticated ? (
              <button
                onClick={signIn}
                disabled={isLoading}
                className="px-6 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-lg font-semibold disabled:opacity-50 transition-all"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-gray-400">{user?.username}</span>
                <button
                  onClick={signOut}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-2 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {!isAuthenticated ? (
          // Landing view for non-authenticated users
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
              Provably Fair Crypto Battles
            </h2>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl">
              Wager SOL in 1v1 battles with instant settlements. Every outcome is
              cryptographically verifiable.
            </p>
            <div className="flex gap-4">
              {!connected ? (
                <WalletMultiButton className="!bg-gradient-to-r !from-red-600 !to-orange-600 hover:!from-red-500 hover:!to-orange-500 !text-lg !py-3 !px-8" />
              ) : (
                <button
                  onClick={signIn}
                  disabled={isLoading}
                  className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-lg text-lg font-semibold disabled:opacity-50 transition-all"
                >
                  {isLoading ? 'Signing in...' : 'Connect Wallet to Play'}
                </button>
              )}
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 w-full max-w-4xl">
              <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700">
                <div className="text-3xl mb-3">🎲</div>
                <h3 className="text-lg font-semibold mb-2">Provably Fair</h3>
                <p className="text-gray-400 text-sm">
                  Every outcome uses HMAC-SHA256 cryptographic verification
                </p>
              </div>
              <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="text-lg font-semibold mb-2">Instant Payouts</h3>
                <p className="text-gray-400 text-sm">
                  Win and receive your SOL instantly to your wallet
                </p>
              </div>
              <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700">
                <div className="text-3xl mb-3">🎮</div>
                <h3 className="text-lg font-semibold mb-2">Epic Animations</h3>
                <p className="text-gray-400 text-sm">
                  Watch your battles unfold with exciting fight animations
                </p>
              </div>
            </div>

            {/* Live Feed for visitors */}
            <div className="mt-16 w-full">
              <h3 className="text-xl font-semibold mb-4 text-gray-300">Live Matches</h3>
              <LiveFeed />
            </div>
          </div>
        ) : (
          // Game view for authenticated users
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - User Stats */}
            <div className="space-y-6">
              <UserStats />
            </div>

            {/* Center Column - Game Arena */}
            <div className="lg:col-span-1 space-y-6">
              {gameState === 'idle' || gameState === 'queuing' ? (
                <BettingPanel />
              ) : (
                <MatchViewer />
              )}
            </div>

            {/* Right Column - Live Feed */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-300">Recent Matches</h3>
              <LiveFeed />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <div className="flex justify-center gap-6 mb-4">
            <a href="/fairness" className="hover:text-gray-300 transition-colors">
              Fairness Verifier
            </a>
            <a href="/status" className="hover:text-gray-300 transition-colors">
              System Status
            </a>
          </div>
          <p>GambleFights - Provably Fair Gaming</p>
        </div>
      </footer>
    </div>
  );
}
