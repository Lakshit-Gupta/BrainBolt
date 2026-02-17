BrainBolt — Adaptive Infinite Quiz Platform
Build a Next.js full-stack adaptive quiz app with in-memory state, adaptive difficulty algorithm, leaderboard, Docker deployment, and LLD documentation.

Proposed Changes
Scaffold
[NEW] 
package.json
Next.js 15 + TypeScript + Tailwind CSS + ESLint. Use npx create-next-app@latest with --app --typescript --tailwind --eslint --src-dir --no-import-alias.

[NEW] 
next.config.ts
Add output: 'standalone' for Docker production build.

Backend — Data & Algorithm (src/lib/)
[NEW] 
questions.ts
Seed data: 20 questions across difficulty tiers 1-10 (science, math, history, geography, tech). Each question has id, text, choices[], correctIndex, difficulty, category.

[NEW] 
store.ts
In-memory singleton store using Map:

users: Map<string, UserState> — difficulty, streak, maxStreak, totalScore, confidence, answeredIds, recentResults (rolling last 10)
idempotencyKeys: Map<string, { response, timestamp }> — TTL-based cleanup
Helper functions: getOrCreateUser(), getLeaderboard(), checkIdempotency(), recordIdempotency()
[NEW] 
adaptive.ts
Implements the exact adaptive algorithm from the spec:

processAnswer(userId, questionId, selectedIndex) → returns { correct, scoreDelta, newDifficulty, streak, totalScore }
Confidence/hysteresis band: need confidence ≥ 7 to go up, ≤ 3 to go down
Score formula: difficulty * 10 * min(4, 1 + streak*0.25) * accuracy_factor
getNextQuestion(userId) → picks a random question matching current difficulty band (±1), not recently answered
[NEW] 
rateLimit.ts
Simple in-memory rate limiter: max 30 requests/minute per userId. Uses a Map<string, { count, windowStart }>.

Backend — API Routes
[NEW] 
route.ts
GET /api/quiz/next?userId=X → Returns next question based on adaptive difficulty. Rate-limited.

[NEW] 
route.ts
POST /api/quiz/answer body { userId, questionId, selectedIndex, idempotencyKey } → Process answer through adaptive algorithm. Idempotency check on key. Rate-limited.

[NEW] 
route.ts
GET /api/leaderboard/score → Top 10 users by totalScore.

[NEW] 
route.ts
GET /api/leaderboard/streak → Top 10 users by maxStreak.

Frontend — Components
[NEW] 
globals.css
Design system tokens as CSS custom properties: colors, spacing, radii, shadows, font sizes. Dark mode via [data-theme="dark"] selector + Tailwind dark: classes.

[NEW] 
layout.tsx
Root layout with Google Fonts (Inter), theme provider, metadata for SEO.

[NEW] 
page.tsx
Main quiz page — entry point with name input → quiz flow.

[NEW] 
QuizCard.tsx
Renders question text + 4 answer buttons with hover/select animations. Shows correct/incorrect feedback with color transitions. Difficulty badge, streak counter, score display. Timer animation bar.

[NEW] 
Leaderboard.tsx
Two tabs (Score / Streak). Polls /api/leaderboard/* every 3s. Animated rank entries. Highlights current user.

[NEW] 
ThemeToggle.tsx
Sun/moon icon toggle for light/dark mode. Persists to localStorage.

[NEW] 
StatsBar.tsx
Horizontal bar showing current score, streak, difficulty level with visual indicators and micro-animations.

Docker
[NEW] 
Dockerfile
Multi-stage build: deps → builder → runner. Uses standalone output. Non-root nextjs user.

[NEW] 
docker-compose.yml
Single service app, port 3000, NODE_ENV=production, restart unless-stopped.

[NEW] 
.dockerignore
Exclude node_modules, .next, .git, etc.

Documentation
[NEW] 
README.md
Quick-start with Docker single command, fallback npm instructions, tech stack overview.

[NEW] 
LLD.md
Low-Level Design doc: class responsibilities, API schemas (request/response), DB schema (in-memory model), cache strategy (document Redis upgrade path), adaptive algorithm pseudocode, edge cases (idempotency, ping-pong, streak reset, decay), sequence diagrams.

Verification Plan
Browser Testing
Quiz Flow: Open http://localhost:3000, enter a name, answer questions — verify questions load, answers submit, score updates
Adaptive Difficulty: Answer 3+ correct in a row → verify difficulty increases; answer wrong several times → verify difficulty decreases
Leaderboard: Check both Score and Streak tabs update after answering questions
Dark Mode: Toggle theme, verify all components render correctly in both modes
Idempotency: Submit same answer twice with same key → verify no double scoring
Docker Verification
bash
docker-compose up --build
# Verify app accessible at http://localhost:3000
Manual Verification by User
Visual review of UI polish, animations, and responsiveness
Review LLD.md for completeness

