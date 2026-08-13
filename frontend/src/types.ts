export interface Phrase {
  id: string;
  japanese: string;
  romaji: string;
  english: string;
  audioUrl: string;
  category: "greeting" | "daily-life" | "food" | "travel" | "work";
  difficulty: "beginner" | "intermediate" | "advanced";
  practicePrompt: string;
}

export interface PracticeResponseEntry {
  text: string;
  submittedAt: string;
}
