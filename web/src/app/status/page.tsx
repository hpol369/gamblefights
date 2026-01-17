'use client';

import { useEffect, useState } from 'react';
import { fetchHealth, HealthResponse } from '@/lib/api';
import { useGame } from '../context/GameContext';

export default function StatusPage() {
    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const { isConnected, joinQueue, messages } = useGame();

    useEffect(() => {
        fetchHealth()
            .then(setHealth)
            .catch((err: Error) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center font-mono p-4">
            <div className="border border-zinc-800 p-8 rounded-xl bg-zinc-900 shadow-2xl w-full max-w-md space-y-6">
                <div>
                    <h1 className="text-2xl font-bold mb-4 text-emerald-400">System Status</h1>

                    {loading && <p className="animate-pulse">Checking server connection...</p>}

                    {error && (
                        <div className="text-red-400">
                            <p>Connection Failed</p>
                            <p className="text-sm opacity-50">{error}</p>
                        </div>
                    )}

                    {health && (
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-zinc-500">Service:</span>
                                <span>{health.service}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500">API Status:</span>
                                <span className="text-emerald-500 font-bold uppercase">{health.status}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-zinc-700 pt-4">
                    <h2 className="text-lg font-bold mb-2 text-blue-400">Game Server</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-zinc-500">WebSocket:</span>
                            <span className={isConnected ? "text-emerald-500 font-bold" : "text-red-500"}>
                                {isConnected ? "CONNECTED" : "DISCONNECTED"}
                            </span>
                        </div>

                        <button
                            onClick={joinQueue}
                            disabled={!isConnected}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white py-2 rounded transition-colors font-bold mt-2"
                        >
                            Join Matchmaking
                        </button>

                        <div className="bg-zinc-950 p-2 rounded text-xs h-32 overflow-y-auto border border-zinc-800 font-mono">
                            {messages.length === 0 ? (
                                <span className="text-zinc-600 italic">No messages...</span>
                            ) : (
                                messages.map((m, i) => (
                                    <div key={i} className="mb-1 border-b border-zinc-800 pb-1 last:border-0">
                                        <span className="text-blue-400">&gt;</span> <span className="text-zinc-300">{m.type}</span>
                                        {m.payload && <span className="text-zinc-500 block pl-4">{JSON.stringify(m.payload)}</span>}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
