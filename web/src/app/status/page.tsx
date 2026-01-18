'use client';

import { useEffect, useState } from 'react';
import { fetchHealth, HealthResponse } from '@/lib/api';
import { useGame } from '../context/GameContext';
import Link from 'next/link';

export default function StatusPage() {
    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const { isConnected, messages } = useGame();

    useEffect(() => {
        fetchHealth()
            .then(setHealth)
            .catch((err: Error) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-sand bg-[url('https://www.transparenttextures.com/patterns/sandpaper.png')] text-[#3b3b3b] flex items-center justify-center font-[Cinzel] p-4">
            <div className="parchment-panel p-8 rounded-xl w-full max-w-md space-y-6">
                <div>
                    <h1 className="text-2xl font-bold mb-4 text-[#8b0000] border-b border-[#8b6b45] pb-2">System Status</h1>

                    {loading && <p className="animate-pulse text-[#5a3a22]">Consulting the oracles...</p>}

                    {error && (
                        <div className="text-[#8b0000]">
                            <p className="font-bold">Connection Failed</p>
                            <p className="text-sm opacity-50 font-sans">{error}</p>
                        </div>
                    )}

                    {health && (
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-[#5a3a22]">Service:</span>
                                <span className="font-bold">{health.service}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#5a3a22]">API Status:</span>
                                <span className="text-[#3b8b00] font-bold uppercase">{health.status}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-[#8b6b45] pt-4">
                    <h2 className="text-lg font-bold mb-2 text-[#5a3a22]">Arena Server</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between">
                            <span className="text-[#5a3a22]">WebSocket:</span>
                            <span className={isConnected ? "text-[#3b8b00] font-bold" : "text-[#8b0000] font-bold"}>
                                {isConnected ? "CONNECTED" : "DISCONNECTED"}
                            </span>
                        </div>

                        <div className="bg-[#eecfa1] p-2 rounded text-xs h-32 overflow-y-auto border border-[#8b6b45] font-mono">
                            {messages.length === 0 ? (
                                <span className="text-[#8b6b45] italic">No messages from the gods...</span>
                            ) : (
                                messages.map((m, i) => (
                                    <div key={i} className="mb-1 border-b border-[#d4b483] pb-1 last:border-0">
                                        <span className="text-[#8b0000]">&gt;</span> <span className="text-[#3b3b3b]">{m.type}</span>
                                        {!!m.payload && <span className="text-[#5a3a22] block pl-4 text-[10px]">{JSON.stringify(m.payload)}</span>}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="pt-4 text-center">
                    <Link href="/" className="text-[#8b0000] hover:text-[#a60000] underline decoration-[#8b0000]/30 text-sm">
                        ← Return to Arena
                    </Link>
                </div>
            </div>
        </div>
    );
}
