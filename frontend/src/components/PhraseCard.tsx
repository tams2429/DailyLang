import type { Phrase } from "../types";
import { AudioPlayer } from "./AudioPlayer";

interface PhraseCardProps {
  phrase: Phrase;
}

const difficultyColor: Record<Phrase["difficulty"], string> = {
  beginner: "bg-emerald-100 text-emerald-700",
  intermediate: "bg-amber-100 text-amber-700",
  advanced: "bg-rose-100 text-rose-700",
};

export function PhraseCard({ phrase }: PhraseCardProps) {
  return (
    <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          {phrase.category.replace("-", " ")}
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
      <p className="mt-2 text-center text-lg text-slate-500">{phrase.romaji}</p>
      <p className="mt-1 text-center text-base text-slate-400">{phrase.english}</p>

      <div className="mt-6 flex justify-center">
        <AudioPlayer src={phrase.audioUrl} />
      </div>
    </div>
  );
}
