// POST /api/quiz/answer
// Process an answer submission with idempotency enforcement. Rate-limited.

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { checkIdempotency, recordIdempotency } from "@/lib/store";
import { processAnswer } from "@/lib/adaptive";
import { getQuestionById } from "@/lib/questions";

interface AnswerRequestBody {
  userId?: string;
  questionId?: string;
  selectedIndex?: number;
  idempotencyKey?: string;
}

export async function POST(request: NextRequest) {
  let body: AnswerRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { userId, questionId, selectedIndex, idempotencyKey } = body;

  // ── Validate required fields ──
  if (!userId || !questionId || selectedIndex === undefined || !idempotencyKey) {
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
  const cached = checkIdempotency(idempotencyKey);
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

  // ── Process answer through adaptive engine ──
  const response = processAnswer(userId, questionId, selectedIndex);

  // ── Record idempotency ──
  recordIdempotency(idempotencyKey, response);

  return NextResponse.json(
    { ...response, idempotent: false },
    {
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    }
  );
}
