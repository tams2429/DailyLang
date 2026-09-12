import { useState } from 'react';
import { translatePhrase } from '../api/client';
import type { Phrase } from '../types';

interface AddPhraseFormProps {
    /** Label of the scenario the new phrase will be added to */
    scenarioLabel: string;
    /** When true, the Scenario field is an editable input instead of read-only */
    scenarioEditable?: boolean;
    onScenarioLabelChange?: (value: string) => void;
    submitting?: boolean;
    error?: string | null;
    onCancel: () => void;
    onSubmit: (input: {
        japanese: string;
        romaji: string;
        english: string;
        difficulty: Phrase['difficulty'];
        exampleResponse: string;
        exampleResponseJapanese: string;
    }) => void;
}

const difficulties: Phrase['difficulty'][] = [
    'beginner',
    'intermediate',
    'advanced',
];

const fieldClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:border-rose-400 focus:outline-none';

export function AddPhraseForm({
    scenarioLabel,
    scenarioEditable,
    onScenarioLabelChange,
    submitting,
    error,
    onCancel,
    onSubmit,
}: AddPhraseFormProps) {
    const [japanese, setJapanese] = useState('');
    const [romaji, setRomaji] = useState('');
    const [english, setEnglish] = useState('');
    const [exampleResponse, setExampleResponse] = useState('');
    const [exampleResponseJapanese, setExampleResponseJapanese] = useState('');
    const [difficulty, setDifficulty] =
        useState<Phrase['difficulty']>('beginner');
    const [translating, setTranslating] = useState(false);
    const [translateError, setTranslateError] = useState<string | null>(null);

    // Only one of Japanese / Romaji / English is required - everything else is
    // filled in by the LLM when the form is submitted.
    const canSubmit =
        (japanese.trim() || romaji.trim() || english.trim()) &&
        (!scenarioEditable || scenarioLabel.trim()) &&
        !submitting &&
        !translating;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        let filled = {
            japanese: japanese.trim(),
            romaji: romaji.trim(),
            english: english.trim(),
            exampleResponse: exampleResponse.trim(),
            exampleResponseJapanese: exampleResponseJapanese.trim(),
        };

        if (Object.values(filled).some((value) => !value)) {
            setTranslating(true);
            setTranslateError(null);
            try {
                const result = await translatePhrase(filled);
                filled = {
                    japanese: filled.japanese || result.japanese,
                    romaji: filled.romaji || result.romaji,
                    english: filled.english || result.english,
                    exampleResponse:
                        filled.exampleResponse || result.exampleResponse,
                    exampleResponseJapanese:
                        filled.exampleResponseJapanese ||
                        result.exampleResponseJapanese,
                };
                setJapanese(filled.japanese);
                setRomaji(filled.romaji);
                setEnglish(filled.english);
                setExampleResponse(filled.exampleResponse);
                setExampleResponseJapanese(filled.exampleResponseJapanese);
            } catch (err) {
                setTranslateError((err as Error).message);
                return;
            } finally {
                setTranslating(false);
            }
        }

        onSubmit({ ...filled, difficulty });
    };

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
            <form
                onSubmit={handleSubmit}
                className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            >
                <h2 className="text-lg font-semibold text-slate-900">
                    Add a phrase
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    Fill in any one of Japanese, Romaji or English - the
                    remaining fields are generated for you when you add the
                    phrase.
                </p>

                <div className="mt-4 flex flex-col gap-3">
                    <div>
                        <label
                            htmlFor="new-phrase-scenario"
                            className="text-sm font-medium text-slate-500"
                        >
                            Scenario
                        </label>
                        <input
                            id="new-phrase-scenario"
                            type="text"
                            value={scenarioLabel}
                            readOnly={!scenarioEditable}
                            autoFocus={scenarioEditable}
                            onChange={(e) =>
                                onScenarioLabelChange?.(e.target.value)
                            }
                            placeholder="e.g. Job interview"
                            className={
                                scenarioEditable
                                    ? fieldClass
                                    : `${fieldClass} cursor-not-allowed bg-slate-100 text-slate-500`
                            }
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="new-phrase-japanese"
                            className="text-sm font-medium text-slate-500"
                        >
                            Japanese
                        </label>
                        <input
                            id="new-phrase-japanese"
                            type="text"
                            autoFocus={!scenarioEditable}
                            value={japanese}
                            onChange={(e) => setJapanese(e.target.value)}
                            placeholder="おはようございます"
                            className={fieldClass}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="new-phrase-romaji"
                            className="text-sm font-medium text-slate-500"
                        >
                            Romaji
                        </label>
                        <input
                            id="new-phrase-romaji"
                            type="text"
                            value={romaji}
                            onChange={(e) => setRomaji(e.target.value)}
                            placeholder="Ohayou gozaimasu"
                            className={fieldClass}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="new-phrase-english"
                            className="text-sm font-medium text-slate-500"
                        >
                            English
                        </label>
                        <input
                            id="new-phrase-english"
                            type="text"
                            value={english}
                            onChange={(e) => setEnglish(e.target.value)}
                            placeholder="Good morning"
                            className={fieldClass}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="new-phrase-example-response"
                            className="text-sm font-medium text-slate-500"
                        >
                            Example response (romaji)
                        </label>
                        <input
                            id="new-phrase-example-response"
                            type="text"
                            value={exampleResponse}
                            onChange={(e) => setExampleResponse(e.target.value)}
                            placeholder="Ohayou gozaimasu"
                            className={fieldClass}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="new-phrase-example-response-japanese"
                            className="text-sm font-medium text-slate-500"
                        >
                            Example response (Japanese)
                        </label>
                        <input
                            id="new-phrase-example-response-japanese"
                            type="text"
                            value={exampleResponseJapanese}
                            onChange={(e) =>
                                setExampleResponseJapanese(e.target.value)
                            }
                            placeholder="おはようございます"
                            className={fieldClass}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="new-phrase-difficulty"
                            className="text-sm font-medium text-slate-500"
                        >
                            Difficulty
                        </label>
                        <select
                            id="new-phrase-difficulty"
                            value={difficulty}
                            onChange={(e) =>
                                setDifficulty(
                                    e.target.value as Phrase['difficulty'],
                                )
                            }
                            className={`${fieldClass} capitalize`}
                        >
                            {difficulties.map((level) => (
                                <option key={level} value={level}>
                                    {level}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {(error || translateError) && (
                    <p className="mt-3 text-sm text-rose-600">
                        {error ?? translateError}
                    </p>
                )}

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={submitting || translating}
                        className="rounded-full border border-slate-300 px-4 py-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="rounded-full bg-emerald-600 px-5 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {translating
                            ? 'Translating...'
                            : submitting
                              ? 'Adding...'
                              : 'Add phrase'}
                    </button>
                </div>
            </form>
        </div>
    );
}
