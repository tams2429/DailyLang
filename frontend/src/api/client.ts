import type { Phrase, PracticeResponseEntry } from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(path, {
        headers: { 'Content-Type': 'application/json' },
        ...init,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
            body?.error ?? `Request to ${path} failed with ${res.status}`,
        );
    }
    return res.json() as Promise<T>;
}

export function fetchPhrases(): Promise<Phrase[]> {
    return request<Phrase[]>('/api/phrases');
}

export function reorderScenarioPhrases(
    scenario: string,
    phraseIds: string[],
): Promise<Phrase[]> {
    return request<Phrase[]>(`/api/scenarios/${scenario}/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ phraseIds }),
    });
}

export function fetchDailyPhrase(): Promise<Phrase> {
    return request<Phrase>('/api/phrases/daily');
}

export function submitPracticeResponse(
    phraseId: string,
    text: string,
): Promise<{ ok: true; phraseId: string; entry: PracticeResponseEntry }> {
    return request(`/api/phrases/${phraseId}/responses`, {
        method: 'POST',
        body: JSON.stringify({ text }),
    });
}

export function fetchPracticeHistory(
    phraseId: string,
): Promise<PracticeResponseEntry[]> {
    return request<PracticeResponseEntry[]>(
        `/api/phrases/${phraseId}/responses`,
    );
}

// Deletes a previously LLM-generated phrase and returns the deleted phrase so
// the caller can offer an "undo" action that restores it.
export function deletePhrase(phraseId: string): Promise<Phrase> {
    return request<Phrase>(`/api/phrases/${phraseId}`, {
        method: 'DELETE',
    });
}

export interface NewPhraseInput {
    scenario: string;
    label?: string;
    japanese: string;
    romaji: string;
    english: string;
    difficulty: Phrase['difficulty'];
    exampleResponse?: string;
    exampleResponseJapanese?: string;
    /** Slot the new phrase in right after this phrase id, if provided */
    insertAfterId?: string;
}

export interface CreatePhraseResult {
    phrase: Phrase;
    /** Full, correctly ordered phrase list for the scenario after insertion */
    scenarioPhrases: Phrase[];
}

// Adds a manually written phrase to a scenario, slotted in after
// insertAfterId if provided (otherwise appended to the end).
export function createPhrase(
    input: NewPhraseInput,
): Promise<CreatePhraseResult> {
    return request<CreatePhraseResult>('/api/phrases', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

// Undoes a deletion by re-adding the previously deleted phrase.
export function restorePhrase(phrase: Phrase): Promise<Phrase> {
    return request<Phrase>(`/api/phrases/${phrase.id}/restore`, {
        method: 'POST',
        body: JSON.stringify(phrase),
    });
}

export interface GeneratePhrasesResult {
    scenario: string;
    label: string;
    phrases: Phrase[];
    cached: boolean;
}

// Requests phrases for a scenario from the backend, which serves them from
// its JSON cache if already generated, or calls the Gemini API and caches
// the result. Pass force to bypass the cache and regenerate.
export function generatePhrases(
    scenario: string,
    options?: { label?: string; force?: boolean },
): Promise<GeneratePhrasesResult> {
    return request<GeneratePhrasesResult>('/api/phrases/generate', {
        method: 'POST',
        body: JSON.stringify({
            scenario,
            label: options?.label,
            force: options?.force ?? false,
        }),
    });
}

export interface GeneratedScenarioMeta {
    id: string;
    label: string;
    description: string;
}

export interface DeletedScenario {
    scenario: string;
    label: string;
    phrases: Phrase[];
}

export interface TranslatedPhrase {
    japanese: string;
    romaji: string;
    english: string;
    exampleResponse: string;
    exampleResponseJapanese: string;
}

// Fills in whichever of japanese/romaji/english weren't provided, using the
// backend's LLM translation endpoint.
export function translatePhrase(input: {
    japanese?: string;
    romaji?: string;
    english?: string;
    exampleResponse?: string;
    exampleResponseJapanese?: string;
}): Promise<TranslatedPhrase> {
    return request<TranslatedPhrase>('/api/phrases/translate', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export function fetchGeneratedScenarios(): Promise<GeneratedScenarioMeta[]> {
    return request<GeneratedScenarioMeta[]>('/api/scenarios/generated');
}

// Deletes an entire user-generated scenario and all of its phrases.
export function deleteScenario(scenarioId: string): Promise<DeletedScenario> {
    return request<DeletedScenario>(`/api/scenarios/${scenarioId}`, {
        method: 'DELETE',
    });
}

export function restoreScenario(
    scenario: DeletedScenario,
): Promise<DeletedScenario> {
    return request<DeletedScenario>(
        `/api/scenarios/${scenario.scenario}/restore`,
        {
            method: 'POST',
            body: JSON.stringify(scenario),
        },
    );
}
