import type { Phrase } from './data/phrases';

// Simple JSON-file cache of LLM-generated scenario phrases, keyed by a
// slugified scenario id. Kept separate from the hand-written seed data in
// data/phrases.ts so that generated content can be regenerated/evicted
// independently. Fine for single-user/local use; swap for a real DB if this
// ever needs concurrent multi-user writes.
export interface CachedScenario {
    label: string;
    phrases: Phrase[];
    updatedAt: string;
}

type Cache = Record<string, CachedScenario>;

const CACHE_PATH = `${import.meta.dir}/../data/generated-phrases.json`;

let cache: Cache | null = null;

async function load(): Promise<Cache> {
    if (cache) return cache;

    const file = Bun.file(CACHE_PATH);
    if (await file.exists()) {
        try {
            cache = (await file.json()) as Cache;
        } catch {
            cache = {};
        }
    } else {
        cache = {};
    }
    return cache;
}

async function persist(next: Cache): Promise<void> {
    cache = next;
    await Bun.write(CACHE_PATH, JSON.stringify(next, null, 4));
}

export async function getCachedScenario(
    slug: string,
): Promise<CachedScenario | null> {
    const c = await load();
    return c[slug] ?? null;
}

export async function setCachedScenario(
    slug: string,
    label: string,
    phrases: Phrase[],
): Promise<void> {
    const c = await load();
    await persist({
        ...c,
        [slug]: { label, phrases, updatedAt: new Date().toISOString() },
    });
}

export async function getAllCachedScenarios(): Promise<Cache> {
    return load();
}
