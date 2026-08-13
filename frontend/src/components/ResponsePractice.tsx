import { useState } from "react";
import type { Phrase } from "../types";
import { usePhraseStore } from "../store/usePhraseStore";

interface ResponsePracticeProps {
  phrase: Phrase;
}

export function ResponsePractice({ phrase }: ResponsePracticeProps) {
  const [text, setText] = useState("");
  const submitting = usePhraseStore((state) => state.submitting);
  const lastSubmittedText = usePhraseStore((state) => state.lastSubmittedText);
  const submitResponse = usePhraseStore((state) => state.submitResponse);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await submitResponse(text.trim());
    setText("");
  };

  return (
    <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
      <p className="mb-3 text-sm font-medium text-slate-500">
        Practice prompt: <span className="text-slate-700">{phrase.practicePrompt}</span>
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your response in Japanese..."
          rows={3}
          className="w-full rounded-lg border border-slate-200 p-3 text-lg focus:border-rose-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="self-end rounded-full bg-slate-900 px-5 py-2 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Submit response"}
        </button>
      </form>
      {lastSubmittedText && (
        <p className="mt-3 text-sm text-emerald-600">
          Saved your response: "{lastSubmittedText}"
        </p>
      )}
    </div>
  );
}
