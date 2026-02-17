"use client";

import { useState, useEffect } from "react";
import QuizCard from "../components/QuizCard";
import Leaderboard from "../components/Leaderboard";
import ThemeToggle from "../components/ThemeToggle";
import StatsBar from "../components/StatsBar";

export default function Page() {
  const [sessionId, setSessionId] = useState("");
  const [userId, setUserId] = useState("");
  const [quizStarted, setQuizStarted] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [stats, setStats] = useState({
    score: 0,
    streak: 0,
    difficulty: 1,
    maxStreak: 0,
  });

  useEffect(() => {
    setSessionId(crypto.randomUUID());
  }, []);

  const startQuiz = () => {
    if (userId.trim()) {
      setQuizStarted(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      startQuiz();
    }
  };

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
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5"
                >
                  Your Name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  autoFocus
                />
              </div>

              <button
                onClick={startQuiz}
                disabled={!userId.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
              >
                Start Quiz
              </button>
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
              {userId}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <StatsBar
          score={stats.score}
          streak={stats.streak}
          difficulty={stats.difficulty}
          maxStreak={stats.maxStreak}
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
            <Leaderboard userId={userId} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quiz Card */}
          <div className="lg:col-span-2">
            <QuizCard userId={userId} onStatsUpdate={setStats} />
          </div>

          {/* Leaderboard: bottom panel on tablet (md), side panel on desktop (lg) */}
          <div className="hidden md:block">
            <Leaderboard userId={userId} />
          </div>
        </div>
      </main>
    </div>
  );
}
