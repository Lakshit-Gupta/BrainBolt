"""
BrainBolt IRT + Elo Hybrid Scoring Microservice

Uses Item Response Theory (3-Parameter Logistic Model) combined with
an Elo-style difficulty adjustment for adaptive scoring.

IRT 3PL Model:
  P(correct | theta) = c + (1-c) * (1 / (1 + exp(-1.7 * a * (theta - b))))

Where:
  theta = learner ability estimate (updated via Newton-Raphson MLE)
  a     = item discrimination (how well question separates ability levels)
  b     = item difficulty (ability level at which P=0.5, adjusted for c)
  c     = guessing parameter (lower asymptote, typically 0.25 for 4-choice)

Elo Component:
  Expected score E = 1 / (1 + 10^((difficulty_rating - theta_scaled) / 400))
  K-factor adjusts based on confidence (number of answers seen)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import numpy as np
from scipy.optimize import brentq
import redis as redis_client
import json
import os
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="BrainBolt IRT Scoring Service",
    description="Item Response Theory + Elo hybrid scoring for adaptive quiz",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis connection
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
try:
    r = redis_client.from_url(REDIS_URL, decode_responses=True)
    r.ping()
    logger.info(f"[Redis] Connected to {REDIS_URL}")
except Exception as e:
    logger.warning(f"[Redis] Connection failed: {e}. Using in-memory fallback.")
    r = None

# In-memory fallback
_memory_store: dict = {}


# ============================================================
# IRT ITEM PARAMETERS
# Keyed by difficulty level 1-10
# a = discrimination, b = difficulty parameter, c = guessing
# ============================================================
IRT_ITEM_PARAMS: dict[int, dict] = {
    1:  {"a": 0.8,  "b": -3.0, "c": 0.25},  # Very easy
    2:  {"a": 0.9,  "b": -2.0, "c": 0.25},
    3:  {"a": 1.0,  "b": -1.2, "c": 0.25},
    4:  {"a": 1.1,  "b": -0.6, "c": 0.25},
    5:  {"a": 1.2,  "b": 0.0,  "c": 0.25},  # Medium
    6:  {"a": 1.3,  "b": 0.6,  "c": 0.20},
    7:  {"a": 1.4,  "b": 1.2,  "c": 0.20},
    8:  {"a": 1.5,  "b": 1.8,  "c": 0.15},
    9:  {"a": 1.6,  "b": 2.4,  "c": 0.15},
    10: {"a": 1.8,  "b": 3.0,  "c": 0.10},  # Expert
}

# Theta bounds (ability estimate range)
THETA_MIN = -4.0
THETA_MAX = 4.0
THETA_INITIAL = 0.0  # Start at average ability

# Elo K-factor bounds
ELO_K_MAX = 64.0   # High uncertainty early on
ELO_K_MIN = 16.0   # Stabilizes after many answers
ELO_SCALE = 400.0  # Standard Elo scale factor


# ============================================================
# PYDANTIC MODELS
# ============================================================

class ScoreRequest(BaseModel):
    userId: str = Field(..., description="Unique user identifier")
    difficulty: int = Field(..., ge=1, le=10, description="Question difficulty 1-10")
    correct: bool = Field(..., description="Whether the answer was correct")
    streak: int = Field(..., ge=0, description="Current answer streak")
    totalAnswers: int = Field(..., ge=1, description="Total answers given so far")
    recentResults: list[bool] = Field(
        default=[],
        description="Last 10 answer results (true=correct)"
    )


class ScoreResponse(BaseModel):
    scoreDelta: float = Field(..., description="Points earned this answer")
    newTheta: float = Field(..., description="Updated IRT ability estimate")
    thetaDelta: float = Field(..., description="Change in ability estimate")
    irtProbability: float = Field(..., description="IRT predicted P(correct)")
    eloExpected: float = Field(..., description="Elo expected score")
    streakMultiplier: float = Field(..., description="Streak bonus multiplier")
    accuracyFactor: float = Field(..., description="Rolling accuracy factor")
    breakdown: dict = Field(..., description="Score component breakdown")


class ThetaResponse(BaseModel):
    userId: str
    theta: float
    thetaHistory: list[float]
    totalAnswers: int


class HealthResponse(BaseModel):
    status: str
    redis: str
    version: str


# ============================================================
# IRT CORE FUNCTIONS
# ============================================================

def irt_probability(theta: float, a: float, b: float, c: float) -> float:
    """
    3-Parameter Logistic IRT Model.
    Returns probability of correct response given ability theta.
    
    P(correct | theta) = c + (1-c) / (1 + exp(-1.7 * a * (theta - b)))
    """
    exponent = -1.7 * a * (theta - b)
    # Clip to prevent overflow
    exponent = np.clip(exponent, -500, 500)
    return c + (1.0 - c) / (1.0 + np.exp(exponent))


def update_theta_mle(
    theta_current: float,
    response_history: list[dict],
    max_iterations: int = 20,
    tolerance: float = 1e-6
) -> float:
    """
    Maximum Likelihood Estimation of theta using Newton-Raphson iteration.
    
    Maximizes log-likelihood:
    L(theta) = sum[ u_i * log(P_i) + (1-u_i) * log(1-P_i) ]
    
    Newton-Raphson update:
    theta_new = theta_old - L'(theta) / L''(theta)
    """
    if len(response_history) < 2:
        # Not enough data for MLE, use simple adjustment
        last = response_history[-1] if response_history else None
        if last is None:
            return theta_current
        params = IRT_ITEM_PARAMS[last["difficulty"]]
        delta = 0.3 if last["correct"] else -0.3
        return np.clip(theta_current + delta, THETA_MIN, THETA_MAX)

    theta = theta_current

    for _ in range(max_iterations):
        L_prime = 0.0   # First derivative of log-likelihood
        L_double = 0.0  # Second derivative of log-likelihood

        for resp in response_history:
            params = IRT_ITEM_PARAMS[resp["difficulty"]]
            a, b, c = params["a"], params["b"], params["c"]
            u = 1.0 if resp["correct"] else 0.0

            P = irt_probability(theta, a, b, c)
            Q = 1.0 - P

            # Avoid log(0)
            P = np.clip(P, 1e-10, 1 - 1e-10)
            Q = np.clip(Q, 1e-10, 1 - 1e-10)

            # Derivative of P with respect to theta
            W = (P - c) / (1.0 - c)  # Rescaled probability
            dP = 1.7 * a * W * (1.0 - W) * (1.0 - c)

            # First derivative contribution
            L_prime += dP * (u - P) / (P * Q)

            # Second derivative contribution (negative definite)
            L_double -= (dP ** 2) / (P * Q)

        # Avoid division by zero
        if abs(L_double) < 1e-10:
            break

        delta = L_prime / L_double
        theta_new = np.clip(theta - delta, THETA_MIN, THETA_MAX)

        if abs(theta_new - theta) < tolerance:
            theta = theta_new
            break

        theta = theta_new

    return float(theta)


def elo_expected_score(theta: float, difficulty: int) -> float:
    """
    Elo-style expected score for a question of given difficulty.
    
    Maps theta (-4 to 4) to Elo scale (0 to 3200).
    Maps difficulty (1-10) to Elo scale.
    
    E = 1 / (1 + 10^((difficulty_elo - player_elo) / 400))
    """
    # Map theta to Elo scale: theta=0 → 1600, range ±4 → ±800
    player_elo = 1600 + (theta * 200)

    # Map difficulty 1-10 to Elo: 1→800, 10→2400
    difficulty_elo = 800 + (difficulty - 1) * (1600 / 9)

    exponent = (difficulty_elo - player_elo) / ELO_SCALE
    return 1.0 / (1.0 + 10.0 ** exponent)


def compute_k_factor(total_answers: int) -> float:
    """
    Dynamic K-factor: high uncertainty early, stabilizes with more data.
    
    K = K_MAX * exp(-total_answers / 30) + K_MIN
    """
    k = ELO_K_MAX * np.exp(-total_answers / 30.0) + ELO_K_MIN
    return float(np.clip(k, ELO_K_MIN, ELO_K_MAX))


def compute_streak_multiplier(streak: int) -> float:
    """
    Streak multiplier: capped at 4.0x.
    multiplier = min(4.0, 1.0 + streak * 0.25)
    """
    return float(min(4.0, 1.0 + streak * 0.25))


def compute_accuracy_factor(recent_results: list[bool]) -> float:
    """
    Rolling accuracy from last 10 answers.
    Floor at 0.1 to keep scoring meaningful even after many wrong answers.
    """
    if not recent_results:
        return 0.5  # Default 50% accuracy for new users
    accuracy = sum(recent_results) / len(recent_results)
    return float(max(0.1, accuracy))


# ============================================================
# REDIS / MEMORY HELPERS
# ============================================================

def get_user_irt_state(user_id: str) -> dict:
    """Get user's IRT state (theta + response history) from Redis or memory."""
    key = f"irt:state:{user_id}"
    try:
        if r:
            data = r.get(key)
            if data:
                return json.loads(data)
    except Exception:
        pass

    # Check memory fallback
    if key in _memory_store:
        return _memory_store[key]

    # Default initial state
    return {
        "theta": THETA_INITIAL,
        "thetaHistory": [],
        "responseHistory": [],
        "totalAnswers": 0,
    }


