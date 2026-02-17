// GET /api/v1/quiz/next
// Returns the next question based on adaptive difficulty. Rate-limited. Requires auth.

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getNextQuestion } from "@/lib/adaptive";
import { verifyAuth } from "@/lib/auth";
import { saveUser } from "@/lib/store";

export async function GET(request: NextRequest) {
  // Verify authentication
  const auth = await verifyAuth(request.headers.get("Authorization"));

  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = auth.userId;
  
  // Read sessionId from query params
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  // Rate limit check
  const rateLimit = checkRateLimit(userId);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: rateLimit.retryAfter },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimit.retryAfter),
          "Retry-After": String(rateLimit.retryAfter),
        },
      }
    );
  }

  // Get next question via adaptive engine
  const result = await getNextQuestion(userId);

  if (!result) {
    return NextResponse.json(
      { error: "No questions available for current difficulty" },
      { status: 404 }
    );
  }
  
  // Store sessionId if provided
  if (sessionId && result) {
    // Note: getNextQuestion already loads the user, but we need to update sessionId
    const { getOrCreateUser } = await import('@/lib/store');
    const user = await getOrCreateUser(userId);
    user.sessionId = sessionId;
    await saveUser(user);
  }

  return NextResponse.json(
    {
      ...result,
      sessionId: sessionId || null,
      currentScore: result.userState.totalScore,
      currentStreak: result.userState.streak,
      difficulty: result.userState.difficulty,
    },
    {
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    }
  );
}
