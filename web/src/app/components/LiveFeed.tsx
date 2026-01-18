'use client';

import { useState, useEffect } from 'react';
import { getLiveMatches, Match } from '@/lib/api';

export function LiveFeed() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const data = await getLiveMatches();
        setMatches(data.matches);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch live matches:', err);
        setError('Failed to load matches');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();

    // Refresh every 10 seconds
    const interval = setInterval(fetchMatches, 10000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="parchment-panel p-6 rounded-lg">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[#d4b483]/30 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="parchment-panel p-6 rounded-lg text-center">
        <p className="text-[#8b0000]">{error}</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="parchment-panel p-6 rounded-lg text-center">
        <p className="text-[#5a3a22] font-[Cinzel]">No carnage in the arena yet.</p>
        <p className="text-sm text-[#8b6b45] mt-2 italic">Be the first gladiator!</p>
      </div>
    );
  }

  return (
    <div className="parchment-panel rounded-lg overflow-hidden">
      <div className="divide-y divide-[#d4b483]">
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  const isCompleted = match.status === 'COMPLETED';
  const timeAgo = getTimeAgo(match.createdAt);

  return (
    <div className="p-4 hover:bg-[#d4b483]/20 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-[#3b8b00]' : 'bg-[#ffd700] animate-pulse'
              }`}
          />
          <span className="text-xs text-[#5a3a22] uppercase font-bold tracking-wider">
            {isCompleted ? 'Finished' : 'Fighting'}
          </span>
        </div>
        <span className="text-xs text-[#8b6b45]">{timeAgo}</span>
      </div>

      <div className="flex items-center justify-between font-[Cinzel]">
        <div className="flex-1">
          <p
            className={`font-bold text-sm truncate ${match.winner === match.playerA ? 'text-[#8b0000]' : 'text-[#3b3b3b]'
              }`}
          >
            {match.playerAUsername}
            {match.winner === match.playerA && ' 👑'}
          </p>
        </div>

        <div className="px-3 py-1 bg-[#5a3a22] rounded text-xs font-mono text-[#eecfa1]">
          {match.wagerDisplay}
        </div>

        <div className="flex-1 text-right">
          <p
            className={`font-bold text-sm truncate ${match.winner === match.playerB ? 'text-[#8b0000]' : 'text-[#3b3b3b]'
              }`}
          >
            {match.winner === match.playerB && '👑 '}
            {match.playerBUsername}
          </p>
        </div>
      </div>

      {isCompleted && match.winnerUsername && (
        <p className="text-xs text-[#5a3a22] mt-2 text-center font-serif italic">
          {match.winnerUsername} claimed {match.wagerDisplay}
        </p>
      )}
    </div>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
