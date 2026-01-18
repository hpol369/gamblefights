'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';

interface PlayerState {
    id: string;
    name: string;
    x: number;
    y: number;
    character: string;
    isBot?: boolean;
    targetX?: number;
    targetY?: number;
    chatMessage?: string;
    chatTimer?: number;
}

// Coordinate constants for "Pseudo-Isometric" mapping
// The map is a static image, so we map the "Sand" area to a logical rectangle
// and just render players sorted by Y to create depth.
const MAP_WIDTH = 800; // Canvas width
const MAP_HEIGHT = 600;

// Defines the "Walkable" bounds (approximate diamond/square in screen space)
// We'll keep it simple: Just a rectangular walkable area that fits "inside" the walls of the image
// Adjust these based on the generated image visual
const MIN_X = 150;
const MAX_X = 650;
const MIN_Y = 150;
const MAX_Y = 500;

const BOT_NAMES = ['Maximus', 'Spartacus', 'Crixus', 'Commodus', 'Tigris'];

export function LobbyCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const router = useRouter();
    const { startDemoFight } = useGame();
    const { user } = useAuth();
    const [players, setPlayers] = useState<Map<string, PlayerState>>(new Map());
    const [myPos, setMyPos] = useState({ x: 400, y: 350 });
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const keysRef = useRef(new Set<string>());

    const myCharacter = 'trump';
    const myName = user?.username || 'You';

    // Assets
    const assetsRef = useRef<{ [key: string]: HTMLImageElement }>({});
    const assetsLoaded = useRef(false);

    // Load Assets
    useEffect(() => {
        const assets = ['trump', 'maduro', 'isometric'];
        let loaded = 0;
        assets.forEach(name => {
            const img = new Image();
            img.onload = () => {
                loaded++;
                if (loaded === assets.length) {
                    assetsLoaded.current = true;
                }
            };
            img.src = name === 'isometric' ? '/isometric_arena.png' : `/characters/${name}.png`;
            assetsRef.current[name] = img;
        });
    }, []);

    // Initialize bots
    useEffect(() => {
        const initialPlayers = new Map<string, PlayerState>();
        const botCharacters = ['maduro', 'trump', 'maduro'];
        for (let i = 0; i < 3; i++) {
            const botId = `bot-${i}`;
            // Random start pos within bounds
            const bx = MIN_X + Math.random() * (MAX_X - MIN_X);
            const by = MIN_Y + Math.random() * (MAX_Y - MIN_Y);

            initialPlayers.set(botId, {
                id: botId,
                name: BOT_NAMES[i],
                x: bx,
                y: by,
                character: botCharacters[i],
                isBot: true,
                targetX: bx,
                targetY: by,
            });
        }
        setPlayers(initialPlayers);
    }, []);

    const STAKING_PHRASES = [
        "Whip 10m", "DDS spec only", "No food", "Box me", "Staking 50m",
        "100m risk", "No prayer", "Main staking", "Cleaned again...", "Spare 100k?"
    ];

    // Bot AI
    useEffect(() => {
        const botInterval = setInterval(() => {
            setPlayers(prev => {
                const newMap = new Map(prev);
                newMap.forEach((player, id) => {
                    if (player.isBot) {
                        // Move towards target
                        const dx = (player.targetX || player.x) - player.x;
                        const dy = (player.targetY || player.y) - player.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < 5) {
                            // New target within bounds
                            player.targetX = MIN_X + Math.random() * (MAX_X - MIN_X);
                            player.targetY = MIN_Y + Math.random() * (MAX_Y - MIN_Y);
                        } else {
                            const speed = 1.5;
                            player.x += (dx / dist) * speed;
                            player.y += (dy / dist) * speed;
                        }

                        // Chat Logic
                        if (!player.chatMessage && Math.random() < 0.02) {
                            const phrase = STAKING_PHRASES[Math.floor(Math.random() * STAKING_PHRASES.length)];
                            player.chatMessage = phrase;
                            player.chatTimer = 150;
                        }
                        if (player.chatTimer && player.chatTimer > 0) {
                            player.chatTimer--;
                            if (player.chatTimer <= 0) player.chatMessage = undefined;
                        }
                    }
                });
                return newMap;
            });
        }, 50);
        return () => clearInterval(botInterval);
    }, []);

    // Input Handling
    useEffect(() => {
        const handleDown = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
        const handleUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());

        window.addEventListener('keydown', handleDown);
        window.addEventListener('keyup', handleUp);

        const moveInterval = setInterval(() => {
            const keys = keysRef.current;
            if (keys.size === 0) return;

            setMyPos(prev => {
                let { x, y } = prev;
                const speed = 4;
                if (keys.has('w') || keys.has('arrowup')) y -= speed;
                if (keys.has('s') || keys.has('arrowdown')) y += speed;
                if (keys.has('a') || keys.has('arrowleft')) x -= speed;
                if (keys.has('d') || keys.has('arrowright')) x += speed;

                // Clamp to Walkable Area
                x = Math.max(MIN_X, Math.min(MAX_X, x));
                y = Math.max(MIN_Y, Math.min(MAX_Y, y));

                return { x, y };
            });
        }, 1000 / 60);

        return () => {
            window.removeEventListener('keydown', handleDown);
            window.removeEventListener('keyup', handleUp);
            clearInterval(moveInterval);
        };
    }, []);

    // Click handler
    const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        let clickedBotId: string | null = null;
        // Check bots (simple AABB click check, accounts for sprite height)
        players.forEach(player => {
            if (player.isBot) {
                // Approximate sprite box centered at x, standing at y
                const spriteTop = player.y - 70;
                const spriteBottom = player.y;
                const spriteLeft = player.x - 30;
                const spriteRight = player.x + 30;

                if (clickX >= spriteLeft && clickX <= spriteRight && clickY >= spriteTop && clickY <= spriteBottom) {
                    clickedBotId = player.id;
                }
            }
        });

        if (clickedBotId) setSelectedPlayer(clickedBotId);
        else setSelectedPlayer(null);
    }, [players]);

    const challengeBot = useCallback(() => {
        if (selectedPlayer) {
            const bot = players.get(selectedPlayer);
            if (bot) {
                startDemoFight(myName, 100000000);
                router.push('/');
            }
        }
    }, [selectedPlayer, players, startDemoFight, myName, router]);

    // Render Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            // Draw Isometric Background
            if (assetsRef.current['isometric'] && assetsRef.current['isometric'].complete) {
                // Draw background covering canvas. Assuming 800x600 image or similar aspect
                ctx.drawImage(assetsRef.current['isometric'], 0, 0, canvas.width, canvas.height);
            } else {
                ctx.fillStyle = '#eecfa1';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Prepare Render List (Z-Sort)
            const renderList: PlayerState[] = [];
            players.forEach(p => { if (p.isBot) renderList.push(p); });
            // Add self
            renderList.push({
                id: 'me', name: myName, x: myPos.x, y: myPos.y, character: myCharacter, isBot: false
            });

            // Sort by Y (higher Y = closer to camera = draw last)
            renderList.sort((a, b) => a.y - b.y);

            // Draw Players
            renderList.forEach(p => {
                const img = assetsRef.current[p.character];
                const isMe = p.id === 'me';
                const isSelected = selectedPlayer === p.id;

                ctx.save();
                ctx.translate(p.x, p.y);

                // Selection Ring (Ground Level)
                if (isSelected) {
                    ctx.save();
                    ctx.scale(1, 0.5); // Flatten ring for isometric look
                    ctx.strokeStyle = '#ffd700';
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.arc(0, 0, 30, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }

                // Shadow (Ground Level)
                ctx.save();
                ctx.scale(1, 0.5);
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.arc(0, 0, 20, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Character Sprite (Standing Up)
                // Draw image upwards from (0,0) so feet are at origin
                if (img && img.complete) {
                    // Assuming sprite is roughly 2x height vs width
                    ctx.drawImage(img, -30, -70, 60, 70);
                } else {
                    ctx.fillStyle = isMe ? '#ffd700' : '#8b0000';
                    ctx.fillRect(-15, -60, 30, 60);
                }

                // Interaction Text
                if (p.isBot) {
                    ctx.fillStyle = '#ff4444';
                    ctx.font = 'bold 10px Arial';
                    ctx.textAlign = 'center';
                    // ctx.fillText('⚔️ duel', 0, 15); // Below feet
                }

                // Name Tag (Floating above head)
                ctx.textAlign = 'center';
                ctx.font = 'bold 12px "Cinzel"';
                ctx.fillStyle = isMe ? '#ffd700' : '#ffffff';
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 3;
                ctx.strokeText(isMe ? myName : p.name, 0, -80);
                ctx.fillText(isMe ? myName : p.name, 0, -80);

                // Chat Bubble
                if (p.chatMessage) {
                    ctx.font = 'bold 13px Verdana';
                    ctx.fillStyle = '#ffff00';
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 2; // Thin outline
                    ctx.strokeText(p.chatMessage, 0, -100);
                    ctx.fillText(p.chatMessage, 0, -100);
                }

                ctx.restore();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [players, myPos, selectedPlayer, myName, myCharacter]);

    return (
        <div className="relative">
            <div className="relative border-4 border-[#3e2723] rounded-xl shadow-2xl overflow-hidden bg-[#1a0f0a]">
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    className="w-full h-auto cursor-pointer"
                    onClick={handleCanvasClick}
                />
                {/* <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]"></div> */}
                <div className="absolute top-4 left-4 bg-black/60 text-[#eecfa1] p-3 rounded font-mono text-sm border border-[#5a3a22] backdrop-blur-sm">
                    <div className="font-bold mb-1 text-[#ffd700] uppercase tracking-wider">Controls</div>
                    <div className="opacity-80">WASD / Arrow keys</div>
                    <div className="opacity-80">Click players to duel</div>
                </div>
            </div>

            {/* Challenge Modal */}
            {selectedPlayer && (
                <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                    <div className="bg-[#2a1a10] border-2 border-[#ffd700] p-1 shadow-2xl pointer-events-auto transform scale-100 transition-all max-w-sm w-full">
                        <div className="border border-[#ffd700]/30 p-6">
                            <h3 className="text-[#ffd700] text-center mb-6 font-[Cinzel] text-2xl uppercase tracking-widest border-b border-[#ffd700]/30 pb-4">
                                Challenge
                            </h3>
                            <p className="text-[#eecfa1] text-center mb-8 font-serif text-lg">
                                Duel <span className="text-white font-bold">{players.get(selectedPlayer)?.name}</span>?
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={challengeBot}
                                    className="flex-1 px-4 py-3 bg-[#5a0000] hover:bg-[#7a0000] text-[#ffd700] font-bold border border-[#ffd700] font-[Cinzel] text-sm uppercase tracking-wider transition-colors"
                                >
                                    Fight
                                </button>
                                <button
                                    onClick={() => setSelectedPlayer(null)}
                                    className="flex-1 px-4 py-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#888] font-bold border border-[#444] font-[Cinzel] text-sm uppercase tracking-wider transition-colors"
                                >
                                    Decline
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
