import { useEffect, useRef, useState } from 'react';
import type { Phrase } from '../types';
import { usePhraseStore } from '../store/usePhraseStore';
import {
    isSpeechRecognitionSupported,
    useSpeechRecognition,
} from '../hooks/useSpeechRecognition';

interface ResponsePracticeProps {
    phrase: Phrase;
}

type InputMode = 'romaji' | 'japanese';

// Loosely normalize responses before comparing so that punctuation, casing,
// and extra whitespace don't cause a correct answer to be marked wrong.
// Japanese doesn't use spaces between words, so when comparing Japanese
// text (e.g. from speech recognition, which may insert spaces after commas
// or pauses) whitespace is stripped entirely instead of just collapsed.
function normalize(input: string, mode: InputMode): string {
    const stripped = input
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .trim();
    return mode === 'japanese'
        ? stripped.replace(/\s+/g, '')
        : stripped.replace(/\s+/g, ' ');
}

// Masks a romaji answer word-by-word, revealing each word's first letter.
function buildRomajiHint(answer: string): string {
    return answer
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
}

// Speaks Japanese text aloud via the browser's speech synthesis API, if
// available (mirrors the approach used by AudioPlayer for phrase playback).
function speakJapanese(text: string): boolean {
    if (!('speechSynthesis' in window)) return false;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    window.speechSynthesis.speak(utterance);
    return true;
}

// Masks a Japanese answer character-by-character, revealing the first
// character of the string (Japanese doesn't reliably use spaces between
// words, so we mask per-character instead of per-word).
function buildJapaneseHint(answer: string): string {
    const chars = Array.from(answer);
    return chars
        .map((ch, index) => {
            if (index === 0) return ch;
            return /[\p{L}\p{N}]/u.test(ch) ? '＿' : ch;
        })
        .join(' ');
}

const ADVANCE_DELAY_MS = 1400;

export function ResponsePractice({ phrase }: ResponsePracticeProps) {
    const [text, setText] = useState('');
    const [showHint, setShowHint] = useState(false);
    const [revealAnswer, setRevealAnswer] = useState(false);
    const [inputMode, setInputMode] = useState<InputMode>('romaji');
    const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
    const [speakError, setSpeakError] = useState(false);
    const advanceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const submitting = usePhraseStore((state) => state.submitting);
    const lastSubmittedText = usePhraseStore(
        (state) => state.lastSubmittedText,
    );
    const submitResponse = usePhraseStore((state) => state.submitResponse);
    const nextPhrase = usePhraseStore((state) => state.nextPhrase);

    // Speech recognition only transcribes to Japanese script, so using the
    // mic switches input mode to 日本語 and fills the textarea as you speak.
    const {
        isListening,
        error: speechError,
        start: startListening,
        stop: stopListening,
    } = useSpeechRecognition({
        lang: 'ja-JP',
        onResult: (transcript) => {
            setInputMode('japanese');
            setText(transcript);
        },
    });

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

    const expectedAnswer =
        inputMode === 'japanese'
            ? phrase.exampleResponseJapanese
            : phrase.exampleResponse;

    const hint =
        inputMode === 'japanese'
            ? buildJapaneseHint(expectedAnswer)
            : buildRomajiHint(expectedAnswer);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed) return;

        await submitResponse(trimmed);

        const isCorrect =
            normalize(trimmed, inputMode) ===
            normalize(expectedAnswer, inputMode);

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
            <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-500">
                    Practice prompt:{' '}
                    <span className="text-slate-700">
                        {phrase.practicePrompt}
                    </span>
                </p>
                <div className="flex shrink-0 rounded-full border border-slate-300 bg-slate-50 p-0.5 text-xs font-medium">
                    <button
                        type="button"
                        onClick={() => setInputMode('romaji')}
                        aria-pressed={inputMode === 'romaji'}
                        className={`rounded-full px-3 py-1 transition ${
                            inputMode === 'romaji'
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Romaji
                    </button>
                    <button
                        type="button"
                        onClick={() => setInputMode('japanese')}
                        aria-pressed={inputMode === 'japanese'}
                        className={`rounded-full px-3 py-1 transition ${
                            inputMode === 'japanese'
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        日本語
                    </button>
                </div>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="relative">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={
                            inputMode === 'japanese'
                                ? '日本語で答えを入力してください...'
                                : 'Type your response in romaji...'
                        }
                        rows={3}
                        className="w-full rounded-lg border border-slate-200 p-3 pr-12 text-lg focus:border-rose-400 focus:outline-none"
                    />
                    {isSpeechRecognitionSupported && (
                        <button
                            type="button"
                            onClick={() =>
                                isListening ? stopListening() : startListening()
                            }
                            aria-pressed={isListening}
                            title={
                                isListening
                                    ? 'Stop listening'
                                    : 'Speak your answer'
                            }
                            className={`absolute right-2 top-2 rounded-full p-2 transition ${
                                isListening
                                    ? 'animate-pulse bg-rose-500 text-white'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                        >
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
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                        </button>
                    )}
                </div>
                {speechError && (
                    <p className="text-sm text-rose-600">{speechError}</p>
                )}
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
                            {revealAnswer ? expectedAnswer : hint}
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setSpeakError(false);
                                if (
                                    !speakJapanese(
                                        phrase.exampleResponseJapanese,
                                    )
                                ) {
                                    setSpeakError(true);
                                }
                            }}
                            aria-label="Play answer audio"
                            title="Play answer audio"
                            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        >
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
                                <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                                <path d="M18.5 5.5a9 9 0 0 1 0 13" />
                            </svg>
                        </button>
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
                {speakError && (
                    <p className="text-center text-sm text-amber-600">
                        Audio playback not available. Your browser may not
                        support speech synthesis.
                    </p>
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
