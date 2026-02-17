// ─── BrainBolt Question Bank ────────────────────────────────────────────────
// 40 Technical Questions for AI SDE Intern Evaluation
// Categories: Frontend, Backend, System Design, Python, AI/ML, DSA

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

// ─── Question Bank ──────────────────────────────────────────────────────────

const questions: Question[] = [
  // ── Frontend/React/Next.js (8 questions, difficulty 3-7) ──
  {
    id: "q001",
    text: "In React, what is the purpose of the useCallback hook?",
    choices: [
      "To memoize a value that is expensive to compute",
      "To memoize a function reference between renders",
      "To run side effects after render",
      "To manage component state"
    ],
    correctIndex: 1,
    difficulty: 5,
    category: "Frontend/React/Next.js",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q002",
    text: "In Next.js App Router, which of these correctly describes a Server Component?",
    choices: [
      "It runs only in the browser and can use useState",
      "It renders on the server and cannot use browser APIs or hooks",
      "It is the same as a Client Component but faster",
      "It requires the 'use server' directive at the top"
    ],
    correctIndex: 1,
    difficulty: 6,
    category: "Frontend/React/Next.js",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q003",
    text: "What is the key difference between useEffect and useLayoutEffect in React?",
    choices: [
      "useLayoutEffect runs synchronously after DOM mutations but before paint",
      "useEffect can only be used in class components",
      "useLayoutEffect is deprecated in React 18",
      "There is no functional difference, only naming"
    ],
    correctIndex: 0,
    difficulty: 6,
    category: "Frontend/React/Next.js",
    correctAnswerHash: hashCorrectIndex(0),
  },
  {
    id: "q004",
    text: "In Next.js 13+, what is the primary benefit of using Server Actions?",
    choices: [
      "They allow you to write server-side mutation logic without creating API routes",
      "They automatically cache all database queries",
      "They replace all client-side JavaScript",
      "They enable static site generation"
    ],
    correctIndex: 0,
    difficulty: 7,
    category: "Frontend/React/Next.js",
    correctAnswerHash: hashCorrectIndex(0),
  },
  {
    id: "q005",
    text: "What does React's reconciliation algorithm primarily optimize for?",
    choices: [
      "Minimizing network requests",
      "Minimizing DOM manipulations by efficiently comparing virtual DOM trees",
      "Reducing bundle size",
      "Optimizing CSS rendering"
    ],
    correctIndex: 1,
    difficulty: 5,
    category: "Frontend/React/Next.js",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q006",
    text: "What is the purpose of the 'key' prop in React lists?",
    choices: [
      "To encrypt data in the component",
      "To help React identify which items have changed, added, or removed",
      "To define CSS classes for styling",
      "To set the tab order for accessibility"
    ],
    correctIndex: 1,
    difficulty: 4,
    category: "Frontend/React/Next.js",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q007",
    text: "In Next.js, what does ISR (Incremental Static Regeneration) enable?",
    choices: [
      "Real-time updates using WebSockets",
      "Updating static pages after build time without rebuilding the entire site",
      "Server-side rendering on every request",
      "Client-side data fetching only"
    ],
    correctIndex: 1,
    difficulty: 6,
    category: "Frontend/React/Next.js",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q008",
    text: "What is CSS-in-JS primarily designed to solve?",
    choices: [
      "Making CSS faster to download",
      "Scoping styles to components and enabling dynamic styling based on props/state",
      "Converting CSS to JavaScript syntax",
      "Removing the need for CSS preprocessors only"
    ],
    correctIndex: 1,
    difficulty: 3,
    category: "Frontend/React/Next.js",
    correctAnswerHash: hashCorrectIndex(1),
  },

  // ── Backend/Node.js/APIs (8 questions, difficulty 3-7) ──
  {
    id: "q009",
    text: "What does idempotency mean in the context of REST APIs?",
    choices: [
      "The endpoint always returns the same response regardless of input",
      "Making the same request multiple times has the same effect as making it once",
      "The API never modifies server state",
      "The API can only be called by authenticated users"
    ],
    correctIndex: 1,
    difficulty: 5,
    category: "Backend/Node.js/APIs",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q010",
    text: "In Node.js, what is the event loop responsible for?",
    choices: [
      "Compiling JavaScript to machine code",
      "Managing asynchronous operations and callbacks",
      "Handling HTTP requests only",
      "Managing memory allocation"
    ],
    correctIndex: 1,
    difficulty: 5,
    category: "Backend/Node.js/APIs",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q011",
    text: "What is the primary purpose of middleware in Express.js?",
    choices: [
      "To replace route handlers entirely",
      "To process requests before they reach route handlers or after responses are sent",
      "To store session data",
      "To compile TypeScript code"
    ],
    correctIndex: 1,
    difficulty: 4,
    category: "Backend/Node.js/APIs",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q012",
    text: "Which HTTP status code should be returned for a successful resource creation?",
    choices: [
      "200 OK",
      "201 Created",
      "204 No Content",
      "202 Accepted"
    ],
    correctIndex: 1,
    difficulty: 3,
    category: "Backend/Node.js/APIs",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q013",
    text: "What is the purpose of CORS (Cross-Origin Resource Sharing)?",
    choices: [
      "To encrypt data in transit",
      "To allow or restrict web applications from making requests to different domains",
      "To compress HTTP responses",
      "To authenticate users"
    ],
    correctIndex: 1,
    difficulty: 4,
    category: "Backend/Node.js/APIs",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q014",
    text: "In JWT (JSON Web Tokens), what is the primary purpose of the signature?",
    choices: [
      "To encrypt the payload data",
      "To verify the token hasn't been tampered with",
      "To store user passwords",
      "To compress the token size"
    ],
    correctIndex: 1,
    difficulty: 5,
    category: "Backend/Node.js/APIs",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q015",
    text: "What is the difference between PUT and PATCH HTTP methods?",
    choices: [
      "PUT is for creating, PATCH is for deleting",
      "PUT replaces the entire resource, PATCH partially updates it",
      "PATCH is faster than PUT",
      "They are functionally identical"
    ],
    correctIndex: 1,
    difficulty: 4,
    category: "Backend/Node.js/APIs",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q016",
    text: "What is the purpose of rate limiting in APIs?",
    choices: [
      "To reduce server costs by limiting responses",
      "To prevent abuse and ensure fair resource usage across clients",
      "To slow down all requests equally",
      "To encrypt API responses"
    ],
    correctIndex: 1,
    difficulty: 4,
    category: "Backend/Node.js/APIs",
    correctAnswerHash: hashCorrectIndex(1),
  },

  // ── System Design (6 questions, difficulty 6-9) ──
  {
    id: "q017",
    text: "In a distributed system, what does the CAP theorem state?",
    choices: [
      "A system can be Consistent, Available, and Partition-tolerant simultaneously",
      "A system can only guarantee two of: Consistency, Availability, Partition tolerance",
      "Consistency and Availability are always mutually exclusive",
      "Partition tolerance is optional in modern cloud systems"
    ],
    correctIndex: 1,
    difficulty: 7,
    category: "System Design",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q018",
    text: "What is the primary purpose of a CDN (Content Delivery Network)?",
    choices: [
      "To backup data across multiple servers",
      "To cache and serve content from locations closer to users, reducing latency",
      "To encrypt all network traffic",
      "To replace database servers"
    ],
    correctIndex: 1,
    difficulty: 6,
    category: "System Design",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q019",
    text: "In microservices architecture, what is the purpose of an API Gateway?",
    choices: [
      "To replace all backend services",
      "To provide a single entry point that routes requests to appropriate microservices",
      "To store all application data",
      "To eliminate the need for authentication"
    ],
    correctIndex: 1,
    difficulty: 7,
    category: "System Design",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q020",
    text: "What is database sharding?",
    choices: [
      "Compressing database records to save space",
      "Horizontally partitioning data across multiple database instances",
      "Creating backup copies of a database",
      "Encrypting sensitive database fields"
    ],
    correctIndex: 1,
    difficulty: 7,
    category: "System Design",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q021",
    text: "What problem does eventual consistency solve in distributed systems?",
    choices: [
      "It guarantees all nodes have identical data at all times",
      "It allows systems to remain available by accepting temporary inconsistencies",
      "It eliminates network partitions",
      "It makes all operations synchronous"
    ],
    correctIndex: 1,
    difficulty: 8,
    category: "System Design",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q022",
    text: "What is the primary benefit of using a message queue (like RabbitMQ or Kafka)?",
    choices: [
      "To store permanent application data",
      "To decouple services and enable asynchronous communication",
      "To replace HTTP APIs entirely",
      "To encrypt messages automatically"
    ],
    correctIndex: 1,
    difficulty: 6,
    category: "System Design",
    correctAnswerHash: hashCorrectIndex(1),
  },

  // ── Python (6 questions, difficulty 3-7) ──
  {
    id: "q023",
    text: "What is the difference between a Python list and a generator?",
    choices: [
      "Lists are faster than generators for all operations",
      "Generators compute values lazily on demand, using less memory than lists",
      "Generators can only contain numbers",
      "Lists support iteration but generators do not"
    ],
    correctIndex: 1,
    difficulty: 4,
    category: "Python",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q024",
    text: "What does the GIL (Global Interpreter Lock) in CPython prevent?",
    choices: [
      "Multiple threads from executing Python bytecode simultaneously",
      "All forms of concurrent programming",
      "The use of external C libraries",
      "Garbage collection from running"
    ],
    correctIndex: 0,
    difficulty: 6,
    category: "Python",
    correctAnswerHash: hashCorrectIndex(0),
  },
  {
    id: "q025",
    text: "What is the purpose of Python's @property decorator?",
    choices: [
      "To make a method static",
      "To define getter/setter methods that look like attributes",
      "To cache function results",
      "To make a class abstract"
    ],
    correctIndex: 1,
    difficulty: 5,
    category: "Python",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q026",
    text: "In Python, what is the difference between 'is' and '=='?",
    choices: [
      "They are completely identical operators",
      "'is' checks object identity (same object), '==' checks value equality",
      "'is' is faster but less accurate than '=='",
      "'is' only works with numbers"
    ],
    correctIndex: 1,
    difficulty: 4,
    category: "Python",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q027",
    text: "What is a Python context manager (used with 'with' statement)?",
    choices: [
      "A way to import modules conditionally",
      "An object that defines setup and teardown actions for a code block",
      "A thread synchronization primitive",
      "A type of decorator"
    ],
    correctIndex: 1,
    difficulty: 5,
    category: "Python",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q028",
    text: "What does Python's *args parameter in a function signature allow?",
    choices: [
      "Only positional arguments",
      "A variable number of positional arguments passed as a tuple",
      "Keyword-only arguments",
      "Default parameter values"
    ],
    correctIndex: 1,
    difficulty: 3,
    category: "Python",
    correctAnswerHash: hashCorrectIndex(1),
  },

  // ── AI/ML Fundamentals (6 questions, difficulty 5-9) ──
  {
    id: "q029",
    text: "What is the vanishing gradient problem in deep neural networks?",
    choices: [
      "When the model's weights become too large during training",
      "When gradients become very small during backpropagation, preventing early layers from learning",
      "When the learning rate is set too high",
      "When the training data is insufficient"
    ],
    correctIndex: 1,
    difficulty: 6,
    category: "AI/ML",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q030",
    text: "What does the 'attention mechanism' in transformers primarily allow?",
    choices: [
      "The model to process tokens in parallel rather than sequentially",
      "The model to focus on relevant parts of the input when generating each output token",
      "The model to use less memory during training",
      "The model to handle variable-length inputs"
    ],
    correctIndex: 1,
    difficulty: 7,
    category: "AI/ML",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q031",
    text: "What is the purpose of dropout in neural networks?",
    choices: [
      "To reduce training time by skipping layers",
      "To prevent overfitting by randomly deactivating neurons during training",
      "To increase model capacity",
      "To normalize input data"
    ],
    correctIndex: 1,
    difficulty: 5,
    category: "AI/ML",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q032",
    text: "In machine learning, what is the bias-variance tradeoff?",
    choices: [
      "The tradeoff between model training time and accuracy",
      "The tradeoff between underfitting (high bias) and overfitting (high variance)",
      "The tradeoff between precision and recall",
      "The tradeoff between supervised and unsupervised learning"
    ],
    correctIndex: 1,
    difficulty: 7,
    category: "AI/ML",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q033",
    text: "What is the primary advantage of transfer learning?",
    choices: [
      "It eliminates the need for labeled data entirely",
      "It allows leveraging knowledge from pre-trained models to solve new tasks faster",
      "It reduces model size by 90%",
      "It only works for image classification"
    ],
    correctIndex: 1,
    difficulty: 6,
    category: "AI/ML",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q034",
    text: "What is backpropagation in neural networks?",
    choices: [
      "A technique for visualizing neural network decisions",
      "An algorithm for computing gradients by propagating errors backward through the network",
      "A method for initializing weights",
      "A regularization technique"
    ],
    correctIndex: 1,
    difficulty: 6,
    category: "AI/ML",
    correctAnswerHash: hashCorrectIndex(1),
  },

  // ── Data Structures & Algorithms (6 questions, difficulty 4-8) ──
  {
    id: "q035",
    text: "What is the time complexity of inserting into a hash table on average?",
    choices: [
      "O(log n)",
      "O(n)",
      "O(1)",
      "O(n log n)"
    ],
    correctIndex: 2,
    difficulty: 4,
    category: "Data Structures & Algorithms",
    correctAnswerHash: hashCorrectIndex(2),
  },
  {
    id: "q036",
    text: "What property must a binary search tree (BST) satisfy?",
    choices: [
      "All left descendants ≤ node < all right descendants",
      "All nodes must have exactly two children",
      "The tree must be perfectly balanced",
      "All leaf nodes must be at the same level"
    ],
    correctIndex: 0,
    difficulty: 4,
    category: "Data Structures & Algorithms",
    correctAnswerHash: hashCorrectIndex(0),
  },
  {
    id: "q037",
    text: "What is the time complexity of QuickSort in the average case?",
    choices: [
      "O(n)",
      "O(n log n)",
      "O(n²)",
      "O(log n)"
    ],
    correctIndex: 1,
    difficulty: 5,
    category: "Data Structures & Algorithms",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q038",
    text: "What problem does dynamic programming solve?",
    choices: [
      "Finding solutions to NP-complete problems in polynomial time",
      "Optimizing recursive solutions by storing and reusing overlapping subproblem results",
      "Sorting data in linear time",
      "Distributing computation across multiple machines"
    ],
    correctIndex: 1,
    difficulty: 6,
    category: "Data Structures & Algorithms",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q039",
    text: "What data structure would be most efficient for implementing an LRU (Least Recently Used) cache?",
    choices: [
      "Array only",
      "Hash map + doubly linked list",
      "Binary search tree",
      "Stack"
    ],
    correctIndex: 1,
    difficulty: 7,
    category: "Data Structures & Algorithms",
    correctAnswerHash: hashCorrectIndex(1),
  },
  {
    id: "q040",
    text: "What is the space complexity of Depth-First Search (DFS) on a graph?",
    choices: [
      "O(1)",
      "O(h) where h is the maximum depth/height",
      "O(n²)",
      "O(log n)"
    ],
    correctIndex: 1,
    difficulty: 6,
    category: "Data Structures & Algorithms",
    correctAnswerHash: hashCorrectIndex(1),
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
