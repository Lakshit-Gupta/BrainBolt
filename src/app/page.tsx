"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import QuizCard from "../components/QuizCard";
import StatsBar from "../components/StatsBar";
import { Skeleton, Input, Button } from "@/components/ui";

const Leaderboard = dynamic(() => import("../components/Leaderboard"), {
  ssr: false,
  loading: () => (
    <div className="space-y-3">
      <Skeleton className="h-8 w-full" />
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  ),
});

const ThemeToggle = dynamic(() => import("../components/ThemeToggle"), {
  ssr: false,
  loading: () => <div className="w-9 h-9" />,
});

export default function Page() {
  const [sessionId, setSessionId] = useState("");
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [quizStarted, setQuizStarted] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [stats, setStats] = useState({
    score: 0,
    streak: 0,
    difficulty: 1,
    maxStreak: 0,
  });

  useEffect(() => {
    setSessionId(crypto.randomUUID());

    // Check for existing token in localStorage
    const storedToken = localStorage.getItem("brainbolt_token");
    const storedUserId = localStorage.getItem("brainbolt_userId");
    const storedUsername = localStorage.getItem("brainbolt_username");

    if (storedToken && storedUserId && storedUsername) {
      setToken(storedToken);
      setUserId(storedUserId);
      setUsername(storedUsername);
      setQuizStarted(true);
    }
  }, []);

  const handleLogin = async () => {
    if (!username.trim()) return;

    setIsLoggingIn(true);
    setLoginError("");

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Login failed");
      }

      const data = await response.json();

      // Store auth data
      localStorage.setItem("brainbolt_token", data.token);
      localStorage.setItem("brainbolt_userId", data.userId);
      localStorage.setItem("brainbolt_username", data.username);

      setToken(data.token);
      setUserId(data.userId);
      setUsername(data.username);
      setQuizStarted(true);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  // Memoize the stats object to prevent unnecessary re-renders
  const memoizedStats = useMemo(() => stats, [stats.score, stats.streak, stats.difficulty, stats.maxStreak]);

  // Wrap onStatsUpdate with useCallback to prevent re-renders
  const handleStatsUpdate = useCallback((newStats: typeof stats) => {
    setStats(newStats);
  }, []);

  if (!quizStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                BrainBolt
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Adaptive Infinite Quiz Platform
              </p>
            </div>

            <div className="space-y-4">
              <Input
                id="username"
                label="Username"
                type="text"
                placeholder="Enter username (letters, numbers, underscore)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                disabled={isLoggingIn}
                error={loginError}
              />

              <Button
                onClick={handleLogin}
                disabled={!username.trim() || isLoggingIn}
                loading={isLoggingIn}
                className="w-full"
              >
                Start Playing
              </Button>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                  Adaptive
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Scales with you
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                  Streaks
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Up to 4x multiplier
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                  Compete
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Live leaderboard
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-4">
            Session: {sessionId ? sessionId.slice(0, 8) : "..."}
          </p>
        </div>

        <div className="fixed top-4 right-4">
          <ThemeToggle />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            BrainBolt
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {username}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <StatsBar
          score={memoizedStats.score}
          streak={memoizedStats.streak}
          difficulty={memoizedStats.difficulty}
          maxStreak={memoizedStats.maxStreak}
        />
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pb-8">
        {/* Mobile leaderboard toggle (visible below md) */}
        <div className="md:hidden mb-4">
          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="w-full py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            {showLeaderboard ? "Hide Leaderboard" : "Show Leaderboard"}
          </button>
        </div>

        {/* Mobile leaderboard (collapsible, below md only) */}
        {showLeaderboard && (
          <div className="md:hidden mb-6">
            <Leaderboard userId={userId} token={token} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quiz Card */}
          <div className="lg:col-span-2">
            <QuizCard userId={userId} token={token} onStatsUpdate={handleStatsUpdate} />
          </div>

          {/* Leaderboard: bottom panel on tablet (md), side panel on desktop (lg) */}
          <div className="hidden md:block">
            <Leaderboard userId={userId} token={token} />
          </div>
        </div>
      </main>
    </div>
  );
}
