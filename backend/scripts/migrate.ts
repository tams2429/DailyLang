// One-off script to create the DB schema. Run once with:
//   bun run scripts/migrate.ts
import postgres from 'postgres';

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
await sql.end();
