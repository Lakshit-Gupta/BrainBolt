// POST /api/v1/quiz/answer
// Process an answer submission with idempotency enforcement. Rate-limited. Requires auth.

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { checkIdempotency, recordIdempotency, getUser, getUserScoreRank, getUserStreakRank } from "@/lib/store";
import { processAnswer } from "@/lib/adaptive";
import { getQuestionById } from "@/lib/questions";

interface AnswerRequestBody {
  questionId?: string;
  selectedIndex?: number;
  idempotencyKey?: string;
  stateVersion?: number;
  sessionId?: string;
}

export async function POST(request: NextRequest) {
  // Verify authentication
  const auth = await verifyAuth(request.headers.get("Authorization"));
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = auth.userId;

  let body: AnswerRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { questionId, selectedIndex, idempotencyKey, stateVersion, sessionId } = body;

  // ── Validate required fields ──
  if (!questionId || selectedIndex === undefined || !idempotencyKey) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (typeof selectedIndex !== "number" || selectedIndex < 0) {
    return NextResponse.json(
      { error: "Invalid selectedIndex" },
      { status: 400 }
    );
  }

  // ── Verify question exists ──
  const question = getQuestionById(questionId);
  if (!question) {
    return NextResponse.json(
      { error: "Question not found" },
      { status: 404 }
    );
  }

  // ── Validate selectedIndex against question choices ──
  if (selectedIndex >= question.choices.length) {
    return NextResponse.json(
      { error: "Invalid selectedIndex" },
      { status: 400 }
    );
  }

  // ── Rate limit check ──
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

  // ── Idempotency check ──
  const cached = await checkIdempotency(idempotencyKey);
  if (cached) {
    return NextResponse.json(
      { ...cached, idempotent: true },
      {
        headers: {
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      }
    );
  }

  // ── State version check (optimistic locking) ──
  if (stateVersion !== undefined) {
    const user = await getUser(userId);
    if (user && user.stateVersion !== stateVersion) {
      return NextResponse.json(
        {
          error: "State version mismatch",
          currentVersion: user.stateVersion
        },
        { status: 409 }
      );
    }
  }

  // ── Session ID validation (soft check with logging) ──
  if (sessionId) {
    const user = await getUser(userId);
    if (user && user.sessionId && user.sessionId !== sessionId) {
      console.warn(`[SessionMismatch] userId=${userId} expected=${user.sessionId} received=${sessionId}`);
    }
  }

  // ── Process answer through adaptive engine ──
  const response = await processAnswer(userId, questionId, selectedIndex);

  // ── Fetch leaderboard ranks ──
  const leaderboardRankScore = await getUserScoreRank(userId);
  const leaderboardRankStreak = await getUserStreakRank(userId);

  // ── Record idempotency ──
  await recordIdempotency(idempotencyKey, response);

  return NextResponse.json(
    { 
      ...response, 
      idempotent: false,
      leaderboardRankScore,
      leaderboardRankStreak,
      sessionId: sessionId || null,
    },
    {
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    }
  );
}
