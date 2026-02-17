"use client";

interface StatsBarProps {
  score: number;
  streak: number;
  difficulty: number;
  maxStreak: number;
}

export default function StatsBar({
  score,
  streak,
  difficulty,
  maxStreak,
}: StatsBarProps) {
  const multiplier = Math.min(4.0, 1.0 + streak * 0.25);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Score */}
        <div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Score
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums mt-1">
            {Math.round(score).toLocaleString()}
          </div>
        </div>

        {/* Streak */}
        <div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Streak
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">
              {streak}
            </span>
            {streak > 0 && (
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-400/10 px-1.5 py-0.5 rounded">
                {multiplier.toFixed(2)}x
              </span>
            )}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Difficulty
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${(difficulty / 10) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 tabular-nums w-8 text-right">
              {difficulty}/10
            </span>
          </div>
        </div>

        {/* Best Streak */}
        <div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Best Streak
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums mt-1">
            {maxStreak}
          </div>
        </div>
      </div>
    </div>
  );
}
