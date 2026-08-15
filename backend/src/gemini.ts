import type { Phrase } from './data/phrases';

// Free-tier Gemini model via the plain REST API (no SDK dependency needed —
// Bun's built-in fetch is enough). Get a free API key at
// https://aistudio.google.com/apikey and set GEMINI_API_KEY in backend/.env.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';

interface GeneratedEntry {
    japanese: string;
    romaji: string;
    english: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    practicePrompt: string;
    exampleResponse: string;
    exampleResponseJapanese: string;
}

function buildPrompt(label: string, count: number): string {
    return `You are helping build a Japanese language learning app.
Generate ${count} short, natural, commonly-used Japanese phrases for the scenario: "${label}".
Order them so they read as a natural conversation flow for that scenario (opening lines first).
Mix difficulty levels (beginner, intermediate, advanced) across the set where it makes sense.
For each phrase, provide:
- japanese: the phrase written in Japanese script
- romaji: the romanized reading
- english: an English translation
- difficulty: one of "beginner", "intermediate", or "advanced"
- practicePrompt: a short instruction telling a learner what to say back in response
- exampleResponse: a correct example reply, written in romaji
- exampleResponseJapanese: the same example reply written in Japanese script (hiragana/katakana/kanji as natural)`;
}

export async function generatePhrasesForScenario(
    slug: string,
    label: string,
    count = 6,
): Promise<Phrase[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error(
            'GEMINI_API_KEY is not configured. Add it to backend/.env (see backend/.env.example).',
        );
    }

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: buildPrompt(label, count) }],
                    },
                ],
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: 'ARRAY',
                        items: {
                            type: 'OBJECT',
                            properties: {
                                japanese: { type: 'STRING' },
                                romaji: { type: 'STRING' },
                                english: { type: 'STRING' },
                                difficulty: {
                                    type: 'STRING',
                                    enum: [
                                        'beginner',
                                        'intermediate',
                                        'advanced',
                                    ],
                                },
                                practicePrompt: { type: 'STRING' },
                                exampleResponse: { type: 'STRING' },
                                exampleResponseJapanese: { type: 'STRING' },
                            },
                            required: [
                                'japanese',
                                'romaji',
                                'english',
                                'difficulty',
                                'practicePrompt',
                                'exampleResponse',
                                'exampleResponseJapanese',
                            ],
                        },
                    },
                },
            }),
        },
    );

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(
            `Gemini API request failed (${res.status}): ${body.slice(0, 300)}`,
        );
    }

    const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error('Gemini API returned an unexpected response shape.');
    }

    let entries: GeneratedEntry[];
    try {
        entries = JSON.parse(text);
    } catch {
        throw new Error('Failed to parse Gemini API response as JSON.');
    }

    const now = new Date().toISOString();
    return entries.map((entry, index) => ({
        id: `${slug}-${index + 1}`,
        scenario: slug,
        order: index + 1,
        japanese: entry.japanese,
        romaji: entry.romaji,
        english: entry.english,
        audioUrl: '',
        difficulty: entry.difficulty,
        practicePrompt: entry.practicePrompt,
        exampleResponse: entry.exampleResponse,
        exampleResponseJapanese: entry.exampleResponseJapanese,
        source: 'generated',
        generatedAt: now,
    }));
}
