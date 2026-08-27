import type { Phrase } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { scenarios } from '../data/scenarios';

interface PhraseCardProps {
    phrase: Phrase;
    onDelete?: () => void;
    deleting?: boolean;
}

const difficultyColor: Record<Phrase['difficulty'], string> = {
    beginner: 'bg-emerald-100 text-emerald-700',
    intermediate: 'bg-amber-100 text-amber-700',
    advanced: 'bg-rose-100 text-rose-700',
};

export function PhraseCard({ phrase, onDelete, deleting }: PhraseCardProps) {
    const scenarioLabel =
        scenarios.find((s) => s.id === phrase.scenario)?.label ??
        phrase.scenario;

    return (
        <div className="relative w-full max-w-xl rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
            {phrase.source === 'generated' && onDelete && (
                <button
                    type="button"
                    onClick={onDelete}
                    disabled={deleting}
                    aria-label="Delete this phrase"
                    title="Delete this phrase"
                    className="absolute right-4 top-4 rounded-full p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {deleting ? '…' : '🗑'}
                </button>
            )}

            <div className="mb-4 flex items-center justify-between">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                    {scenarioLabel}
                </span>
                <span
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${difficultyColor[phrase.difficulty]}`}
                >
                    {phrase.difficulty}
                </span>
            </div>

            <p className="text-center text-4xl font-semibold text-slate-900">
                {phrase.japanese}
            </p>
            <p className="mt-2 text-center text-lg text-slate-500">
                {phrase.romaji}
            </p>
            <p className="mt-1 text-center text-base text-slate-400">
                {phrase.english}
            </p>

            <div className="mt-6 flex justify-center">
                <AudioPlayer src={phrase.audioUrl} text={phrase.japanese} />
            </div>
        </div>
    );
}
