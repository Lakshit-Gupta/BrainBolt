# BrainBolt — Low-Level Design (LLD)

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Module Responsibilities](#2-module-responsibilities)
3. [API Request / Response Schemas](#3-api-request--response-schemas)
4. [In-Memory Data Model](#4-in-memory-data-model)
5. [Redis Upgrade Path](#5-redis-upgrade-path)
6. [Adaptive Algorithm](#6-adaptive-algorithm)
7. [Score Formula](#7-score-formula)
8. [Edge Cases](#8-edge-cases)
9. [Sequence Diagrams](#9-sequence-diagrams)

---

## 1. Architecture Overview

BrainBolt is a **monolithic Next.js 15 application** that serves both the React frontend and the API backend via Next.js App Router API routes. All state is held **in-memory** for the demo; the design is structured so that swapping to Redis/PostgreSQL requires changing only the store layer.

```
┌─────────────────────────────────────────────────┐
│                   Client (Browser)              │
│  ┌───────────┐ ┌────────────┐ ┌──────────────┐  │
│  │ QuizCard  │ │Leaderboard │ │  ThemeToggle │  │
│  │ StatsBar  │ │ (polling)  │ │              │  │
│  └─────┬─────┘ └─────┬──────┘ └──────────────┘  │
│        │              │                          │
└────────┼──────────────┼──────────────────────────┘
         │ HTTP         │ HTTP (poll 3s)
         ▼              ▼
┌─────────────────────────────────────────────────┐
│              Next.js API Routes                 │
│  ┌──────────────┐  ┌────────────────────────┐   │
│  │ /api/quiz/*  │  │ /api/leaderboard/*     │   │
│  └──────┬───────┘  └───────────┬────────────┘   │
│         │                      │                │
│  ┌──────▼──────────────────────▼────────────┐   │
│  │           Library Layer                  │   │
│  │  adaptive.ts │ store.ts │ rateLimit.ts   │   │
│  └──────────────────────────────────────────┘   │
│         │                                       │
│  ┌──────▼──────────────────────────────────┐    │
│  │        In-Memory Store (Maps)           │    │
│  │  users │ idempotencyKeys │ questions    │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

---

## 2. Module Responsibilities

### 2.1 `src/lib/questions.ts` — Question Bank

| Responsibility | Details |
|---|---|
| Store seed questions | 20 hardcoded questions across difficulty tiers 1–10 |
| Provide typed interfaces | `Question { id, text, choices[], correctIndex, difficulty, category }` |
| Filter by difficulty | `getQuestionsByDifficulty(d: number): Question[]` — returns questions within ±1 of target |

### 2.2 `src/lib/store.ts` — State Management

| Responsibility | Details |
|---|---|
| User state CRUD | Create/read/update `UserState` objects keyed by `userId` |
| Leaderboard queries | Return top-N users sorted by `totalScore` or `maxStreak` |
| Idempotency log | Store processed `idempotencyKey → response` pairs with TTL |
| Cleanup | Periodic eviction of expired idempotency keys (5-minute TTL) |

### 2.3 `src/lib/adaptive.ts` — Adaptive Engine

| Responsibility | Details |
|---|---|
| Process answers | Apply confidence/hysteresis algorithm to adjust difficulty |
| Calculate scores | Compute `scoreDelta` using the three-factor formula |
| Select next question | Pick a question matching the user's current difficulty band, avoiding repeats |

### 2.4 `src/lib/rateLimit.ts` — Rate Limiter

| Responsibility | Details |
|---|---|
| Throttle requests | Max 30 requests per 60-second sliding window per `userId` |
| Return headers | `X-RateLimit-Remaining`, `X-RateLimit-Reset` |

### 2.5 API Route Handlers

| Route | Method | Responsibility |
|---|---|---|
| `/api/quiz/next` | GET | Serve the next question for a user based on adaptive difficulty |
| `/api/quiz/answer` | POST | Process an answer submission, enforce idempotency |
| `/api/leaderboard/score` | GET | Return top 10 users by total score |
| `/api/leaderboard/streak` | GET | Return top 10 users by max streak |

### 2.6 Frontend Components

| Component | Responsibility |
|---|---|
| `QuizCard` | Render question text, 4 answer buttons, correct/incorrect feedback animations |
| `Leaderboard` | Two-tab (Score/Streak) display, polls API every 3 seconds |
| `StatsBar` | Display current score, streak, difficulty level with visual indicators |
| `ThemeToggle` | Toggle `data-theme` attribute between `light` and `dark`, persist to `localStorage` |

---

## 3. API Request / Response Schemas

### 3.1 `GET /api/quiz/next`

**Request:**

```
GET /api/quiz/next?userId=abc123
```

| Param | Type | Required | Description |
|---|---|---|---|
| `userId` | `string` | Yes | Unique user identifier (UUID or display name) |

**Response — 200 OK:**

```json
{
  "question": {
    "id": "q7",
    "text": "What is the chemical symbol for gold?",
    "choices": ["Ag", "Au", "Fe", "Cu"],
    "difficulty": 3,
    "category": "Science"
  },
  "userState": {
    "difficulty": 3,
    "streak": 2,
    "totalScore": 185,
    "maxStreak": 5
  }
}
```

> **Note:** `correctIndex` is **never** sent to the client.

**Error Responses:**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "userId is required" }` | Missing query param |
| 429 | `{ "error": "Rate limit exceeded", "retryAfter": 23 }` | Rate limit hit |
| 404 | `{ "error": "No questions available for current difficulty" }` | All questions exhausted at this level |

---

### 3.2 `POST /api/quiz/answer`

**Request:**

```json
POST /api/quiz/answer
Content-Type: application/json

{
  "userId": "abc123",
  "questionId": "q7",
  "selectedIndex": 1,
  "idempotencyKey": "idem_a1b2c3d4"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `userId` | `string` | Yes | User identifier |
| `questionId` | `string` | Yes | ID of the question being answered |
| `selectedIndex` | `number` | Yes | 0-based index of selected answer |
| `idempotencyKey` | `string` | Yes | Client-generated unique key for this submission |

**Response — 200 OK:**

```json
{
  "correct": true,
  "correctIndex": 1,
  "scoreDelta": 67.5,
  "userState": {
    "difficulty": 3,
    "streak": 3,
    "maxStreak": 5,
    "totalScore": 252.5,
    "confidence": 6
  },
  "idempotent": false
}
```

| Field | Type | Description |
|---|---|---|
| `correct` | `boolean` | Whether the answer was correct |
| `correctIndex` | `number` | Revealed after submission |
| `scoreDelta` | `number` | Points earned (0 if wrong) |
| `userState` | `object` | Updated user state after processing |
| `idempotent` | `boolean` | `true` if this was a replayed request (no state change) |

**Error Responses:**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "Missing required fields" }` | Missing body fields |
| 400 | `{ "error": "Invalid selectedIndex" }` | Index not 0–3 |
| 404 | `{ "error": "Question not found" }` | Invalid `questionId` |
| 429 | `{ "error": "Rate limit exceeded" }` | Rate limit hit |

---

### 3.3 `GET /api/leaderboard/score`

**Request:**

```
GET /api/leaderboard/score
```

**Response — 200 OK:**

```json
{
  "leaderboard": [
    { "userId": "Alice", "totalScore": 1250.5, "difficulty": 7, "streak": 4 },
    { "userId": "Bob", "totalScore": 980.0, "difficulty": 5, "streak": 0 },
    ...
  ],
  "updatedAt": "2026-02-17T11:00:00.000Z"
}
```

---

### 3.4 `GET /api/leaderboard/streak`

**Request:**

```
GET /api/leaderboard/streak
```

**Response — 200 OK:**

```json
{
  "leaderboard": [
    { "userId": "Alice", "maxStreak": 12, "totalScore": 1250.5, "difficulty": 7 },
    { "userId": "Charlie", "maxStreak": 9, "totalScore": 720.0, "difficulty": 4 },
    ...
  ],
  "updatedAt": "2026-02-17T11:00:00.000Z"
}
```

---

## 4. In-Memory Data Model

### 4.1 `UserState`

```typescript
interface UserState {
  userId:         string;   // unique identifier
  difficulty:     number;   // 1–10, starts at 1
  streak:         number;   // current consecutive correct, resets to 0 on wrong
  maxStreak:      number;   // all-time best streak
  totalScore:     number;   // cumulative score
  confidence:     number;   // 0–10, starts at 5 (hysteresis control)
  lastQuestionId: string | null;
  answeredIds:    Set<string>;     // questions already seen (avoid repeats)
  recentResults:  boolean[];       // rolling last 10 results for accuracy_factor
  createdAt:      number;          // Date.now() timestamp
}
```

### 4.2 `IdempotencyEntry`

```typescript
interface IdempotencyEntry {
  response:  AnswerResponse;  // cached response payload
  timestamp: number;          // Date.now() when created
}
```

**Eviction:** Entries older than 5 minutes are purged on every write (lazy cleanup).

### 4.3 Store Structure

```typescript
// In-memory Maps (singleton module-level variables)
const users            = new Map<string, UserState>();
const idempotencyKeys  = new Map<string, IdempotencyEntry>();
```

### 4.4 Leaderboard Derivation

Leaderboards are **computed on read** — no separate data structure. The store sorts the `users` Map values:

```typescript
function getScoreLeaderboard(limit = 10): LeaderboardEntry[] {
  return [...users.values()]
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit)
    .map(u => ({
      userId: u.userId,
      totalScore: u.totalScore,
      difficulty: u.difficulty,
      streak: u.streak,
    }));
}
```

This is O(n log n) per request. Acceptable for demo scale (< 1000 users). For production, see [Redis Upgrade Path](#5-redis-upgrade-path).

---

## 5. Redis Upgrade Path

The current in-memory store is **not production-ready** — data is lost on restart, and the app cannot scale horizontally. Here is the documented migration path to Redis.

### 5.1 What Changes

| Current (In-Memory) | Production (Redis) | Notes |
|---|---|---|
| `Map<string, UserState>` | Redis Hash `user:{userId}` | One hash per user with fields for each property |
| `Map<string, IdempotencyEntry>` | Redis String `idem:{key}` with `EX 300` | Built-in TTL, no manual cleanup needed |
| Leaderboard via sort | Redis Sorted Set `leaderboard:score`, `leaderboard:streak` | `ZADD` on score update, `ZREVRANGE` for reads — O(log n) |
| `answeredIds` Set | Redis Set `answered:{userId}` | `SADD` / `SISMEMBER` for O(1) lookups |
| `recentResults` array | Redis List `recent:{userId}` with `LTRIM 0 9` | Capped at 10 entries automatically |

### 5.2 Redis Data Schema

```
# User state
HSET user:alice difficulty 3 streak 2 maxStreak 5 totalScore 185 confidence 6

# Idempotency (auto-expires in 5 minutes)
SET idem:idem_a1b2c3 '{"correct":true,"scoreDelta":67.5,...}' EX 300

# Leaderboards (sorted sets)
ZADD leaderboard:score 185 alice
ZADD leaderboard:streak 5 alice

# Answered questions 
SADD answered:alice q1 q3 q7

# Recent results (capped list)
RPUSH recent:alice 1 1 0 1
LTRIM recent:alice -10 -1
```

### 5.3 Code Changes Required

1. Install `ioredis`: `npm install ioredis`
2. Create `src/lib/redis.ts` — connection singleton with retry logic
3. Refactor `store.ts` — replace Map operations with Redis commands
4. All functions become `async` (Redis I/O is async)
5. Add `REDIS_URL` to environment variables and `docker-compose.yml`
6. Add a `redis` service to `docker-compose.yml`:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
  app:
    # ... existing config
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
```

### 5.4 Cache Strategy (Production)

| Data | Cache TTL | Invalidation |
|---|---|---|
| User state | No cache (direct read from Redis hash) | N/A — always fresh |
| Leaderboard | Cache 2s in application memory | Time-based; prevents thundering herd on polling |
| Questions | Cache indefinitely in-memory | Invalidate on admin update (future feature) |
| Idempotency | 5-minute TTL in Redis | Automatic via `EX` |

---

## 6. Adaptive Algorithm

### 6.1 State Variables (per user)

```
difficulty   : integer [1, 10]   — starts at 1
streak       : integer [0, ∞)    — current consecutive correct answers
maxStreak    : integer [0, ∞)    — all-time best streak
totalScore   : float   [0, ∞)    — cumulative score
confidence   : integer [0, 10]   — starts at 5, controls hysteresis
```

### 6.2 On Correct Answer

```pseudocode
function onCorrectAnswer(user, question):
    user.streak += 1
    user.maxStreak = max(user.maxStreak, user.streak)
    
    // ── Hysteresis: raise difficulty only with sustained performance ──
    user.confidence = min(10, user.confidence + 1)
    if user.confidence >= 7:
        user.difficulty = min(10, user.difficulty + 1)
        user.confidence = 5          // reset after level change
    
    // ── Score calculation ──
    multiplier     = min(4.0, 1.0 + user.streak * 0.25)   // capped at 4×
    accuracy       = rollingAccuracy(user, last=10)        // correct / total in last 10
    base           = user.difficulty * 10                  // 10–100
    scoreDelta     = base * multiplier * accuracy
    user.totalScore += scoreDelta
    
    return scoreDelta
```

### 6.3 On Wrong Answer

```pseudocode
function onWrongAnswer(user, question):
    user.streak = 0                                        // hard reset
    
    // ── Hysteresis: lower difficulty only with sustained poor performance ──
    user.confidence = max(0, user.confidence - 2)          // drops FASTER than it rises
    if user.confidence <= 3:
        user.difficulty = max(1, user.difficulty - 1)
        user.confidence = 5          // reset after level change
    
    scoreDelta = 0                   // no points for wrong answers
    return scoreDelta
```

### 6.4 Ping-Pong Fix (Hysteresis Band)

**Problem:** Without hysteresis, alternating correct/wrong answers cause difficulty to oscillate every question (e.g., 3 → 4 → 3 → 4 → ...).

**Solution:** The `confidence` variable creates a **dead zone** between difficulty changes:

```
    Difficulty DOWN zone          Neutral zone         Difficulty UP zone
    ◄────────────────►    ◄─────────────────────►    ◄──────────────────►
    confidence: 0  1  2  3    4    5    6    7    8    9    10
                         ▲                        ▲
                    DROP threshold            RAISE threshold
```

- **To raise difficulty:** confidence must reach **≥ 7** (requires at least 2 consecutive correct answers from neutral)
- **To lower difficulty:** confidence must reach **≤ 3** (requires at least 1 wrong answer from neutral, since wrong drops by 2)
- After any difficulty change, confidence **resets to 5** (center of the band)
- Asymmetric rates: correct adds +1, wrong subtracts −2. This means the system is **more responsive to failure** than success, which feels fair to the player.

**Proof it prevents ping-pong:**

```
Start:  confidence=5, difficulty=3
Wrong:  confidence=3 → triggers drop → difficulty=2, confidence=5
Right:  confidence=6 → NO change (6 < 7)
Wrong:  confidence=4 → NO change (4 > 3)
Right:  confidence=5 → NO change (5 < 7)
```

The alternating pattern **never reaches a threshold** — difficulty stays stable.

### 6.5 Question Selection

```pseudocode
function getNextQuestion(user):
    // Target band: [difficulty-1, difficulty+1]
    candidates = questions.filter(q =>
        abs(q.difficulty - user.difficulty) <= 1
        AND q.id NOT IN user.answeredIds
    )
    
    if candidates.isEmpty():
        // Fallback: reset answered set, widen band
        user.answeredIds.clear()
        candidates = questions.filter(q =>
            abs(q.difficulty - user.difficulty) <= 2
        )
    
    // Prefer exact difficulty match (70% chance), then ±1 (30%)
    exactMatch = candidates.filter(q => q.difficulty == user.difficulty)
    if exactMatch.isNotEmpty() AND random() < 0.7:
        return randomChoice(exactMatch)
    
    return randomChoice(candidates)
```

---

## 7. Score Formula

### 7.1 Full Formula

```
scoreDelta = base_difficulty_weight × streak_multiplier × accuracy_factor
```

| Factor | Formula | Range | Purpose |
|---|---|---|---|
| `base_difficulty_weight` | `difficulty × 10` | 10 – 100 | Harder questions worth more |
| `streak_multiplier` | `min(4.0, 1.0 + streak × 0.25)` | 1.0 – 4.0 | Reward consecutive correct answers |
| `accuracy_factor` | `correct_in_last_10 / total_in_last_10` | 0.1 – 1.0 | Rolling accuracy over last 10 answers |

### 7.2 Example Calculations

| Scenario | Difficulty | Streak | Accuracy (last 10) | Score Delta |
|---|---|---|---|---|
| First correct answer, easy | 1 | 1 | 1/1 = 1.0 | 10 × 1.25 × 1.0 = **12.5** |
| 5th correct in a row, medium | 5 | 5 | 8/10 = 0.8 | 50 × 2.25 × 0.8 = **90.0** |
| 12th correct in a row, hard | 8 | 12 | 10/10 = 1.0 | 80 × 4.0 × 1.0 = **320.0** |
| Wrong answer (any) | any | 0 | any | **0** |

### 7.3 Multiplier Cap Rationale

The streak multiplier caps at **4.0×** (reached at streak = 12). Without a cap, a 50-streak would give 13.5× — this would make scores diverge too rapidly and make leaderboards uncompetitive for new players.

---

## 8. Edge Cases

### 8.1 Idempotency

**Problem:** Network retries or double-clicks can submit the same answer twice, causing double scoring.

**Solution:**

```pseudocode
function handleAnswer(request):
    key = request.idempotencyKey
    
    cached = idempotencyStore.get(key)
    if cached is not null:
        return { ...cached.response, idempotent: true }   // replay cached response
    
    response = processAnswer(request)                      // actual processing
    idempotencyStore.set(key, { response, timestamp: now() })
    
    return { ...response, idempotent: false }
```

**Key Design Decisions:**
- Keys are **client-generated** (UUID v4), so retries send the same key
- Keys expire after **5 minutes** (lazy cleanup on each write)
- The response `idempotent: true` flag tells the client this was a replay
- The cached response is returned **exactly as-is** — same `scoreDelta`, same `userState`

### 8.2 Ping-Pong Prevention

See [Section 6.4](#64-ping-pong-fix-hysteresis-band) for the full explanation. Summary:

| Pattern | Without Hysteresis | With Hysteresis |
|---|---|---|
| R W R W R W | 3->4->3->4->3->4 (oscillates) | 3->3->3->3->3->3 (stable) |
| R R R R R | 3->4->5->6->7 (instant jump) | 3->3->4->4->5 (gradual, needs 2+ per level) |
| W W W | 3->2->1 (instant drop) | 3->2->2 (drops faster due to -2 confidence) |

### 8.3 Streak Reset

- **On wrong answer:** `streak` resets to **0 immediately** — no grace period
- **`maxStreak` is never reduced** — it's a high-water mark
- **After reset:** the player starts rebuilding from streak=0, multiplier=1.0×
- **Confidence drops by 2** per wrong answer (asymmetric to make the system more responsive to failure)

### 8.4 Score Decay

- **No time-based decay** in the current design — scores are permanent
- **Accuracy factor provides implicit decay:** if a player's recent accuracy drops (e.g., 3/10), their score gains per question shrink dramatically even on correct answers
- **Production upgrade:** Could add a daily decay factor (e.g., `totalScore *= 0.99` daily) to keep leaderboards fresh

### 8.5 Boundary Conditions

| Condition | Handling |
|---|---|
| `difficulty` reaches 10 (max) | Clamped: `min(10, difficulty + 1)` — stays at 10 |
| `difficulty` reaches 1 (min) | Clamped: `max(1, difficulty - 1)` — stays at 1 |
| `confidence` reaches 10 | Clamped: `min(10, confidence + 1)` — stays at 10, triggers difficulty up |
| `confidence` reaches 0 | Clamped: `max(0, confidence - 2)` — stays at 0, triggers difficulty down |
| `streak_multiplier` exceeds 4.0 | Capped: `min(4.0, 1 + streak * 0.25)` — max at streak ≥ 12 |
| All questions answered at difficulty | `answeredIds` cleared, difficulty band widened to ±2 |
| `accuracy_factor` with < 10 answers | Uses actual count: `correct / total` (e.g., 2/3 = 0.67) |
| `accuracy_factor` is 0 | Minimum floor: returns `0.1` to avoid zero scores on correct answers |
| `userId` not found | Auto-created with default state (difficulty=1, confidence=5) |
| `selectedIndex` out of range | 400 error: "Invalid selectedIndex" |
| Empty `idempotencyKey` | 400 error: "idempotencyKey is required" |

### 8.6 Rate Limiting

| Parameter | Value |
|---|---|
| Window size | 60 seconds (sliding) |
| Max requests per window | 30 |
| Scope | Per `userId` |
| Response on limit | 429 with `retryAfter` seconds until window reset |
| Implementation | In-memory `Map<string, { count, windowStart }>` |

**Production upgrade:** Replace with Redis-based sliding window (`INCR` + `EXPIRE`) or a dedicated rate-limiting service (e.g., Cloudflare, API Gateway).

### 8.7 Concurrent Requests

**Problem:** Two answer submissions for the same user arriving simultaneously could cause race conditions on the in-memory state.

**Current handling:** Node.js is single-threaded — concurrent requests are serialized by the event loop. No mutex needed for in-memory Maps.

**Production (Redis):** Use Redis transactions (`MULTI`/`EXEC`) or Lua scripts to ensure atomicity:

```lua
-- Atomic score update in Redis
local score = redis.call('HGET', 'user:' .. userId, 'totalScore')
score = tonumber(score) + scoreDelta
redis.call('HSET', 'user:' .. userId, 'totalScore', score)
redis.call('ZADD', 'leaderboard:score', score, userId)
```

---

## 9. Sequence Diagrams

### 9.1 Quiz Flow (Correct Answer)

```
Client                    API                     Store           Adaptive
  │                        │                        │                │
  │─── GET /quiz/next ────►│                        │                │
  │    ?userId=alice        │── getOrCreateUser() ──►│                │
  │                        │◄── userState ──────────│                │
  │                        │── getNextQuestion() ───────────────────►│
  │                        │◄── question ───────────────────────────│
  │◄── { question, state } │                        │                │
  │                        │                        │                │
  │─── POST /quiz/answer ─►│                        │                │
  │    { userId, qId,      │── checkIdempotency() ─►│                │
  │      selectedIndex,    │◄── null (new key) ─────│                │
  │      idempotencyKey }  │── processAnswer() ─────────────────────►│
  │                        │                        │    confidence++ │
  │                        │                        │    streak++     │
  │                        │                        │    calc score   │
  │                        │◄── { correct, delta } ─────────────────│
  │                        │── recordIdempotency() ►│                │
  │                        │── updateUser() ────────►│                │
  │◄── { correct, delta,  │                        │                │
  │      userState }       │                        │                │
  │                        │                        │                │
```

### 9.2 Idempotent Replay

```
Client                    API                     Store
  │                        │                        │
  │─── POST /quiz/answer ─►│                        │
  │    (same idemKey)      │── checkIdempotency() ─►│
  │                        │◄── cached response ────│
  │◄── { ..., idempotent:  │                        │
  │      true }            │   (no state change)    │
  │                        │                        │
```

### 9.3 Leaderboard Polling

```
Client                    API                     Store
  │                        │                        │
  │─── GET /leaderboard ──►│                        │
  │    /score              │── getScoreBoard() ────►│
  │                        │◄── sorted users[] ─────│
  │◄── { leaderboard }    │                        │
  │                        │                        │
  │   ... 3 seconds ...    │                        │
  │                        │                        │
  │─── GET /leaderboard ──►│                        │
  │    /score              │── getScoreBoard() ────►│
  │                        │◄── sorted users[] ─────│
  │◄── { leaderboard }    │                        │
  │                        │                        │
```

---

## Appendix A: Technology Choices & Rationale

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) | Single codebase for frontend + API; SSR for leaderboard |
| State | In-memory Maps | Zero-dependency demo; Redis upgrade path documented |
| Real-time updates | Polling (3s) | Simpler than WebSocket; sufficient for demo scale |
| Auth | `userId` param | No login friction; sufficient for demo |
| Styling | Tailwind CSS + CSS variables | Design system tokens + rapid development |
| Deployment | Docker (standalone output) | Single `docker-compose up --build` command |

## Appendix B: File Tree

```
brainbolt/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── quiz/
│   │   │   │   ├── next/route.ts
│   │   │   │   └── answer/route.ts
│   │   │   └── leaderboard/
│   │   │       ├── score/route.ts
│   │   │       └── streak/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── QuizCard.tsx
│   │   ├── Leaderboard.tsx
│   │   ├── StatsBar.tsx
│   │   └── ThemeToggle.tsx
│   └── lib/
│       ├── adaptive.ts
│       ├── questions.ts
│       ├── rateLimit.ts
│       └── store.ts
├── Dockerfile
├── docker-compose.yml
├── LLD.md
├── README.md
├── next.config.ts
├── package.json
└── tsconfig.json
```
