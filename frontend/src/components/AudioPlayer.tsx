import { useRef, useState } from 'react';

interface AudioPlayerProps {
    src: string;
    text?: string;
}

function speak(text: string): boolean {
    if (!('speechSynthesis' in window)) return false;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    window.speechSynthesis.speak(utterance);
    return true;
}

export function AudioPlayer({ src, text }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [error, setError] = useState(false);

    const play = () => {
        setError(false);

        if (!src) {
            if (!text || !speak(text)) setError(true);
            return;
        }

        audioRef.current?.play().catch(() => {
            if (!text || !speak(text)) setError(true);
        });
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <button
                type="button"
                onClick={play}
                className="flex items-center gap-2 rounded-full bg-rose-500 px-6 py-3 font-medium text-white shadow transition hover:bg-rose-600 active:scale-95"
            >
                <span aria-hidden>▶</span>
                Play phrase
            </button>
            {src && (
                <audio
                    ref={audioRef}
                    src={src}
                    onError={() => setError(true)}
                    preload="none"
                />
            )}
            {error && (
                <p className="text-sm text-amber-600">
                    Audio not available. Your browser may not support speech
                    synthesis.
                </p>
            )}
        </div>
    );
}
