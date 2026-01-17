'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGame, MatchResult } from '../context/GameContext';
import { parseSOL, formatSOL } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const WAGER_PRESETS = [
  { label: '0.05 SOL', value: 0.05 },
  { label: '0.1 SOL', value: 0.1 },
  { label: '0.25 SOL', value: 0.25 },
  { label: '0.5 SOL', value: 0.5 },
  { label: '1 SOL', value: 1 },
];

export function BettingPanel() {
  const { balances, refreshBalances } = useAuth();
  const { gameState, joinQueue, leaveQueue, isConnected, setTestMatch } = useGame();
  const [selectedWager, setSelectedWager] = useState(0.1);
  const [customWager, setCustomWager] = useState('');
  const [isTestingFight, setIsTestingFight] = useState(false);

  const handleTestFight = async () => {
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
  const hasEnoughBalance = balanceLamports >= wagerLamports;

  const handleJoinQueue = () => {
    const amount = customWager ? parseFloat(customWager) : selectedWager;
    joinQueue(parseSOL(amount));
  };

  const isQueuing = gameState === 'queuing';

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
      <h2 className="text-xl font-bold mb-6 text-center">Quick Play</h2>

      {/* Wager Selection */}
      <div className="space-y-4">
        <label className="block text-sm text-gray-400">Select Wager Amount</label>

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
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                selectedWager === preset.value && !customWager
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 disabled:opacity-50"
            step="0.01"
            min="0.01"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            SOL
          </span>
        </div>

        {/* Balance Display */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Your Balance:</span>
          <span className={hasEnoughBalance ? 'text-green-400' : 'text-red-400'}>
            {solBalance?.display || '0 SOL'}
          </span>
        </div>

        {!hasEnoughBalance && wagerLamports > 0 && (
          <p className="text-red-400 text-sm text-center">
            Insufficient balance for this wager
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 space-y-3">
        {!isQueuing ? (
          <button
            onClick={handleJoinQueue}
            disabled={!isConnected || !hasEnoughBalance || wagerLamports === 0}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-lg text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {!isConnected
              ? 'Connecting...'
              : `Fight for ${formatSOL(wagerLamports)}`}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-lg font-semibold">
                  Finding opponent...
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Wager: {formatSOL(wagerLamports)}
              </p>
            </div>
            <button
              onClick={leaveQueue}
              className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Test Fight Button */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <button
          onClick={handleTestFight}
          disabled={isTestingFight}
          className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isTestingFight ? 'Starting...' : '🤖 Test Fight vs Bot (Free)'}
        </button>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Fight against a bot to test the game
        </p>
      </div>

      {/* Info */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="text-xs text-gray-500 space-y-1">
          <p>Winner takes all (0% house edge for MVP)</p>
          <p>Matched with players at similar wager amounts</p>
        </div>
      </div>
    </div>
  );
}
