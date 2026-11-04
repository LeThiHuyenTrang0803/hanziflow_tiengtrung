// ============================================================================
// 1. DATA MODELS & HIERARCHICAL COURSE TYPES (src/types/vocabulary.ts)
// ============================================================================

export type VocabStatus = 'new' | 'learning' | 'graduated';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export type TrackCode = 'track-hsk' | 'track-comm';

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface CourseLevel {
  id: string;
  categoryId: string;
  name: string;
  description: string;
}

export interface Lesson {
  id: string;
  levelId: string;
  title: string;
  description: string;
}

export interface ReadingText {
  id: string;
  lessonId: string;
  title: string;
  content_hanzi: string;
  content_pinyin: string;
  content_meaning: string;
}

export interface VocabularyItem {
  id: string;
  hanzi: string;            // Chinese characters (e.g., 学习)
  pinyin: string;           // Pinyin with tone marks (e.g., xué xí)
  meaning: string;          // Vietnamese translation (e.g., Học tập)
  example_sentence: string; // Example sentence using the word
  status: VocabStatus;      // 'new' | 'learning' | 'graduated'
  next_review_date: number; // Timestamp (ms) for the next review
  interval: number;         // Current review interval in days
  lessonId?: string;        // Optional link to a Lesson
  levelId?: string;         // Optional link to a CourseLevel
  ease_factor?: number;     // SM-2 ease factor (default 2.5)
  repetitions?: number;     // Consecutive successful recalls
  last_reviewed_at?: number;// Timestamp (ms) of last review
}

export type VocabFormInput = Pick<
  VocabularyItem,
  'hanzi' | 'pinyin' | 'meaning' | 'example_sentence'
> & {
  status?: VocabStatus;
  lessonId?: string;
  levelId?: string;
};

export interface LessonVocabulary {
  id: string;
  lessonId: string;
  vocabId: string; // Points to canonical VocabularyItem.id (1 SRS schedule per word!)
  trackId: TrackCode;
  order: number;
}
