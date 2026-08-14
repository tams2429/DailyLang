import { create } from 'zustand';
import { fetchPhrases, submitPracticeResponse } from '../api/client';
import { scenarios } from '../data/scenarios';
import type { Phrase, ScenarioId } from '../types';

function computeScenarioPhrases(
    phrases: Phrase[],
    scenario: ScenarioId,
): Phrase[] {
    return phrases
        .filter((p) => p.scenario === scenario)
        .sort((a, b) => a.order - b.order);
}

interface PhraseStore {
    phrases: Phrase[];
    scenarioPhrases: Phrase[];
    currentScenario: ScenarioId;
    currentIndex: number;
    status: 'idle' | 'loading' | 'loaded' | 'error';
    error: string | null;
    submitting: boolean;
    lastSubmittedText: string | null;

    currentPhrase: () => Phrase | null;
    loadPhrases: () => Promise<void>;
    nextPhrase: () => void;
    previousPhrase: () => void;
    setScenario: (scenario: ScenarioId) => void;
    submitResponse: (text: string) => Promise<void>;
}

export const usePhraseStore = create<PhraseStore>((set, get) => ({
    phrases: [],
    scenarioPhrases: [],
    currentScenario: scenarios[0].id,
    currentIndex: 0,
    status: 'idle',
    error: null,
    submitting: false,
    lastSubmittedText: null,

    currentPhrase: () => get().scenarioPhrases[get().currentIndex] ?? null,

    loadPhrases: async () => {
        set({ status: 'loading', error: null });
        try {
            const phrases = await fetchPhrases();
            set({
                phrases,
                scenarioPhrases: computeScenarioPhrases(
                    phrases,
                    get().currentScenario,
                ),
                status: 'loaded',
                currentIndex: 0,
            });
        } catch (err) {
            set({ status: 'error', error: (err as Error).message });
        }
    },

    nextPhrase: () =>
        set((state) => ({
            currentIndex: Math.min(
                state.currentIndex + 1,
                state.scenarioPhrases.length - 1,
            ),
            lastSubmittedText: null,
        })),

    previousPhrase: () =>
        set((state) => ({
            currentIndex: Math.max(state.currentIndex - 1, 0),
            lastSubmittedText: null,
        })),

    setScenario: (scenario: ScenarioId) =>
        set((state) => ({
            currentScenario: scenario,
            scenarioPhrases: computeScenarioPhrases(state.phrases, scenario),
            currentIndex: 0,
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
