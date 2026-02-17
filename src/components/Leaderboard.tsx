"use client";

import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { Card, Skeleton } from "@/components/ui";

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

function Leaderboard({ userId, token }: { userId: string; token: string }) {
  const [tab, setTab] = useState<"score" | "streak">("score");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(() => {
    fetch(`/api/v1/leaderboard/${tab}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
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
  }, [tab, token]);

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard();

    const interval = setInterval(fetchLeaderboard, 3000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const handleTabChange = useCallback((newTab: "score" | "streak") => {
    setTab(newTab);
  }, []);

  const renderedEntries = useMemo(() => {
    if (entries.length === 0) return null;

    return entries.map((entry, index) => {
      const isCurrentUser = entry.userId === userId;
      return (
        <div
          key={entry.userId}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-bb-md transition-colors ${isCurrentUser
              ? "bb-accent-subtle border"
              : ""
            }`}
        >
          <span
            className={`w-6 text-bb-sm font-medium tabular-nums text-center ${index === 0
                ? "text-amber-400"
                : index === 1
                  ? "text-slate-300"
                  : index === 2
                    ? "text-amber-700"
                    : "text-bb-muted"
              }`}
          >
            {index + 1}
          </span>
          <span
            className={`flex-1 text-bb-sm truncate ${isCurrentUser
                ? "text-bb-accent font-medium"
                : "text-bb-text"
              }`}
          >
            {entry.userId}
            {isCurrentUser && (
              <span className="text-bb-xs text-bb-muted ml-1">
                (you)
              </span>
            )}
          </span>
          <span className="text-bb-sm font-medium text-bb-text tabular-nums">
            {tab === "score"
              ? Math.round(entry.totalScore).toLocaleString()
              : entry.maxStreak}
          </span>
        </div>
      );
    });
  }, [entries, userId, tab]);

  return (
    <Card>
      {/* Tabs */}
      <div className="flex border-b border-bb-border mb-4">
        <button
          onClick={() => handleTabChange("score")}
          className={`flex-1 px-4 py-3 text-bb-sm font-medium transition-colors ${tab === "score"
              ? "text-bb-accent border-b-2 border-bb-accent"
              : "text-bb-muted hover:text-bb-text"
            }`}
        >
          Score
        </button>
        <button
          onClick={() => handleTabChange("streak")}
          className={`flex-1 px-4 py-3 text-bb-sm font-medium transition-colors ${tab === "streak"
              ? "text-bb-accent border-b-2 border-bb-accent"
              : "text-bb-muted hover:text-bb-text"
            }`}
        >
          Streak
        </button>
      </div>

      {/* Content */}
      <div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-6 h-6 rounded-full" />
                <Skeleton className="flex-1 h-4" />
                <Skeleton className="w-12 h-4" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-bb-error text-bb-sm mb-3">
              {error}
            </p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                fetchLeaderboard();
              }}
              className="text-bb-sm px-3 py-1.5 bg-bb-accent hover:bg-bb-accent-hover text-white rounded-bb-md transition-colors"
            >
              Retry
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-bb-muted text-bb-sm">
              No entries yet. Be the first!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {renderedEntries}

            {/* Current user not in top list */}
            {currentUser && (
              <>
                <div className="border-t border-bb-border my-2" />
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-bb-md bb-accent-subtle border">
                  <span className="w-6 text-bb-sm font-medium tabular-nums text-center text-bb-muted">
                    {currentUser.rank}
                  </span>
                  <span className="flex-1 text-bb-sm text-bb-accent font-medium truncate">
                    {currentUser.userId}
                    <span className="text-bb-xs text-bb-muted ml-1">
                      (you)
                    </span>
                  </span>
                  <span className="text-bb-sm font-medium text-bb-text tabular-nums">
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
    </Card>
  );
}

export default memo(Leaderboard);
