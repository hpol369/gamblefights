'use client';

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { generateDemoFight } from '@/lib/demoFight';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';

// FightScript types
export interface FightEvent {
    time: number;
    type: string;
    actor: string;
    hit?: boolean;
    crit?: boolean;
    dodge?: boolean;
    damage?: number;
}

export interface PlayerInfo {
    id: string;
    username: string;
    character: string;
    skin: string;
}

export interface FightScript {
    matchId: string;
    playerA: PlayerInfo;
    playerB: PlayerInfo;
    winner: string;
    duration: number;
    events: FightEvent[];
}

export interface MatchResult {
    type: string;
    matchId: string;
    winner: string;
    winnerId: string;
    serverSeed: string;
    serverSeedHashed: string;
    clientSeedA: string;
    clientSeedB: string;
    nonce: number;
    outcomeHash: string;
    fightScript: FightScript;
    wagerAmount: number;
    totalPot: number;
}

export type GameState = 'idle' | 'queuing' | 'matched' | 'fighting' | 'result';

export interface GameMessage {
    type: string;
    matchId?: string;
    wagerAmount?: number;
    error?: string;
    [key: string]: unknown;
}

interface GameContextType {
    isConnected: boolean;
    gameState: GameState;
    currentMatch: MatchResult | null;
    queueWager: number;
    messages: GameMessage[];
    sendMessage: (type: string, payload?: Record<string, unknown>) => void;
    joinQueue: (wagerAmount: number) => void;
    leaveQueue: () => void;
    resetGame: () => void;
    setTestMatch: (match: MatchResult) => void;
    startDemoFight: (username: string, wagerAmount: number) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [gameState, setGameState] = useState<GameState>('idle');
    const [currentMatch, setCurrentMatch] = useState<MatchResult | null>(null);
    const [queueWager, setQueueWager] = useState(0);
    const [messages, setMessages] = useState<GameMessage[]>([]);
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
    const connectRef = useRef<(() => void) | undefined>(undefined);

    const connect = useCallback(() => {
        if (ws.current?.readyState === WebSocket.OPEN) return;

        const socket = new WebSocket(WS_URL);

        socket.onopen = () => {
            console.log('Connected to Game Server');
            setIsConnected(true);
        };

        socket.onclose = () => {
            console.log('Disconnected from Game Server');
            setIsConnected(false);
            setGameState('idle');

            // Attempt reconnect after 3 seconds
            reconnectTimeout.current = setTimeout(() => connectRef.current?.(), 3000);
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        socket.onmessage = (event) => {
            try {
                const msg: GameMessage = JSON.parse(event.data);
                console.log('WS Message:', msg);
                setMessages((prev) => [...prev.slice(-50), msg]); // Keep last 50 messages

                // Handle different message types
                switch (msg.type) {
                    case 'QUEUE_JOINED':
                        setGameState('queuing');
                        break;
                    case 'MATCH_FOUND':
                        setGameState('matched');
                        break;
                    case 'MATCH_RESULT':
                        setCurrentMatch(msg as unknown as MatchResult);
                        setGameState('result');
                        break;
                    case 'MATCH_ERROR':
                        console.error('Match error:', msg.error);
                        setGameState('idle');
                        break;
                }
            } catch {
                console.error('Failed to parse WS msg:', event.data);
            }
        };

        ws.current = socket;
    }, []);

    // Keep ref updated with latest connect function
    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
            }
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [connect]);

    const sendMessage = useCallback((type: string, payload?: Record<string, unknown>) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type, payload }));
        }
    }, []);

    const joinQueue = useCallback((wagerAmount: number) => {
        setQueueWager(wagerAmount);
        sendMessage('JOIN_QUEUE', { wagerAmount });
    }, [sendMessage]);

    const leaveQueue = useCallback(() => {
        sendMessage('LEAVE_QUEUE');
        setGameState('idle');
        setQueueWager(0);
    }, [sendMessage]);

    const resetGame = useCallback(() => {
        setGameState('idle');
        setCurrentMatch(null);
        setQueueWager(0);
    }, []);

    const setTestMatch = useCallback((match: MatchResult) => {
        setCurrentMatch(match);
        setGameState('result');
    }, []);

    // Start a demo fight (for guest mode, runs locally without backend)
    const startDemoFight = useCallback((username: string, wagerAmount: number) => {
        setGameState('queuing');

        // Simulate queue time
        setTimeout(() => {
            setGameState('matched');

            // Generate the fight after a short delay
            setTimeout(() => {
                const demoFight = generateDemoFight();

                // Override player A with the user
                demoFight.playerA.username = username;
                demoFight.playerA.id = 'guest-user';

                // Create a full match result
                const matchResult: MatchResult = {
                    type: 'MATCH_RESULT',
                    matchId: demoFight.matchId,
                    winner: demoFight.winner === 'playerA' ? username : demoFight.playerB.username,
                    winnerId: demoFight.winner === 'playerA' ? 'guest-user' : demoFight.playerB.id,
                    serverSeed: 'demo-server-seed-' + Math.random().toString(36),
                    serverSeedHashed: 'demo-hash',
                    clientSeedA: 'demo-client-a',
                    clientSeedB: 'demo-client-b',
                    nonce: Math.floor(Math.random() * 1000),
                    outcomeHash: 'demo-outcome-hash',
                    fightScript: demoFight,
                    wagerAmount: wagerAmount,
                    totalPot: wagerAmount * 2,
                };

                setCurrentMatch(matchResult);
                setGameState('result');
            }, 1500);
        }, 2000);
    }, []);

    return (
        <GameContext.Provider
            value={{
                isConnected,
                gameState,
                currentMatch,
                queueWager,
                messages,
                sendMessage,
                joinQueue,
                leaveQueue,
                resetGame,
                setTestMatch,
                startDemoFight,
            }}
        >
            {children}
        </GameContext.Provider>
    );
}

export function useGame() {
    const context = useContext(GameContext);
    if (context === undefined) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
}
