import { useState } from 'react';
import type { Phrase } from '../types';

interface AddPhraseFormProps {
    /** Label of the scenario the new phrase will be added to */
    scenarioLabel: string;
    submitting?: boolean;
    error?: string | null;
    onCancel: () => void;
    onSubmit: (input: {
        japanese: string;
        romaji: string;
        english: string;
        difficulty: Phrase['difficulty'];
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
    submitting,
    error,
    onCancel,
    onSubmit,
}: AddPhraseFormProps) {
    const [japanese, setJapanese] = useState('');
    const [romaji, setRomaji] = useState('');
    const [english, setEnglish] = useState('');
    const [difficulty, setDifficulty] =
        useState<Phrase['difficulty']>('beginner');

    const canSubmit =
        japanese.trim() && romaji.trim() && english.trim() && !submitting;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({
            japanese: japanese.trim(),
            romaji: romaji.trim(),
            english: english.trim(),
            difficulty,
        });
    };

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
                <h2 className="text-lg font-semibold text-slate-900">
                    Add a phrase
                </h2>

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
                            readOnly
                            className={`${fieldClass} cursor-not-allowed bg-slate-100 text-slate-500`}
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
                            autoFocus
                            required
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
                            required
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
                            required
                            value={english}
                            onChange={(e) => setEnglish(e.target.value)}
                            placeholder="Good morning"
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

                {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        className="rounded-full border border-slate-300 px-4 py-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="rounded-full bg-emerald-600 px-5 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting ? 'Adding...' : 'Add phrase'}
                    </button>
                </div>
            </form>
        </div>
    );
}
