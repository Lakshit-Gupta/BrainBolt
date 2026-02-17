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
      <div className="grid grid-cols-4 gap-4 w-full">
        {/* Score */}
        <div className="flex flex-col gap-1">
          <div className="text-bb-xs font-medium text-bb-muted uppercase tracking-wide">
            Score
          </div>
          <div className="text-bb-2xl font-bold text-bb-text tabular-nums">
            {Math.round(score).toLocaleString()}
          </div>
        </div>

        {/* Streak */}
        <div className="flex flex-col gap-1">
          <div className="text-bb-xs font-medium text-bb-muted uppercase tracking-wide">
            Streak
          </div>
          <div className="flex items-baseline gap-2">
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
        <div className="flex flex-col gap-1" style={{ position: 'relative', isolation: 'isolate', overflow: 'hidden' }}>
          <div className="text-bb-xs font-medium text-bb-muted uppercase tracking-wide">
            Difficulty
          </div>
          <div className="text-bb-2xl font-bold text-bb-text tabular-nums">
            {difficulty}
          </div>
          <div style={{ overflow: 'hidden', borderRadius: 4, height: 4, width: '100%', marginTop: 4 }} className="bg-bb-elevated">
            <div
              className="h-full bg-bb-accent transition-all duration-500"
              style={{ width: `${(difficulty / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* Best Streak */}
        <div className="flex flex-col gap-1">
          <div className="text-bb-xs font-medium text-bb-muted uppercase tracking-wide">
            Best Streak
          </div>
          <div className="text-bb-2xl font-bold text-bb-text tabular-nums">
            {maxStreak}
          </div>
        </div>
      </div>
    </Card>
  );
}
