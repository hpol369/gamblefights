'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAuth } from './context/AuthContext';
import { useGame } from './context/GameContext';
import { BettingPanel } from './components/BettingPanel';
import { MatchViewer } from './components/MatchViewer';
import { LiveFeed } from './components/LiveFeed';
import { UserStats } from './components/UserStats';
import { SpectatorDemo } from './components/SpectatorDemo';

export default function Home() {
  const { connected } = useWallet();
  const { user, isAuthenticated, error, signInAsGuest, signOut, balances, addTestFunds, isGuest } = useAuth();
  const { isConnected, gameState } = useGame();

  // Get SOL balance
  const solBalance = balances.find((b) => b.currency === 'SOL');

  return (
    <div className="min-h-screen bg-sand bg-[url('https://www.transparenttextures.com/patterns/sandpaper.png')]">
      {/* Header (Stone Slab) */}
      <header className="border-b-4 border-[#5a5a5a] bg-[#3b3b3b] shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#ffd700] font-[Cinzel] drop-shadow-[2px_2px_0_#8b0000]">
              GambleFights
            </h1>
            <div className="hidden sm:flex items-center gap-2 text-sm bg-black/30 px-3 py-1 rounded border border-[#5a5a5a]">
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#3b8b00]' : 'bg-[#8b0000]'}`}
              />
              <span className="text-[#eecfa1] font-mono">
                {isConnected ? 'Arena Online' : 'Arena Offline'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated && solBalance && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#1a0f0a] border border-[#5a3a22] rounded shadow-inner">
                <span className="text-[#8b6b45] text-sm uppercase tracking-wider font-bold">Treasury:</span>
                <span className="font-[Cinzel] font-bold text-[#ffd700] text-lg">
                  {solBalance.display}
                </span>
                {isGuest && (
                  <span className="ml-1 text-[10px] text-[#8b6b45] uppercase">(Demo)</span>
                )}
                {!isGuest && (
                  <button
                    onClick={addTestFunds}
                    className="ml-2 w-5 h-5 flex items-center justify-center bg-[#5a3a22] text-[#eecfa1] hover:bg-[#7a5a3a] rounded text-xs leading-none"
                    title="Beg for coins (dev only)"
                  >
                    +
                  </button>
                )}
              </div>
            )}

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-[#eecfa1] font-[Cinzel] text-lg">{user?.username}</span>
                {isGuest && !connected && (
                  <WalletMultiButton className="!bg-[#5a3a22] !hover:bg-[#7a5a3a] !font-[Cinzel] !uppercase !border !border-[#ffd700] !text-xs !py-1 !px-3 !h-auto" />
                )}
                <button
                  onClick={signOut}
                  className="px-4 py-2 bg-[#5a5a5a] hover:bg-[#6a6a6a] text-[#eecfa1] rounded border border-[#3b3b3b] text-xs uppercase font-bold tracking-wider"
                >
                  Leave
                </button>
              </div>
            ) : (
              <button
                onClick={signInAsGuest}
                className="px-6 py-2 bg-[#8b0000] text-[#ffd700] border-2 border-[#ffd700] hover:bg-[#a60000] rounded font-[Cinzel] font-bold uppercase transition-all shadow-md"
              >
                Play Free
              </button>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-4 py-2 mt-4">
          <div className="bg-[#5a1a1a] border-l-4 border-[#ff0000] text-[#ffcccc] px-4 py-3 rounded shadow-md flex items-center">
            <span className="text-2xl mr-2">⚠️</span>
            {error}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {!isAuthenticated ? (
          // Landing view for non-authenticated users
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 text-[#3b3b3b] font-[Cinzel] drop-shadow-[0_2px_0_rgba(255,255,255,0.5)]">
              Gladiatorial Combat
            </h2>
            <div className="h-1 w-24 sm:w-32 bg-[#8b0000] mb-6 sm:mb-8"></div>
            <p className="text-lg sm:text-xl lg:text-2xl text-[#5a3a22] mb-8 sm:mb-12 max-w-2xl font-serif italic">
              &quot;Wager your gold in glorious 1v1 combat. Only the strongest prevail in the cryptographic arena.&quot;
            </p>
            <button
              onClick={signInAsGuest}
              className="px-12 py-5 bg-[#8b0000] text-[#ffd700] border-4 border-[#ffd700] hover:bg-[#a60000] rounded-lg text-2xl font-bold font-[Cinzel] uppercase transition-all shadow-[0_5px_15px_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(0,0,0,0.4)] animate-pulse"
            >
              Play Free
            </button>

            {/* Live Demo Fight */}
            <div className="mt-12 w-full">
              <p className="text-sm text-[#8b6b45] mb-4 uppercase tracking-widest font-bold">Live Arena Preview</p>
              <SpectatorDemo />
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 w-full max-w-5xl">
              <div className="parchment-panel p-8 rounded-lg transform hover:scale-105 transition-transform duration-300">
                <div className="text-5xl mb-4 text-[#8b0000]">⚖️</div>
                <h3 className="text-xl font-bold mb-3 font-[Cinzel] text-[#3b3b3b]">Provably Fair</h3>
                <p className="text-[#5a3a22]">
                  The gods do not play dice in secret. Every blow is cryptographically verifiable.
                </p>
              </div>
              <div className="parchment-panel p-8 rounded-lg transform hover:scale-105 transition-transform duration-300">
                <div className="text-5xl mb-4 text-[#ffd700] drop-shadow-md">💰</div>
                <h3 className="text-xl font-bold mb-3 font-[Cinzel] text-[#3b3b3b]">Instant Gold</h3>
                <p className="text-[#5a3a22]">
                  To the victor go the spoils. Winnings are sent instantly to your treasury.
                </p>
              </div>
              <div className="parchment-panel p-8 rounded-lg transform hover:scale-105 transition-transform duration-300">
                <div className="text-5xl mb-4 text-[#8b0000]">⚔️</div>
                <h3 className="text-xl font-bold mb-3 font-[Cinzel] text-[#3b3b3b]">Epic Battles</h3>
                <p className="text-[#5a3a22]">
                  Witness your champion fight for glory with visceral combat animations.
                </p>
              </div>
            </div>

            {/* Live Feed for visitors */}
            <div className="mt-20 w-full max-w-4xl">
              <h3 className="text-2xl font-bold mb-6 text-[#3b3b3b] font-[Cinzel] border-b-2 border-[#5a5a5a] inline-block pb-2">Recent Batles</h3>
              <LiveFeed />
            </div>
          </div>
        ) : (
          // Game view for authenticated users
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Column - User Stats */}
            <div className="space-y-6">
              <UserStats />
            </div>

            {/* Center Column - Game Arena (wider) */}
            <div className="lg:col-span-2 space-y-6">
              {gameState === 'idle' || gameState === 'queuing' ? (
                <BettingPanel />
              ) : (
                <MatchViewer />
              )}
            </div>

            {/* Right Column - Live Feed */}
            <div className="space-y-6">
              <div className="parchment-panel p-4 rounded-lg">
                <h3 className="text-xl font-bold text-[#3b3b3b] font-[Cinzel] mb-4 border-b border-[#d4b483] pb-2">Arena History</h3>
                <LiveFeed />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-[#5a5a5a] mt-auto bg-[#3b3b3b] text-[#8b8b8b]">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm">
          <div className="flex justify-center gap-8 mb-4 font-[Cinzel]">
            <a href="/fairness" className="hover:text-[#ffd700] transition-colors uppercase tracking-widest">
              Fairness Scrolls
            </a>
            <a href="/status" className="hover:text-[#ffd700] transition-colors uppercase tracking-widest">
              System Status
            </a>
          </div>
          <p className="font-serif italic text-[#6a6a6a]">GambleFights - Forged in the fires of Solana</p>
        </div>
      </footer>
    </div>
  );
}
