import { useEffect, useMemo, useState } from 'react';
import { usePhraseStore } from './store/usePhraseStore';
import { PhraseCard } from './components/PhraseCard';
import { ResponsePractice } from './components/ResponsePractice';
import { scenarios } from './data/scenarios';

function App() {
    const {
        currentScenario,
        currentIndex,
        scenarioPhrases,
        status,
        error,
        loadPhrases,
        nextPhrase,
        previousPhrase,
        setScenario,
        customScenarios,
        generating,
        generateError,
        generateScenario,
    } = usePhraseStore();
    const currentPhrase = usePhraseStore((state) => state.currentPhrase());
    const allScenarios = useMemo(() => {
        const custom = customScenarios.filter(
            (c) => !scenarios.some((s) => s.id === c.id),
        );
        return [...scenarios, ...custom];
    }, [customScenarios]);
    const scenarioMeta = allScenarios.find((s) => s.id === currentScenario);
    const [scenarioSearch, setScenarioSearch] = useState('');

    useEffect(() => {
        loadPhrases();
    }, [loadPhrases]);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scenarioSearch.trim()) return;
        await generateScenario(scenarioSearch.trim());
        setScenarioSearch('');
    };

    const handleRegenerate = () => {
        const label = scenarioMeta?.label ?? currentScenario;
        generateScenario(label, true);
    };

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

                <div className="flex w-full max-w-xl flex-col items-center gap-2">
                    <label
                        htmlFor="scenario-select"
                        className="text-sm font-medium text-slate-500"
                    >
                        Scenario
                    </label>
                    <select
                        id="scenario-select"
                        value={currentScenario}
                        onChange={(e) => setScenario(e.target.value)}
                        className="w-full max-w-xs rounded-full border border-slate-300 bg-white px-4 py-2 text-center font-medium text-slate-700 focus:border-rose-400 focus:outline-none"
                    >
                        {allScenarios.map((scenario) => (
                            <option key={scenario.id} value={scenario.id}>
                                {scenario.label}
                            </option>
                        ))}
                    </select>
                    {scenarioMeta && (
                        <p className="text-center text-xs text-slate-400">
                            {scenarioMeta.description}
                        </p>
                    )}
                </div>

                <form
                    onSubmit={handleGenerate}
                    className="flex w-full max-w-xl gap-2"
                >
                    <input
                        type="text"
                        value={scenarioSearch}
                        onChange={(e) => setScenarioSearch(e.target.value)}
                        placeholder="Request a new scenario, e.g. 'job interview'"
                        className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-slate-700 focus:border-rose-400 focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={generating || !scenarioSearch.trim()}
                        className="rounded-full bg-slate-900 px-5 py-2 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {generating ? 'Generating...' : 'Generate'}
                    </button>
                </form>
                {generateError && (
                    <p className="text-sm text-rose-600">{generateError}</p>
                )}

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
                                {currentIndex + 1} / {scenarioPhrases.length}
                            </span>
                            <button
                                type="button"
                                onClick={nextPhrase}
                                disabled={
                                    currentIndex === scenarioPhrases.length - 1
                                }
                                className="rounded-full border border-slate-300 px-4 py-2 text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleRegenerate}
                            disabled={generating}
                            className="text-sm font-medium text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {generating
                                ? 'Generating...'
                                : `Regenerate phrases for "${scenarioMeta?.label ?? currentScenario}"`}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default App;

