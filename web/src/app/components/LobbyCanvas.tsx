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
}

const BOT_NAMES = ['Maximus', 'Spartacus', 'Crixus', 'Commodus', 'Tigris'];

export function LobbyCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const router = useRouter();
    const { startDemoFight } = useGame();
    const { user } = useAuth();
    const [players, setPlayers] = useState<Map<string, PlayerState>>(new Map());
    const [myPos, setMyPos] = useState({ x: 400, y: 300 });
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const keysRef = useRef(new Set<string>());

    const myCharacter = 'trump';
    const myName = user?.username || 'You';

    // Assets
    const assetsRef = useRef<{ [key: string]: HTMLImageElement }>({});
    const assetsLoaded = useRef(false);

    // Load Assets
    useEffect(() => {
        const chars = ['trump', 'maduro'];
        let loaded = 0;
        chars.forEach(char => {
            const img = new Image();
            img.onload = () => {
                loaded++;
                if (loaded === chars.length) {
                    assetsLoaded.current = true;
                }
            };
            img.src = `/characters/${char}.png`;
            assetsRef.current[char] = img;
        });
    }, []);

    // Initialize bots
    useEffect(() => {
        const initialPlayers = new Map<string, PlayerState>();

        // Add bots
        const botCharacters = ['maduro', 'trump', 'maduro'];
        for (let i = 0; i < 3; i++) {
            const botId = `bot-${i}`;
            initialPlayers.set(botId, {
                id: botId,
                name: BOT_NAMES[i],
                x: 150 + Math.random() * 500,
                y: 150 + Math.random() * 300,
                character: botCharacters[i],
                isBot: true,
                targetX: 150 + Math.random() * 500,
                targetY: 150 + Math.random() * 300,
            });
        }

        setPlayers(initialPlayers);
    }, []);

    // Bot AI - random movement
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
                            // Pick new random target
                            player.targetX = 100 + Math.random() * 600;
                            player.targetY = 100 + Math.random() * 400;
                        } else {
                            // Move towards target
                            const speed = 1.5;
                            player.x += (dx / dist) * speed;
                            player.y += (dy / dist) * speed;
                        }
                    }
                });
                return newMap;
            });
        }, 50);

        return () => clearInterval(botInterval);
    }, []);

    // Input Handling (WASD)
    useEffect(() => {
        const handleDown = (e: KeyboardEvent) => {
            keysRef.current.add(e.key.toLowerCase());
        };
        const handleUp = (e: KeyboardEvent) => {
            keysRef.current.delete(e.key.toLowerCase());
        };

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

                // Boundaries
                x = Math.max(40, Math.min(760, x));
                y = Math.max(40, Math.min(560, y));

                return { x, y };
            });
        }, 1000 / 60);

        return () => {
            window.removeEventListener('keydown', handleDown);
            window.removeEventListener('keyup', handleUp);
            clearInterval(moveInterval);
        };
    }, []);

    // Click handler for challenging
    const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        // Check if clicked on a bot
        let clickedBotId: string | null = null;
        players.forEach(player => {
            if (player.isBot) {
                const dist = Math.sqrt((clickX - player.x) ** 2 + (clickY - player.y) ** 2);
                if (dist < 40) {
                    clickedBotId = player.id;
                }
            }
        });

        if (clickedBotId) {
            setSelectedPlayer(clickedBotId);
        } else {
            setSelectedPlayer(null);
        }
    }, [players]);

    // Challenge selected bot
    const challengeBot = useCallback(() => {
        if (selectedPlayer) {
            const bot = players.get(selectedPlayer);
            if (bot) {
                // Start a demo fight against this bot
                startDemoFight(myName, 100000000); // 0.1 SOL
                // Navigate to home page where MatchViewer is
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
            // Clear with sand color
            ctx.fillStyle = '#eecfa1';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw subtle grid
            ctx.globalAlpha = 0.15;
            ctx.strokeStyle = '#8b6b45';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i < canvas.width; i += 40) {
                ctx.moveTo(i, 0);
                ctx.lineTo(i, canvas.height);
            }
            for (let i = 0; i < canvas.height; i += 40) {
                ctx.moveTo(0, i);
                ctx.lineTo(canvas.width, i);
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            // Draw arena border decorations
            ctx.strokeStyle = '#5a3a22';
            ctx.lineWidth = 3;
            ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

            // Function to draw a player
            const drawPlayer = (p: PlayerState, isMe: boolean = false) => {
                const img = assetsRef.current[p.character];

                ctx.save();
                ctx.translate(p.x, p.y);

                // Selection ring
                if (selectedPlayer === p.id) {
                    ctx.strokeStyle = '#ffd700';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(0, 10, 35, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.ellipse(0, 25, 20, 8, 0, 0, Math.PI * 2);
                ctx.fill();

                // Character sprite
                if (img && img.complete) {
                    ctx.drawImage(img, -30, -40, 60, 70);
                } else {
                    // Fallback
                    ctx.fillStyle = isMe ? '#ffd700' : '#8b0000';
                    ctx.beginPath();
                    ctx.arc(0, 0, 20, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Name tag
                ctx.fillStyle = isMe ? '#ffd700' : '#ffffff';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 3;
                ctx.font = 'bold 12px "Cinzel", serif';
                ctx.textAlign = 'center';
                const name = isMe ? myName : p.name;
                ctx.strokeText(name, 0, -50);
                ctx.fillText(name, 0, -50);

                // Bot indicator
                if (p.isBot) {
                    ctx.fillStyle = '#8b0000';
                    ctx.font = '10px Arial';
                    ctx.fillText('⚔️ Click to duel', 0, 45);
                }

                ctx.restore();
            };

            // Draw bots
            players.forEach(player => {
                if (player.isBot) {
                    drawPlayer(player, false);
                }
            });

            // Draw self (always on top)
            drawPlayer({
                id: 'me',
                name: myName,
                x: myPos.x,
                y: myPos.y,
                character: myCharacter,
                isBot: false
            }, true);

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationFrameId);
    }, [players, myPos, selectedPlayer, myName, myCharacter]);

    return (
        <div className="relative">
            <div className="relative border-4 border-[#5a3a22] rounded-xl shadow-2xl overflow-hidden bg-[#1a0f0a]">
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    className="w-full h-auto cursor-pointer"
                    onClick={handleCanvasClick}
                />
                <div className="absolute top-4 left-4 bg-black/70 text-[#eecfa1] p-3 rounded font-mono text-sm">
                    <div className="font-bold mb-1">Controls:</div>
                    <div>WASD / Arrow keys to move</div>
                    <div>Click a gladiator to duel</div>
                </div>
            </div>

            {/* Challenge Modal */}
            {selectedPlayer && (
                <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                    <div className="bg-[#2a1a10] border-4 border-[#ffd700] rounded-lg p-6 shadow-2xl pointer-events-auto">
                        <p className="text-[#eecfa1] text-center mb-4 font-[Cinzel] text-xl">
                            Challenge <span className="text-[#ffd700] font-bold">{players.get(selectedPlayer)?.name}</span> to a duel?
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={challengeBot}
                                className="flex-1 px-6 py-3 bg-[#8b0000] text-[#ffd700] font-bold rounded hover:bg-[#a60000] border-2 border-[#ffd700] font-[Cinzel] text-lg cursor-pointer active:scale-95 transition-transform"
                            >
                                ⚔️ FIGHT!
                            </button>
                            <button
                                onClick={() => setSelectedPlayer(null)}
                                className="flex-1 px-6 py-3 bg-[#3b3b3b] text-[#eecfa1] font-bold rounded hover:bg-[#4b4b4b] border-2 border-[#5a5a5a] font-[Cinzel] text-lg cursor-pointer active:scale-95 transition-transform"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
