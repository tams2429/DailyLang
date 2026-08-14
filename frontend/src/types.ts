export type ScenarioId =
    | 'greetings'
    | 'restaurant'
    | 'shop'
    | 'plane'
    | 'airport'
    | 'hotel';

export interface ScenarioMeta {
    id: ScenarioId;
    label: string;
    description: string;
}

export interface Phrase {
    id: string;
    /** Scenario/topic this phrase belongs to, used to group a conversation flow */
    scenario: ScenarioId;
    /** 1-based position of this phrase within its scenario's conversation flow */
    order: number;
    japanese: string;
    romaji: string;
    english: string;
    audioUrl: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    practicePrompt: string;
    /** A correct example response (romaji) used to generate hints */
    exampleResponse: string;
}

export interface PracticeResponseEntry {
    text: string;
    submittedAt: string;
}
