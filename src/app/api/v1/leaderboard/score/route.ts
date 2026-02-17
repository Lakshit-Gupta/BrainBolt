// GET /api/v1/leaderboard/score
// Returns top 10 users by totalScore. Requires auth.

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { getScoreLeaderboard, getUserRank, getUser } from "@/lib/store";

export async function GET(request: NextRequest) {
  // Verify authentication
  const isInternal = request.headers.get("x-internal-request") === "true";
  let userId: string | undefined;

  if (!isInternal) {
    const auth = await verifyAuth(request.headers.get("Authorization"));
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = auth.userId;
  }

  const leaderboard = await getScoreLeaderboard(10);

  const response: any = {
    leaderboard,
    updatedAt: new Date().toISOString(),
  };

  // If userId provided and user is NOT in top 10, add currentUser
  if (userId) {
    const rank = await getUserRank(userId, 'score');
    const isInTop10 = leaderboard.some(entry => entry.userId === userId);

    if (rank > 0 && !isInTop10) {
      const user = await getUser(userId);
      if (user) {
        response.currentUser = {
          userId: user.userId,
          totalScore: user.totalScore,
          rank: rank,
          difficulty: user.difficulty,
          streak: user.streak,
        };
      }
    }
  }

  return NextResponse.json(response);
}
