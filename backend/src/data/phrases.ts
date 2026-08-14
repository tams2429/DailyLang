export interface Phrase {
    id: string;
    japanese: string;
    romaji: string;
    english: string;
    /** Path served by this backend under /audio, e.g. /audio/ohayou.mp3 */
    audioUrl: string;
    category: 'greeting' | 'daily-life' | 'food' | 'travel' | 'work';
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    /** Suggested example response the user can practice saying back */
    practicePrompt: string;
    /** A correct example response (romaji) used to generate hints */
    exampleResponse: string;
}

// Preprogrammed daily phrases. Add real audio files to backend/public/audio
// with matching filenames to enable playback.
export const phrases: Phrase[] = [
    {
        id: 'ohayou-gozaimasu',
        japanese: 'おはようございます',
        romaji: 'Ohayou gozaimasu',
        english: 'Good morning',
        audioUrl: '/audio/ohayou-gozaimasu.mp3',
        category: 'greeting',
        difficulty: 'beginner',
        practicePrompt: 'Reply with a good morning greeting of your own.',
        exampleResponse: 'Ohayou gozaimasu',
    },
    {
        id: 'genki-desu-ka',
        japanese: 'お元気ですか？',
        romaji: 'Genki desu ka?',
        english: 'How are you?',
        audioUrl: '/audio/genki-desu-ka.mp3',
        category: 'greeting',
        difficulty: 'beginner',
        practicePrompt:
            'Answer how you are feeling today, e.g. 元気です (Genki desu).',
        exampleResponse: 'Genki desu',
    },
    {
        id: 'onaka-ga-suita',
        japanese: 'お腹が空いた',
        romaji: 'Onaka ga suita',
        english: "I'm hungry",
        audioUrl: '/audio/onaka-ga-suita.mp3',
        category: 'daily-life',
        difficulty: 'beginner',
        practicePrompt: "Say what you'd like to eat right now.",
        exampleResponse: 'Sushi ga tabetai desu',
    },
    {
        id: 'nani-ga-tabetai',
        japanese: '何が食べたいですか？',
        romaji: 'Nani ga tabetai desu ka?',
        english: 'What do you want to eat?',
        audioUrl: '/audio/nani-ga-tabetai.mp3',
        category: 'food',
        difficulty: 'intermediate',
        practicePrompt: "Respond with a food you'd like to eat.",
        exampleResponse: 'Ramen ga tabetai desu',
    },
    {
        id: 'eki-wa-doko-desu-ka',
        japanese: '駅はどこですか？',
        romaji: 'Eki wa doko desu ka?',
        english: 'Where is the station?',
        audioUrl: '/audio/eki-wa-doko-desu-ka.mp3',
        category: 'travel',
        difficulty: 'intermediate',
        practicePrompt: 'Practice giving simple directions in Japanese.',
        exampleResponse: 'Massugu itte kudasai',
    },
    {
        id: 'otsukaresama-desu',
        japanese: 'お疲れ様です',
        romaji: 'Otsukaresama desu',
        english: 'Thank you for your hard work',
        audioUrl: '/audio/otsukaresama-desu.mp3',
        category: 'work',
        difficulty: 'advanced',
        practicePrompt: 'Reply to a coworker at the end of the day.',
        exampleResponse: 'Otsukaresama deshita',
    },
];