def save_user_irt_state(user_id: str, state: dict) -> None:
    """Save user's IRT state to Redis with 24h TTL."""
    key = f"irt:state:{user_id}"
    serialized = json.dumps(state)
    try:
        if r:
            r.setex(key, 86400, serialized)
            return
    except Exception:
        pass
    _memory_store[key] = state


# ============================================================
# API ENDPOINTS
# ============================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    redis_status = "disconnected"
    try:
        if r:
            r.ping()
            redis_status = "connected"
    except Exception:
        pass

    return HealthResponse(
        status="healthy",
        redis=redis_status,
        version="1.0.0"
    )


@app.post("/score", response_model=ScoreResponse)
async def compute_score(request: ScoreRequest):
    """
    Compute IRT + Elo hybrid score for an answer.
    
    Called by Next.js after every answer submission.
    Returns scoreDelta and updated ability estimate (theta).
    """
    # Load user's IRT state
    state = get_user_irt_state(request.userId)
    theta_before = state["theta"]

    # Get IRT parameters for this difficulty
    if request.difficulty not in IRT_ITEM_PARAMS:
        raise HTTPException(status_code=400, detail=f"Invalid difficulty: {request.difficulty}")

    params = IRT_ITEM_PARAMS[request.difficulty]
    a, b, c = params["a"], params["b"], params["c"]

    # 1. IRT probability of correct answer at current theta
    irt_prob = irt_probability(theta_before, a, b, c)

    # 2. Elo expected score
    elo_expected = elo_expected_score(theta_before, request.difficulty)

    # 3. Add this response to history (keep last 50)
    response_history = state.get("responseHistory", [])
    response_history.append({
        "difficulty": request.difficulty,
        "correct": request.correct,
    })
    if len(response_history) > 50:
        response_history = response_history[-50:]

    # 4. Update theta via Newton-Raphson MLE
    theta_after = update_theta_mle(theta_before, response_history)
    theta_delta = theta_after - theta_before

    # 5. Compute score components
    streak_multiplier = compute_streak_multiplier(request.streak)
    accuracy_factor = compute_accuracy_factor(request.recentResults)

    # 6. Base score from IRT information
    # Use Fisher information as base weight: I(theta) = a^2 * P*Q / (P-c)^2
    P = irt_probability(theta_after, a, b, c)
    Q = 1.0 - P
    P_safe = max(P, 1e-10)
    Q_safe = max(Q, 1e-10)
    W = max(P_safe - c, 1e-10)

    fisher_info = (a ** 2) * (P_safe * Q_safe) / (W ** 2)
    # Normalize fisher info to 0-1 range (typical range 0-3)
    normalized_info = min(1.0, fisher_info / 3.0)

    # 7. Elo K-factor adjustment
    k_factor = compute_k_factor(request.totalAnswers)
    actual_score = 1.0 if request.correct else 0.0
    elo_delta = k_factor * (actual_score - elo_expected)

    # 8. Composite score delta
    # Only award positive points on correct answers
    if request.correct:
        # IRT component: harder questions at your ability level = more points
        irt_component = request.difficulty * 10 * normalized_info

        # Elo surprise bonus: beating expectations earns extra
        elo_component = max(0, elo_delta) * 50

        # Apply multipliers
        base_score = (irt_component + elo_component) * streak_multiplier * accuracy_factor
        score_delta = round(max(1.0, base_score), 2)
    else:
        score_delta = 0.0

    # 9. Update theta history
    theta_history = state.get("thetaHistory", [])
    theta_history.append(round(theta_after, 4))
    if len(theta_history) > 100:
        theta_history = theta_history[-100:]

    # 10. Save updated state
    state.update({
        "theta": theta_after,
        "thetaHistory": theta_history,
        "responseHistory": response_history,
        "totalAnswers": request.totalAnswers,
    })
    save_user_irt_state(request.userId, state)

    logger.info(
        f"[Score] userId={request.userId} "
        f"difficulty={request.difficulty} "
        f"correct={request.correct} "
        f"theta={theta_before:.3f}→{theta_after:.3f} "
        f"delta={score_delta}"
    )

    return ScoreResponse(
        scoreDelta=score_delta,
        newTheta=round(theta_after, 4),
        thetaDelta=round(theta_delta, 4),
        irtProbability=round(irt_prob, 4),
        eloExpected=round(elo_expected, 4),
        streakMultiplier=streak_multiplier,
        accuracyFactor=accuracy_factor,
        breakdown={
            "baseDifficulty": request.difficulty * 10,
            "normalizedInfo": round(normalized_info, 4),
            "eloComponent": round(max(0, elo_delta) * 50, 2) if request.correct else 0,
            "kFactor": round(k_factor, 2),
            "streakMultiplier": streak_multiplier,
            "accuracyFactor": accuracy_factor,
        }
    )


