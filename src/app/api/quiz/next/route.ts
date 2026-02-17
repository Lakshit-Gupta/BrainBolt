// GET /api/quiz/next?userId=X
// Returns the next question based on adaptive difficulty. Rate-limited.

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getNextQuestion } from "@/lib/adaptive";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId || !userId.trim()) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

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
  const result = getNextQuestion(userId);

  if (!result) {
    return NextResponse.json(
      { error: "No questions available for current difficulty" },
      { status: 404 }
    );
  }

  return NextResponse.json(result, {
    headers: {
      "X-RateLimit-Remaining": String(rateLimit.remaining),
    },
  });
}
