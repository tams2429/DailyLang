import { useEffect, useRef, useState } from 'react';
import type { Phrase } from '../types';
import { usePhraseStore } from '../store/usePhraseStore';

interface ResponsePracticeProps {
    phrase: Phrase;
}

// Loosely normalize responses before comparing so that punctuation, casing,
// and extra whitespace don't cause a correct answer to be marked wrong.
function normalize(input: string): string {
    return input
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
}

const ADVANCE_DELAY_MS = 1400;

export function ResponsePractice({ phrase }: ResponsePracticeProps) {
    const [text, setText] = useState('');
    const [showHint, setShowHint] = useState(false);
    const [revealAnswer, setRevealAnswer] = useState(false);
    const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
    const advanceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const submitting = usePhraseStore((state) => state.submitting);
    const lastSubmittedText = usePhraseStore(
        (state) => state.lastSubmittedText,
    );
    const submitResponse = usePhraseStore((state) => state.submitResponse);
    const nextPhrase = usePhraseStore((state) => state.nextPhrase);

    useEffect(() => {
        setShowHint(false);
        setRevealAnswer(false);
        setResult(null);
        if (advanceTimeout.current) clearTimeout(advanceTimeout.current);
    }, [phrase.id]);

    useEffect(() => {
        return () => {
            if (advanceTimeout.current) clearTimeout(advanceTimeout.current);
        };
    }, []);

    const hint = phrase.exampleResponse
        .split(' ')
        .filter(Boolean)
        .map((word) =>
            [
                word[0].toUpperCase(),
                ...word
                    .slice(1)
                    .split('')
                    .map(() => '_'),
            ].join(' '),
        )
        .join('   ');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed) return;

        await submitResponse(trimmed);

        const isCorrect =
            normalize(trimmed) === normalize(phrase.exampleResponse);

        if (isCorrect) {
            setResult('correct');
            setShowHint(false);
            setRevealAnswer(false);
            setText('');
            advanceTimeout.current = setTimeout(() => {
                nextPhrase();
            }, ADVANCE_DELAY_MS);
        } else {
            setResult('incorrect');
            setShowHint(true);
        }
    };

    return (
        <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
            <p className="mb-3 text-sm font-medium text-slate-500">
                Practice prompt:{' '}
                <span className="text-slate-700">{phrase.practicePrompt}</span>
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type your response in Japanese..."
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 p-3 text-lg focus:border-rose-400 focus:outline-none"
                />
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => setShowHint((prev) => !prev)}
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                    >
                        {showHint ? 'Hide hint' : 'Show hint'}
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || !text.trim()}
                        className="rounded-full bg-slate-900 px-5 py-2 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting ? 'Saving...' : 'Submit response'}
                    </button>
                </div>
                {showHint && (
                    <div className="flex items-center justify-center gap-2">
                        <p className="text-center text-lg text-slate-500">
                            {revealAnswer ? phrase.exampleResponse : hint}
                        </p>
                        <button
                            type="button"
                            onClick={() => setRevealAnswer((prev) => !prev)}
                            aria-label={
                                revealAnswer ? 'Hide answer' : 'Reveal answer'
                            }
                            aria-pressed={revealAnswer}
                            title={
                                revealAnswer ? 'Hide answer' : 'Reveal answer'
                            }
                            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        >
                            {revealAnswer ? (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                >
                                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                                    <circle cx="12" cy="12" r="3" />
                                    <line x1="3" y1="21" x2="21" y2="3" />
                                </svg>
                            ) : (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                >
                                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            )}
                        </button>
                    </div>
                )}
            </form>
            {result === 'correct' && (
                <p className="mt-3 text-sm font-medium text-emerald-600">
                    ✓ Correct! Moving on to the next phrase...
                </p>
            )}
            {result === 'incorrect' && (
                <p className="mt-3 text-sm font-medium text-rose-600">
                    ✗ Not quite — here's a hint to help you.
                </p>
            )}
            {result === null && lastSubmittedText && (
                <p className="mt-3 text-sm text-emerald-600">
                    Saved your response: "{lastSubmittedText}"
                </p>
            )}
        </div>
    );
}
