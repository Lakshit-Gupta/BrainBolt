"use client";

import { Card, Badge } from "@/components/ui";

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
    <Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Score */}
        <div>
          <div className="text-bb-xs font-medium text-bb-muted uppercase tracking-wide">
            Score
          </div>
          <div className="text-bb-2xl font-bold text-bb-text tabular-nums mt-1">
            {Math.round(score).toLocaleString()}
          </div>
        </div>

        {/* Streak */}
        <div>
          <div className="text-bb-xs font-medium text-bb-muted uppercase tracking-wide">
            Streak
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-bb-2xl font-bold text-bb-text tabular-nums">
              {streak}
            </span>
            {streak > 0 && (
              <Badge variant="accent" className="text-bb-xs">
                {multiplier.toFixed(2)}x
              </Badge>
            )}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <div className="text-bb-xs font-medium text-bb-muted uppercase tracking-wide">
            Difficulty
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-2 bg-bb-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-bb-accent rounded-full transition-all duration-500"
                style={{ width: `${(difficulty / 10) * 100}%` }}
              />
            </div>
            <span className="text-bb-sm font-medium text-bb-text tabular-nums w-8 text-right">
              {difficulty}/10
            </span>
          </div>
        </div>

        {/* Best Streak */}
        <div>
          <div className="text-bb-xs font-medium text-bb-muted uppercase tracking-wide">
            Best Streak
          </div>
          <div className="text-bb-2xl font-bold text-bb-text tabular-nums mt-1">
            {maxStreak}
          </div>
        </div>
      </div>
    </Card>
  );
}
