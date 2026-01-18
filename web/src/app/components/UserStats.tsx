'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMatchHistory, Match } from '@/lib/api';

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
      <div className="parchment-panel p-6 rounded-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-[#8b0000] rounded-full flex items-center justify-center text-2xl font-bold border-4 border-[#ffd700] text-[#ffd700] shadow-md font-[Cinzel]">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold font-[Cinzel] text-[#3b3b3b]">{user.username}</h2>
            <p className="text-sm text-[#8b6b45] truncate max-w-[180px] font-mono">
              {user.walletAddressSOL}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatBox
            label="Treasury"
            value={solBalance?.display || '0 SOL'}
            color="text-[#3b8b00]"
          />
          <StatBox label="Battles" value={totalGames.toString()} />
          <StatBox
            label="Victories"
            value={user.totalWins.toString()}
            color="text-[#3b8b00]"
          />
          <StatBox
            label="Defeats"
            value={user.totalLosses.toString()}
            color="text-[#8b0000]"
          />
        </div>

        {/* Win Rate Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[#5a3a22] font-bold uppercase text-xs">Win Rate</span>
            <span className="font-mono text-[#3b3b3b]">{winRate.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-[#d4b483] rounded-full overflow-hidden border border-[#8b6b45]">
            <div
              className="h-full bg-gradient-to-r from-[#3b8b00] to-[#5a9b20] transition-all duration-500"
              style={{ width: `${winRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Match History */}
      <div className="parchment-panel p-6 rounded-lg">
        <h3 className="text-lg font-bold mb-4 font-[Cinzel] text-[#3b3b3b] border-b border-[#d4b483] pb-2">Battle Log</h3>

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-[#d4b483]/30 rounded-lg" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <p className="text-[#8b6b45] text-center py-4 italic">No battles recorded in the scrolls</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {matches.slice(0, 10).map((match) => (
              <HistoryItem key={match.id} match={match} userId={user.id} />
            ))}
          </div>
        )}
      </div>

      {/* Client Seed */}
      <div className="parchment-panel p-6 rounded-lg">
        <h3 className="text-lg font-bold mb-2 font-[Cinzel] text-[#3b3b3b]">Fairness Scroll</h3>
        <p className="text-xs text-[#5a3a22] mb-4">
          Your client seed is used to cryptographically verify the carnage
        </p>
        <div className="p-3 bg-[#eecfa1] border border-[#8b6b45] rounded shadow-inner">
          <p className="text-xs text-[#8b6b45] mb-1 font-bold">Client Seed</p>
          <p className="font-mono text-sm truncate text-[#3b3b3b]">{user.clientSeed || 'Not set'}</p>
        </div>
        <a
          href="/fairness"
          className="inline-block mt-3 text-sm text-[#8b0000] hover:text-[#a60000] underline decoration-[#8b0000]/30"
        >
          Verify the Scrolls →
        </a>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color = 'text-[#3b3b3b]',
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="p-3 bg-[#eecfa1] border border-[#8b6b45] rounded shadow-sm">
      <p className="text-xs text-[#5a3a22] mb-1 uppercase font-bold tracking-wide">{label}</p>
      <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
    </div>
  );
}

function HistoryItem({ match, userId }: { match: Match; userId: string }) {
  const isWinner = match.winner === userId;
  const opponent =
    match.playerA === userId ? match.playerBUsername : match.playerAUsername;

  return (
    <div className="flex items-center justify-between p-3 bg-[#eecfa1]/50 border border-[#d4b483] rounded hover:bg-[#d4b483]/30 transition-colors">
      <div className="flex items-center gap-3">
        <span
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-[Cinzel] font-bold border-2 ${isWinner ? 'bg-[#3b8b00]/20 text-[#3b8b00] border-[#3b8b00]' : 'bg-[#8b0000]/20 text-[#8b0000] border-[#8b0000]'
            }`}
        >
          {isWinner ? 'W' : 'L'}
        </span>
        <div>
          <p className="text-sm font-bold text-[#3b3b3b] font-[Cinzel]">vs {opponent}</p>
          <p className="text-xs text-[#8b6b45]">
            {new Date(match.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={`font-mono text-sm font-bold ${isWinner ? 'text-[#3b8b00]' : 'text-[#8b0000]'
            }`}
        >
          {isWinner ? '+' : '-'}
          {match.wagerDisplay}
        </p>
      </div>
    </div>
  );
}
