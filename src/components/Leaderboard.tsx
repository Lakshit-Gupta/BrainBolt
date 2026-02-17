"use client";

import { useEffect, useState, useCallback } from "react";

interface LeaderboardEntry {
  userId: string;
  totalScore: number;
  maxStreak: number;
  streak: number;
  difficulty: number;
}

interface CurrentUser {
  userId: string;
  totalScore?: number;
  maxStreak?: number;
  rank: number;
  difficulty: number;
  streak?: number;
}

export default function Leaderboard({ userId }: { userId: string }) {
  const [tab, setTab] = useState<"score" | "streak">("score");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(() => {
    fetch(
      `/api/leaderboard/${tab}?userId=${encodeURIComponent(userId)}`
    )
      .then((res) => {
        if (!res.ok)
          throw new Error(`Failed to load leaderboard (${res.status})`);
        return res.json();
      })
      .then((data) => {
        setEntries(data.leaderboard || []);
        setCurrentUser(data.currentUser || null);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [tab, userId]);

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard();

    const interval = setInterval(fetchLeaderboard, 3000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setTab("score")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            tab === "score"
              ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Score
        </button>
        <button
          onClick={() => setTab("streak")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            tab === "streak"
              ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Streak
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="w-12 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-red-500 dark:text-red-400 text-sm mb-3">
              {error}
            </p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                fetchLeaderboard();
              }}
              className="text-sm px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              No entries yet. Be the first!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {entries.map((entry, index) => {
              const isCurrentUser = entry.userId === userId;
              return (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
                    isCurrentUser
                      ? "bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30"
                      : ""
                  }`}
                >
                  <span
                    className={`w-6 text-sm font-medium tabular-nums text-center ${
                      index === 0
                        ? "text-amber-500 dark:text-amber-400"
                        : index === 1
                          ? "text-slate-400 dark:text-slate-300"
                          : index === 2
                            ? "text-amber-700 dark:text-amber-600"
                            : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={`flex-1 text-sm truncate ${
                      isCurrentUser
                        ? "text-indigo-600 dark:text-indigo-300 font-medium"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {entry.userId}
                    {isCurrentUser && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">
                        (you)
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-50 tabular-nums">
                    {tab === "score"
                      ? Math.round(entry.totalScore).toLocaleString()
                      : entry.maxStreak}
                  </span>
                </div>
              );
            })}

            {/* Current user not in top list */}
            {currentUser && (
              <>
                <div className="border-t border-slate-200 dark:border-slate-700 my-2" />
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30">
                  <span className="w-6 text-sm font-medium tabular-nums text-center text-slate-400 dark:text-slate-500">
                    {currentUser.rank}
                  </span>
                  <span className="flex-1 text-sm text-indigo-600 dark:text-indigo-300 font-medium truncate">
                    {currentUser.userId}
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">
                      (you)
                    </span>
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-50 tabular-nums">
                    {tab === "score"
                      ? Math.round(currentUser.totalScore || 0).toLocaleString()
                      : currentUser.maxStreak || 0}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
