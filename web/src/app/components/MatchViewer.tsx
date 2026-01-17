'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGame, FightEvent } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { formatSOL } from '@/lib/api';
import {
  playCountdownBeep,
  playSwordHit,
  playHurtSound,
  playVictorySound,
  playDefeatSound,
  playBlockSound,
  playDodgeSound,
} from '@/lib/sounds';

export function MatchViewer() {
  const { gameState, currentMatch, resetGame } = useGame();
  const { user, refreshBalances } = useAuth();
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [playerAHealth, setPlayerAHealth] = useState(99);
  const [playerBHealth, setPlayerBHealth] = useState(99);
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [waitingToStart, setWaitingToStart] = useState(true);
  const [damagePopup, setDamagePopup] = useState<{ player: string; damage: number; key: number } | null>(null);

  const fightScript = currentMatch?.fightScript;

  // Check if user won - compare by winner field and username since IDs may not match
  const isWinner =
    currentMatch?.winnerId === user?.id ||
    (currentMatch?.winner === 'playerA' && fightScript?.playerA?.username === user?.username) ||
    (currentMatch?.winner === 'playerB' && fightScript?.playerB?.username === user?.username);

  // Track if fight ended early due to KO
  const [fightEnded, setFightEnded] = useState(false);

  // Process fight events
  const processEvent = useCallback((event: FightEvent) => {
    setCurrentAnimation(`${event.actor}-${event.type}`);

    // Play sounds based on event type
    if (event.type.includes('attack')) {
      playSwordHit();
    }

    // Apply damage
    if (event.hit && event.damage) {
      const target = event.actor === 'playerA' ? 'playerB' : 'playerA';

      // Play hurt sound
      setTimeout(() => playHurtSound(), 100);

      // Show damage popup
      setDamagePopup({ player: target, damage: event.damage, key: Date.now() });
      setTimeout(() => setDamagePopup(null), 800);

      if (event.actor === 'playerA') {
        setPlayerBHealth((h) => {
          const newHealth = Math.max(0, h - event.damage!);
          if (newHealth <= 0) setFightEnded(true);
          return newHealth;
        });
      } else {
        setPlayerAHealth((h) => {
          const newHealth = Math.max(0, h - event.damage!);
          if (newHealth <= 0) setFightEnded(true);
          return newHealth;
        });
      }
    } else if (event.type === 'react_dodge') {
      playDodgeSound();
    } else if (event.type === 'react_block') {
      playBlockSound();
    }

    // Check for KO event
    if (event.type === 'ko' || event.type === 'victory') {
      setFightEnded(true);
    }

    // Clear animation after delay
    setTimeout(() => setCurrentAnimation(null), 300);
  }, []);

  // Reset waiting state when new match arrives
  useEffect(() => {
    if (gameState === 'result' && fightScript) {
      setWaitingToStart(true);
      setPlayerAHealth(99);
      setPlayerBHealth(99);
      setCurrentEventIndex(0);
      setShowResult(false);
      setFightEnded(false);
      setCountdown(null);
    }
  }, [gameState, fightScript]);

  // Start fight function - called when user clicks Start
  const startFight = () => {
    if (!fightScript) return;
    setWaitingToStart(false);
    setCountdown(3);
  };

  // Run fight animation with countdown (only after user clicks Start)
  useEffect(() => {
    if (gameState !== 'result' || !fightScript || waitingToStart) return;

    const timeouts: NodeJS.Timeout[] = [];

    // Play countdown beep for 3
    playCountdownBeep(3);

    // Countdown: 3 -> 2 -> 1 -> FIGHT!
    timeouts.push(setTimeout(() => {
      setCountdown(2);
      playCountdownBeep(2);
    }, 1000));
    timeouts.push(setTimeout(() => {
      setCountdown(1);
      playCountdownBeep(1);
    }, 2000));
    timeouts.push(setTimeout(() => {
      setCountdown(0);
      playCountdownBeep(0); // "FIGHT!" sound
    }, 3000));
    timeouts.push(setTimeout(() => setCountdown(null), 3500)); // Clear countdown

    const countdownDelay = 3500; // Start events after countdown
    const events = fightScript.events;

    // Schedule each event after countdown
    events.forEach((event, index) => {
      const timeout = setTimeout(() => {
        processEvent(event);
        setCurrentEventIndex(index);

        // Show result after last event
        if (index === events.length - 1) {
          setTimeout(() => {
            setShowResult(true);
            refreshBalances();
          }, 1000);
        }
      }, countdownDelay + event.time * 1000);

      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [gameState, fightScript, waitingToStart, processEvent, refreshBalances]);

  // Show result immediately when fight ends (KO or health reaches 0)
  useEffect(() => {
    if (fightEnded && !showResult) {
      setTimeout(() => {
        setShowResult(true);
        // Play victory or defeat sound
        if (isWinner) {
          playVictorySound();
        } else {
          playDefeatSound();
        }
        refreshBalances();
      }, 500);
    }
  }, [fightEnded, showResult, refreshBalances, isWinner]);

  // Waiting for match
  if (gameState === 'matched') {
    return (
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Match Found!</h2>
        <div className="flex items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-lg">Starting fight...</span>
        </div>
      </div>
    );
  }

  // No match data
  if (!currentMatch || !fightScript) {
    return (
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 text-center">
        <p className="text-gray-400">No match data</p>
        <button
          onClick={resetGame}
          className="mt-4 px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden relative">
      {/* Match Header */}
      <div className="bg-gray-900 p-4 border-b border-gray-700">
        {/* Back button */}
        <button
          onClick={resetGame}
          className="absolute top-2 right-2 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors z-30"
        >
          ✕ Exit
        </button>
        <div className="flex justify-between items-center">
          <div className="text-center flex-1">
            <p className="font-bold text-lg">{fightScript.playerA.username}</p>
            <p className="text-sm text-gray-400">Player A</p>
          </div>
          <div className="px-4 py-2 bg-orange-600 rounded-lg">
            <span className="text-sm font-bold">VS</span>
          </div>
          <div className="text-center flex-1">
            <p className="font-bold text-lg">{fightScript.playerB.username}</p>
            <p className="text-sm text-gray-400">Player B</p>
          </div>
        </div>
      </div>

      {/* Fight Arena */}
      <div className="relative h-[400px] bg-gradient-to-b from-gray-900 via-gray-800 to-green-900/30 overflow-hidden">
        {/* Health Bars - OSRS Style */}
        <div className="absolute top-4 left-4 right-4 flex gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-green-400 font-bold">HP</span>
              <span className="text-sm font-mono text-white">{playerAHealth}/99</span>
            </div>
            <div className="h-5 bg-red-900 rounded border border-gray-600 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-600 to-green-500 transition-all duration-300"
                style={{ width: `${(playerAHealth / 99) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-end gap-2 mb-1">
              <span className="text-sm font-mono text-white">{playerBHealth}/99</span>
              <span className="text-xs text-green-400 font-bold">HP</span>
            </div>
            <div className="h-5 bg-red-900 rounded border border-gray-600 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300 ml-auto"
                style={{ width: `${(playerBHealth / 99) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Fighters - positioned closer together in the center */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex justify-center gap-16">
          {/* Player A - Pixel Character */}
          <div
            className={`relative transition-all duration-200 ${
              currentAnimation?.startsWith('playerA-attack')
                ? 'translate-x-12 scale-110'
                : currentAnimation?.startsWith('playerA-react_hit')
                ? '-translate-x-3 brightness-200 scale-95'
                : currentAnimation === 'playerA-ko'
                ? 'rotate-90 translate-y-12 opacity-30'
                : currentAnimation === 'playerA-victory'
                ? 'scale-125 -translate-y-4 animate-bounce'
                : ''
            }`}
          >
            {/* Character Body */}
            <div className="relative w-16 h-24">
              {/* Head */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 bg-amber-200 rounded-sm border-2 border-amber-300">
                {/* Eyes */}
                <div className="absolute top-2 left-1 w-1.5 h-1.5 bg-black rounded-full"></div>
                <div className="absolute top-2 right-1 w-1.5 h-1.5 bg-black rounded-full"></div>
                {/* Helmet */}
                <div className="absolute -top-1 left-0 right-0 h-3 bg-gray-400 rounded-t-sm border border-gray-500"></div>
              </div>
              {/* Body/Armor */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-10 h-10 bg-blue-600 border-2 border-blue-800 rounded-sm">
                {/* Chest detail */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-4 h-6 bg-blue-500 rounded-sm"></div>
              </div>
              {/* Legs */}
              <div className="absolute top-[72px] left-1/2 -translate-x-1/2 flex gap-1">
                <div className={`w-3 h-6 bg-blue-800 rounded-b-sm ${!waitingToStart && !showResult ? 'animate-pulse' : ''}`}></div>
                <div className={`w-3 h-6 bg-blue-800 rounded-b-sm ${!waitingToStart && !showResult ? 'animate-pulse' : ''}`} style={{animationDelay: '0.15s'}}></div>
              </div>
              {/* Sword Arm */}
              <div className={`absolute top-10 -right-4 transition-transform duration-100 ${
                currentAnimation?.startsWith('playerA-attack') ? 'rotate-[-60deg] translate-x-2' : 'rotate-12'
              }`}>
                <div className="w-2 h-6 bg-amber-200 rounded-sm"></div>
                <div className="w-1.5 h-10 bg-gray-300 border border-gray-400 -mt-1 ml-0.5">
                  <div className="w-3 h-2 bg-yellow-600 -mt-1 -ml-0.5"></div>
                </div>
              </div>
              {/* Shield Arm */}
              <div className="absolute top-9 -left-3 w-6 h-8 bg-blue-800 rounded-sm border-2 border-blue-900 flex items-center justify-center">
                <div className="w-3 h-4 bg-yellow-500 rounded-sm"></div>
              </div>
            </div>
            {currentAnimation === 'playerA-victory' && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl">🏆</span>}
          </div>

          {/* Player B - Pixel Character (Red) */}
          <div
            className={`relative transition-all duration-200 ${
              currentAnimation?.startsWith('playerB-attack')
                ? '-translate-x-12 scale-110'
                : currentAnimation?.startsWith('playerB-react_hit')
                ? 'translate-x-3 brightness-200 scale-95'
                : currentAnimation === 'playerB-ko'
                ? '-rotate-90 translate-y-12 opacity-30'
                : currentAnimation === 'playerB-victory'
                ? 'scale-125 -translate-y-4 animate-bounce'
                : ''
            }`}
          >
            {/* Character Body */}
            <div className="relative w-16 h-24 scale-x-[-1]">
              {/* Head */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 bg-amber-200 rounded-sm border-2 border-amber-300">
                {/* Eyes */}
                <div className="absolute top-2 left-1 w-1.5 h-1.5 bg-black rounded-full"></div>
                <div className="absolute top-2 right-1 w-1.5 h-1.5 bg-black rounded-full"></div>
                {/* Helmet */}
                <div className="absolute -top-1 left-0 right-0 h-3 bg-gray-500 rounded-t-sm border border-gray-600"></div>
              </div>
              {/* Body/Armor */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-10 h-10 bg-red-600 border-2 border-red-800 rounded-sm">
                {/* Chest detail */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-4 h-6 bg-red-500 rounded-sm"></div>
              </div>
              {/* Legs */}
              <div className="absolute top-[72px] left-1/2 -translate-x-1/2 flex gap-1">
                <div className={`w-3 h-6 bg-red-800 rounded-b-sm ${!waitingToStart && !showResult ? 'animate-pulse' : ''}`}></div>
                <div className={`w-3 h-6 bg-red-800 rounded-b-sm ${!waitingToStart && !showResult ? 'animate-pulse' : ''}`} style={{animationDelay: '0.15s'}}></div>
              </div>
              {/* Sword Arm */}
              <div className={`absolute top-10 -right-4 transition-transform duration-100 ${
                currentAnimation?.startsWith('playerB-attack') ? 'rotate-[-60deg] translate-x-2' : 'rotate-12'
              }`}>
                <div className="w-2 h-6 bg-amber-200 rounded-sm"></div>
                <div className="w-1.5 h-10 bg-gray-300 border border-gray-400 -mt-1 ml-0.5">
                  <div className="w-3 h-2 bg-yellow-600 -mt-1 -ml-0.5"></div>
                </div>
              </div>
              {/* Shield Arm */}
              <div className="absolute top-9 -left-3 w-6 h-8 bg-red-800 rounded-sm border-2 border-red-900 flex items-center justify-center">
                <div className="w-3 h-4 bg-yellow-500 rounded-sm"></div>
              </div>
            </div>
            {currentAnimation === 'playerB-victory' && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl scale-x-[-1]">🏆</span>}
          </div>
        </div>

        {/* Damage Hitsplats - OSRS Style */}
        {damagePopup && (
          <div
            key={damagePopup.key}
            className={`absolute top-1/3 ${damagePopup.player === 'playerA' ? 'left-16' : 'right-16'} pointer-events-none animate-bounce`}
          >
            <div className="relative">
              {/* Red hitsplat background */}
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center border-2 border-red-800 shadow-lg"
                   style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}>
              </div>
              {/* Damage number */}
              <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg drop-shadow-lg">
                {damagePopup.damage}
              </span>
            </div>
          </div>
        )}

        {/* Action Text */}
        {currentAnimation && !countdown && !damagePopup && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <span className="text-2xl font-bold text-yellow-400 animate-pulse">
              {currentAnimation.includes('dodge') && '💨 DODGE!'}
              {currentAnimation.includes('block') && '🛡️ BLOCK!'}
              {currentAnimation.includes('ko') && '☠️ K.O.!'}
            </span>
          </div>
        )}

        {/* Start Button Overlay */}
        {waitingToStart && !countdown && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
            <button
              onClick={startFight}
              className="px-12 py-6 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-xl text-3xl font-bold transition-all transform hover:scale-105 active:scale-95 shadow-2xl"
            >
              START FIGHT
            </button>
          </div>
        )}

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
            <div className="text-center">
              <span className="text-8xl font-bold text-white animate-pulse">
                {countdown === 0 ? 'FIGHT!' : countdown}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Result Overlay */}
      {showResult && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
          <div className="text-center animate-in fade-in zoom-in">
            <p className="text-5xl mb-4">
              {isWinner ? '🎉' : '😢'}
            </p>
            <h2 className={`text-3xl font-bold mb-2 ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
              {isWinner ? 'YOU WIN!' : 'YOU LOSE'}
            </h2>
            <p className="text-xl text-gray-300 mb-6">
              {isWinner
                ? `+${formatSOL(currentMatch.totalPot)}`
                : `-${formatSOL(currentMatch.wagerAmount)}`}
            </p>
            <button
              onClick={resetGame}
              className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-lg font-bold text-lg transition-all"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Match Info */}
      <div className="p-4 bg-gray-900 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Wager</p>
            <p className="font-mono">{formatSOL(currentMatch.wagerAmount)}</p>
          </div>
          <div>
            <p className="text-gray-400">Total Pot</p>
            <p className="font-mono text-green-400">{formatSOL(currentMatch.totalPot)}</p>
          </div>
        </div>

        {showResult && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500 mb-2">Verification Data</p>
            <div className="space-y-1 text-xs font-mono text-gray-400">
              <p className="truncate">Server Seed: {currentMatch.serverSeed}</p>
              <p className="truncate">Hash: {currentMatch.serverSeedHashed}</p>
              <p>Nonce: {currentMatch.nonce}</p>
            </div>
            <a
              href={`/fairness?serverSeed=${currentMatch.serverSeed}&clientSeed=${currentMatch.clientSeedA}-${currentMatch.clientSeedB}&nonce=${currentMatch.nonce}`}
              className="inline-block mt-2 text-xs text-orange-400 hover:text-orange-300"
            >
              Verify Result →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
