'use client';

import { useState } from 'react';
import { verifyOutcome } from '@/lib/fairness';
import Link from 'next/link';

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
        <div className="min-h-screen bg-sand bg-[url('https://www.transparenttextures.com/patterns/sandpaper.png')] text-[#3b3b3b] font-[Cinzel] p-8">
            <div className="max-w-2xl mx-auto space-y-8 parchment-panel p-8 rounded-xl shadow-2xl">
                <div className="border-b border-[#8b6b45] pb-4">
                    <h1 className="text-3xl font-bold text-[#8b0000]">Fairness Scrolls</h1>
                    <p className="text-[#5a3a22] mt-2 font-serif italic">
                        &quot;Trust, but verify.&quot; — Ancient Gladiator Proverb
                    </p>
                </div>

                <div className="text-sm text-[#5a3a22] font-mono bg-[#eecfa1]/50 p-4 rounded border border-[#8b6b45]">
                    Paste the Server Seed (revealed after a match), your Client Seed, and the Nonce to verify the game outcome.
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold mb-1 text-[#5a3a22] uppercase">Server Seed</label>
                        <input
                            type="text"
                            value={serverSeed}
                            onChange={(e) => setServerSeed(e.target.value)}
                            className="w-full bg-[#eecfa1] border-2 border-[#8b6b45] rounded p-2 focus:border-[#8b0000] outline-none font-mono text-[#3b3b3b]"
                            placeholder="e.g. 5b7d..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-1 text-[#5a3a22] uppercase">Client Seed</label>
                            <input
                                type="text"
                                value={clientSeed}
                                onChange={(e) => setClientSeed(e.target.value)}
                                className="w-full bg-[#eecfa1] border-2 border-[#8b6b45] rounded p-2 font-mono text-[#3b3b3b]"
                                placeholder="Your seed"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1 text-[#5a3a22] uppercase">Nonce</label>
                            <input
                                type="number"
                                value={nonce}
                                onChange={(e) => setNonce(e.target.value)}
                                className="w-full bg-[#eecfa1] border-2 border-[#8b6b45] rounded p-2 font-mono text-[#3b3b3b]"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleVerify}
                        className="w-full bg-[#8b0000] hover:bg-[#a60000] text-[#ffd700] font-bold py-4 rounded border-2 border-[#5a1a1a] shadow-lg transition-transform hover:scale-[1.01] uppercase tracking-wider"
                    >
                        Verify Outcome
                    </button>
                </div>

                {result && (
                    <div className="bg-[#eecfa1] p-6 rounded border-2 border-[#8b6b45] space-y-4">
                        <h2 className="text-xl font-bold text-[#8b0000] border-b border-[#8b6b45] pb-2">Oracle&apos;s Verdict</h2>
                        <div className="grid grid-cols-[100px_1fr] gap-4 text-sm font-mono text-[#3b3b3b]">
                            <div className="text-[#5a3a22] font-bold">Hash:</div>
                            <div className="break-all">{result.hash}</div>

                            <div className="text-[#5a3a22] font-bold">Winner:</div>
                            <div className={result.isPlayerAWin ? 'text-[#3b8b00] font-bold' : 'text-[#8b0000] font-bold'}>
                                {result.isPlayerAWin ? 'Player A (You)' : 'Player B (Opponent)'}
                            </div>
                        </div>
                    </div>
                )}

                <div className="pt-4 text-center">
                    <Link href="/" className="text-[#8b0000] hover:text-[#a60000] underline decoration-[#8b0000]/30 text-sm">
                        ← Return to Arena
                    </Link>
                </div>
            </div>
        </div>
    );
}
