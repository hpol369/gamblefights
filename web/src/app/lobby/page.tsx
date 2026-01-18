'use client';

import { LobbyCanvas } from '../components/LobbyCanvas';

export default function LobbyPage() {
    return (
        <main className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/sandpaper.png')] bg-[#eecfa1] p-8 flex flex-col items-center justify-center">
            <h1 className="text-4xl font-bold text-[#5a3a22] mb-8 font-[Cinzel] drop-shadow-md">
                The Duel Arena
            </h1>

            <div className="w-full max-w-4xl">
                <LobbyCanvas />
            </div>

            <div className="mt-8 text-[#5a3a22] max-w-2xl text-center font-mono text-sm bg-white/20 p-4 rounded border border-[#5a3a22]/20">
                <p className="font-bold mb-2">Instructions:</p>
                <p>• WASD to move around.</p>
                <p>• Other players appear in real-time.</p>
                <p>• (Coming Soon) Click a player to challenge them!</p>
            </div>
        </main>
    );
}
