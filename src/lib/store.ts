// ─── BrainBolt In-Memory Store ──────────────────────────────────────────────
// Fully typed singleton store using Maps. All state lives here.
// Designed for easy swap to Redis (see LLD § 5).

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserState {
  userId: string;
  difficulty: number;       // 1–10, starts at 1
  streak: number;           // current consecutive correct, resets to 0 on wrong
  maxStreak: number;        // all-time best streak
  totalScore: number;       // cumulative score
  confidence: number;       // 0–10, starts at 5 (hysteresis control)
  lastQuestionId: string | null;
  answeredIds: Set<string>; // questions already seen (avoid repeats)
  recentResults: boolean[]; // rolling last 10 results for accuracy_factor
  createdAt: number;        // Date.now() timestamp
}

export interface AnswerResponse {
  correct: boolean;
  correctIndex: number;
  scoreDelta: number;
  userState: PublicUserState;
}

export interface PublicUserState {
  difficulty: number;
  streak: number;
  maxStreak: number;
  totalScore: number;
  confidence: number;
}

export interface ScoreLeaderboardEntry {
  userId: string;
  totalScore: number;
  difficulty: number;
  streak: number;
}

export interface StreakLeaderboardEntry {
  userId: string;
  maxStreak: number;
  totalScore: number;
  difficulty: number;
}

export interface IdempotencyEntry {
  response: AnswerResponse;
  timestamp: number; // Date.now() when created
}

// ─── Constants ──────────────────────────────────────────────────────────────

const RECENT_RESULTS_MAX_LENGTH = 10;
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Store (module-level singletons) ────────────────────────────────────────

const users = new Map<string, UserState>();
const idempotencyKeys = new Map<string, IdempotencyEntry>();

// ─── User Helpers ───────────────────────────────────────────────────────────

/**
 * Returns the UserState for the given userId.
 * If the user doesn't exist, creates a new one with default state.
 */
export function getOrCreateUser(userId: string): UserState {
  const existing = users.get(userId);
  if (existing) return existing;

  const newUser: UserState = {
    userId,
    difficulty: 1,
    streak: 0,
    maxStreak: 0,
    totalScore: 0,
    confidence: 5,
    lastQuestionId: null,
    answeredIds: new Set<string>(),
    recentResults: [],
    createdAt: Date.now(),
  };

  users.set(userId, newUser);
  return newUser;
}

/**
 * Get a user without creating. Returns undefined if not found.
 */
export function getUser(userId: string): UserState | undefined {
  return users.get(userId);
}

/**
 * Persist an updated UserState back into the store.
 */
export function updateUser(user: UserState): void {
  users.set(user.userId, user);
}

/**
 * Push a result onto the rolling recentResults window.
 * Enforces max length of 10 by shifting oldest entries.
 */
export function pushRecentResult(user: UserState, correct: boolean): void {
  user.recentResults.push(correct);
  while (user.recentResults.length > RECENT_RESULTS_MAX_LENGTH) {
    user.recentResults.shift();
  }
}

/**
 * Mark a question as answered by the user.
 */
export function markQuestionAnswered(user: UserState, questionId: string): void {
  user.answeredIds.add(questionId);
  user.lastQuestionId = questionId;
}

/**
 * Clear the answered set (used when all questions at a difficulty are exhausted).
 */
export function clearAnsweredIds(user: UserState): void {
  user.answeredIds.clear();
}

/**
 * Extract the public-facing subset of user state (no internal tracking fields).
 */
export function toPublicUserState(user: UserState): PublicUserState {
  return {
    difficulty: user.difficulty,
    streak: user.streak,
    maxStreak: user.maxStreak,
    totalScore: user.totalScore,
    confidence: user.confidence,
  };
}

// ─── Leaderboard ────────────────────────────────────────────────────────────

/**
 * Top N users sorted by totalScore (descending).
 */
export function getScoreLeaderboard(limit: number = 10): ScoreLeaderboardEntry[] {
  return [...users.values()]
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit)
    .map((u) => ({
      userId: u.userId,
      totalScore: u.totalScore,
      difficulty: u.difficulty,
      streak: u.streak,
    }));
}

/**
 * Top N users sorted by maxStreak (descending).
 */
export function getStreakLeaderboard(limit: number = 10): StreakLeaderboardEntry[] {
  return [...users.values()]
    .sort((a, b) => b.maxStreak - a.maxStreak)
    .slice(0, limit)
    .map((u) => ({
      userId: u.userId,
      maxStreak: u.maxStreak,
      totalScore: u.totalScore,
      difficulty: u.difficulty,
    }));
}

/**
 * Get user's rank in the leaderboard
 * Returns the 1-based rank (1 = first place)
 */
export function getUserRank(userId: string, type: 'score' | 'streak'): number {
  const allUsers = [...users.values()];

  if (type === 'score') {
    const sorted = allUsers.sort((a, b) => b.totalScore - a.totalScore);
    const index = sorted.findIndex(u => u.userId === userId);
    return index === -1 ? -1 : index + 1;
  } else {
    const sorted = allUsers.sort((a, b) => b.maxStreak - a.maxStreak);
    const index = sorted.findIndex(u => u.userId === userId);
    return index === -1 ? -1 : index + 1;
  }
}

// ─── Idempotency ────────────────────────────────────────────────────────────

/**
 * Check if an idempotency key has already been processed.
 * Returns the cached AnswerResponse if found (and not expired), else null.
 */
export function checkIdempotency(key: string): AnswerResponse | null {
  const entry = idempotencyKeys.get(key);
  if (!entry) return null;

  // Expired — treat as if it doesn't exist
  if (Date.now() - entry.timestamp > IDEMPOTENCY_TTL_MS) {
    idempotencyKeys.delete(key);
    return null;
  }

  return entry.response;
}

/**
 * Record a processed idempotency key with its response.
 * Also performs lazy cleanup of expired entries.
 */
export function recordIdempotency(key: string, response: AnswerResponse): void {
  idempotencyKeys.set(key, { response, timestamp: Date.now() });
  cleanupExpiredIdempotencyKeys();
}

/**
 * Lazy cleanup: remove all idempotency entries older than the TTL.
 */
function cleanupExpiredIdempotencyKeys(): void {
  const now = Date.now();
  for (const [k, v] of idempotencyKeys) {
    if (now - v.timestamp > IDEMPOTENCY_TTL_MS) {
      idempotencyKeys.delete(k);
    }
  }
}

// ─── Store Reset (for testing) ──────────────────────────────────────────────

/**
 * Clears all data from the store. Used for testing only.
 */
export function resetStore(): void {
  users.clear();
  idempotencyKeys.clear();
}
