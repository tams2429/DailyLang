import { create } from 'zustand';
import {
    fetchGeneratedScenarios,
    fetchPhrases,
    generatePhrases,
    submitPracticeResponse,
} from '../api/client';
import { scenarios } from '../data/scenarios';
import type { Phrase, ScenarioId, ScenarioMeta } from '../types';

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

    /** Scenarios previously generated via the LLM (loaded from the backend cache) */
    customScenarios: ScenarioMeta[];
    generating: boolean;
    generateError: string | null;

    currentPhrase: () => Phrase | null;
    loadPhrases: () => Promise<void>;
    nextPhrase: () => void;
    previousPhrase: () => void;
    setScenario: (scenario: ScenarioId) => void;
    submitResponse: (text: string) => Promise<void>;
    generateScenario: (input: string, force?: boolean) => Promise<void>;
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
    customScenarios: [],
    generating: false,
    generateError: null,

    currentPhrase: () => get().scenarioPhrases[get().currentIndex] ?? null,

    loadPhrases: async () => {
        set({ status: 'loading', error: null });
        try {
            const [phrases, customScenarios] = await Promise.all([
                fetchPhrases(),
                fetchGeneratedScenarios().catch(() => []),
            ]);
            set({
                phrases,
                customScenarios,
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

    generateScenario: async (input: string, force = false) => {
        const label = input.trim();
        if (!label) return;

        set({ generating: true, generateError: null });
        try {
            const result = await generatePhrases(label, { label, force });
            set((state) => {
                const others = state.phrases.filter(
                    (p) => p.scenario !== result.scenario,
                );
                const nextPhrases = [...others, ...result.phrases];
                const hasCustom = state.customScenarios.some(
                    (s) => s.id === result.scenario,
                );
                const customScenarios = hasCustom
                    ? state.customScenarios
                    : [
                          ...state.customScenarios,
                          {
                              id: result.scenario,
                              label: result.label,
                              description: 'Custom generated scenario',
                          },
                      ];
                return {
                    phrases: nextPhrases,
                    customScenarios,
                    currentScenario: result.scenario,
                    scenarioPhrases: computeScenarioPhrases(
                        nextPhrases,
                        result.scenario,
                    ),
                    currentIndex: 0,
                    lastSubmittedText: null,
                };
            });
        } catch (err) {
            set({ generateError: (err as Error).message });
        } finally {
            set({ generating: false });
        }
    },
}));

