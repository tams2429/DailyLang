import type { Phrase, PracticeResponseEntry } from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request to ${path} failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchPhrases(): Promise<Phrase[]> {
  return request<Phrase[]>("/api/phrases");
}

export function fetchDailyPhrase(): Promise<Phrase> {
  return request<Phrase>("/api/phrases/daily");
}

export function submitPracticeResponse(
  phraseId: string,
  text: string,
): Promise<{ ok: true; phraseId: string; entry: PracticeResponseEntry }> {
  return request(`/api/phrases/${phraseId}/responses`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function fetchPracticeHistory(phraseId: string): Promise<PracticeResponseEntry[]> {
  return request<PracticeResponseEntry[]>(`/api/phrases/${phraseId}/responses`);
}
