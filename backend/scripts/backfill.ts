// One-off script to backfill any scenarios from the local JSON cache
// (data/generated-phrases.json) into the Neon database. Safe to re-run:
// existing rows are left untouched (on conflict do nothing).
//
// Run with: bun run scripts/backfill.ts
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

const file = Bun.file(`${import.meta.dir}/../data/generated-phrases.json`);
const cache: Record<
    string,
    { label: string; phrases: unknown[]; updatedAt: string }
> = (await file.exists()) ? await file.json() : {};

let count = 0;
for (const [slug, entry] of Object.entries(cache)) {
    await sql`
        insert into scenarios (slug, label, phrases, updated_at)
        values (${slug}, ${entry.label}, ${sql.json(entry.phrases)}, ${entry.updatedAt})
        on conflict (slug) do nothing
    `;
    count++;
}

console.log(`Backfill complete. Processed ${count} scenario(s).`);
await sql.end();
