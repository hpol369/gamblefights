'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMatchHistory, Match, formatSOL } from '@/lib/api';

export function UserStats() {
  const { user, balances } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const solBalance = balances.find((b) => b.currency === 'SOL');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getMatchHistory();
        setMatches(data.matches);
      } catch (err) {
        console.error('Failed to fetch match history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (!user) return null;

  const totalGames = user.totalWins + user.totalLosses;
  const winRate = totalGames > 0 ? (user.totalWins / totalGames) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-2xl font-bold">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user.username}</h2>
            <p className="text-sm text-gray-400 truncate max-w-[180px]">
              {user.walletAddressSOL}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatBox
            label="Balance"
            value={solBalance?.display || '0 SOL'}
            color="text-green-400"
          />
          <StatBox label="Total Games" value={totalGames.toString()} />
          <StatBox
            label="Wins"
            value={user.totalWins.toString()}
            color="text-green-400"
          />
          <StatBox
            label="Losses"
            value={user.totalLosses.toString()}
            color="text-red-400"
          />
        </div>

        {/* Win Rate Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Win Rate</span>
            <span className="font-mono">{winRate.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
              style={{ width: `${winRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Match History */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4">Match History</h3>

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-700 rounded-lg" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No matches yet</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {matches.slice(0, 10).map((match) => (
              <HistoryItem key={match.id} match={match} userId={user.id} />
            ))}
          </div>
        )}
      </div>

      {/* Client Seed */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-2">Provably Fair</h3>
        <p className="text-xs text-gray-500 mb-4">
          Your client seed is used to verify game fairness
        </p>
        <div className="p-3 bg-gray-900 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Client Seed</p>
          <p className="font-mono text-sm truncate">{user.clientSeed || 'Not set'}</p>
        </div>
        <a
          href="/fairness"
          className="inline-block mt-3 text-sm text-orange-400 hover:text-orange-300"
        >
          Learn more about fairness →
        </a>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color = 'text-white',
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="p-3 bg-gray-900 rounded-lg">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
    </div>
  );
}

function HistoryItem({ match, userId }: { match: Match; userId: string }) {
  const isWinner = match.winner === userId;
  const opponent =
    match.playerA === userId ? match.playerBUsername : match.playerAUsername;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
      <div className="flex items-center gap-3">
        <span
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
            isWinner ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
          }`}
        >
          {isWinner ? 'W' : 'L'}
        </span>
        <div>
          <p className="text-sm font-medium">vs {opponent}</p>
          <p className="text-xs text-gray-500">
            {new Date(match.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={`font-mono text-sm ${
            isWinner ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {isWinner ? '+' : '-'}
          {match.wagerDisplay}
        </p>
      </div>
    </div>
  );
}
