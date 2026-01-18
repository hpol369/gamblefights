'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGame, MatchResult } from '../context/GameContext';
import { parseSOL, formatSOL } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const DEMO_WAGER = 100000000; // 0.1 SOL in lamports for demo

const WAGER_PRESETS = [
  { label: '0.05 SOL', value: 0.05 },
  { label: '0.1 SOL', value: 0.1 },
  { label: '0.25 SOL', value: 0.25 },
  { label: '0.5 SOL', value: 0.5 },
  { label: '1 SOL', value: 1 },
];

export function BettingPanel() {
  const { balances, isGuest, user } = useAuth();
  const { gameState, joinQueue, leaveQueue, isConnected, setTestMatch, startDemoFight } = useGame();
  const [selectedWager, setSelectedWager] = useState(0.1);
  const [customWager, setCustomWager] = useState('');
  const [isTestingFight, setIsTestingFight] = useState(false);

  // Handle fight - uses demo mode for guests, real API for authenticated users
  const handleFight = () => {
    if (isGuest) {
      // Use local demo fight for guests
      startDemoFight(user?.username || 'Guest', DEMO_WAGER);
    } else {
      // Use real queue for authenticated users
      const amount = customWager ? parseFloat(customWager) : selectedWager;
      joinQueue(parseSOL(amount));
    }
  };

  const handleTestFight = async () => {
    // For guests, just use demo fight
    if (isGuest) {
      startDemoFight(user?.username || 'Guest', DEMO_WAGER);
      return;
    }

    setIsTestingFight(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Test fight - Token:', token ? 'present' : 'missing');
      console.log('Test fight - API URL:', `${API_URL}/api/test/fight`);

      const res = await fetch(`${API_URL}/api/test/fight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Test fight - Response status:', res.status);
      const data = await res.json();
      console.log('Test fight - Response data:', data);

      if (res.ok) {
        setTestMatch(data as MatchResult);
      } else {
        alert(`Test fight failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Test fight failed:', err);
      alert(`Test fight error: ${err}`);
    } finally {
      setIsTestingFight(false);
    }
  };

  const solBalance = balances.find((b) => b.currency === 'SOL');
  const balanceLamports = solBalance?.balance || 0;
  const wagerLamports = parseSOL(customWager ? parseFloat(customWager) : selectedWager);
  const hasEnoughBalance = isGuest || balanceLamports >= wagerLamports;

  const isQueuing = gameState === 'queuing' || gameState === 'matched';

  return (
    <div className="parchment-panel rounded-xl p-6">
      <h2 className="text-2xl font-bold mb-6 text-center font-[Cinzel] text-[#8b0000]">Wager Your Gold</h2>

      {/* Wager Selection */}
      <div className="space-y-4">
        <label className="block text-sm text-[#5a3a22] font-bold uppercase tracking-wide">Select Wager Amount</label>

        {/* Preset Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {WAGER_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => {
                setSelectedWager(preset.value);
                setCustomWager('');
              }}
              disabled={isQueuing}
              className={`py-2 px-3 rounded text-sm font-bold transition-all border font-[Cinzel] ${selectedWager === preset.value && !customWager
                  ? 'bg-[#8b0000] text-[#ffd700] border-[#ffd700]'
                  : 'bg-[#eecfa1] text-[#5a3a22] border-[#8b6b45] hover:bg-[#d4b483]'
                } disabled:opacity-50`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Amount Input */}
        <div className="relative">
          <input
            type="number"
            placeholder="Custom amount..."
            value={customWager}
            onChange={(e) => setCustomWager(e.target.value)}
            disabled={isQueuing}
            className="w-full px-4 py-3 bg-[#eecfa1] border-2 border-[#8b6b45] rounded text-[#3b3b3b] placeholder-[#8b6b45]/50 focus:outline-none focus:border-[#8b0000] font-[Cinzel] disabled:opacity-50"
            step="0.01"
            min="0.01"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5a3a22] font-bold">
            SOL
          </span>
        </div>

        {/* Balance Display */}
        <div className="flex justify-between text-sm font-mono">
          <span className="text-[#5a3a22]">Your Balance:</span>
          <span className={hasEnoughBalance ? 'text-[#3b8b00] font-bold' : 'text-[#8b0000] font-bold'}>
            {solBalance?.display || '0 SOL'}
          </span>
        </div>

        {!hasEnoughBalance && wagerLamports > 0 && (
          <p className="text-[#8b0000] text-sm text-center font-bold">
            Insufficient funds, beggar.
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 space-y-3">
        {!isQueuing ? (
          <button
            onClick={handleFight}
            disabled={(!isGuest && !isConnected) || !hasEnoughBalance || (!isGuest && wagerLamports === 0)}
            className="w-full py-4 bg-[#8b0000] text-[#ffd700] border-4 border-[#ffd700] rounded text-lg font-bold font-[Cinzel] uppercase disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            {isGuest
              ? 'FIGHT NOW (Demo)'
              : !isConnected
              ? 'Connecting to Arena...'
              : `FIGHT FOR ${formatSOL(wagerLamports)}`}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="text-center py-4 bg-[#eecfa1]/50 rounded border border-[#8b6b45]">
              <div className="inline-flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-[#8b0000] border-t-transparent rounded-full animate-spin" />
                <span className="text-lg font-bold text-[#8b0000] font-[Cinzel]">
                  Searching for Opponent...
                </span>
              </div>
              <p className="text-[#5a3a22] text-sm mt-2 font-mono">
                Wager: {formatSOL(wagerLamports)}
              </p>
            </div>
            <button
              onClick={leaveQueue}
              className="w-full py-3 bg-[#5a5a5a] text-[#eecfa1] hover:bg-[#6a6a6a] rounded font-bold transition-colors uppercase text-sm"
            >
              Cancel Search
            </button>
          </div>
        )}
      </div>

      {/* Test Fight Button */}
      <div className="mt-6 pt-6 border-t border-[#8b6b45]/30">
        <button
          onClick={handleTestFight}
          disabled={isTestingFight}
          className="w-full py-2 bg-[#5a3a22] text-[#eecfa1] hover:bg-[#7a5a3a] rounded text-sm font-bold transition-colors disabled:opacity-50 uppercase font-[Cinzel]"
        >
          {isTestingFight ? 'Summoning Bot...' : '🤖 Spar with Training Dummy'}
        </button>
      </div>

      {/* Info */}
      <div className="mt-4 pt-4 border-t border-[#8b6b45]/30">
        <div className="text-[10px] text-[#8b6b45] space-y-1 text-center font-serif italic">
          <p>Winner takes all gold (0% tax for Gladiators)</p>
          <p>Matched with warriors of equal wealth</p>
        </div>
      </div>
    </div>
  );
}
