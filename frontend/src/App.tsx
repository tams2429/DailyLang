import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePhraseStore } from './store/usePhraseStore';
import { PhraseCard } from './components/PhraseCard';
import { AddPhraseForm } from './components/AddPhraseForm';
import { ResponsePractice } from './components/ResponsePractice';
import { scenarios } from './data/scenarios';

interface Toast {
    id: number;
    message: string;
    tone: 'error' | 'warning' | 'success';
}

const toastTone: Record<Toast['tone'], string> = {
    error: 'bg-rose-600 text-white',
    warning: 'bg-amber-100 text-amber-800 ring-1 ring-amber-300',
    success: 'bg-emerald-600 text-white',
};

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
        moveCurrentPhrase,
        reordering,
        reorderError,
        setScenario,
        customScenarios,
        generating,
        generateError,
        generateScenario,
        deleteCurrentPhrase,
        deleting,
        deleteError,
        deletedPhrase,
        undoDelete,
        undoing,
        addPhrase,
        adding,
        addError,
        createScenarioWithPhrase,
        deleteEntireScenario,
        deletingScenario,
    } = usePhraseStore();
    const currentPhrase = usePhraseStore((state) => state.currentPhrase());
    const allScenarios = useMemo(() => {
        // Include custom scenarios even with 0 phrases so an empty one
        // (e.g. after deleting its last phrase) can still be selected and
        // removed via the Delete button instead of becoming unreachable.
        const custom = customScenarios.filter(
            (c) => !scenarios.some((s) => s.id === c.id),
        );
        return [...scenarios, ...custom];
    }, [customScenarios]);
    const scenarioMeta = allScenarios.find((s) => s.id === currentScenario);
    const [scenarioSearch, setScenarioSearch] = useState('');
    const [isAddingScenario, setIsAddingScenario] = useState(false);
    const [addPhraseMode, setAddPhraseMode] = useState<
        'existing' | 'new-scenario' | null
    >(null);
    const [newScenarioLabel, setNewScenarioLabel] = useState('');
    const [showEmptyScenarioModal, setShowEmptyScenarioModal] = useState(false);
    const [showDeleteScenarioModal, setShowDeleteScenarioModal] =
        useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastIdRef = useRef(0);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => {
        loadPhrases();
    }, [loadPhrases]);

    // Clear any pending toast timers on unmount.
    useEffect(() => {
        const timers = timersRef.current;
        return () => timers.forEach(clearTimeout);
    }, []);

    // Each call pushes a new toast with its own id, so pressing a button
    // repeatedly re-shows the message every time rather than only once.
    const addToast = useCallback((message: string, tone: Toast['tone']) => {
        const id = ++toastIdRef.current;
        setToasts((prev) => [...prev, { id, message, tone }]);
        const timer = setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
            timersRef.current = timersRef.current.filter((t) => t !== timer);
        }, 3000);
        timersRef.current.push(timer);
    }, []);

    const handleDelete = async () => {
        await deleteCurrentPhrase();
        if (usePhraseStore.getState().deleteError) return;
        if (usePhraseStore.getState().scenarioPhrases.length === 0) {
            setShowEmptyScenarioModal(true);
            return;
        }
        addToast('Phrase deleted', 'error');
        addToast(
            'Press ↺ to keep it before moving on to the next phrase, otherwise it will be permanently deleted.',
            'warning',
        );
    };

    const handleConfirmEmptyScenarioDelete = () => {
        setShowEmptyScenarioModal(false);
        addToast('Phrase deleted', 'error');
        const currentIdx = allScenarios.findIndex(
            (s) => s.id === currentScenario,
        );
        const next = allScenarios.find(
            (s, i) => i !== currentIdx && s.id !== currentScenario,
        );
        if (next) setScenario(next.id);
    };

    const handleCancelEmptyScenarioDelete = async () => {
        setShowEmptyScenarioModal(false);
        await undoDelete();
    };

    const isCustomScenario = customScenarios.some(
        (s) => s.id === currentScenario,
    );

    const handleConfirmDeleteScenario = async () => {
        const scenarioToDelete = currentScenario;
        const ok = await deleteEntireScenario(scenarioToDelete);
        setShowDeleteScenarioModal(false);
        if (!ok) return;
        addToast('Scenario deleted', 'error');
        const currentIdx = allScenarios.findIndex(
            (s) => s.id === scenarioToDelete,
        );
        const next = allScenarios.find(
            (s, i) => i !== currentIdx && s.id !== scenarioToDelete,
        );
        if (next) setScenario(next.id);
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scenarioSearch.trim()) return;
        await generateScenario(scenarioSearch.trim());
        setScenarioSearch('');
        if (!usePhraseStore.getState().generateError) {
            setIsAddingScenario(false);
        }
    };

    const handleCancelAddScenario = () => {
        setIsAddingScenario(false);
        setScenarioSearch('');
    };

    const handleOpenCreateScenarioPhrase = () => {
        setNewScenarioLabel('');
        setAddPhraseMode('new-scenario');
    };

    const handleRegenerate = () => {
        const label = scenarioMeta?.label ?? currentScenario;
        generateScenario(label, true);
    };

    const handleAddPhrase = async (input: Parameters<typeof addPhrase>[0]) => {
        const ok = await addPhrase(input);
        if (!ok) return;
        setAddPhraseMode(null);
        addToast('Phrase added', 'success');
    };

    const handleCreateScenarioPhrase = async (
        input: Parameters<typeof addPhrase>[0],
    ) => {
        const ok = await createScenarioWithPhrase(newScenarioLabel, input);
        if (!ok) return;
        setAddPhraseMode(null);
        setIsAddingScenario(false);
        setScenarioSearch('');
        addToast('Scenario created', 'success');
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10">
            <div
                aria-live="polite"
                className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4"
            >
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        role="status"
                        className={`max-w-md rounded-full px-4 py-2 text-center text-sm font-medium shadow-lg ${toastTone[toast.tone]}`}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>

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
                    {isAddingScenario ? (
                        <>
                            <label
                                htmlFor="scenario-search"
                                className="text-sm font-medium text-slate-500"
                            >
                                Add new scenario
                            </label>
                            <form
                                onSubmit={handleGenerate}
                                className="flex w-full gap-2"
                            >
                                <input
                                    id="scenario-search"
                                    type="text"
                                    autoFocus
                                    value={scenarioSearch}
                                    onChange={(e) =>
                                        setScenarioSearch(e.target.value)
                                    }
                                    placeholder="Request a new scenario, e.g. 'job interview'"
                                    className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-slate-700 focus:border-rose-400 focus:outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={
                                        generating || !scenarioSearch.trim()
                                    }
                                    className="rounded-full bg-slate-900 px-5 py-2 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {generating ? 'Generating...' : 'Generate'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancelAddScenario}
                                    disabled={generating}
                                    className="rounded-full border border-slate-300 px-4 py-2 text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </form>
                            {generateError && (
                                <p className="text-sm text-rose-600">
                                    {generateError}
                                </p>
                            )}
                        </>
                    ) : (
                        <>
                            <label
                                htmlFor="scenario-select"
                                className="text-sm font-medium text-slate-500"
                            >
                                Scenario
                            </label>
                            <div className="flex w-full gap-2">
                                <select
                                    id="scenario-select"
                                    value={currentScenario}
                                    onChange={(e) =>
                                        setScenario(e.target.value)
                                    }
                                    className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-center font-medium text-slate-700 focus:border-rose-400 focus:outline-none"
                                >
                                    {allScenarios.map((scenario) => (
                                        <option
                                            key={scenario.id}
                                            value={scenario.id}
                                        >
                                            {scenario.label}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={handleOpenCreateScenarioPhrase}
                                    className="rounded-full border border-emerald-500 px-5 py-2 font-medium text-emerald-600 transition hover:bg-emerald-50"
                                >
                                    Create
                                </button>
                                {isCustomScenario && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowDeleteScenarioModal(true)
                                        }
                                        className="rounded-full border border-rose-500 px-5 py-2 font-medium text-rose-600 transition hover:bg-rose-50"
                                    >
                                        Delete
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsAddingScenario(true)}
                                    className="rounded-full border border-slate-300 px-5 py-2 font-medium text-slate-600 transition hover:bg-white"
                                >
                                    Search
                                </button>
                            </div>
                            {scenarioMeta && (
                                <p className="text-center text-xs text-slate-400">
                                    {scenarioMeta.description}
                                </p>
                            )}
                        </>
                    )}
                </div>

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
                        <PhraseCard
                            phrase={currentPhrase}
                            onDelete={handleDelete}
                            deleting={deleting}
                            onUndo={undoDelete}
                            undoing={undoing}
                            canUndo={Boolean(deletedPhrase)}
                            onAdd={() => setAddPhraseMode('existing')}
                        />
                        {deleteError && (
                            <p className="text-sm text-rose-600">
                                {deleteError}
                            </p>
                        )}
                        {reorderError && (
                            <p className="text-sm text-rose-600">
                                {reorderError}
                            </p>
                        )}
                        <ResponsePractice phrase={currentPhrase} />

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => moveCurrentPhrase('up')}
                                disabled={reordering || currentIndex === 0}
                                className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Move up
                            </button>
                            <button
                                type="button"
                                onClick={() => moveCurrentPhrase('down')}
                                disabled={
                                    reordering ||
                                    currentIndex === scenarioPhrases.length - 1
                                }
                                className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Move down
                            </button>
                        </div>

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

            {addPhraseMode === 'existing' && (
                <AddPhraseForm
                    scenarioLabel={scenarioMeta?.label ?? currentScenario}
                    submitting={adding}
                    error={addError}
                    onCancel={() => setAddPhraseMode(null)}
                    onSubmit={handleAddPhrase}
                />
            )}

            {addPhraseMode === 'new-scenario' && (
                <AddPhraseForm
                    scenarioLabel={newScenarioLabel}
                    scenarioEditable
                    onScenarioLabelChange={setNewScenarioLabel}
                    submitting={adding}
                    error={addError}
                    onCancel={() => setAddPhraseMode(null)}
                    onSubmit={handleCreateScenarioPhrase}
                />
            )}

            {showEmptyScenarioModal && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-slate-900">
                            Delete this scenario?
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                            This was the last phrase in{' '}
                            {scenarioMeta?.label ?? currentScenario}. Deleting
                            it will leave the scenario empty. Are you sure?
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleCancelEmptyScenarioDelete}
                                disabled={undoing}
                                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                No, keep it
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmEmptyScenarioDelete}
                                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500"
                            >
                                Yes, delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteScenarioModal && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-slate-900">
                            Delete this scenario?
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                            This will permanently delete{' '}
                            {scenarioMeta?.label ?? currentScenario} and all{' '}
                            {scenarioPhrases.length} phrase
                            {scenarioPhrases.length === 1 ? '' : 's'} in it. Are
                            you sure?
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    setShowDeleteScenarioModal(false)
                                }
                                disabled={deletingScenario}
                                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                No, keep it
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDeleteScenario}
                                disabled={deletingScenario}
                                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {deletingScenario
                                    ? 'Deleting...'
                                    : 'Yes, delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
