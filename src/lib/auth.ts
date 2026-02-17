// ─── BrainBolt Simple Authentication ────────────────────────────────────────
// Username-based auth with session tokens stored in Redis (for API routes)

import redis from './redis';

export interface Session {
  userId: string;
  username: string;
  token: string;
  createdAt: number;
}

const SESSION_TTL = 86400; // 24 hours in seconds
const USERNAME_REGEX = /^[a-zA-Z0-9_]{1,20}$/;

// In-memory fallback
const sessions = new Map<string, Session>();
const userProfiles = new Map<string, {userId: string, username: string}>();
let redisAvailable = true;

// Initialize availability from client status and update on runtime events
// (client auto-connects in `src/lib/redis.ts`; avoid calling `connect()` here)
redisAvailable = redis.status === 'ready';

redis.on('ready', () => {
  redisAvailable = true;
});

redis.on('end', () => {
  redisAvailable = false;
});

/**
 * Generate a new session token
 */
function generateToken(): string {
  return crypto.randomUUID();
}

/**
 * Validate username format
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || username.trim().length === 0) {
    return { valid: false, error: 'Username cannot be empty' };
  }

  if (username.length < 1 || username.length > 20) {
    return { valid: false, error: 'Username must be 1-20 characters' };
  }

  if (!USERNAME_REGEX.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  return { valid: true };
}

/**
 * Create a new session for a username
 */
export async function createSession(username: string): Promise<Session> {
  const userId = crypto.randomUUID();
  const token = generateToken();
  const session: Session = {
    userId,
    username,
    token,
    createdAt: Date.now(),
  };

  try {
    if (redisAvailable) {
      await redis.setex(`session:${token}`, SESSION_TTL, JSON.stringify(session));
      await redis.setex(`user:profile:${userId}`, SESSION_TTL, JSON.stringify({ userId, username }));
      return session;
    }
  } catch (err) {
    console.error('Redis error in createSession, falling back to memory:', err);
    redisAvailable = false;
  }

  // In-memory fallback
  sessions.set(token, session);
  userProfiles.set(userId, { userId, username });
  return session;
}

/**
 * Get session by token
 */export async function getSession(token: string): Promise<Session | null> {
  if (!token) return null;

  try {
    if (redisAvailable) {
      const data = await redis.get(`session:${token}`);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    }
  } catch (err) {
    console.error('Redis error in getSession, falling back to memory:', err);
    redisAvailable = false;
  }

  return sessions.get(token) || null;
}

/**
 * Get user profile by userId
 */
export async function getUserProfile(userId: string): Promise<{ userId: string; username: string } | null> {
  if (!userId) return null;

  try {
    if (redisAvailable) {
      const data = await redis.get(`user:profile:${userId}`);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    }
  } catch (err) {
    console.error('Redis error in getUserProfile, falling back to memory:', err);
    redisAvailable = false;
  }

  return userProfiles.get(userId) || null;
}

/**
 * Verify auth token from header
 */
export async function verifyAuth(authHeader: string | null): Promise<{ userId: string; username: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const session = await getSession(token);

  if (!session) {
    return null;
  }

  return { userId: session.userId, username: session.username };
}
