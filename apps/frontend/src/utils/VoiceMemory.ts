// src/utils/VoiceMemory.ts
export type VoiceContext = {
  lastItem?: string;
  lastCategory?: string;
  lastMood?: string;
  lastAction?: string;
};

let memory: VoiceContext = {};

export const VoiceMemory = {
  set: (key: keyof VoiceContext, value: string) => {
    memory[key] = value;
  },
  get: (key: keyof VoiceContext) => memory[key],
  clear: () => {
    memory = {};
  },
  all: () => memory,
};
