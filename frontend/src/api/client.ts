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

export function fetchGeneratedScenarios(): Promise<GeneratedScenarioMeta[]> {
    return request<GeneratedScenarioMeta[]>('/api/scenarios/generated');
}
