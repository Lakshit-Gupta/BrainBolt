"use client";

import { useState, useEffect, useCallback } from "react";

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

export default function QuizCard({
  userId,
  onStatsUpdate,
}: {
  userId: string;
  onStatsUpdate: (stats: StatsData) => void;
}) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const fetchQuestion = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/quiz/next?userId=${encodeURIComponent(userId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load question (${res.status})`);
        return res.json();
      })
      .then((data) => {
        setQuestion(data.question);
        setIdempotencyKey(crypto.randomUUID());
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
  }, [userId, onStatsUpdate]);

  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  const submitAnswer = () => {
    if (question && selectedIndex !== null && !submitting) {
      setSubmitting(true);
      fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          questionId: question.id,
          selectedIndex,
          idempotencyKey,
        }),
      })
        .then((res) => {
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
        });
    }
  };

  const optionLabels = ["A", "B", "C", "D"];

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="flex justify-between">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16" />
          </div>
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mt-6" />
          <div className="space-y-3 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
            ))}
          </div>
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg mt-4" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-6">
        <div className="text-center py-8">
          <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchQuestion();
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-6">
        <div className="text-center py-8">
          <p className="text-slate-500 dark:text-slate-400">
            No questions available at this difficulty level.
          </p>
          <button
            onClick={fetchQuestion}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg">
      {/* Card Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {question.category}
        </span>
        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-400/10 px-2.5 py-1 rounded-full">
          Level {question.difficulty}
        </span>
      </div>

      {/* Question Body */}
      <div className="p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-6">
          {question.text}
        </h2>

        {/* Answer Choices */}
        <div className="space-y-3">
          {question.choices.map((choice, index) => {
            let buttonClass =
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ";

            if (feedback) {
              if (index === feedback.correctIndex) {
                buttonClass +=
                  "border-green-500 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400";
              } else if (index === selectedIndex && !feedback.correct) {
                buttonClass +=
                  "border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400";
              } else {
                buttonClass +=
                  "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500";
              }
            } else if (index === selectedIndex) {
              buttonClass +=
                "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-slate-900 dark:text-slate-50";
            } else {
              buttonClass +=
                "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800";
            }

            return (
              <button
                key={index}
                className={buttonClass}
                onClick={() => !feedback && setSelectedIndex(index)}
                disabled={!!feedback}
              >
                <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                  {optionLabels[index]}
                </span>
                <span className="font-medium">{choice}</span>
              </button>
            );
          })}
        </div>

        {/* Submit Button */}
        {!feedback && (
          <button
            onClick={submitAnswer}
            disabled={selectedIndex === null || submitting}
            className="w-full mt-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
          >
            {submitting ? "Submitting..." : "Submit Answer"}
          </button>
        )}

        {/* Feedback */}
        {feedback && (
          <div
            className={`mt-6 px-4 py-3 rounded-lg border ${
              feedback.correct
                ? "border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400"
                : "border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
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
    </div>
  );
}
