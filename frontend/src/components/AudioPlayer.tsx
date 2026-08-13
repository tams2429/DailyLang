import { useRef, useState } from 'react';

interface AudioPlayerProps {
    src: string;
}

export function AudioPlayer({ src }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [error, setError] = useState(false);

    const play = () => {
        setError(false);
        audioRef.current?.play().catch(() => setError(true));
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
            <audio
                ref={audioRef}
                src={src}
                onError={() => setError(true)}
                preload="none"
            />
            {error && (
                <p className="text-sm text-amber-600">
                    Audio not available yet. Add a matching file under{' '}
                    <code>backend/public/audio</code>.
                </p>
            )}
        </div>
    );
}
