import { phrases, scenarios, type Phrase } from './data/phrases';
import {
    addPracticeResponse,
    deleteCachedScenario,
    getAllCachedScenarios,
    getCachedScenario,
    getPracticeResponses,
    setCachedScenario,
} from './cache';
import { generatePhrasesForScenario, translatePhrase } from './gemini';

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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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

// Hand-written seed phrases plus any previously LLM-generated scenarios
// loaded from the JSON cache on disk. Mutated in place as new scenarios are
// generated so all routes below immediately see new phrases.
const cachedScenarios = await getAllCachedScenarios();
for (const scenario of scenarios) {
    if (cachedScenarios[scenario.id]) continue;

    const seedPhrases = phrases
        .filter((phrase) => phrase.scenario === scenario.id)
        .map((phrase) => ({ ...phrase, source: 'seed' as const }));
    if (seedPhrases.length === 0) continue;

    await setCachedScenario(scenario.id, scenario.label, seedPhrases);
    cachedScenarios[scenario.id] = {
        label: scenario.label,
        phrases: seedPhrases,
        updatedAt: new Date().toISOString(),
    };
}
let allPhrases: (typeof phrases)[number][] = [
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

        // POST /api/phrases/translate - given whichever of japanese/romaji/
        // english the user typed, fill in the other two via the LLM.
        if (
            url.pathname === '/api/phrases/translate' &&
            req.method === 'POST'
        ) {
            const body = await req.json().catch(() => null);
            const japanese =
                typeof body?.japanese === 'string' ? body.japanese.trim() : '';
            const romaji =
                typeof body?.romaji === 'string' ? body.romaji.trim() : '';
            const english =
                typeof body?.english === 'string' ? body.english.trim() : '';
            const exampleResponse =
                typeof body?.exampleResponse === 'string'
                    ? body.exampleResponse.trim()
                    : '';
            const exampleResponseJapanese =
                typeof body?.exampleResponseJapanese === 'string'
                    ? body.exampleResponseJapanese.trim()
                    : '';

            if (!japanese && !romaji && !english) {
                return json(
                    {
                        error: 'At least one of japanese, romaji or english is required',
                    },
                    { status: 400 },
                );
            }

            try {
                const result = await translatePhrase({
                    japanese,
                    romaji,
                    english,
                    exampleResponse,
                    exampleResponseJapanese,
                });
                return json(result);
            } catch (err) {
                return json({ error: (err as Error).message }, { status: 502 });
            }
        }

        // POST /api/phrases - manually add a phrase to a scenario. Body:
        // { scenario, japanese, romaji, english, difficulty, label?, insertAfterId? }
        // When insertAfterId is given, the new phrase is slotted in
        // immediately after that phrase (shifting later phrases down),
        // otherwise it's appended to the end of the scenario.
        if (url.pathname === '/api/phrases' && req.method === 'POST') {
            const body = await req.json().catch(() => null);

            const scenario = slugify(
                typeof body?.scenario === 'string' ? body.scenario : '',
            );
            const japanese =
                typeof body?.japanese === 'string' ? body.japanese.trim() : '';
            const romaji =
                typeof body?.romaji === 'string' ? body.romaji.trim() : '';
            const english =
                typeof body?.english === 'string' ? body.english.trim() : '';
            const difficulty = body?.difficulty;
            const exampleResponse =
                typeof body?.exampleResponse === 'string'
                    ? body.exampleResponse.trim()
                    : '';
            const exampleResponseJapanese =
                typeof body?.exampleResponseJapanese === 'string'
                    ? body.exampleResponseJapanese.trim()
                    : '';
            const insertAfterId =
                typeof body?.insertAfterId === 'string'
                    ? body.insertAfterId
                    : null;

            if (!scenario || !japanese || !romaji || !english) {
                return json(
                    {
                        error: 'scenario, japanese, romaji and english are all required',
                    },
                    { status: 400 },
                );
            }
            if (
                difficulty !== 'beginner' &&
                difficulty !== 'intermediate' &&
                difficulty !== 'advanced'
            ) {
                return json(
                    {
                        error: 'difficulty must be beginner, intermediate or advanced',
                    },
                    { status: 400 },
                );
            }

            const cached = await getCachedScenario(scenario);
            const label =
                (typeof body?.label === 'string' && body.label.trim()) ||
                cached?.label ||
                scenario;

            const afterPhrase = insertAfterId
                ? allPhrases.find(
                      (p) => p.id === insertAfterId && p.scenario === scenario,
                  )
                : undefined;

            let insertOrder: number;
            if (afterPhrase) {
                // Slot in right after the phrase that initiated the add,
                // shifting every later phrase in this scenario down by one.
                insertOrder = afterPhrase.order + 1;
                allPhrases = allPhrases.map((p) =>
                    p.scenario === scenario && p.order >= insertOrder
                        ? { ...p, order: p.order + 1 }
                        : p,
                );
            } else {
                // No anchor phrase (or it wasn't found) - append to the end.
                insertOrder =
                    allPhrases
                        .filter((p) => p.scenario === scenario)
                        .reduce((max, p) => Math.max(max, p.order), 0) + 1;
            }

            const phrase: Phrase = {
                id: `${scenario}-custom-${Date.now()}`,
                scenario,
                order: insertOrder,
                japanese,
                romaji,
                english,
                audioUrl: '',
                difficulty,
                practicePrompt: `Respond to "${english}".`,
                exampleResponse,
                exampleResponseJapanese,
                source: 'generated',
                generatedAt: new Date().toISOString(),
            };

            allPhrases = [...allPhrases, phrase];

            const updatedScenarioPhrases = allPhrases
                .filter((p) => p.scenario === scenario)
                .sort((a, b) => a.order - b.order);
            await setCachedScenario(scenario, label, updatedScenarioPhrases);

            const scenarioPhrases = allPhrases
                .filter((p) => p.scenario === scenario)
                .sort((a, b) => a.order - b.order);

            return json({ phrase, scenarioPhrases }, { status: 201 });
        }

        // PATCH /api/scenarios/:slug/reorder - persist a complete phrase order.
        const reorderMatch = url.pathname.match(
            /^\/api\/scenarios\/([\w-]+)\/reorder$/,
        );
        if (reorderMatch && req.method === 'PATCH') {
            const scenario = reorderMatch[1];
            const body = (await req.json().catch(() => null)) as {
                phraseIds?: unknown;
            } | null;
            const phraseIds = body?.phraseIds;
            const current = allPhrases
                .filter((phrase) => phrase.scenario === scenario)
                .sort((a, b) => a.order - b.order);

            if (
                !Array.isArray(phraseIds) ||
                phraseIds.length !== current.length ||
                new Set(phraseIds).size !== current.length ||
                phraseIds.some((id: unknown) => typeof id !== 'string') ||
                current.some((phrase) => !phraseIds.includes(phrase.id))
            ) {
                return json(
                    {
                        error: 'phraseIds must contain every phrase exactly once',
                    },
                    { status: 400 },
                );
            }

            const reordered = (phraseIds as string[]).map(
                (id: string, index: number) => ({
                    ...current.find((phrase) => phrase.id === id)!,
                    order: index + 1,
                }),
            );
            const cached = await getCachedScenario(scenario);
            const label =
                cached?.label ??
                scenarios.find((item) => item.id === scenario)?.label ??
                scenario;

            try {
                await setCachedScenario(scenario, label, reordered);
            } catch (err) {
                return json({ error: (err as Error).message }, { status: 502 });
            }

            allPhrases = [
                ...allPhrases.filter((phrase) => phrase.scenario !== scenario),
                ...reordered,
            ];
            return json(reordered);
        }

        // GET /api/scenarios/generated - list scenarios generated via the LLM
        if (
            url.pathname === '/api/scenarios/generated' &&
            req.method === 'GET'
        ) {
            const cached = await getAllCachedScenarios();
            return json(
                Object.entries(cached)
                    .filter(
                        ([id]) =>
                            !scenarios.some((scenario) => scenario.id === id),
                    )
                    .map(([id, entry]) => ({
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
                const generated = await generatePhrasesForScenario(slug, label);
                // Don't persist empty results - it would leave a permanent,
                // undeletable-looking scenario entry with 0 phrases.
                if (generated.length === 0) {
                    return json(
                        {
                            error: 'No phrases were generated for this scenario',
                        },
                        { status: 502 },
                    );
                }
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

            const entry = await addPracticeResponse(phraseId, text);

            return json({ ok: true, phraseId, entry });
        }

        // GET /api/phrases/:id/responses - list past responses for a phrase
        const historyMatch = url.pathname.match(
            /^\/api\/phrases\/([\w-]+)\/responses$/,
        );
        if (historyMatch && req.method === 'GET') {
            return json(await getPracticeResponses(historyMatch[1]));
        }

        // POST /api/phrases/:id/restore - undo a previous deletion. Body must
        // be the full phrase object as returned by the DELETE call below.
        const restoreMatch = url.pathname.match(
            /^\/api\/phrases\/([\w-]+)\/restore$/,
        );
        if (restoreMatch && req.method === 'POST') {
            const id = restoreMatch[1];
            const body = (await req.json().catch(() => null)) as Phrase | null;

            if (!body || body.id !== id || body.source !== 'generated') {
                return json(
                    { error: 'A valid generated phrase is required' },
                    { status: 400 },
                );
            }

            if (allPhrases.some((p) => p.id === id)) {
                return json(
                    { error: 'Phrase already exists' },
                    { status: 409 },
                );
            }

            const cached = await getCachedScenario(body.scenario);
            const label = cached?.label ?? body.scenario;
            const restoredPhrases = [
                ...(cached?.phrases.filter((p) => p.id !== id) ?? []),
                body,
            ].sort((a, b) => a.order - b.order);

            await setCachedScenario(body.scenario, label, restoredPhrases);
            allPhrases = [...allPhrases, body];

            return json(body);
        }

        // DELETE /api/phrases/:id - remove a previously LLM-generated phrase.
        // Seed phrases (hand-written, not stored in the DB) cannot be deleted.
        if (phraseMatch && req.method === 'DELETE') {
            const id = phraseMatch[1];
            const phrase = allPhrases.find((p) => p.id === id);
            if (!phrase)
                return json({ error: 'Phrase not found' }, { status: 404 });
            if (phrase.source !== 'generated') {
                return json(
                    { error: 'Only generated phrases can be deleted' },
                    { status: 400 },
                );
            }

            const cached = await getCachedScenario(phrase.scenario);
            if (cached) {
                const remaining = cached.phrases.filter((p) => p.id !== id);
                try {
                    if (remaining.length === 0) {
                        await deleteCachedScenario(phrase.scenario);
                    } else {
                        await setCachedScenario(
                            phrase.scenario,
                            cached.label,
                            remaining,
                        );
                    }
                } catch (err) {
                    return json(
                        { error: (err as Error).message },
                        { status: 502 },
                    );
                }
            }
            allPhrases = allPhrases.filter((p) => p.id !== id);

            return json(phrase);
        }

        // DELETE /api/scenarios/:slug - remove an entire user-generated
        // scenario and all of its phrases. Scenarios that aren't stored in
        // the DB (i.e. hand-written seed scenarios) cannot be deleted.
        const scenarioMatch = url.pathname.match(
            /^\/api\/scenarios\/([\w-]+)$/,
        );
        if (scenarioMatch && req.method === 'DELETE') {
            const slug = scenarioMatch[1];
            if (scenarios.some((scenario) => scenario.id === slug)) {
                return json(
                    { error: 'Seed scenarios cannot be deleted' },
                    { status: 400 },
                );
            }
            const cached = await getCachedScenario(slug);
            if (!cached) {
                return json({ error: 'Scenario not found' }, { status: 404 });
            }

            try {
                await deleteCachedScenario(slug);
            } catch (err) {
                return json({ error: (err as Error).message }, { status: 502 });
            }
            allPhrases = allPhrases.filter((p) => p.scenario !== slug);

            return json({ scenario: slug });
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
