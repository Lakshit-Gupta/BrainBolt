"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { Button, Card, Badge, SkeletonCard } from "@/components/ui";

interface Question {
  id: string;
  text: string;
  choices: string[];
  difficulty: number;
  category: string;
}

interface StatsData {
  score: number;
  streak: number;
  difficulty: number;
  maxStreak: number;
}

interface FeedbackData {
  correct: boolean;
  correctIndex: number;
  scoreDelta: number;
}

function QuizCard({
  userId,
  token,
  onStatsUpdate,
}: {
  userId: string;
  token: string;
  onStatsUpdate: (stats: StatsData) => void;
}) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [stateVersion, setStateVersion] = useState(0);

  const fetchQuestion = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/v1/quiz/next`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load question (${res.status})`);
        return res.json();
      })
      .then((data) => {
        setQuestion(data.question);
        setIdempotencyKey(crypto.randomUUID());
        setStateVersion(data.stateVersion || 0);
        if (data.userState) {
          onStatsUpdate({
            score: data.userState.totalScore,
            streak: data.userState.streak,
            difficulty: data.userState.difficulty,
            maxStreak: data.userState.maxStreak,
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token, onStatsUpdate]);

  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  const submitAnswer = useCallback(() => {
    if (question && selectedIndex !== null && !submitting) {
      setSubmitting(true);
      fetch("/api/v1/quiz/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionId: question.id,
          selectedIndex,
          idempotencyKey,
          stateVersion,
        }),
      })
        .then((res) => {
          if (res.status === 409) {
            throw new Error("State out of sync, refreshing...");
          }
          if (!res.ok)
            throw new Error(`Failed to submit answer (${res.status})`);
          return res.json();
        })
        .then((data) => {
          setFeedback({
            correct: data.correct,
            correctIndex: data.correctIndex,
            scoreDelta: data.scoreDelta,
          });
          setStateVersion(data.stateVersion || 0);
          onStatsUpdate({
            score: data.userState.totalScore,
            streak: data.userState.streak,
            difficulty: data.userState.difficulty,
            maxStreak: data.userState.maxStreak,
          });
          setSubmitting(false);
          setTimeout(() => {
            setFeedback(null);
            setSelectedIndex(null);
            fetchQuestion();
          }, 2000);
        })
        .catch((err) => {
          setError(err.message);
          setSubmitting(false);
          if (err.message.includes("State out of sync")) {
            setTimeout(() => {
              setError(null);
              fetchQuestion();
            }, 1000);
          }
        });
    }
  }, [question, selectedIndex, submitting, token, idempotencyKey, stateVersion, onStatsUpdate, fetchQuestion]);

  const handleAnswer = useCallback((index: number) => {
    if (!feedback) {
      setSelectedIndex(index);
    }
  }, [feedback]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAnswer(index);
    }
  }, [handleAnswer]);

  const optionLabels = ["A", "B", "C", "D"];

  if (loading) {
    return <SkeletonCard />;
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-bb-error mb-4">{error}</p>
          <Button
            onClick={() => {
              setError(null);
              fetchQuestion();
            }}
          >
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (!question) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-bb-muted">
            No questions available at this difficulty level.
          </p>
          <Button onClick={fetchQuestion} className="mt-4">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card aria-busy={loading}>
      {/* Card Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-bb-border">
        <span className="text-bb-sm font-medium text-bb-muted">
          {question.category}
        </span>
        <Badge variant="accent">
          Level {question.difficulty}
        </Badge>
      </div>

      {/* Question Body */}
      <div>
        <h2
          className="text-bb-xl font-semibold text-bb-text mb-6"
          aria-live="polite"
        >
          {question.text}
        </h2>

        {/* Answer Choices */}
        <div
          role="listbox"
          aria-label="Answer choices"
          className="space-y-3"
        >
          {question.choices.map((choice, index) => {
            let buttonClass =
              "w-full flex items-center gap-3 px-4 py-3 rounded-bb-md border text-left transition-all focus:outline-none focus:ring-2 focus:ring-bb-accent ";

            if (feedback) {
              if (index === feedback.correctIndex) {
                buttonClass +=
                  "bb-success-subtle border text-bb-success";
              } else if (index === selectedIndex && !feedback.correct) {
                buttonClass +=
                  "bb-error-subtle border text-bb-error";
              } else {
                buttonClass +=
                  "border-bb-border bg-bb-elevated text-bb-muted opacity-50";
              }
            } else if (index === selectedIndex) {
              buttonClass +=
                "bb-accent-subtle text-bb-text ring-2 ring-bb-accent";
            } else {
              buttonClass +=
                "border-bb-border bg-bb-elevated text-bb-text hover:border-bb-accent hover:bg-bb-surface cursor-pointer";
            }

            return (
              <button
                key={index}
                role="option"
                aria-selected={selectedIndex === index}
                tabIndex={0}
                className={buttonClass}
                onClick={() => handleAnswer(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                disabled={!!feedback}
              >
                <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-bb-bg text-bb-xs font-medium text-bb-muted border border-bb-border">
                  {optionLabels[index]}
                </span>
                <span className="font-medium">{choice}</span>
              </button>
            );
          })}
        </div>

        {/* Submit Button */}
        {!feedback && (
          <Button
            onClick={submitAnswer}
            disabled={selectedIndex === null || submitting}
            loading={submitting}
            className="w-full mt-6"
          >
            Submit Answer
          </Button>
        )}

        {/* Feedback */}
        {feedback && (
          <div
            role="alert"
            aria-live="assertive"
            className={`mt-6 px-4 py-3 rounded-bb-md border ${feedback.correct
                ? "bb-success-subtle text-bb-success"
                : "bb-error-subtle text-bb-error"
              }`}
          >
            <p className="font-medium">
              {feedback.correct
                ? `Correct! +${Math.round(feedback.scoreDelta)} points`
                : "Incorrect!"}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

export default memo(QuizCard);
