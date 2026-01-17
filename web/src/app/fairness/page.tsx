'use client';

import { useState } from 'react';
import { verifyOutcome } from '@/lib/fairness';

export default function FairnessPage() {
    const [serverSeed, setServerSeed] = useState('');
    const [clientSeed, setClientSeed] = useState('');
    const [nonce, setNonce] = useState('0');
    const [result, setResult] = useState<{ isPlayerAWin: boolean; hash: string } | null>(null);

    const handleVerify = async () => {
        if (!serverSeed || !clientSeed) return;
        const res = await verifyOutcome(serverSeed, clientSeed, parseInt(nonce));
        setResult(res);
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-8 font-sans">
            <div className="max-w-2xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-emerald-400">Fairness Verifier</h1>
                <p className="text-zinc-400">
                    Paste the Server Seed (revealed after a match), your Client Seed, and the Nonce to verify the game outcome.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Server Seed</label>
                        <input
                            type="text"
                            value={serverSeed}
                            onChange={(e) => setServerSeed(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="e.g. 5b7d..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Client Seed</label>
                            <input
                                type="text"
                                value={clientSeed}
                                onChange={(e) => setClientSeed(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded p-2"
                                placeholder="Your seed"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Nonce</label>
                            <input
                                type="number"
                                value={nonce}
                                onChange={(e) => setNonce(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded p-2"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleVerify}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded transition-colors"
                    >
                        Verify Outcome
                    </button>
                </div>

                {result && (
                    <div className="bg-zinc-900 p-6 rounded border border-zinc-700 space-y-2">
                        <h2 className="text-xl font-bold">Result</h2>
                        <div className="grid grid-cols-[100px_1fr] gap-2 text-sm font-mono">
                            <div className="text-zinc-500">Hash:</div>
                            <div className="break-all">{result.hash}</div>

                            <div className="text-zinc-500">Winner:</div>
                            <div className={result.isPlayerAWin ? 'text-blue-400' : 'text-red-400'}>
                                {result.isPlayerAWin ? 'Player A (You)' : 'Player B (Opponent)'}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
