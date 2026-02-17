import { Suspense } from 'react';

interface LeaderboardEntry {
    userId: string;
    username?: string;
    totalScore?: number;
    maxStreak?: number;
    rank: number;
}

async function getLeaderboardData() {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    try {
        const [scoreRes, streakRes] = await Promise.all([
            fetch(`${baseUrl}/api/v1/leaderboard/score`, {
                cache: 'no-store',
                headers: { 'x-internal-request': 'true' }
            }),
            fetch(`${baseUrl}/api/v1/leaderboard/streak`, {
                cache: 'no-store',
                headers: { 'x-internal-request': 'true' }
            }),
        ]);
        const scoreData = await scoreRes.json();
        const streakData = await streakRes.json();
        return {
            scores: scoreData.leaderboard || [],
            streaks: streakData.leaderboard || [],
            updatedAt: new Date().toISOString(),
        };
    } catch {
        return { scores: [], streaks: [], updatedAt: new Date().toISOString() };
    }
}

export default async function LeaderboardPage() {
    const { scores, streaks, updatedAt } = await getLeaderboardData();

    return (
        <main
            className="min-h-screen"
            style={{ backgroundColor: 'var(--color-bg-primary)' }}
        >
            <div className="max-w-4xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="mb-8">
                    <a
                        href="/"
                        className="text-bb-sm text-bb-muted hover:text-bb-text transition-colors mb-4 inline-block"
                    >
                        ← Back to Quiz
                    </a>
                    <h1
                        className="text-bb-3xl font-bold"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        BrainBolt Leaderboard
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        Server-rendered • Updated: {new Date(updatedAt).toLocaleTimeString()}
                    </p>
                </div>

                {/* Two columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Score leaderboard */}
                    <div className="bb-card">
                        <h2
                            className="text-bb-xl font-semibold mb-4"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            🏆 Top Scores
                        </h2>
                        {scores.length === 0 ? (
                            <p style={{ color: 'var(--color-text-muted)' }}>No scores yet</p>
                        ) : (
                            <ol className="space-y-2">
                                {scores.map((entry: LeaderboardEntry, i: number) => (
                                    <li
                                        key={entry.userId}
                                        className="flex items-center justify-between p-3 rounded-bb-md"
                                        style={{ backgroundColor: 'var(--color-bg-elevated)' }}
                                    >
                                        <span style={{
                                            color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : 'var(--color-text-secondary)',
                                            fontWeight: 700,
                                            minWidth: '2rem'
                                        }}>
                                            #{i + 1}
                                        </span>
                                        <span
                                            className="flex-1 mx-3 truncate"
                                            style={{ color: 'var(--color-text-primary)' }}
                                        >
                                            {entry.username || entry.userId.substring(0, 8)}
                                        </span>
                                        <span
                                            className="font-mono font-bold"
                                            style={{ color: 'var(--color-accent-light)' }}
                                        >
                                            {entry.totalScore?.toLocaleString()}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>

                    {/* Streak leaderboard */}
                    <div className="bb-card">
                        <h2
                            className="text-bb-xl font-semibold mb-4"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            🔥 Top Streaks
                        </h2>
                        {streaks.length === 0 ? (
                            <p style={{ color: 'var(--color-text-muted)' }}>No streaks yet</p>
                        ) : (
                            <ol className="space-y-2">
                                {streaks.map((entry: LeaderboardEntry, i: number) => (
                                    <li
                                        key={entry.userId}
                                        className="flex items-center justify-between p-3 rounded-bb-md"
                                        style={{ backgroundColor: 'var(--color-bg-elevated)' }}
                                    >
                                        <span style={{
                                            color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : 'var(--color-text-secondary)',
                                            fontWeight: 700,
                                            minWidth: '2rem'
                                        }}>
                                            #{i + 1}
                                        </span>
                                        <span
                                            className="flex-1 mx-3 truncate"
                                            style={{ color: 'var(--color-text-primary)' }}
                                        >
                                            {entry.username || entry.userId.substring(0, 8)}
                                        </span>
                                        <span
                                            className="font-mono font-bold"
                                            style={{ color: 'var(--color-success)' }}
                                        >
                                            {entry.maxStreak} streak
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
