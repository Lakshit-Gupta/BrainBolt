# BrainBolt -- Adaptive Infinite Quiz Platform

An intelligent quiz engine that adapts to your skill level in real-time. Powered by a confidence-based hysteresis algorithm that prevents difficulty ping-pong, a streak multiplier scoring system, and a live leaderboard.

##  Run Locally (Single Command)

```bash
docker-compose up --build
```

Then open **[http://localhost:3000](http://localhost:3000)**

> **Requirements:** Docker + Docker Compose installed. Nothing else needed.

---

##  Fallback (Without Docker)

```bash
npm install
npm run build
npm start
```

Or for development with hot-reload:

```bash
npm install
npm run dev
```

---

##  Architecture

BrainBolt is a **monolithic Next.js 15 application** — the React frontend and API backend live in one codebase via App Router API routes.

```
┌──────────────────────────────┐
│        Browser (React)       │
│  Quiz Card • Leaderboard     │
│  Stats Bar • Theme Toggle    │
└──────────┬───────────────────┘
           │  HTTP / Polling (3s)
┌──────────▼───────────────────┐
│     Next.js API Routes       │
│  /api/quiz/next              │
│  /api/quiz/answer            │
│  /api/leaderboard/score      │
│  /api/leaderboard/streak     │
└──────────┬───────────────────┘
           │
┌──────────▼───────────────────┐
│     Library Layer            │
│  adaptive.ts • store.ts      │
│  questions.ts • rateLimit.ts │
└──────────┬───────────────────┘
           │
┌──────────▼───────────────────┐
│   In-Memory Store (Maps)     │
│   (Redis upgrade documented) │
└──────────────────────────────┘
```

---

##  Features

| Feature | Description |
|---|---|
| **Adaptive Difficulty** | Confidence-based hysteresis algorithm (1–10 scale) prevents ping-pong oscillation |
| **Streak Scoring** | Multiplier grows with consecutive correct answers, capped at 4× |
| **Live Leaderboard** | Two tabs (Score / Streak), polls every 3 seconds |
| **Idempotent Answers** | Client-generated keys prevent double-scoring on retries |
| **Rate Limiting** | 30 requests/minute per user |
| **Dark Mode** | Toggle between light and dark themes, persisted to localStorage |
| **Design System** | CSS custom properties + Tailwind for consistent theming |
| **Docker Ready** | Multi-stage Dockerfile with standalone Next.js output |

---

##  How the Adaptive Algorithm Works

```
                  ← harder to drop ──────── harder to rise →
Confidence:  0   1   2   3   4   5   6   7   8   9   10
                       ▲                   ▲
                  DROP threshold     RAISE threshold
```

- **Correct answer:** confidence +1. If confidence ≥ 7 → difficulty up, confidence resets to 5.
- **Wrong answer:** confidence −2. If confidence ≤ 3 → difficulty down, confidence resets to 5.
- **Result:** Alternating right/wrong answers **never** trigger a difficulty change. You need **sustained performance** to shift levels.

See [LLD.md](./LLD.md) for the full pseudocode and edge-case analysis.

---

##  Score Formula

```
scoreDelta = (difficulty × 10) × min(4.0, 1 + streak × 0.25) × accuracy_factor
```

| Factor | Range | Purpose |
|---|---|---|
| Base (difficulty × 10) | 10–100 | Harder questions → more points |
| Streak multiplier | 1.0×–4.0× | Reward consecutive correct answers |
| Accuracy factor | 0.1–1.0 | Rolling accuracy over last 10 answers |

---

##  Project Structure

```
brainbolt/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── quiz/
│   │   │   │   ├── next/route.ts      # Serve next question
│   │   │   │   └── answer/route.ts    # Process answer
│   │   │   └── leaderboard/
│   │   │       ├── score/route.ts     # Top scores
│   │   │       └── streak/route.ts    # Top streaks
│   │   ├── globals.css                # Design tokens
│   │   ├── layout.tsx                 # Root layout
│   │   └── page.tsx                   # Quiz page
│   ├── components/
│   │   ├── QuizCard.tsx               # Question + answers
│   │   ├── Leaderboard.tsx            # Score/streak tabs
│   │   ├── StatsBar.tsx               # Live stats
│   │   └── ThemeToggle.tsx            # Dark mode toggle
│   └── lib/
│       ├── adaptive.ts               # Adaptive algorithm
│       ├── questions.ts              # Question bank
│       ├── rateLimit.ts              # Rate limiter
│       └── store.ts                  # In-memory state
├── Dockerfile                         # Multi-stage build
├── docker-compose.yml                 # Single-command deploy
├── LLD.md                             # Low-Level Design doc
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/quiz/next?userId=X` | Get next question for user |
| `POST` | `/api/quiz/answer` | Submit answer (idempotent) |
| `GET` | `/api/leaderboard/score` | Top 10 by total score |
| `GET` | `/api/leaderboard/streak` | Top 10 by max streak |

---

##  Docker Details

The Dockerfile uses a **multi-stage build** with Next.js `standalone` output mode:

1. **deps** — Install `node_modules`
2. **builder** — Build the Next.js app
3. **runner** — Minimal production image with `server.js`

The final image runs as a non-root `nextjs` user on port 3000.

---

##  Documentation

- **[LLD.md](./LLD.md)** — Full Low-Level Design: module responsibilities, API schemas, data model, adaptive algorithm pseudocode, score formula, edge cases, sequence diagrams, Redis upgrade path.

---

##  Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS Custom Properties |
| State | In-memory Maps (Redis upgrade documented) |
| Real-time | Polling (3s intervals) |
| Deployment | Docker (standalone output) |

---

##  License

MIT
