// GET /api/leaderboard/streak
// Returns top 10 users by maxStreak.

import { NextRequest, NextResponse } from "next/server";
import { getStreakLeaderboard, getUserRank, getUser } from "@/lib/store";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");

  const leaderboard = getStreakLeaderboard(10);

  const response: any = {
    leaderboard,
    updatedAt: new Date().toISOString(),
  };

  // If userId provided and user is NOT in top 10, add currentUser
  if (userId) {
    const rank = getUserRank(userId, 'streak');
    const isInTop10 = leaderboard.some(entry => entry.userId === userId);

    if (rank > 0 && !isInTop10) {
      const user = getUser(userId);
      if (user) {
        response.currentUser = {
          userId: user.userId,
          maxStreak: user.maxStreak,
          rank: rank,
          difficulty: user.difficulty,
          totalScore: user.totalScore,
        };
      }
    }
  }

  return NextResponse.json(response);
}
