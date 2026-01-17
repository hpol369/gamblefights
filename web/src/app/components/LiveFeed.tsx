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
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 text-center">
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 text-center">
        <p className="text-gray-400">No recent matches</p>
        <p className="text-sm text-gray-500 mt-2">Be the first to fight!</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
      <div className="divide-y divide-gray-700">
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
    <div className="p-4 hover:bg-gray-700/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isCompleted ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
            }`}
          />
          <span className="text-xs text-gray-500">
            {isCompleted ? 'Completed' : 'Live'}
          </span>
        </div>
        <span className="text-xs text-gray-500">{timeAgo}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p
            className={`font-medium text-sm truncate ${
              match.winner === match.playerA ? 'text-green-400' : 'text-gray-300'
            }`}
          >
            {match.playerAUsername}
            {match.winner === match.playerA && ' 👑'}
          </p>
        </div>

        <div className="px-3 py-1 bg-gray-700 rounded text-xs font-mono">
          {match.wagerDisplay}
        </div>

        <div className="flex-1 text-right">
          <p
            className={`font-medium text-sm truncate ${
              match.winner === match.playerB ? 'text-green-400' : 'text-gray-300'
            }`}
          >
            {match.winner === match.playerB && '👑 '}
            {match.playerBUsername}
          </p>
        </div>
      </div>

      {isCompleted && match.winnerUsername && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          {match.winnerUsername} won {match.wagerDisplay} x2
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