@app.get("/theta/{user_id}", response_model=ThetaResponse)
async def get_theta(user_id: str):
    """
    Get user's current IRT ability estimate (theta).
    Useful for displaying skill level in the frontend.
    """
    state = get_user_irt_state(user_id)
    return ThetaResponse(
        userId=user_id,
        theta=round(state["theta"], 4),
        thetaHistory=state.get("thetaHistory", []),
        totalAnswers=state.get("totalAnswers", 0),
    )


@app.delete("/theta/{user_id}")
async def reset_theta(user_id: str):
    """Reset user's IRT state (for testing)."""
    key = f"irt:state:{user_id}"
    try:
        if r:
            r.delete(key)
    except Exception:
        pass
    if key in _memory_store:
        del _memory_store[key]
    return {"message": f"IRT state reset for user {user_id}"}


@app.get("/item-params")
async def get_item_params():
    """Return IRT parameters for all difficulty levels (for LLD documentation)."""
    return {
        "model": "3PL (Three-Parameter Logistic)",
        "parameters": IRT_ITEM_PARAMS,
        "description": {
            "a": "Discrimination: how well item separates ability levels",
            "b": "Difficulty: theta at which P(correct)=0.5 (adjusted for c)",
            "c": "Guessing: lower asymptote (chance of correct at very low ability)"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
