import { create } from 'zustand';
import type {
  Category,
  CourseLevel,
  Lesson,
  ReadingText,
  VocabularyItem,
  LessonVocabulary,
  VocabFormInput,
  TrackCode,
  ReviewRating
} from '@/types/vocabulary';
import {
  VocabStorageService,
  INITIAL_LESSON_VOCAB_LINKS,
  normalizeCanonicalVocabKey,
  getInitialHierarchicalData
} from '@/services/vocabStorage';
import { calculateNextReview, getStartOfTodayMs } from '@/lib/srs';

// ============================================================================
// 4. ZUSTAND HIERARCHICAL STORE (src/store/useVocabStore.ts)
// ============================================================================

interface VocabStoreState {
  categories: Category[];
  levels: CourseLevel[];
  lessons: Lesson[];
  readingTexts: ReadingText[];
  words: VocabularyItem[];
  lessonVocabLinks: LessonVocabulary[];
  isInitialized: boolean;
  darkMode: boolean;
  reviewsCompletedToday: number;
  initialize: () => void;
  toggleDarkMode: () => void;
  addWord: (input: VocabFormInput) => VocabularyItem;
  linkWordToLesson: (vocabId: string, lessonId: string, trackId?: TrackCode) => void;
  updateWord: (id: string, input: Partial<VocabularyItem>) => void;
  deleteWord: (id: string) => void;
  rateWord: (id: string, rating: ReviewRating) => void;
  addLesson: (levelId: string, title: string, description: string) => Lesson;
  saveReadingText: (input: Omit<ReadingText, 'id'> & { id?: string }) => void;
  bulkImport: (newItems: VocabularyItem[], mode: 'merge' | 'replace') => number;
  resetDemoData: () => void;
}

const persistFromState = (state: {
  categories: Category[];
  levels: CourseLevel[];
  lessons: Lesson[];
  readingTexts: ReadingText[];
  words: VocabularyItem[];
  lessonVocabLinks: LessonVocabulary[];
}) => {
  VocabStorageService.saveBundle({
    categories: state.categories,
    levels: state.levels,
    lessons: state.lessons,
    readingTexts: state.readingTexts,
    words: state.words,
    lessonVocabLinks: state.lessonVocabLinks
  });
};

