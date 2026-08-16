import { useCallback, useEffect, useRef, useState } from 'react';

// Minimal typings for the Web Speech API's SpeechRecognition, which isn't
// part of the standard lib.dom typings yet.
interface SpeechRecognitionResultLike {
    isFinal: boolean;
    [index: number]: { transcript: string };
}

interface SpeechRecognitionEventLike extends Event {
    resultIndex: number;
    results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike extends Event {
    error: string;
}

interface SpeechRecognitionLike extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start(): void;
    stop(): void;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
    onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const isSpeechRecognitionSupported =
    getSpeechRecognitionConstructor() !== null;

interface UseSpeechRecognitionOptions {
    lang?: string;
    onResult: (transcript: string, isFinal: boolean) => void;
}

// Wraps the browser's SpeechRecognition API so components can start/stop
// listening and receive interim + final transcripts as the user speaks.
export function useSpeechRecognition({
    lang = 'ja-JP',
    onResult,
}: UseSpeechRecognitionOptions) {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
    const onResultRef = useRef(onResult);
    onResultRef.current = onResult;

    useEffect(() => {
        return () => {
            recognitionRef.current?.stop();
        };
    }, []);

    const start = useCallback(() => {
        const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
        if (!SpeechRecognitionCtor) {
            setError('Speech recognition is not supported in this browser.');
            return;
        }

        setError(null);
        const recognition = new SpeechRecognitionCtor();
        recognition.lang = lang;
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
            let transcript = '';
            let isFinal = false;
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                transcript += result[0].transcript;
                if (result.isFinal) isFinal = true;
            }
            onResultRef.current(transcript, isFinal);
        };

        recognition.onerror = (event) => {
            setError(event.error || 'Speech recognition error');
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    }, [lang]);

    const stop = useCallback(() => {
        recognitionRef.current?.stop();
        setIsListening(false);
    }, []);

    return { isListening, error, start, stop };
}
