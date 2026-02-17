// ─── BrainBolt Store with Redis (+ In-Memory Fallback) ─────────────────────
// Redis-first store with graceful in-memory fallback if Redis is unavailable.
// All operations are async.

import redis from './redis';
import { Question } from './questions';

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
  stateVersion: number;     // incremented on every answer, for optimistic locking
  lastAnswerAt: number;     // last answer timestamp for inactivity detection
  sessionId?: string;       // optional session identifier
}

export interface AnswerResponse {
  correct: boolean;
  correctIndex: number;
  scoreDelta: number;
  userState: PublicUserState;
  stateVersion: number;
  irtData?: {
    scoreDelta: number;
    newTheta: number;
    thetaDelta: number;
    irtProbability: number;
    eloExpected: number;
    streakMultiplier: number;
    accuracyFactor: number;
    breakdown: Record<string, number>;
  };
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

export interface AnswerLog {
  id: string;
  userId: string;
  questionId: string;
  difficulty: number;
  answer: number;        // selectedIndex
  correct: boolean;
  scoreDelta: number;
  streakAtAnswer: number;
  answeredAt: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const RECENT_RESULTS_MAX_LENGTH = 10;
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes
const USER_STATE_TTL = 86400; // 24 hours
const QUESTIONS_CACHE_TTL = 3600; // 1 hour
const IDEMPOTENCY_TTL = 300; // 5 minutes

// ─── In-Memory Fallback Store ───────────────────────────────────────────────

const users = new Map<string, UserState>();
const idempotencyKeys = new Map<string, IdempotencyEntry>();
let redisAvailable = true;

// Initialize availability from client status and update on runtime events
// (the Redis client is created/auto-connected in `src/lib/redis.ts`; avoid calling `connect()` again)
redisAvailable = redis.status === 'ready';

redis.on('ready', () => {
  redisAvailable = true;
});

redis.on('end', () => {
  console.warn('Redis connection closed — switching to in-memory fallback');
  redisAvailable = false;
});

// ─── User Helpers ───────────────────────────────────────────────────────────

/**
 * Returns the UserState for the given userId.
 * If the user doesn't exist, creates a new one with default state.
 */
export async function getOrCreateUser(userId: string): Promise<UserState> {
  try {
    if (redisAvailable) {
      const key = `user:state:${userId}`;
      const data = await redis.get(key);

      if (data) {
        const parsed = JSON.parse(data);
        // Convert answeredIds array back to Set
        parsed.answeredIds = new Set(parsed.answeredIds || []);
        return parsed;
      }

      // Create new user
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
        stateVersion: 0,
        lastAnswerAt: Date.now(),
      };

      // Save to Redis
      await saveUser(newUser);
      return newUser;
    }
  } catch (err) {
    console.error('Redis error in getOrCreateUser, falling back to memory:', err);
    redisAvailable = false;
  }

  // In-memory fallback
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
    stateVersion: 0,
    lastAnswerAt: Date.now(),
  };

  users.set(userId, newUser);
  return newUser;
}

/**
 * Get a user without creating. Returns undefined if not found.
 */
export async function getUser(userId: string): Promise<UserState | undefined> {
  try {
    if (redisAvailable) {
      const key = `user:state:${userId}`;
      const data = await redis.get(key);

      if (data) {
        const parsed = JSON.parse(data);
        parsed.answeredIds = new Set(parsed.answeredIds || []);
        return parsed;
      }
      return undefined;
    }
  } catch (err) {
    console.error('Redis error in getUser, falling back to memory:', err);
    redisAvailable = false;
  }

  return users.get(userId);
}

/**
 * Persist an updated UserState back into the store.
 */