export const useVocabStore = create<VocabStoreState>((set, get) => ({
  categories: [],
  levels: [],
  lessons: [],
  readingTexts: [],
  words: [],
  lessonVocabLinks: INITIAL_LESSON_VOCAB_LINKS,
  isInitialized: false,
  darkMode: false,
  reviewsCompletedToday: 0,

  initialize: () => {
    if (get().isInitialized) return;
    const bundle = VocabStorageService.loadBundle();
    const theme = VocabStorageService.getTheme();
    set({
      categories: bundle.categories,
      levels: bundle.levels,
      lessons: bundle.lessons,
      readingTexts: bundle.readingTexts,
      words: bundle.words,
      lessonVocabLinks: bundle.lessonVocabLinks || INITIAL_LESSON_VOCAB_LINKS,
      isInitialized: true,
      darkMode: theme === 'dark'
    });
  },

  toggleDarkMode: () => {
    const next = !get().darkMode;
    VocabStorageService.saveTheme(next ? 'dark' : 'light');
    set({ darkMode: next });
  },

  addWord: (input) => {
    const state = get();
    let resolvedLevelId = input.levelId;
    if (input.lessonId && !resolvedLevelId) {
      const matchedLesson = state.lessons.find((l) => l.id === input.lessonId);
      if (matchedLesson) resolvedLevelId = matchedLesson.levelId;
    }

    const inputKey = normalizeCanonicalVocabKey(input.hanzi, input.pinyin, input.meaning);
    const existingCanonical = state.words.find(
      (w) =>
        normalizeCanonicalVocabKey(w.hanzi, w.pinyin, w.meaning) === inputKey ||
        w.hanzi.trim() === input.hanzi.trim()
    );

    if (existingCanonical) {
      // P1 Fix: Preserve existing lessonId & SRS state! Only append a new LessonVocabulary link if needed.
      let nextLinks = state.lessonVocabLinks;
      if (input.lessonId) {
        const hasLink = nextLinks.some(
          (lv) => lv.lessonId === input.lessonId && lv.vocabId === existingCanonical.id
        );
        if (!hasLink) {
          const newLink: LessonVocabulary = {
            id: `lv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            lessonId: input.lessonId,
            vocabId: existingCanonical.id,
            trackId: input.lessonId.includes('comm') ? 'track-comm' : 'track-hsk',
            order: nextLinks.filter((l) => l.lessonId === input.lessonId).length + 1
          };
          nextLinks = [...nextLinks, newLink];
        }
      }
      set({ lessonVocabLinks: nextLinks });
      persistFromState({ ...state, lessonVocabLinks: nextLinks });
      return existingCanonical;
    }

    const newItem: VocabularyItem = {
      id: `voc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      hanzi: input.hanzi.trim(),
      pinyin: input.pinyin.trim(),
      meaning: input.meaning.trim(),
      example_sentence: input.example_sentence.trim(),
      status: input.status || 'new',
      next_review_date: getStartOfTodayMs(),
      interval: 0,
      lessonId: input.lessonId || undefined,
      levelId: resolvedLevelId || undefined,
      ease_factor: 2.5,
      repetitions: 0
    };
    const nextWords = [newItem, ...state.words];
    let nextLinks = state.lessonVocabLinks;
    if (input.lessonId) {
      nextLinks = [
        ...nextLinks,
        {
          id: `lv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          lessonId: input.lessonId,
          vocabId: newItem.id,
          trackId: input.lessonId.includes('comm') ? 'track-comm' : 'track-hsk',
          order: nextLinks.filter((l) => l.lessonId === input.lessonId).length + 1
        }
      ];
    }
    set({ words: nextWords, lessonVocabLinks: nextLinks });
    persistFromState({ ...state, words: nextWords, lessonVocabLinks: nextLinks });
    return newItem;
  },

  linkWordToLesson: (vocabId, lessonId, trackId) => {
    const state = get();
    const exists = state.lessonVocabLinks.some(
      (lv) => lv.vocabId === vocabId && lv.lessonId === lessonId
    );
    if (exists) return;
    const nextLinks: LessonVocabulary[] = [
      ...state.lessonVocabLinks,
      {
        id: `lv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        lessonId,
        vocabId,
        trackId: trackId || (lessonId.includes('comm') ? 'track-comm' : 'track-hsk'),
        order: state.lessonVocabLinks.filter((l) => l.lessonId === lessonId).length + 1
      }
    ];
    set({ lessonVocabLinks: nextLinks });
    persistFromState({ ...state, lessonVocabLinks: nextLinks });
  },

  updateWord: (id, input) => {
    const state = get();
    let resolvedLevelId = input.levelId;
    if (input.lessonId && !resolvedLevelId) {
      const matchedLesson = state.lessons.find((l) => l.id === input.lessonId);
      if (matchedLesson) resolvedLevelId = matchedLesson.levelId;
    }
    const nextWords = state.words.map((w) =>
      w.id === id
        ? {
            ...w,
            ...input,
            levelId: resolvedLevelId !== undefined ? resolvedLevelId : w.levelId
          }
        : w
    );
    let nextLinks = state.lessonVocabLinks;
    if (input.lessonId) {
      const hasLink = nextLinks.some(
        (lv) => lv.lessonId === input.lessonId && lv.vocabId === id
      );
      if (!hasLink) {
        nextLinks = [
          ...nextLinks,
          {
            id: `lv-${Date.now()}`,
            lessonId: input.lessonId,
            vocabId: id,
            trackId: input.lessonId.includes('comm') ? 'track-comm' : 'track-hsk',
            order: nextLinks.length + 1
          }
        ];
      }
    }
    set({ words: nextWords, lessonVocabLinks: nextLinks });
    persistFromState({ ...state, words: nextWords, lessonVocabLinks: nextLinks });
  },

  deleteWord: (id) => {
    const state = get();
    const nextWords = state.words.filter((w) => w.id !== id);
    // P1 Fix: Remove all LessonVocabulary links referencing the deleted word to prevent orphan links
    const nextLinks = state.lessonVocabLinks.filter((lv) => lv.vocabId !== id);
    set({ words: nextWords, lessonVocabLinks: nextLinks });
    persistFromState({ ...state, words: nextWords, lessonVocabLinks: nextLinks });
  },

  rateWord: (id, rating) => {
    const state = get();
    const nextWords = state.words.map((w) =>
      w.id === id ? calculateNextReview(w, rating) : w
    );
    set({
      words: nextWords,
      reviewsCompletedToday: state.reviewsCompletedToday + 1
    });
    persistFromState({ ...state, words: nextWords });
  },

  addLesson: (levelId, title, description) => {
    const state = get();
    const newLesson: Lesson = {
      id: `les-${Date.now()}`,
      levelId,
      title: title.trim(),
      description: description.trim()
    };
    const nextLessons = [...state.lessons, newLesson];
    set({ lessons: nextLessons });
    persistFromState({ ...state, lessons: nextLessons });
    return newLesson;
  },

  saveReadingText: (input) => {
    const state = get();
    let nextTexts: ReadingText[];
    if (input.id) {
      nextTexts = state.readingTexts.map((rt) =>
        rt.id === input.id ? { ...rt, ...input, id: input.id } : rt
      );
    } else {
      const created: ReadingText = {
        id: `rt-${Date.now()}`,
        lessonId: input.lessonId,
        title: input.title.trim(),
        content_hanzi: input.content_hanzi.trim(),
        content_pinyin: input.content_pinyin.trim(),
        content_meaning: input.content_meaning.trim()
      };
      nextTexts = [...state.readingTexts, created];
    }
    set({ readingTexts: nextTexts });
    persistFromState({ ...state, readingTexts: nextTexts });
  },

  bulkImport: (incoming, mode) => {
    const state = get();
    const validLessonIds = new Set(state.lessons.map((l) => l.id));

    if (mode === 'replace') {
      // Deduplicate incoming by canonical key and rebuild LessonVocabulary cleanly without orphan links
      const canonicalMap = new Map<string, VocabularyItem>();
      const nextLinks: LessonVocabulary[] = [];
      incoming.forEach((item, idx) => {
        const key = normalizeCanonicalVocabKey(item.hanzi, item.pinyin, item.meaning);
        const existing = canonicalMap.get(key);
        const targetWord = existing || item;
        if (!existing) {
          canonicalMap.set(key, item);
        }
        if (item.lessonId && validLessonIds.has(item.lessonId)) {
          const alreadyLinked = nextLinks.some(
            (lv) => lv.lessonId === item.lessonId && lv.vocabId === targetWord.id
          );
          if (!alreadyLinked) {
            nextLinks.push({
              id: `lv-imp-${Date.now()}-${idx}`,
              lessonId: item.lessonId,
              vocabId: targetWord.id,
              trackId: item.lessonId.includes('comm') ? 'track-comm' : 'track-hsk',
              order: nextLinks.length + 1
            });
          }
        }
      });
      const nextWords = Array.from(canonicalMap.values());
      set({ words: nextWords, lessonVocabLinks: nextLinks });
      persistFromState({ ...state, words: nextWords, lessonVocabLinks: nextLinks });
      return nextWords.length;
    } else {
      // Merge mode: preserve existing SRS state for canonical matches and append new LessonVocabulary links!
      const nextWords = [...state.words];
      const nextLinks = [...state.lessonVocabLinks];
      let addedOrLinkedCount = 0;

      incoming.forEach((item, idx) => {
        const key = normalizeCanonicalVocabKey(item.hanzi, item.pinyin, item.meaning);
        const existing = nextWords.find(
          (w) =>
            normalizeCanonicalVocabKey(w.hanzi, w.pinyin, w.meaning) === key ||
            w.hanzi.trim() === item.hanzi.trim()
        );
        const targetId = existing ? existing.id : item.id;
        if (!existing) {
          nextWords.unshift(item);
          addedOrLinkedCount++;
        }
        if (item.lessonId && validLessonIds.has(item.lessonId)) {
          const hasLink = nextLinks.some(
            (lv) => lv.lessonId === item.lessonId && lv.vocabId === targetId
          );
          if (!hasLink) {
            nextLinks.push({
              id: `lv-mrg-${Date.now()}-${idx}`,
              lessonId: item.lessonId,
              vocabId: targetId,
              trackId: item.lessonId.includes('comm') ? 'track-comm' : 'track-hsk',
              order: nextLinks.length + 1
            });
            if (existing) addedOrLinkedCount++;
          }
        }
      });

      set({ words: nextWords, lessonVocabLinks: nextLinks });
      persistFromState({ ...state, words: nextWords, lessonVocabLinks: nextLinks });
      return addedOrLinkedCount;
    }
  },

  resetDemoData: () => {
    const seed = getInitialHierarchicalData();
    VocabStorageService.saveBundle(seed);
    set({
      categories: seed.categories,
      levels: seed.levels,
      lessons: seed.lessons,
      readingTexts: seed.readingTexts,
      words: seed.words,
      lessonVocabLinks: seed.lessonVocabLinks || INITIAL_LESSON_VOCAB_LINKS,
      reviewsCompletedToday: 0
    });
  }
}));