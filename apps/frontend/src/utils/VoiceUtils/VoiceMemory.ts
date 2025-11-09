// src/utils/VoiceMemory.ts
export type VoiceContext = {
  lastIntent?: string; // e.g. "weather", "travel", "style"
  lastCity?: string;
  lastDate?: string;
  lastAction?: string;
  lastTopic?: string;
};

type MemoryEntry = {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  data?: Record<string, any>;
};

let memory: VoiceContext = {};
let shortTerm: MemoryEntry[] = []; // 🧠 rolling short-term memory

export const VoiceMemory = {
  // ───────── basic API (compatible with existing code) ─────────
  set: (key: keyof VoiceContext, value: string) => {
    memory[key] = value;
  },
  get: (key: keyof VoiceContext) => memory[key],
  all: () => memory,
  clear: () => {
    memory = {};
    shortTerm = [];
  },

  // ───────── contextual extensions ─────────
  pushContext: (entry: MemoryEntry) => {
    shortTerm.push(entry);
    if (shortTerm.length > 10) shortTerm.shift(); // keep last 10 exchanges
  },
  getContext: () => shortTerm,
  getLastUser: () => [...shortTerm].reverse().find(e => e.role === 'user'),
  getLastAssistant: () =>
    [...shortTerm].reverse().find(e => e.role === 'assistant'),
};

//////////////////

// // src/utils/VoiceMemory.ts
// export type VoiceContext = {
//   lastItem?: string;
//   lastCategory?: string;
//   lastMood?: string;
//   lastAction?: string;
// };

// let memory: VoiceContext = {};

// export const VoiceMemory = {
//   set: (key: keyof VoiceContext, value: string) => {
//     memory[key] = value;
//   },
//   get: (key: keyof VoiceContext) => memory[key],
//   clear: () => {
//     memory = {};
//   },
//   all: () => memory,
// };
