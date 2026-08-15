import { phrases } from './data/phrases';
import { getAllCachedScenarios, getCachedScenario, setCachedScenario } from './cache';
import { generatePhrasesForScenario } from './gemini';

const PORT = Number(process.env.PORT ?? 4000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

function slugify(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-+|-+$)/g, '');
}

const corsHeaders = {
    'Access-Control-Allow-Origin': FRONTEND_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, init: ResponseInit = {}) {
    return new Response(JSON.stringify(data), {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
            ...init.headers,
        },
    });
}

// In-memory store of practice responses, keyed by phrase id.
// Resets whenever the server restarts (self-contained, no DB for now).
const practiceResponses: Record<
    string,
    { text: string; submittedAt: string }[]
> = {};

// Hand-written seed phrases plus any previously LLM-generated scenarios
// loaded from the JSON cache on disk. Mutated in place as new scenarios are
// generated so all routes below immediately see new phrases.
const cachedScenarios = await getAllCachedScenarios();
let allPhrases: (typeof phrases)[number][] = [
    ...phrases,
    ...Object.values(cachedScenarios).flatMap((entry) => entry.phrases),
];

Bun.serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);

        if (req.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // GET /api/phrases - list all phrases (seed + previously generated)
        if (url.pathname === '/api/phrases' && req.method === 'GET') {
            return json(allPhrases);
        }

        // GET /api/phrases/daily - a deterministic "phrase of the day"
        if (url.pathname === '/api/phrases/daily' && req.method === 'GET') {
            const dayIndex =
                Math.floor(Date.now() / 86_400_000) % allPhrases.length;
            return json(allPhrases[dayIndex]);
        }

        // GET /api/scenarios/generated - list scenarios generated via the LLM
        if (
            url.pathname === '/api/scenarios/generated' &&
            req.method === 'GET'
        ) {
            const cached = await getAllCachedScenarios();
            return json(
                Object.entries(cached).map(([id, entry]) => ({
                    id,
                    label: entry.label,
                    description: 'Custom generated scenario',
                })),
            );
        }

        // POST /api/phrases/generate - generate (or return cached) phrases for
        // a scenario using the Gemini API. Body: { scenario, label?, force? }
        if (url.pathname === '/api/phrases/generate' && req.method === 'POST') {
            const body = await req.json().catch(() => null);
            const rawScenario =
                typeof body?.scenario === 'string' ? body.scenario : '';
            const label =
                typeof body?.label === 'string' && body.label.trim()
                    ? body.label.trim()
                    : rawScenario.trim();
            const force = body?.force === true;
            const slug = slugify(rawScenario);

            if (!slug) {
                return json(
                    { error: 'A scenario name is required' },
                    { status: 400 },
                );
            }

            if (!force) {
                const cached = await getCachedScenario(slug);
                if (cached && cached.phrases.length > 0) {
                    return json({
                        scenario: slug,
                        label: cached.label,
                        phrases: cached.phrases,
                        cached: true,
                    });
                }
            }

            try {
                const generated = await generatePhrasesForScenario(
                    slug,
                    label,
                );
                await setCachedScenario(slug, label, generated);
                allPhrases = [
                    ...allPhrases.filter((p) => p.scenario !== slug),
                    ...generated,
                ];
                return json({
                    scenario: slug,
                    label,
                    phrases: generated,
                    cached: false,
                });
            } catch (err) {
                return json(
                    {
                        error:
                            (err as Error).message ??
                            'Failed to generate phrases',
                    },
                    { status: 502 },
                );
            }
        }

        // GET /api/phrases/:id - fetch a single phrase
        const phraseMatch = url.pathname.match(/^\/api\/phrases\/([\w-]+)$/);
        if (phraseMatch && req.method === 'GET') {
            const phrase = allPhrases.find((p) => p.id === phraseMatch[1]);
            if (!phrase)
                return json({ error: 'Phrase not found' }, { status: 404 });
            return json(phrase);
        }

        // POST /api/phrases/:id/responses - submit a practice response
        const responseMatch = url.pathname.match(
            /^\/api\/phrases\/([\w-]+)\/responses$/,
        );
        if (responseMatch && req.method === 'POST') {
            const phraseId = responseMatch[1];
            const phrase = allPhrases.find((p) => p.id === phraseId);
            if (!phrase)
                return json({ error: 'Phrase not found' }, { status: 404 });

            const body = await req.json().catch(() => null);
            const text = typeof body?.text === 'string' ? body.text.trim() : '';
            if (!text)
                return json(
                    { error: 'Response text is required' },
                    { status: 400 },
                );

            const entry = { text, submittedAt: new Date().toISOString() };
            practiceResponses[phraseId] ??= [];
            practiceResponses[phraseId].push(entry);

            return json({ ok: true, phraseId, entry });
        }

        // GET /api/phrases/:id/responses - list past responses for a phrase
        const historyMatch = url.pathname.match(
            /^\/api\/phrases\/([\w-]+)\/responses$/,
        );
        if (historyMatch && req.method === 'GET') {
            return json(practiceResponses[historyMatch[1]] ?? []);
        }

        // Serve preprogrammed audio files from ./public/audio
        if (url.pathname.startsWith('/audio/')) {
            const file = Bun.file(
                `${import.meta.dir}/../public${url.pathname}`,
            );
            if (await file.exists()) {
                return new Response(file, { headers: corsHeaders });
            }
            return json({ error: 'Audio file not found' }, { status: 404 });
        }

        if (url.pathname === '/api/health') {
            return json({ status: 'ok' });
        }

        return json({ error: 'Not found' }, { status: 404 });
    },
});

console.log(`dailyLang backend running at http://localhost:${PORT}`);
