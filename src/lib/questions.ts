// ─── BrainBolt Question Bank ────────────────────────────────────────────────
// 20 seed questions across difficulty tiers 1–10.
// Categories: Science, Math, History, Geography, Tech.

import { createHash } from 'crypto';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Question {
  id: string;
  text: string;
  choices: string[];
  correctIndex: number;
  difficulty: number; // 1–10
  category: string;
  correctAnswerHash: string;
}

// ─── Hash Helper ────────────────────────────────────────────────────────────

function hashCorrectIndex(index: number): string {
  return createHash('sha256')
    .update(String(index))
    .digest('hex')
    .substring(0, 16);
}

// ─── Seed Data ──────────────────────────────────────────────────────────────

const questions: Question[] = [
  // ── Difficulty 1 ──
  {
    id: "q1",
    text: "What planet is known as the Red Planet?",
    choices: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctIndex: 1,
    difficulty: 1,
    category: "Science",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q2",
    text: "What is 7 + 5?",
    choices: ["10", "11", "12", "13"],
    correctIndex: 2,
    difficulty: 1,
    category: "Math",
    correctAnswerHash: hashCorrectIndex(2),
  },

  // ── Difficulty 2 ──
  {
    id: "q3",
    text: "Which ocean is the largest?",
    choices: ["Atlantic", "Indian", "Arctic", "Pacific"],
    correctIndex: 3,
    difficulty: 2,
    category: "Geography",
    correctAnswerHash: hashCorrectIndex(3),
  },
  {
    id: "q4",
    text: "Who painted the Mona Lisa?",
    choices: ["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"],
    correctIndex: 1,
    difficulty: 2,
    category: "History",
    correctAnswerHash: hashCorrectIndex(1),
  },

  // ── Difficulty 3 ──
  {
    id: "q5",
    text: "What is the chemical symbol for gold?",
    choices: ["Ag", "Au", "Fe", "Cu"],
    correctIndex: 1,
    difficulty: 3,
    category: "Science",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q6",
    text: "What is 15% of 200?",
    choices: ["20", "25", "30", "35"],
    correctIndex: 2,
    difficulty: 3,
    category: "Math",
    correctAnswerHash: hashCorrectIndex(2),
  },

  // ── Difficulty 4 ──
  {
    id: "q7",
    text: "Which country has the most time zones?",
    choices: ["Russia", "USA", "France", "China"],
    correctIndex: 2,
    difficulty: 4,
    category: "Geography",
    correctAnswerHash: hashCorrectIndex(2),
  },
  {
    id: "q8",
    text: "What does HTML stand for?",
    choices: [
      "Hyper Text Markup Language",
      "High Tech Modern Language",
      "Hyper Transfer Markup Language",
      "Home Tool Markup Language",
    ],
    correctIndex: 0,
    difficulty: 4,
    category: "Tech",
    correctAnswerHash: hashCorrectIndex(0),
  },

  // ── Difficulty 5 ──
  {
    id: "q9",
    text: "What is the powerhouse of the cell?",
    choices: ["Nucleus", "Ribosome", "Mitochondria", "Golgi apparatus"],
    correctIndex: 2,
    difficulty: 5,
    category: "Science",
    correctAnswerHash: hashCorrectIndex(2),
  },
  {
    id: "q10",
    text: "In what year did World War I begin?",
    choices: ["1912", "1914", "1916", "1918"],
    correctIndex: 1,
    difficulty: 5,
    category: "History",
    correctAnswerHash: hashCorrectIndex(1),
  },

  // ── Difficulty 6 ──
  {
    id: "q11",
    text: "What is the derivative of x²?",
    choices: ["x", "2x", "x²", "2x²"],
    correctIndex: 1,
    difficulty: 6,
    category: "Math",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q12",
    text: "Which protocol is used for secure web communication?",
    choices: ["HTTP", "FTP", "HTTPS", "SMTP"],
    correctIndex: 2,
    difficulty: 6,
    category: "Tech",
    correctAnswerHash: hashCorrectIndex(2),
  },

  // ── Difficulty 7 ──
  {
    id: "q13",
    text: "What is the smallest country in the world by area?",
    choices: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"],
    correctIndex: 1,
    difficulty: 7,
    category: "Geography",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q14",
    text: "What is the half-life of Carbon-14 (approximately)?",
    choices: ["1,000 years", "5,730 years", "10,000 years", "50,000 years"],
    correctIndex: 1,
    difficulty: 7,
    category: "Science",
    correctAnswerHash: hashCorrectIndex(1),
  },

  // ── Difficulty 8 ──
  {
    id: "q15",
    text: "What is the time complexity of binary search?",
    choices: ["O(n)", "O(n log n)", "O(log n)", "O(1)"],
    correctIndex: 2,
    difficulty: 8,
    category: "Tech",
    correctAnswerHash: hashCorrectIndex(2),
  },
  {
    id: "q16",
    text: "Who formulated the general theory of relativity?",
    choices: ["Isaac Newton", "Niels Bohr", "Albert Einstein", "Max Planck"],
    correctIndex: 2,
    difficulty: 8,
    category: "Science",
    correctAnswerHash: hashCorrectIndex(2),
  },

  // ── Difficulty 9 ──
  {
    id: "q17",
    text: "What is the integral of 1/x dx?",
    choices: ["x²", "ln|x| + C", "1/x² + C", "e^x + C"],
    correctIndex: 1,
    difficulty: 9,
    category: "Math",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q18",
    text: "The Treaty of Westphalia in 1648 ended which conflict?",
    choices: [
      "Hundred Years' War",
      "War of the Roses",
      "Thirty Years' War",
      "Seven Years' War",
    ],
    correctIndex: 2,
    difficulty: 9,
    category: "History",
    correctAnswerHash: hashCorrectIndex(2),
  },

  // ── Difficulty 10 ──
  {
    id: "q19",
    text: "What is the Kolmogorov complexity of a string?",
    choices: [
      "The length of the string",
      "The shortest program that produces the string",
      "The number of unique characters",
      "The entropy of the string",
    ],
    correctIndex: 1,
    difficulty: 10,
    category: "Tech",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q20",
    text: "What is the value of the Euler–Mascheroni constant γ (to 4 decimal places)?",
    choices: ["0.5772", "0.6931", "1.4142", "2.7183"],
    correctIndex: 0,
    difficulty: 10,
    category: "Math",
    correctAnswerHash: hashCorrectIndex(0),
  },
];

// ─── Accessors ──────────────────────────────────────────────────────────────

/** Return all questions (immutable reference). */
export function getAllQuestions(): readonly Question[] {
  return questions;
}

/** Look up a single question by id. Returns undefined if not found. */
export function getQuestionById(id: string): Question | undefined {
  return questions.find((q) => q.id === id);
}

/**
 * Return questions within ±band of the target difficulty.
 * Used by the adaptive engine for question selection.
 */
export function getQuestionsByDifficulty(
  target: number,
  band: number = 1
): Question[] {
  return questions.filter(
    (q) => Math.abs(q.difficulty - target) <= band
  );
}
