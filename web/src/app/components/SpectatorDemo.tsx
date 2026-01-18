'use client';

import { useState, useEffect, useCallback } from 'react';
import { FightScript, FightEvent } from '../context/GameContext';
import { generateDemoFight } from '@/lib/demoFight';

// Mini Gladiator for demo (smaller version)
function MiniGladiator({ isPlayerB, animation, character }: { isPlayerB: boolean; animation: string | null; character?: string }) {
  const isAttacking = animation?.includes('attack') && (isPlayerB ? animation?.startsWith('playerB') : animation?.startsWith('playerA'));
  const isHit = animation?.includes('react_hit') && (isPlayerB ? animation?.startsWith('playerB') : animation?.startsWith('playerA'));
  const isKO = animation?.includes('ko') && (isPlayerB ? animation?.startsWith('playerB') : animation?.startsWith('playerA'));
  const isVictory = animation?.includes('victory') && (isPlayerB ? animation?.startsWith('playerB') : animation?.startsWith('playerA'));

  const baseClass = `relative w-20 h-32 transition-all duration-300 ${isPlayerB ? 'scale-x-[-1]' : ''}`;

  let transformClass = '';
  if (isAttacking) transformClass = 'translate-x-[30px] rotate-12 scale-110';
  if (isHit) transformClass = '-translate-x-3 -rotate-6 brightness-150';
  if (isKO) transformClass = 'translate-y-16 rotate-90 grayscale opacity-60';
  if (isVictory) transformClass = '-translate-y-3 scale-110';

  const isCustomCharacter = character === 'trump' || character === 'maduro';

  return (
    <div className={`${baseClass} ${transformClass}`}>
      {/* Shadow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-3 bg-black/40 rounded-[50%] blur-sm"></div>

      {/* Legs */}
      <div className={`absolute bottom-0 left-5 w-4 h-14 bg-[#dbb086] border-2 border-black rounded-full ${!isKO && !isVictory ? 'animate-bounce-slight' : ''}`}></div>
      <div className={`absolute bottom-0 right-5 w-4 h-14 bg-[#dbb086] border-2 border-black rounded-full ${!isKO && !isVictory ? 'animate-bounce-slight' : ''}`}></div>

      {/* Skirt */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-14 h-10 bg-[#5a3a22] border-2 border-black rounded-b-xl z-10"></div>

      {/* Torso */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-14 h-16 bg-[#dbb086] border-2 border-black rounded-xl z-20"></div>

      {/* Head */}
      {isCustomCharacter ? (
        <div className={`absolute -top-6 left-1/2 -translate-x-1/2 w-24 h-24 z-30 ${isHit ? 'animate-shake' : ''}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/characters/${character}.png`}
            alt={character}
            className="w-full h-full object-contain filter drop-shadow-md"
          />
        </div>
      ) : (
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-10 h-12 bg-[#dbb086] border-2 border-black rounded-xl z-30 ${isHit ? 'animate-shake' : ''}`}>
          {/* Helmet */}
          <div className={`absolute -top-3 w-12 -left-1 h-8 rounded-t-xl border-2 border-black ${isPlayerB ? 'bg-[#5a1a1a]' : 'bg-[#1a3a5a]'}`}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-4 bg-red-600 rounded-t-full border border-black"></div>
          </div>
          {/* Eyes */}
          <div className="mt-6 flex justify-center gap-1">
            <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
          </div>
        </div>
      )}

      {/* Shield arm */}
      <div className={`absolute top-10 -left-2 w-4 h-14 bg-[#dbb086] border-2 border-black rounded-full z-0 ${isAttacking ? 'rotate-[-20deg]' : 'rotate-12'}`}>
        <div className="absolute bottom-0 -left-3 w-10 h-10 bg-stone-600 border-3 border-gray-400 rounded-full"></div>
      </div>

      {/* Sword arm */}
      <div className={`absolute top-10 -right-2 w-4 h-14 bg-[#dbb086] border-2 border-black rounded-full z-40 transition-transform ${isAttacking ? 'rotate-[-100deg]' : '-rotate-12'}`}>
        <div className="absolute bottom-0 left-0 w-3 h-20 bg-gray-300 border border-gray-600"></div>
      </div>

      {isVictory && <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-2xl animate-bounce">👑</span>}
    </div>
  );
}

export function SpectatorDemo() {
  const [fightScript, setFightScript] = useState<FightScript | null>(null);
  const [playerAHealth, setPlayerAHealth] = useState(99);
  const [playerBHealth, setPlayerBHealth] = useState(99);
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [screenShake, setScreenShake] = useState<'none' | 'light' | 'normal'>('none');

  // Start a new demo fight
  const startNewFight = useCallback(() => {
    const newFight = generateDemoFight();
    setFightScript(newFight);
    setPlayerAHealth(99);
    setPlayerBHealth(99);
    setCurrentAnimation(null);
    setShowResult(false);
    setIsPlaying(true);
  }, []);

  // Auto-start on mount and restart after fight ends
  useEffect(() => {
    startNewFight();
  }, [startNewFight]);

  // Process fight events
  const processEvent = useCallback((event: FightEvent) => {
    setCurrentAnimation(`${event.actor}-${event.type}`);

    if (event.hit && event.damage) {
      // Screen shake
      setScreenShake(event.damage > 15 ? 'normal' : 'light');
      setTimeout(() => setScreenShake('none'), 300);

      if (event.actor === 'playerA') {
        setPlayerBHealth((h) => Math.max(0, h - event.damage!));
      } else {
        setPlayerAHealth((h) => Math.max(0, h - event.damage!));
      }
    }

    if (event.type === 'ko' || event.type === 'victory') {
      if (event.type === 'victory') {
        setShowResult(true);
      }
    }

    setTimeout(() => setCurrentAnimation(null), 400);
  }, []);

  // Run fight animation
  useEffect(() => {
    if (!isPlaying || !fightScript) return;

    const timeouts: NodeJS.Timeout[] = [];
    const events = fightScript.events;

    events.forEach((event) => {
      const timeout = setTimeout(() => {
        processEvent(event);
      }, event.time * 1000);
      timeouts.push(timeout);
    });

    // Restart after fight ends
    const restartTimeout = setTimeout(() => {
      setIsPlaying(false);
      setTimeout(startNewFight, 2000); // Wait 2s then start new fight
    }, (fightScript.duration + 3) * 1000);
    timeouts.push(restartTimeout);

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [isPlaying, fightScript, processEvent, startNewFight]);

  if (!fightScript) return null;

  const winner = fightScript.winner === 'playerA' ? fightScript.playerA.username : fightScript.playerB.username;

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Mini Arena */}
      <div className={`relative bg-[#1a0f0a] rounded-lg overflow-hidden border-4 border-[#5a5a5a] shadow-xl ${screenShake === 'normal' ? 'animate-screen-shake' : screenShake === 'light' ? 'animate-screen-shake-light' : ''
        }`}>
        {/* Header */}
        <div className="bg-[#3b3b3b] p-2 border-b-2 border-[#1a1a1a]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#eecfa1] font-[Cinzel] font-bold">{fightScript.playerA.username}</span>
            <span className="text-[#ffd700] font-bold px-2 py-0.5 bg-[#8b0000] rounded text-[10px]">LIVE DEMO</span>
            <span className="text-[#eecfa1] font-[Cinzel] font-bold">{fightScript.playerB.username}</span>
          </div>
        </div>

        {/* Health bars */}
        <div className="flex gap-2 p-2 bg-[#2a1a10]">
          <div className="flex-1">
            <div className="h-3 bg-[#1a0f0a] border border-[#5a5a5a] rounded-sm overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#8b0000] to-[#cc0000] transition-all duration-300"
                style={{ width: `${(playerAHealth / 99) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="h-3 bg-[#1a0f0a] border border-[#5a5a5a] rounded-sm overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-[#8b0000] to-[#cc0000] transition-all duration-300 ml-auto"
                style={{ width: `${(playerBHealth / 99) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Arena */}
        <div className="relative h-48 bg-[#eecfa1]">
          {/* Wall */}
          <div className="h-16 bg-[#dbb086] border-b-4 border-[#5a3a22]">
            <div className="flex justify-around h-full items-end px-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-12 bg-[#c49a6c] border-x border-[#8b6b45]"></div>
              ))}
            </div>
          </div>

          {/* Fighters */}
          <div className="absolute bottom-4 w-full flex justify-center gap-16">
            <MiniGladiator
              isPlayerB={false}
              animation={currentAnimation}
              character={fightScript.playerA.character}
            />
            <MiniGladiator
              isPlayerB={true}
              animation={currentAnimation}
              character={fightScript.playerB.character}
            />
          </div>

          {/* Result overlay */}
          {showResult && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#ffd700] font-[Cinzel]">{winner} WINS!</p>
                <p className="text-xs text-[#8b8b8b] mt-1">Next fight starting...</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#2a1a10] p-2 text-center border-t-2 border-[#5a5a5a]">
          <p className="text-[10px] text-[#8b6b45]">Connect wallet to join the arena</p>
        </div>
      </div>
    </div>
  );
}
