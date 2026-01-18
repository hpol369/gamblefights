'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGame } from '../context/GameContext';

interface PlayerState {
    id: string;
    x: number;
    y: number;
    character: string;
    targetX?: number; // For interpolation
    targetY?: number;
}

export function LobbyCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { sendMessage, messages } = useGame();
    const [players, setPlayers] = useState<Map<string, PlayerState>>(new Map());
    const [myPos, setMyPos] = useState({ x: 400, y: 300 });

    // Assets
    const assetsRef = useRef<{ [key: string]: HTMLImageElement }>({});

    // Load Assets
    useEffect(() => {
        const chars = ['trump', 'maduro', 'gladiator'];
        chars.forEach(char => {
            const img = new Image();
            img.src = `/characters/${char}.png`; // Assuming these exist from previous step
            assetsRef.current[char] = img;
        });
    }, []);

    // Join Lobby on Mount
    useEffect(() => {
        // We send a random character for now, or user's preference
        const chars = ['trump', 'maduro'];
        const myChar = chars[Math.floor(Math.random() * chars.length)];
        sendMessage('LOBBY_ENTER', { character: myChar });
    }, [sendMessage]);

    // Handle Incoming Snapshots
    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.type === 'LOBBY_SNAPSHOT' && lastMsg.payload) {
            const payloadPlayers = (lastMsg.payload as any).players as any[];

            setPlayers(prev => {
                const newMap = new Map(prev);
                const activeIds = new Set<string>();

                payloadPlayers.forEach(p => {
                    activeIds.add(p.id);
                    const existing = newMap.get(p.id);

                    if (existing) {
                        // Update target for interpolation
                        existing.targetX = p.x;
                        existing.targetY = p.y;
                        // If it's me, sync ONLY if deviation is large (lag fix), otherwise trust local input
                        // For now, simpler: map 'my' ID checking needed.
                    } else {
                        newMap.set(p.id, {
                            id: p.id,
                            x: p.x,
                            y: p.y,
                            character: p.character
                        });
                    }
                });

                // Remove disconnected
                for (const id of newMap.keys()) {
                    if (!activeIds.has(id)) {
                        newMap.delete(id);
                    }
                }
                return newMap;
            });
        }
    }, [messages]);

    // Input Handling (WASD)
    useEffect(() => {
        const keys = new Set<string>();
        const handleDown = (e: KeyboardEvent) => keys.add(e.key.toLowerCase());
        const handleUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());

        window.addEventListener('keydown', handleDown);
        window.addEventListener('keyup', handleUp);

        // Movement Loop
        const moveInterval = setInterval(() => {
            if (keys.size === 0) return;

            setMyPos(prev => {
                let { x, y } = prev;
                const speed = 5;
                if (keys.has('w')) y -= speed;
                if (keys.has('s')) y += speed;
                if (keys.has('a')) x -= speed;
                if (keys.has('d')) x += speed;

                // Boundaries
                x = Math.max(20, Math.min(780, x));
                y = Math.max(20, Math.min(580, y));

                // Send update to server
                sendMessage('LOBBY_MOVE', { x, y });

                return { x, y };
            });
        }, 1000 / 60); // 60hz local update

        return () => {
            window.removeEventListener('keydown', handleDown);
            window.removeEventListener('keyup', handleUp);
            clearInterval(moveInterval);
        };
    }, [sendMessage]);

    // Render Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            // Clear
            ctx.fillStyle = '#eecfa1'; // Sand color
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Grid/Details (Simple floor texture logic)
            ctx.globalAlpha = 0.1;
            ctx.strokeStyle = '#5a3a22';
            ctx.beginPath();
            for (let i = 0; i < canvas.width; i += 50) { ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); }
            for (let i = 0; i < canvas.height; i += 50) { ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); }
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            // Draw Players
            players.forEach(p => {
                // Simple Interpolation
                if (p.targetX !== undefined && p.targetY !== undefined) {
                    p.x += (p.targetX - p.x) * 0.1;
                    p.y += (p.targetY - p.y) * 0.1;
                }

                const img = assetsRef.current[p.character] || assetsRef.current['gladiator'];

                ctx.save();
                ctx.translate(p.x, p.y);

                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.ellipse(0, 20, 15, 5, 0, 0, Math.PI * 2);
                ctx.fill();

                // Character
                if (img) {
                    // Draw centered
                    ctx.drawImage(img, -20, -30, 40, 60); // Adjust size as needed
                } else {
                    // Fallback circle
                    ctx.fillStyle = 'red';
                    ctx.beginPath();
                    ctx.arc(0, 0, 10, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Nameplate (optional)
                // ctx.fillStyle = 'black';
                // ctx.fillText(p.id.slice(0,4), -10, -40);

                ctx.restore();
            });

            // Draw Self (Local Prediction)
            // Note: We might want to just render 'players' if we can identify 'self' correctly in the map
            // For now, let's render local state on top to be sure it feels responsive
            // Actually, if we get snapshot, we are in 'players' too. 
            // To strictly follow Ralph's smooth plan, we should separate "Self" render from "Others".
            // Let's implement that refinement later. For MVP, map rendering is fine.

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationFrameId);
    }, [players, myPos]);

    return (
        <div className="relative border-4 border-[#5a3a22] rounded-xl shadow-2xl overflow-hidden bg-[#1a0f0a]">
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="w-full h-auto cursor-crosshair"
            />
            <div className="absolute top-4 left-4 bg-black/50 text-[#eecfa1] p-2 rounded font-mono text-xs">
                Use WASD to move
            </div>
        </div>
    );
}
