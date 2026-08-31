import type { Phrase } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { scenarios } from '../data/scenarios';

interface PhraseCardProps {
    phrase: Phrase;
    onDelete?: () => void;
    deleting?: boolean;
    /** When set, the delete control is swapped for an undo control */
    onUndo?: () => void;
    undoing?: boolean;
    canUndo?: boolean;
}

const difficultyColor: Record<Phrase['difficulty'], string> = {
    beginner: 'bg-emerald-100 text-emerald-700',
    intermediate: 'bg-amber-100 text-amber-700',
    advanced: 'bg-rose-100 text-rose-700',
};

export function PhraseCard({
    phrase,
    onDelete,
    deleting,
    onUndo,
    undoing,
    canUndo,
}: PhraseCardProps) {
    const scenarioLabel =
        scenarios.find((s) => s.id === phrase.scenario)?.label ??
        phrase.scenario;
    const showUndo = canUndo && onUndo;
    const showDelete = !showUndo && phrase.source === 'generated' && onDelete;

    return (
        <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                    {scenarioLabel}
                </span>
                <div className="flex items-center gap-2">
                    <span
                        className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${difficultyColor[phrase.difficulty]}`}
                    >
                        {phrase.difficulty}
                    </span>
                    {showUndo && (
                        <button
                            type="button"
                            onClick={onUndo}
                            disabled={undoing}
                            aria-label="Undo delete"
                            title="Undo delete"
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-sm font-bold leading-none text-amber-600 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {undoing ? '…' : '↺'}
                        </button>
                    )}
                    {showDelete && (
                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={deleting}
                            aria-label="Delete this phrase"
                            title="Delete this phrase"
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-sm font-bold leading-none text-rose-600 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {deleting ? '…' : '−'}
                        </button>
                    )}
                </div>
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
