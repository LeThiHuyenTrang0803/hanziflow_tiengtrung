// ============================================================================
// UTILITY HELPERS (Pinyin Normalization, Audio TTS, CSV/JSON Parsers)
// ============================================================================

import { getStartOfTodayMs, DAY_MS } from '@/lib/srs';
import type { VocabularyItem, VocabStatus } from '@/types/vocabulary';

export function stripPinyinTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ü/g, 'v')
    .toLowerCase()
    .trim();
}

export function speakChinese(text: string): void {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  } catch {
    // Ignore audio errors if unsupported
  }
}

export function formatRelativeReviewDate(timestamp: number): string {
  const now = Date.now();
  const todayStart = getStartOfTodayMs();
  if (timestamp <= now) return 'Due now';
  const diffDays = Math.ceil((timestamp - todayStart) / DAY_MS);
  if (diffDays <= 0) return 'Due today';
  if (diffDays === 1) return 'Tomorrow';
  return `In ${diffDays} days`;
}

export function exportWordsToCSV(words: VocabularyItem[]): string {
  const headers = [
    'id',
    'hanzi',
    'pinyin',
    'meaning',
    'example_sentence',
    'status',
    'next_review_date',
    'interval',
    'lessonId',
    'levelId'
  ];
  const escapeCell = (val: string | number | undefined) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const rows = words.map((w) =>
    [
      w.id,
      w.hanzi,
      w.pinyin,
      w.meaning,
      w.example_sentence,
      w.status,
      w.next_review_date,
      w.interval,
      w.lessonId || '',
      w.levelId || ''
    ]
      .map(escapeCell)
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function parseImportPayload(rawText: string): VocabularyItem[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  const todayStart = getStartOfTodayMs();

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr
      .filter((item) => item && typeof item.hanzi === 'string' && item.hanzi.trim())
      .map((item, idx) => ({
        id: item.id || `imp-${Date.now()}-${idx}`,
        hanzi: String(item.hanzi).trim(),
        pinyin: String(item.pinyin || '').trim(),
        meaning: String(item.meaning || '').trim(),
        example_sentence: String(item.example_sentence || '').trim(),
        status:
          item.status === 'learning' || item.status === 'graduated' ? item.status : 'new',
        next_review_date: Number(item.next_review_date) || todayStart,
        interval: Number(item.interval) || 0,
        lessonId: item.lessonId || 'les-hsk1-1',
        levelId: item.levelId || 'lvl-hsk1',
        ease_factor: 2.5,
        repetitions: 0
      }));
  }

  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const firstRow = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
  const hasHeader =
    firstRow.includes('hanzi') || firstRow.includes('pinyin') || firstRow.includes('meaning');

  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines
    .map((line, idx) => {
      const cols = parseCSVLine(line);
      if (hasHeader) {
        const getCol = (name: string, fallbackIdx: number) => {
          const i = firstRow.indexOf(name);
          return i >= 0 ? cols[i] || '' : cols[fallbackIdx] || '';
        };
        const hanzi = getCol('hanzi', 0);
        if (!hanzi) return null;
        const statusRaw = getCol('status', 4);
        const status: VocabStatus =
          statusRaw === 'learning' || statusRaw === 'graduated' ? statusRaw : 'new';
        return {
          id: getCol('id', -1) || `csv-${Date.now()}-${idx}`,
          hanzi,
          pinyin: getCol('pinyin', 1),
          meaning: getCol('meaning', 2),
          example_sentence: getCol('example_sentence', 3),
          status,
          next_review_date: Number(getCol('next_review_date', 5)) || todayStart,
          interval: Number(getCol('interval', 6)) || 0,
          lessonId: getCol('lessonid', 7) || 'les-hsk1-1',
          levelId: getCol('levelid', 8) || 'lvl-hsk1',
          ease_factor: 2.5,
          repetitions: 0
        } as VocabularyItem;
      } else {
        if (!cols[0]) return null;
        return {
          id: `csv-${Date.now()}-${idx}`,
          hanzi: cols[0] || '',
          pinyin: cols[1] || '',
          meaning: cols[2] || '',
          example_sentence: cols[3] || '',
          status: 'new' as VocabStatus,
          next_review_date: todayStart,
          interval: 0,
          lessonId: 'les-hsk1-1',
          levelId: 'lvl-hsk1',
          ease_factor: 2.5,
          repetitions: 0
        };
      }
    })
    .filter((item): item is VocabularyItem => item !== null);
}

// ============================================================================
// UPDATED ARCHITECTURE BLUEPRINT SNIPPETS
// ============================================================================

export const STEP_1_STRUCTURE_CODE = `# Hierarchical Course & Deck Architecture (Next.js App Router)
hanzi-flow/
├── src/
│   ├── app/
│   │   ├── layout.tsx                   # Root Layout + 'Noto Sans SC' + ThemeProvider
│   │   ├── page.tsx                     # SRS Dashboard (Category & Level Filters)
│   │   ├── library/
│   │   │   ├── page.tsx                 # Categories Grid (HSK, Giao tiếp, YCT)
│   │   │   ├── [categoryId]/page.tsx    # Course Levels List (HSK 1, HSK 2)
│   │   │   └── lesson/[lessonId]/page.tsx # Lesson Detail: Từ vựng + Bài khóa (Reading Text)
│   │   ├── vocabulary/page.tsx          # Global Vocabulary Manager & CSV/JSON Import
│   │   └── review/page.tsx              # Flashcard SRS Deck (Filtered by Lesson/Level/Category)
│   ├── types/
│   │   └── vocabulary.ts                # Category, CourseLevel, Lesson, ReadingText, VocabularyItem
│   ├── lib/
│   │   └── srs.ts                       # SM-2 Spaced Repetition Engine
│   └── store/
│       └── useVocabStore.ts             # Zustand Store with Relational Queries & Seed Data`;

export const STEP_2_MODELS_CODE = `// src/types/vocabulary.ts
export type VocabStatus = 'new' | 'learning' | 'graduated';
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

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
  hanzi: string;
  pinyin: string;
  meaning: string;
  example_sentence: string;
  status: VocabStatus;
  next_review_date: number;
  interval: number;
  lessonId?: string; // Optional link to Lesson (null/undefined for standalone words)
  levelId?: string;  // Link to CourseLevel
}`;
