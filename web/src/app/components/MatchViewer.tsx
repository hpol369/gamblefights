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
import confetti from 'canvas-confetti';

// Gladiator component - defined outside to prevent re-creation during render
function Gladiator({ isPlayerB, animation, character }: { isPlayerB: boolean; animation: string | null; character?: string }) {
  const isAttacking = animation?.includes('attack') && (isPlayerB ? animation?.startsWith('playerB') : animation?.startsWith('playerA'));
  const isHit = animation?.includes('react_hit') && (isPlayerB ? animation?.startsWith('playerB') : animation?.startsWith('playerA'));
  const isKO = animation?.includes('ko') && (isPlayerB ? animation?.startsWith('playerB') : animation?.startsWith('playerA'));
  const isVictory = animation?.includes('victory') && (isPlayerB ? animation?.startsWith('playerB') : animation?.startsWith('playerA'));

  const baseClass = `relative w-24 h-36 sm:w-28 sm:h-42 lg:w-32 lg:h-48 transition-all duration-300 ${isPlayerB ? 'scale-x-[-1]' : ''}`;

  // Animation Transforms
  let transformClass = '';
  if (isAttacking) transformClass = 'translate-x-[40px] rotate-12 scale-110';
  if (isHit) transformClass = '-translate-x-4 -rotate-6 brightness-150';
  if (isKO) transformClass = 'translate-y-24 rotate-90 grayscale opacity-60';
  if (isVictory) transformClass = '-translate-y-4 scale-110';

  const isCustomCharacter = character === 'trump' || character === 'maduro';

  return (
    <div className={`${baseClass} ${transformClass}`}>
      {/* Shadow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/40 rounded-[50%] blur-sm"></div>

      {/* Legs */}
      <div className={`absolute bottom-0 left-8 w-6 h-20 bg-[#dbb086] border-2 border-black rounded-full origin-top ${!isKO && !isVictory ? 'animate-bounce-slight' : ''}`}></div> {/* Back Leg */}
      <div className={`absolute bottom-0 right-8 w-6 h-20 bg-[#dbb086] border-2 border-black rounded-full origin-top ${!isKO && !isVictory ? 'animate-bounce-slight delay-75' : ''}`}></div> {/* Front Leg */}

      {/* Skirt/Loincloth */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-20 h-16 bg-[#5a3a22] border-2 border-black rounded-b-xl z-10">
        <div className="absolute inset-x-2 bottom-2 h-8 bg-[#3d2616] rounded-b-lg"></div>
      </div>

      {/* Torso */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-20 h-24 bg-[#dbb086] border-2 border-black rounded-xl z-20 flex flex-col items-center">
        {/* Pecs */}
        <div className="w-16 h-8 mt-2 flex gap-1 justify-center opacity-20">
          <div className="w-6 h-5 bg-black/10 rounded-b-lg"></div>
          <div className="w-6 h-5 bg-black/10 rounded-b-lg"></div>
        </div>
        {/* Abs */}
        <div className="w-12 h-10 mt-1 grid grid-cols-2 gap-1 opacity-20">
          <div className="bg-black/10 rounded-sm"></div><div className="bg-black/10 rounded-sm"></div>
          <div className="bg-black/10 rounded-sm"></div><div className="bg-black/10 rounded-sm"></div>
        </div>
      </div>

      {/* Head */}
      {isCustomCharacter ? (
        /* Image Head */
        <div className={`absolute -top-8 left-1/2 -translate-x-1/2 w-32 h-32 z-30 ${isHit ? 'animate-shake' : ''}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/characters/${character}.png`}
            alt={character}
            className="w-full h-full object-contain filter drop-shadow-lg"
          />
        </div>
      ) : (
        /* Default CSS Head */
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-14 h-16 bg-[#dbb086] border-2 border-black rounded-xl z-30 flex flex-col items-center ${isHit ? 'animate-shake' : ''}`}>
          {/* Helmet */}
          <div className={`absolute -top-4 w-16 h-10 rounded-t-xl border-2 border-black ${isPlayerB ? 'bg-[#5a1a1a]' : 'bg-[#1a3a5a]'}`}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-2 h-8 bg-yellow-600"></div> {/* Plume base */}
            {/* Plume */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-6 bg-red-600 rounded-t-full border border-black"></div>
          </div>
          {/* Face */}
          <div className="mt-8 w-full flex justify-center gap-2">
            <div className="w-2 h-2 bg-black rounded-full"></div> {/* Eye L */}
            <div className="w-2 h-2 bg-black rounded-full"></div> {/* Eye R */}
          </div>
          {/* Mouth */}
          <div className={`mt-2 w-4 h-1 bg-black/70 rounded-full ${isHit ? 'h-3 rounded-full bg-black' : ''}`}></div>
        </div>
      )}

      {/* Arms */}
      {/* Back Arm (Shield) */}
      <div className={`absolute top-16 -left-4 w-6 h-20 bg-[#dbb086] border-2 border-black rounded-full origin-top rotate-12 z-0 flex items-end justify-center transition-transform duration-200 ${isAttacking ? 'rotate-[-20deg]' : ''}`}>
        <div className="w-16 h-16 bg-stone-600 border-4 border-gray-400 rounded-full flex items-center justify-center -mb-8 -ml-4 shadow-lg">
          <div className="w-4 h-4 bg-yellow-500 rounded-full border border-black"></div>
        </div>
      </div>

      {/* Front Arm (Sword) */}
      <div className={`absolute top-16 -right-4 w-6 h-20 bg-[#dbb086] border-2 border-black rounded-full origin-top -rotate-12 z-40 flex items-end justify-center transition-transform duration-100 ${isAttacking ? 'rotate-[-110deg]' : ''}`}>
        <div className="w-4 h-32 bg-gray-300 border-2 border-gray-600 origin-bottom -mb-2 z-50 transform rotate-12">
          <div className="absolute bottom-0 w-8 h-2 bg-yellow-600 -left-2 border border-black"></div> {/* Hilt */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-4 h-4 bg-yellow-700 rounded-full border border-black"></div> {/* Pommel */}
        </div>
      </div>

      {isVictory && <span className="absolute -top-12 left-1/2 -translate-x-1/2 text-4xl animate-bounce">🏆</span>}
    </div>
  );
}

export function MatchViewer() {
  const { gameState, currentMatch, resetGame } = useGame();
  const { user, refreshBalances } = useAuth();
  const [, setCurrentEventIndex] = useState(0);
  const [playerAHealth, setPlayerAHealth] = useState(99);
  const [playerBHealth, setPlayerBHealth] = useState(99);
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [waitingToStart, setWaitingToStart] = useState(true);
  const [damagePopup, setDamagePopup] = useState<{ player: string; damage: number; key: number } | null>(null);
  const [screenShake, setScreenShake] = useState<'none' | 'light' | 'normal' | 'crit'>('none');

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

      // Trigger screen shake based on damage/crit
      const shakeType = event.crit ? 'crit' : (event.damage > 15 ? 'normal' : 'light');
      setScreenShake(shakeType);
      setTimeout(() => setScreenShake('none'), shakeType === 'crit' ? 500 : 400);

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
    setTimeout(() => setCurrentAnimation(null), 500); // Slightly longer for S&S animations
  }, []);

  // Reset waiting state when new match arrives
  // Note: setState in effect is intentional here - we need to reset state when
  // external match data changes, which is a valid synchronization use case
  const matchId = currentMatch?.matchId;
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
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
  }, [matchId]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

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
        // Play victory or defeat sound + confetti
        if (isWinner) {
          playVictorySound();
          // Epic victory confetti burst
          const duration = 3000;
          const end = Date.now() + duration;
          const colors = ['#ffd700', '#8b0000', '#eecfa1'];

          (function frame() {
            confetti({
              particleCount: 3,
              angle: 60,
              spread: 55,
              origin: { x: 0, y: 0.6 },
              colors: colors,
            });
            confetti({
              particleCount: 3,
              angle: 120,
              spread: 55,
              origin: { x: 1, y: 0.6 },
              colors: colors,
            });

            if (Date.now() < end) {
              requestAnimationFrame(frame);
            }
          })();
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
      <div className="parchment-panel rounded-xl p-8 text-center max-w-lg mx-auto mt-10">
        <h2 className="text-3xl font-bold mb-4 font-[Cinzel] text-[#3b3b3b]">Arena Awaits!</h2>
        <div className="flex items-center justify-center gap-4">
          <div className="w-8 h-8 border-4 border-[#8b0000] border-t-transparent rounded-full animate-spin" />
          <span className="text-xl font-[Cinzel]">Summoning Gladiators...</span>
        </div>
      </div>
    );
  }

  // No match data
  if (!currentMatch || !fightScript) {
    return (
      <div className="parchment-panel rounded-xl p-8 text-center max-w-lg mx-auto">
        <p className="text-[#5a3a22] text-xl font-[Cinzel]">No active duel found.</p>
        <button
          onClick={resetGame}
          className="mt-6 px-8 py-3 bg-[#8b0000] text-[#eecfa1] font-bold rounded hover:bg-[#a60000] border-2 border-[#5a1a1a] shadow-md font-[Cinzel] uppercase tracking-wider"
        >
          Return to Lobby
        </button>
      </div>
    );
  }

  return (
    <div className="stone-border rounded-lg overflow-hidden relative shadow-2xl bg-[#1a0f0a]">
      {/* Match Header (Stone Slab) */}
      <div className="bg-[#3b3b3b] p-4 border-b-4 border-[#1a1a1a] relative shadow-lg">
        {/* Back button */}
        <button
          onClick={resetGame}
          className="absolute top-1/2 -translate-y-1/2 right-4 px-3 py-1 text-xs bg-[#1a1a1a] text-[#8b8b8b] hover:text-white border border-[#5a5a5a] rounded transition-colors z-30 font-mono"
        >
          ✕ FLEE
        </button>
        <div className="flex justify-between items-center px-8">
          <div className="text-center flex-1">
            <p className="font-bold text-xl text-[#eecfa1] font-[Cinzel] tracking-widest">{fightScript.playerA.username}</p>
            <p className="text-xs text-[#8b8b8b] uppercase tracking-wide">Challenger</p>
          </div>
          <div className="px-6 py-2 bg-[#8b0000] rounded-sm transform rotate-45 border-2 border-[#ffd700] shadow-lg z-10">
            <div className="transform -rotate-45">
              <span className="text-xl font-bold text-[#ffd700] font-[Cinzel]">VS</span>
            </div>
          </div>
          <div className="text-center flex-1">
            <p className="font-bold text-xl text-[#eecfa1] font-[Cinzel] tracking-widest">{fightScript.playerB.username}</p>
            <p className="text-xs text-[#8b8b8b] uppercase tracking-wide">Defender</p>
          </div>
        </div>
      </div>

      {/* Fight Arena (Coliseum) - with screen shake */}
      <div className={`relative h-[350px] sm:h-[400px] lg:h-[450px] overflow-hidden ${screenShake === 'crit' ? 'animate-screen-shake-crit' :
        screenShake === 'normal' ? 'animate-screen-shake' :
          screenShake === 'light' ? 'animate-screen-shake-light' : ''
        }`}>
        {/* Background Layer: Sand and Walls */}
        <div className="absolute inset-0 bg-[#eecfa1]">
          {/* Wall Texture */}
          <div className="h-1/3 bg-[#dbb086] border-b-8 border-[#5a3a22] relative">
            <div className="absolute bottom-0 w-full h-4 bg-black/20"></div>
            {/* Columns */}
            <div className="flex justify-around h-full items-end px-12">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-16 h-5/6 bg-[#c49a6c] border-x-2 border-[#8b6b45] relative">
                  <div className="absolute top-0 w-20 -left-2 h-4 bg-[#8b6b45]"></div>
                  <div className="absolute bottom-0 w-20 -left-2 h-8 bg-[#8b6b45]"></div>
                </div>
              ))}
            </div>
          </div>
          {/* Floor Texture (Sand) */}
          <div className="h-2/3 bg-[url('https://www.transparenttextures.com/patterns/sandpaper.png')] opacity-50"></div>
          <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-black/40 to-transparent"></div>
        </div>

        {/* Health Bars - Chunky Metal Style */}
        <div className="absolute top-6 left-6 right-6 flex gap-16 z-20">
          <div className="flex-1 relative">
            <div className="flex items-center gap-2 mb-1 pl-1">
              <span className="text-xs text-[#8b0000] font-bold font-[Cinzel]">HP</span>
              <span className="text-sm font-bold text-[#3b3b3b] font-[Cinzel]">{playerAHealth}/99</span>
            </div>
            <div className="h-8 bg-[#1a0f0a] border-4 border-[#5a5a5a] shadow-inner relative">
              <div
                className="h-full bg-gradient-to-b from-[#8b0000] to-[#5a0000] transition-all duration-300 border-r-2 border-white/20"
                style={{ width: `${(playerAHealth / 99) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex-1 relative text-right">
            <div className="flex items-center justify-end gap-2 mb-1 pr-1">
              <span className="text-sm font-bold text-[#3b3b3b] font-[Cinzel]">{playerBHealth}/99</span>
              <span className="text-xs text-[#8b0000] font-bold font-[Cinzel]">HP</span>
            </div>
            <div className="h-8 bg-[#1a0f0a] border-4 border-[#5a5a5a] shadow-inner relative">
              <div
                className="h-full bg-gradient-to-b from-[#8b0000] to-[#5a0000] transition-all duration-300 border-l-2 border-white/20 absolute right-0"
                style={{ width: `${(playerBHealth / 99) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Fighters Container */}
        <div className="absolute bottom-8 sm:bottom-12 lg:bottom-16 w-full flex justify-center gap-16 sm:gap-24 lg:gap-32 z-10 px-4 sm:px-8 lg:px-12 perspective-1000">
          <Gladiator
            isPlayerB={false}
            animation={currentAnimation}
            character="trump"
          />
          <Gladiator
            isPlayerB={true}
            animation={currentAnimation}
            character="maduro"
          />
        </div>

        {/* Damage Hitsplats - Comic Style */}
        {damagePopup && (
          <div
            key={damagePopup.key}
            className={`absolute top-1/2 ${damagePopup.player === 'playerA' ? 'left-1/4' : 'right-1/4'} pointer-events-none animate-bounce z-50`}
          >
            <div className="relative">
              {/* Spiky Splat */}
              <svg width="100" height="100" viewBox="0 0 100 100" className="drop-shadow-xl fill-[#8b0000] stroke-white stroke-2">
                <path d="M50 0 L60 30 L90 20 L70 50 L100 80 L60 70 L50 100 L40 70 L0 80 L30 50 L10 20 L40 30 Z" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-white font-[Cinzel] font-bold text-3xl drop-shadow-md">
                {damagePopup.damage}
              </span>
            </div>
          </div>
        )}

        {/* Action Text - Dramatic Overlay */}
        {currentAnimation && !countdown && !damagePopup && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-40">
            <span className="text-5xl font-bold text-[#ffd700] stroke-[#8b0000] stroke-2 drop-shadow-xl font-[Cinzel] animate-ping-slow">
              {currentAnimation.includes('dodge') && 'DODGED!'}
              {currentAnimation.includes('block') && 'BLOCKED!'}
              {currentAnimation.includes('ko') && 'FATALITY!'}
            </span>
          </div>
        )}

        {/* Start Button Overlay */}
        {waitingToStart && !countdown && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
            <button
              onClick={startFight}
              className="px-16 py-6 bg-[#8b0000] text-[#ffd700] border-4 border-[#ffd700] rounded-sm text-4xl font-bold font-[Cinzel] shadow-[0_0_20px_rgba(255,215,0,0.5)] hover:scale-105 transition-transform uppercase"
            >
              Enter The Arena
            </button>
          </div>
        )}

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="text-center">
              <span className="text-[150px] font-bold text-[#ffd700] drop-shadow-[0_4px_0_#8b0000] font-[Cinzel] animate-pulse">
                {countdown === 0 ? 'FIGHT!' : countdown}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Result Overlay */}
      {showResult && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="parchment-panel p-12 text-center animate-in fade-in zoom-in max-w-lg w-full m-4">
            <p className="text-6xl mb-6">
              {isWinner ? '👑' : '💀'}
            </p>
            <h2 className={`text-4xl font-bold mb-4 font-[Cinzel] ${isWinner ? 'text-[#8b0000]' : 'text-[#3b3b3b]'}`}>
              {isWinner ? 'VICTORY!' : 'DEFEATED'}
            </h2>
            <div className="border-t-2 border-b-2 border-[#dbb086] py-4 mb-8">
              <p className="text-2xl text-[#5a3a22] font-[Cinzel]">
                {isWinner
                  ? `You claim +${formatSOL(currentMatch.totalPot)}`
                  : `You lost -${formatSOL(currentMatch.wagerAmount)}`}
              </p>
            </div>
            <button
              onClick={resetGame}
              className="w-full px-8 py-4 bg-[#8b0000] text-[#eecfa1] hover:bg-[#a60000] rounded font-bold text-xl transition-all font-[Cinzel] border-2 border-[#5a1a1a]"
            >
              Another Duel?
            </button>
          </div>
        </div>
      )}

      {/* Match Info (Footer) */}
      <div className="p-4 bg-[#2a1a10] border-t-4 border-[#5a5a5a] font-mono text-sm relative">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[#8b6b45] uppercase text-xs">Wager</p>
            <p className="text-[#eecfa1]">{formatSOL(currentMatch.wagerAmount)}</p>
          </div>
          <div>
            <p className="text-[#8b6b45] uppercase text-xs">Prize Pot</p>
            <p className="text-[#ffd700] font-bold">{formatSOL(currentMatch.totalPot)}</p>
          </div>
        </div>

        {showResult && (
          <div className="mt-4 pt-4 border-t border-[#5a3a22]/30">
            <p className="text-[10px] text-[#5a3a22] mb-1 uppercase tracking-wider">Provable Fairness Data</p>
            <div className="space-y-1 text-[10px] text-[#8b6b45] opacity-60 hover:opacity-100 transition-opacity cursor-help">
              <p className="truncate">S.Seed: {currentMatch.serverSeed}</p>
              <p className="truncate">Hash: {currentMatch.serverSeedHashed}</p>
              <p>Nonce: {currentMatch.nonce}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
