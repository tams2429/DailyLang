// One-off script to create the DB schema. Run once with:
//   bun run scripts/migrate.ts
import postgres from 'postgres';
import { phrases, scenarios } from '../src/data/phrases';

const sql = postgres(process.env.DATABASE_URL!);

await sql`
    create table if not exists scenarios (
        slug text primary key,
        label text not null,
        phrases jsonb not null,
        updated_at timestamptz not null default now()
    )
`;

await sql`
    create table if not exists practice_responses (
        id bigserial primary key,
        phrase_id text not null,
        text text not null,
        submitted_at timestamptz not null default now()
    )
`;

await sql`
    create index if not exists practice_responses_phrase_id_idx
    on practice_responses (phrase_id)
`;

console.log('Schema created/verified.');

if (process.argv.includes('--refresh-seeds')) {
    for (const scenario of scenarios) {
        const seedPhrases = phrases
            .filter((phrase) => phrase.scenario === scenario.id)
            .map((phrase) => ({ ...phrase, source: 'seed' as const }));

        await sql`
            insert into scenarios (slug, label, phrases, updated_at)
            values (${scenario.id}, ${scenario.label}, ${sql.json(seedPhrases)}, now())
            on conflict (slug) do update
            set label = excluded.label,
                phrases = excluded.phrases,
                updated_at = excluded.updated_at
        `;
    }
    console.log('Seed scenarios refreshed from source data.');
}

await sql.end();
