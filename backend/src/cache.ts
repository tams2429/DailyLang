import postgres from 'postgres';
import type { Phrase } from './data/phrases';

// DB-backed cache of LLM-generated scenario phrases, keyed by a slugified
// scenario id, stored in Neon Postgres so all instances (localhost, deployed)
// share the same data and concurrent writes are safe (atomic upserts).
//
// A local JSON snapshot (data/generated-phrases.json) is kept as a
// stale-if-error fallback: reads/writes fall back to it if the DB is
// unreachable, and it's refreshed whenever the DB call succeeds.
export interface CachedScenario {
    label: string;
    phrases: Phrase[];
    updatedAt: string;
}

type Cache = Record<string, CachedScenario>;

const CACHE_PATH = `${import.meta.dir}/../data/generated-phrases.json`;

const sql = postgres(process.env.DATABASE_URL!, {
    connect_timeout: 5,
    max: 5,
});

// Local snapshot used only as a fallback when the DB is unreachable.
let fallbackSnapshot: Cache | null = null;

async function loadFallback(): Promise<Cache> {
    if (fallbackSnapshot) return fallbackSnapshot;

    const file = Bun.file(CACHE_PATH);
    if (await file.exists()) {
        try {
            fallbackSnapshot = (await file.json()) as Cache;
        } catch {
            fallbackSnapshot = {};
        }
    } else {
        fallbackSnapshot = {};
    }
    return fallbackSnapshot;
}

async function writeFallback(next: Cache): Promise<void> {
    fallbackSnapshot = next;
    await Bun.write(CACHE_PATH, JSON.stringify(next, null, 4));
}

function rowToScenario(row: {
    label: string;
    phrases: Phrase[];
    updated_at: Date;
}): CachedScenario {
    return {
        label: row.label,
        phrases: row.phrases,
        updatedAt: row.updated_at.toISOString(),
    };
}

export async function getCachedScenario(
    slug: string,
): Promise<CachedScenario | null> {
    try {
        const [row] = await sql`
            select label, phrases, updated_at from scenarios where slug = ${slug}
        `;
        return row ? rowToScenario(row as any) : null;
    } catch (err) {
        console.error('DB read failed, using fallback cache:', err);
        const fallback = await loadFallback();
        return fallback[slug] ?? null;
    }
}

export async function setCachedScenario(
    slug: string,
    label: string,
    phrases: Phrase[],
): Promise<void> {
    const updatedAt = new Date();

    try {
        await sql`
            insert into scenarios (slug, label, phrases, updated_at)
            values (${slug}, ${label}, ${sql.json(phrases as unknown as object)}, ${updatedAt})
            on conflict (slug) do update
            set label = excluded.label,
                phrases = excluded.phrases,
                updated_at = excluded.updated_at
        `;
    } catch (err) {
        console.error(
            'DB write failed, generated scenario will only be saved locally:',
            err,
        );
        // Fall through: still update the local fallback so this session can
        // keep working even though the DB is unreachable.
    }

    // Keep the local fallback snapshot in sync so it reflects the latest
    // known-good data (used if the DB goes down later).
    const fallback = await loadFallback();
    await writeFallback({
        ...fallback,
        [slug]: { label, phrases, updatedAt: updatedAt.toISOString() },
    });
}

// Unlike setCachedScenario, DB failures here are NOT swallowed: silently
// "deleting" only from the local fallback would make the scenario reappear
// on the next DB read, so callers must see the error and can report failure.
export async function deleteCachedScenario(slug: string): Promise<void> {
    await sql`delete from scenarios where slug = ${slug}`;

    const fallback = await loadFallback();
    if (slug in fallback) {
        const { [slug]: _removed, ...rest } = fallback;
        await writeFallback(rest);
    }
}

export async function getAllCachedScenarios(): Promise<Cache> {
    try {
        const rows = await sql`
            select slug, label, phrases, updated_at from scenarios
        `;
        const result = Object.fromEntries(
            rows.map((r: any) => [r.slug, rowToScenario(r)]),
        );
        // Refresh fallback snapshot opportunistically whenever DB is healthy.
        await writeFallback(result);
        return result;
    } catch (err) {
        console.error('DB read failed, using fallback cache:', err);
        return loadFallback();
    }
}

// --- Practice responses -----------------------------------------------
//
// DB-backed store of a learner's submitted practice responses, keyed by
// phrase id. Falls back to an in-memory map (not persisted) if the DB is
// unreachable, so submissions during an outage aren't lost mid-session but
// won't survive a restart.

export interface PracticeResponse {
    text: string;
    submittedAt: string;
}

const fallbackResponses: Record<string, PracticeResponse[]> = {};

export async function addPracticeResponse(
    phraseId: string,
    text: string,
): Promise<PracticeResponse> {
    const entry: PracticeResponse = {
        text,
        submittedAt: new Date().toISOString(),
    };

    try {
        await sql`
            insert into practice_responses (phrase_id, text, submitted_at)
            values (${phraseId}, ${entry.text}, ${entry.submittedAt})
        `;
    } catch (err) {
        console.error(
            'DB write failed, practice response will only be kept in memory for this session:',
            err,
        );
        fallbackResponses[phraseId] ??= [];
        fallbackResponses[phraseId].push(entry);
    }

    return entry;
}

export async function getPracticeResponses(
    phraseId: string,
): Promise<PracticeResponse[]> {
    try {
        const rows = await sql`
            select text, submitted_at from practice_responses
            where phrase_id = ${phraseId}
            order by submitted_at asc
        `;
        return rows.map((r: any) => ({
            text: r.text,
            submittedAt: r.submitted_at.toISOString(),
        }));
    } catch (err) {
        console.error('DB read failed, using in-memory fallback:', err);
        return fallbackResponses[phraseId] ?? [];
    }
}
