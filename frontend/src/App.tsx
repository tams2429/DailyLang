import { useEffect } from 'react';
import { usePhraseStore } from './store/usePhraseStore';
import { PhraseCard } from './components/PhraseCard';
import { ResponsePractice } from './components/ResponsePractice';

function App() {
    const {
        phrases,
        currentIndex,
        status,
        error,
        loadPhrases,
        nextPhrase,
        previousPhrase,
    } = usePhraseStore();
    const currentPhrase = usePhraseStore((state) => state.currentPhrase());

    useEffect(() => {
        loadPhrases();
    }, [loadPhrases]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
                <header className="text-center">
                    <h1 className="text-3xl font-bold text-slate-900">
                        DailyLang
                    </h1>
                    <p className="mt-1 text-slate-500">
                        Listen and practice a Japanese phrase every day
                    </p>
                </header>

                {status === 'loading' && (
                    <p className="text-slate-500">Loading phrases...</p>
                )}
                {status === 'error' && (
                    <p className="text-rose-600">
                        Failed to load phrases: {error}
                    </p>
                )}

                {currentPhrase && (
                    <>
                        <PhraseCard phrase={currentPhrase} />
                        <ResponsePractice phrase={currentPhrase} />

                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={previousPhrase}
                                disabled={currentIndex === 0}
                                className="rounded-full border border-slate-300 px-4 py-2 text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-slate-400">
                                {currentIndex + 1} / {phrases.length}
                            </span>
                            <button
                                type="button"
                                onClick={nextPhrase}
                                disabled={currentIndex === phrases.length - 1}
                                className="rounded-full border border-slate-300 px-4 py-2 text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default App;
