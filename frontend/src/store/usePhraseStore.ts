import { create } from 'zustand';
import {
    createPhrase,
    deletePhrase,
    deleteScenario,
    fetchGeneratedScenarios,
    fetchPhrases,
    generatePhrases,
    restorePhrase,
    submitPracticeResponse,
} from '../api/client';
import type { NewPhraseInput } from '../api/client';
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

    /** The most recently deleted phrase, kept around so it can be undone */
    deletedPhrase: Phrase | null;
    deleting: boolean;
    deleteError: string | null;
    undoing: boolean;

    adding: boolean;
    addError: string | null;

    deletingScenario: boolean;
    deleteScenarioError: string | null;

    currentPhrase: () => Phrase | null;
    loadPhrases: () => Promise<void>;
    nextPhrase: () => void;
    previousPhrase: () => void;
    setScenario: (scenario: ScenarioId) => void;
    submitResponse: (text: string) => Promise<void>;
    generateScenario: (input: string, force?: boolean) => Promise<void>;
    deleteCurrentPhrase: () => Promise<void>;
    undoDelete: () => Promise<void>;
    addPhrase: (
        input: Omit<NewPhraseInput, 'scenario' | 'label'>,
    ) => Promise<boolean>;
    createScenarioWithPhrase: (
        scenarioLabel: string,
        input: Omit<NewPhraseInput, 'scenario' | 'label' | 'insertAfterId'>,
    ) => Promise<boolean>;
    deleteEntireScenario: (scenarioId: string) => Promise<boolean>;
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
    deletedPhrase: null,
    deleting: false,
    deleteError: null,
    undoing: false,
    adding: false,
    addError: null,
    deletingScenario: false,
    deleteScenarioError: null,

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
            deletedPhrase: null,
        })),

    previousPhrase: () =>
        set((state) => ({
            currentIndex: Math.max(state.currentIndex - 1, 0),
            lastSubmittedText: null,
            deletedPhrase: null,
        })),

    setScenario: (scenario: ScenarioId) =>
        set((state) => ({
            currentScenario: scenario,
            scenarioPhrases: computeScenarioPhrases(state.phrases, scenario),
            currentIndex: 0,
            lastSubmittedText: null,
            deletedPhrase: null,
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

    deleteCurrentPhrase: async () => {
        const phrase = get().currentPhrase();
        if (!phrase || phrase.source !== 'generated') return;

        set({ deleting: true, deleteError: null });
        try {
            const deleted = await deletePhrase(phrase.id);
            set((state) => {
                const nextPhrases = state.phrases.filter(
                    (p) => p.id !== deleted.id,
                );
                const nextScenarioPhrases = computeScenarioPhrases(
                    nextPhrases,
                    state.currentScenario,
                );
                // The backend auto-deletes the scenario itself once its last
                // phrase is gone, so mirror that here too.
                const customScenarios =
                    nextScenarioPhrases.length === 0
                        ? state.customScenarios.filter(
                              (s) => s.id !== state.currentScenario,
                          )
                        : state.customScenarios;
                return {
                    phrases: nextPhrases,
                    scenarioPhrases: nextScenarioPhrases,
                    customScenarios,
                    currentIndex: Math.min(
                        state.currentIndex,
                        Math.max(nextScenarioPhrases.length - 1, 0),
                    ),
                    deletedPhrase: deleted,
                    lastSubmittedText: null,
                };
            });
        } catch (err) {
            set({ deleteError: (err as Error).message });
        } finally {
            set({ deleting: false });
        }
    },

    undoDelete: async () => {
        const phrase = get().deletedPhrase;
        if (!phrase) return;

        set({ undoing: true });
        try {
            const restored = await restorePhrase(phrase);
            set((state) => {
                const nextPhrases = [...state.phrases, restored];
                const nextScenarioPhrases = computeScenarioPhrases(
                    nextPhrases,
                    state.currentScenario,
                );
                const restoredIndex = nextScenarioPhrases.findIndex(
                    (p) => p.id === restored.id,
                );
                // Undoing a last-phrase delete recreates the scenario on the
                // backend, so bring it back into the local list too.
                const hasCustom = state.customScenarios.some(
                    (s) => s.id === restored.scenario,
                );
                const customScenarios = hasCustom
                    ? state.customScenarios
                    : [
                          ...state.customScenarios,
                          {
                              id: restored.scenario,
                              label: restored.scenario,
                              description: 'Custom generated scenario',
                          },
                      ];
                return {
                    phrases: nextPhrases,
                    scenarioPhrases: nextScenarioPhrases,
                    customScenarios,
                    currentIndex:
                        restoredIndex >= 0 ? restoredIndex : state.currentIndex,
                    deletedPhrase: null,
                };
            });
        } catch (err) {
            set({ deleteError: (err as Error).message });
        } finally {
            set({ undoing: false });
        }
    },

    addPhrase: async (input) => {
        const scenario = get().currentScenario;
        const label =
            get().customScenarios.find((s) => s.id === scenario)?.label ??
            scenarios.find((s) => s.id === scenario)?.label;
        const insertAfterId = get().currentPhrase()?.id;

        set({ adding: true, addError: null });
        try {
            const result = await createPhrase({
                ...input,
                scenario,
                label,
                insertAfterId,
            });
            set((state) => {
                const nextPhrases = [
                    ...state.phrases.filter((p) => p.scenario !== scenario),
                    ...result.scenarioPhrases,
                ];
                const nextScenarioPhrases = computeScenarioPhrases(
                    nextPhrases,
                    state.currentScenario,
                );
                const createdIndex = nextScenarioPhrases.findIndex(
                    (p) => p.id === result.phrase.id,
                );
                return {
                    phrases: nextPhrases,
                    scenarioPhrases: nextScenarioPhrases,
                    currentIndex:
                        createdIndex >= 0 ? createdIndex : state.currentIndex,
                    deletedPhrase: null,
                    lastSubmittedText: null,
                };
            });
            return true;
        } catch (err) {
            set({ addError: (err as Error).message });
            return false;
        } finally {
            set({ adding: false });
        }
    },

    createScenarioWithPhrase: async (scenarioLabel, input) => {
        const label = scenarioLabel.trim();
        if (!label) return false;

        set({ adding: true, addError: null });
        try {
            const result = await createPhrase({
                ...input,
                scenario: label,
                label,
            });
            const scenarioId = result.phrase.scenario;
            set((state) => {
                const nextPhrases = [
                    ...state.phrases.filter((p) => p.scenario !== scenarioId),
                    ...result.scenarioPhrases,
                ];
                const hasCustom = state.customScenarios.some(
                    (s) => s.id === scenarioId,
                );
                const customScenarios = hasCustom
                    ? state.customScenarios
                    : [
                          ...state.customScenarios,
                          {
                              id: scenarioId,
                              label,
                              description: 'Custom generated scenario',
                          },
                      ];
                return {
                    phrases: nextPhrases,
                    customScenarios,
                    currentScenario: scenarioId,
                    scenarioPhrases: computeScenarioPhrases(
                        nextPhrases,
                        scenarioId,
                    ),
                    currentIndex: 0,
                    deletedPhrase: null,
                    lastSubmittedText: null,
                };
            });
            return true;
        } catch (err) {
            set({ addError: (err as Error).message });
            return false;
        } finally {
            set({ adding: false });
        }
    },

    deleteEntireScenario: async (scenarioId) => {
        set({ deletingScenario: true, deleteScenarioError: null });
        try {
            await deleteScenario(scenarioId);
            set((state) => {
                const nextPhrases = state.phrases.filter(
                    (p) => p.scenario !== scenarioId,
                );
                const customScenarios = state.customScenarios.filter(
                    (s) => s.id !== scenarioId,
                );
                return {
                    phrases: nextPhrases,
                    customScenarios,
                    deletedPhrase: null,
                };
            });
            return true;
        } catch (err) {
            set({ deleteScenarioError: (err as Error).message });
            return false;
        } finally {
            set({ deletingScenario: false });
        }
    },
}));