export async function saveUser(user: UserState): Promise<void> {
  try {
    if (redisAvailable) {
      const key = `user:state:${user.userId}`;
      // Convert Set to array for JSON serialization
      const toSave = {
        ...user,
        answeredIds: Array.from(user.answeredIds),
      };
      await redis.setex(key, USER_STATE_TTL, JSON.stringify(toSave));

      // Update leaderboards
      await redis.zadd('leaderboard:score', user.totalScore, user.userId);
      await redis.zadd('leaderboard:streak', user.maxStreak, user.userId);
      return;
    }
  } catch (err) {
    console.error('Redis error in saveUser, falling back to memory:', err);
    redisAvailable = false;
  }

  // In-memory fallback
  users.set(user.userId, user);
}

/**
 * Persist an updated UserState back into the store (alias for backwards compatibility).
 */
export async function updateUser(user: UserState): Promise<void> {
  return saveUser(user);
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

// ─── Question Caching ───────────────────────────────────────────────────────

/**
 * Get questions by difficulty from cache or source
 */
export async function getQuestionsByDifficulty(difficulty: number, allQuestions: Question[]): Promise<Question[]> {
  try {
    if (redisAvailable) {
      const key = `questions:difficulty:${difficulty}`;
      const cached = await redis.get(key);

      if (cached) {
        return JSON.parse(cached);
      }

      // Filter from source
      const filtered = allQuestions.filter(q => q.difficulty === difficulty);

      // Cache for 1 hour
      await redis.setex(key, QUESTIONS_CACHE_TTL, JSON.stringify(filtered));
      return filtered;
    }
  } catch (err) {
    console.error('Redis error in getQuestionsByDifficulty:', err);
  }

  // Fallback: just filter
  return allQuestions.filter(q => q.difficulty === difficulty);
}

// ─── Leaderboard ────────────────────────────────────────────────────────────

/**
 * Top N users sorted by totalScore (descending).
 */
export async function getScoreLeaderboard(limit: number = 10): Promise<ScoreLeaderboardEntry[]> {
  try {
    if (redisAvailable) {
      // Get top N userIds from sorted set
      const results = await redis.zrevrange('leaderboard:score', 0, limit - 1, 'WITHSCORES');

      const leaderboard: ScoreLeaderboardEntry[] = [];
      for (let i = 0; i < results.length; i += 2) {
        const userId = results[i];
        const totalScore = parseFloat(results[i + 1]);

        // Fetch user state to get other fields
        const user = await getUser(userId);
        if (user) {
          leaderboard.push({
            userId: user.userId,
            totalScore: user.totalScore,
            difficulty: user.difficulty,
            streak: user.streak,
          });
        }
      }

      return leaderboard;
    }
  } catch (err) {
    console.error('Redis error in getScoreLeaderboard, falling back to memory:', err);
    redisAvailable = false;
  }

  // In-memory fallback
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
export async function getStreakLeaderboard(limit: number = 10): Promise<StreakLeaderboardEntry[]> {
  try {
    if (redisAvailable) {
      // Get top N userIds from sorted set
      const results = await redis.zrevrange('leaderboard:streak', 0, limit - 1, 'WITHSCORES');

      const leaderboard: StreakLeaderboardEntry[] = [];
      for (let i = 0; i < results.length; i += 2) {
        const userId = results[i];
        const maxStreak = parseFloat(results[i + 1]);

        // Fetch user state to get other fields
        const user = await getUser(userId);
        if (user) {
          leaderboard.push({
            userId: user.userId,
            maxStreak: user.maxStreak,
            totalScore: user.totalScore,
            difficulty: user.difficulty,
          });
        }
      }

      return leaderboard;
    }
  } catch (err) {
    console.error('Redis error in getStreakLeaderboard, falling back to memory:', err);
    redisAvailable = false;
  }

  // In-memory fallback
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
export async function getUserRank(userId: string, type: 'score' | 'streak'): Promise<number> {
  try {
    if (redisAvailable) {
      const key = type === 'score' ? 'leaderboard:score' : 'leaderboard:streak';
      const rank = await redis.zrevrank(key, userId);

      // zrevrank returns 0-based index, or null if not found
      return rank !== null ? rank + 1 : -1;
    }
  } catch (err) {
    console.error('Redis error in getUserRank, falling back to memory:', err);
    redisAvailable = false;
  }

  // In-memory fallback
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

/**
 * Get user's rank by total score (1-indexed, lower is better)
 */
export async function getUserScoreRank(userId: string): Promise<number> {
  try {
    const rank = await redis.zrevrank('leaderboard:score', userId);
    return rank !== null ? rank + 1 : -1;
  } catch {
    // fallback: sort in-memory
    const allUsers = [...users.values()];
    const sorted = allUsers.sort((a, b) => b.totalScore - a.totalScore);
    const idx = sorted.findIndex(u => u.userId === userId);
    return idx !== -1 ? idx + 1 : -1;
  }
}

/**
 * Get user's rank by max streak (1-indexed)
 */
export async function getUserStreakRank(userId: string): Promise<number> {
  try {
    const rank = await redis.zrevrank('leaderboard:streak', userId);
    return rank !== null ? rank + 1 : -1;
  } catch {
    const allUsers = [...users.values()];
    const sorted = allUsers.sort((a, b) => b.maxStreak - a.maxStreak);
    const idx = sorted.findIndex(u => u.userId === userId);
    return idx !== -1 ? idx + 1 : -1;
  }
}

// ─── Idempotency ────────────────────────────────────────────────────────────

/**
 * Check if an idempotency key has already been processed.
 * Returns the cached AnswerResponse if found (and not expired), else null.
 */
export async function checkIdempotency(key: string): Promise<AnswerResponse | null> {
  try {
    if (redisAvailable) {
      const redisKey = `idempotency:${key}`;
      const data = await redis.get(redisKey);

      if (data) {
        return JSON.parse(data);
      }
      return null;
    }
  } catch (err) {
    console.error('Redis error in checkIdempotency, falling back to memory:', err);
    redisAvailable = false;
  }

  // In-memory fallback
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
 */
export async function recordIdempotency(key: string, response: AnswerResponse): Promise<void> {
  try {
    if (redisAvailable) {
      const redisKey = `idempotency:${key}`;
      await redis.setex(redisKey, IDEMPOTENCY_TTL, JSON.stringify(response));
      return;
    }
  } catch (err) {
    console.error('Redis error in recordIdempotency, falling back to memory:', err);
    redisAvailable = false;
  }

  // In-memory fallback
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

// ─── Answer Log ─────────────────────────────────────────────────────────────

/**
 * Log an answer to Redis (or in-memory)
 */
export async function logAnswer(log: AnswerLog): Promise<void> {
  try {
    if (redisAvailable) {
      const key = `answers:${log.userId}`;

      // Add to list
      await redis.lpush(key, JSON.stringify(log));

      // Keep only last 100
      await redis.ltrim(key, 0, 99);

      // Set expiry
      await redis.expire(key, USER_STATE_TTL);
      return;
    }
  } catch (err) {
    console.error('Redis error in logAnswer:', err);
  }

  // In-memory fallback: skip logging (not critical for demo)
}

/**
 * Get recent answer logs for a user
 */
export async function getAnswerLogs(userId: string, limit: number = 100): Promise<AnswerLog[]> {
  try {
    if (redisAvailable) {
      const key = `answers:${userId}`;
      const logs = await redis.lrange(key, 0, limit - 1);
      return logs.map(log => JSON.parse(log));
    }
  } catch (err) {
    console.error('Redis error in getAnswerLogs:', err);
  }

  return [];
}

// ─── Store Reset (for testing) ──────────────────────────────────────────────

/**
 * Clears all data from the store. Used for testing only.
 */
export async function resetStore(): Promise<void> {
  users.clear();
  idempotencyKeys.clear();

  try {
    if (redisAvailable) {
      await redis.flushdb();
    }
  } catch (err) {
    console.error('Redis error in resetStore:', err);
  }
}
