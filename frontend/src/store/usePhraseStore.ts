import { create } from "zustand";
import { fetchPhrases, submitPracticeResponse } from "../api/client";
import type { Phrase } from "../types";

interface PhraseStore {
  phrases: Phrase[];
  currentIndex: number;
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;
  submitting: boolean;
  lastSubmittedText: string | null;

  currentPhrase: () => Phrase | null;
  loadPhrases: () => Promise<void>;
  nextPhrase: () => void;
  previousPhrase: () => void;
  submitResponse: (text: string) => Promise<void>;
}

export const usePhraseStore = create<PhraseStore>((set, get) => ({
  phrases: [],
  currentIndex: 0,
  status: "idle",
  error: null,
  submitting: false,
  lastSubmittedText: null,

  currentPhrase: () => get().phrases[get().currentIndex] ?? null,

  loadPhrases: async () => {
    set({ status: "loading", error: null });
    try {
      const phrases = await fetchPhrases();
      set({ phrases, status: "loaded", currentIndex: 0 });
    } catch (err) {
      set({ status: "error", error: (err as Error).message });
    }
  },

  nextPhrase: () =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.phrases.length - 1),
      lastSubmittedText: null,
    })),

  previousPhrase: () =>
    set((state) => ({
      currentIndex: Math.max(state.currentIndex - 1, 0),
      lastSubmittedText: null,
    })),

  submitResponse: async (text: string) => {
    const phrase = get().currentPhrase();
    if (!phrase) return;
    set({ submitting: true });
    try {
      await submitPracticeResponse(phrase.id, text);
      set({ lastSubmittedText: text });
    } finally {
      set({ submitting: false });
    }
  },
}));
