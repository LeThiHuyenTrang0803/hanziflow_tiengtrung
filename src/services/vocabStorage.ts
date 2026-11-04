import type {
  Category,
  CourseLevel,
  Lesson,
  ReadingText,
  VocabularyItem,
  LessonVocabulary
} from '@/types/vocabulary';
import { getStartOfTodayMs, DAY_MS } from '@/lib/srs';

// ============================================================================
// 3. HIERARCHICAL SEED DATA & LOCALSTORAGE REPOSITORY (src/services/vocabStorage.ts)
// ============================================================================

const STORAGE_KEY = 'hanziflow_hierarchical_v2';
const THEME_KEY = 'hanziflow_theme_v1';

export interface HierarchicalSeedBundle {
  categories: Category[];
  levels: CourseLevel[];
  lessons: Lesson[];
  readingTexts: ReadingText[];
  words: VocabularyItem[];
  lessonVocabLinks?: LessonVocabulary[];
}

export function normalizeCanonicalVocabKey(
  hanzi: string,
  pinyin?: string,
  meaning?: string
): string {
  const h = (hanzi || '').trim();
  const p = (pinyin || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
  const m = (meaning || '').trim().toLowerCase();
  // Primary identity is Hanzi + normalized Pinyin reading; if Pinyin is omitted, fall back to Hanzi + Meaning
  if (p) return `${h}::${p}`;
  if (m) return `${h}::${m}`;
  return h;
}

export const INITIAL_LESSON_VOCAB_LINKS: LessonVocabulary[] = [
  { id: 'lv-1', lessonId: 'les-hsk1-1', vocabId: 'hsk1-w1', trackId: 'track-hsk', order: 1 },
  { id: 'lv-2', lessonId: 'les-hsk1-1', vocabId: 'hsk1-w2', trackId: 'track-hsk', order: 2 },
  { id: 'lv-3', lessonId: 'les-hsk1-1', vocabId: 'hsk1-w3', trackId: 'track-hsk', order: 3 },
  { id: 'lv-4', lessonId: 'les-hsk1-1', vocabId: 'hsk1-w4', trackId: 'track-hsk', order: 4 },
  { id: 'lv-5', lessonId: 'les-hsk1-1', vocabId: 'hsk1-w5', trackId: 'track-hsk', order: 5 },
  // HSK 2 Lesson 1
  { id: 'lv-6', lessonId: 'les-hsk2-1', vocabId: 'voc-1', trackId: 'track-hsk', order: 1 },
  { id: 'lv-7', lessonId: 'les-hsk2-1', vocabId: 'voc-2', trackId: 'track-hsk', order: 2 },
  { id: 'lv-8', lessonId: 'les-hsk2-1', vocabId: 'voc-3', trackId: 'track-hsk', order: 3 },
  { id: 'lv-9', lessonId: 'les-hsk2-1', vocabId: 'voc-4', trackId: 'track-hsk', order: 4 },
  { id: 'lv-10', lessonId: 'les-hsk2-1', vocabId: 'voc-5', trackId: 'track-hsk', order: 5 },
  { id: 'lv-11', lessonId: 'les-hsk2-1', vocabId: 'voc-6', trackId: 'track-hsk', order: 6 },
  { id: 'lv-12', lessonId: 'les-hsk2-1', vocabId: 'voc-7', trackId: 'track-hsk', order: 7 },
  { id: 'lv-13', lessonId: 'les-hsk2-1', vocabId: 'voc-8', trackId: 'track-hsk', order: 8 },
  { id: 'lv-14', lessonId: 'les-hsk2-1', vocabId: 'voc-9', trackId: 'track-hsk', order: 9 },
  // Communication Lesson 1 (Reuses canonical words hsk1-w1, hsk1-w5, voc-1, voc-4, voc-5, voc-10!)
  { id: 'lv-15', lessonId: 'les-comm1-1', vocabId: 'hsk1-w1', trackId: 'track-comm', order: 1 },
  { id: 'lv-16', lessonId: 'les-comm1-1', vocabId: 'hsk1-w5', trackId: 'track-comm', order: 2 },
  { id: 'lv-17', lessonId: 'les-comm1-1', vocabId: 'voc-5', trackId: 'track-comm', order: 3 },
  { id: 'lv-18', lessonId: 'les-comm1-1', vocabId: 'voc-4', trackId: 'track-comm', order: 4 },
  { id: 'lv-19', lessonId: 'les-comm1-1', vocabId: 'voc-1', trackId: 'track-comm', order: 5 },
  { id: 'lv-20', lessonId: 'les-comm1-1', vocabId: 'voc-10', trackId: 'track-comm', order: 6 }
];

export function getInitialHierarchicalData(): HierarchicalSeedBundle {
  const todayStart = getStartOfTodayMs();

  const categories: Category[] = [
    {
      id: 'cat-hsk',
      name: 'HSK',
      description: 'Giáo trình chuẩn HSK Quốc tế (Hanyu Shuiping Kaoshi) từ sơ cấp đến cao cấp.',
      icon: 'GraduationCap'
    },
    {
      id: 'cat-comm',
      name: 'Giao tiếp (Communication)',
      description: 'Tiếng Trung giao tiếp thực tế hàng ngày, du lịch và công sở.',
      icon: 'MessageCircle'
    },
    {
      id: 'cat-yct',
      name: 'YCT & Chuyên ngành',
      description: 'Tiếng Trung thiếu nhi YCT và từ vựng chủ đề văn hóa - công nghệ.',
      icon: 'Compass'
    }
  ];

  const levels: CourseLevel[] = [
    {
      id: 'lvl-hsk1',
      categoryId: 'cat-hsk',
      name: 'HSK 1',
      description: '150 từ vựng cơ bản, làm quen phát âm Pinyin và mẫu câu chào hỏi.'
    },
    {
      id: 'lvl-hsk2',
      categoryId: 'cat-hsk',
      name: 'HSK 2',
      description: '300 từ vựng thông dụng trong học tập, công việc và thói quen hàng ngày.'
    },
    {
      id: 'lvl-comm1',
      categoryId: 'cat-comm',
      name: 'Giao tiếp Cơ bản',
      description: 'Các tình huống chào hỏi, mua sắm, gọi món và hỏi đường.'
    },
    {
      id: 'lvl-yct1',
      categoryId: 'cat-yct',
      name: 'YCT Cấp độ 1',
      description: 'Từ vựng nền tảng về gia đình, con số và trường học.'
    }
  ];

  const lessons: Lesson[] = [
    {
      id: 'les-hsk1-1',
      levelId: 'lvl-hsk1',
      title: 'Bài 1: Xin chào',
      description: 'Cách chào hỏi cơ bản (你好, 您好), đại từ nhân xưng và lời xin lỗi lịch sự.'
    },
    {
      id: 'les-hsk2-1',
      levelId: 'lvl-hsk2',
      title: 'Bài 1: Học tập & Thói quen',
      description: 'Từ vựng chủ đề phương pháp học tiếng Trung, mục tiêu và sự kiên trì.'
    },
    {
      id: 'les-comm1-1',
      levelId: 'lvl-comm1',
      title: 'Bài 1: Làm quen & Giao lưu',
      description: 'Bắt chuyện với người bản xứ và giới thiệu bản thân tự nhiên.'
    }
  ];

  const readingTexts: ReadingText[] = [
    {
      id: 'rt-hsk1-1',
      lessonId: 'les-hsk1-1',
      title: 'Bài khóa 1: Hội thoại Xin chào & Xin lỗi (你好 / 对不起)',
      content_hanzi: [
        'A: 你好！',
        'B: 你好！很高兴认识你。',
        'A: 您好，请问您是王老师吗？',
        'B: 是的，你们好！请进。',
        'A: 对不起，我来晚了。',
        'B: 没关系，请坐吧！'
      ].join('\n'),
      content_pinyin: [
        'A: Nǐ hǎo!',
        'B: Nǐ hǎo! Hěn gāoxìng rènshi nǐ.',
        'A: Nín hǎo, qǐngwèn nín shì Wáng lǎoshī ma?',
        'B: Shì de, nǐmen hǎo! Qǐng jìn.',
        'A: Duìbuqǐ, wǒ lái wǎn le.',
        'B: Méi guānxi, qǐng zuò ba!'
      ].join('\n'),
      content_meaning: [
        'A: Xin chào!',
        'B: Xin chào! Rất vui được làm quen với bạn.',
        'A: Chào thầy ạ, xin hỏi thầy có phải là thầy Vương không ạ?',
        'B: Đúng vậy, chào các em! Mời vào.',
        'A: Xin lỗi thầy, em đến muộn ạ.',
        'B: Không sao đâu, mời ngồi nhé!'
      ].join('\n')
    },
    {
      id: 'rt-hsk2-1',
      lessonId: 'les-hsk2-1',
      title: 'Bài khóa: Kinh nghiệm học tiếng Trung hiệu quả',
      content_hanzi: [
        'A: 你的汉语说得非常流利，有什么学习经验吗？',
        'B: 我的目标是每天坚持复习生词，养成好习惯。',
        'A: 间隔重复能提高学习效率吗？',
        'B: 当然！只要把握每次交流的机会，你一定能成功。'
      ].join('\n'),
      content_pinyin: [
        'A: Nǐ de Hànyǔ shuō de fēicháng liúlì, yǒu shénme xuéxí jīngyàn ma?',
        'B: Wǒ de mùbiāo shì měitiān jiānchí fùxí shēngcí, yǎngchéng hǎo xíguàn.',
        'A: Jiàngé chóngfù néng tígāo xuéxí xiàolǜ ma?',
        'B: Dāngrán! Zhǐyào bǎwò měi cì jiāoliú de jīhuì, nǐ yīdìng néng chénggōng.'
      ].join('\n'),
      content_meaning: [
        'A: Tiếng Trung của bạn nói rất lưu loát, bạn có kinh nghiệm học tập gì không?',
        'B: Mục tiêu của mình là mỗi ngày kiên trì ôn từ mới, tạo thành thói quen tốt.',
        'A: Lặp lại ngắt quãng (SRS) có thể nâng cao hiệu suất học tập không?',
        'B: Đương nhiên rồi! Chỉ cần nắm bắt mỗi cơ hội giao lưu, bạn nhất định sẽ thành công.'
      ].join('\n')
    },
    {
      id: 'rt-comm1-1',
      lessonId: 'les-comm1-1',
      title: 'Hội thoại Giao tiếp: Kết bạn & Trao đổi văn hóa Việt - Trung',
      content_hanzi: [
        'A: 你好！很高兴有机会和你交流。',
        'B: 你好！你的汉语说得真流利！',
        'A: 谢谢，我每天都坚持学习中文和了解中国文化。',
        'B: 太棒了！如果说错了也没关系，多说就会习惯。'
      ].join('\n'),
      content_pinyin: [
        'A: Nǐ hǎo! Hěn gāoxìng yǒu jīhuì hé nǐ jiāoliú.',
        'B: Nǐ hǎo! Nǐ de Hànyǔ shuō de zhēn liúlì!',
        'A: Xièxie, wǒ měitiān dōu jiānchí xuéxí Zhōngwén hé liǎojiě Zhōngguó wénhuà.',
        'B: Tài bàng le! Rúguǒ shuō cuò le yě méi guānxi, duō shuō jiù huì xíguàn.'
      ].join('\n'),
      content_meaning: [
        'A: Xin chào! Rất vui có cơ hội được giao lưu với bạn.',
        'B: Chào bạn! Tiếng Trung của bạn nói lưu loát thật đấy!',
        'A: Cảm ơn nhé, mỗi ngày mình đều kiên trì học tiếng Trung và tìm hiểu văn hóa Trung Quốc.',
        'B: Tuyệt quá! Nếu nói sai cũng không sao đâu, nói nhiều sẽ thành thói quen.'
      ].join('\n')
    }
  ];

  // 5 Vocab words for HSK 1 -> "Bài 1: Xin chào" + 10 Vocab words for HSK 2 / Communication
  const words: VocabularyItem[] = [
    {
      id: 'hsk1-w1',
      hanzi: '你好',
      pinyin: 'nǐ hǎo',
      meaning: 'Xin chào',
      example_sentence: '你好！很高兴认识你。(Xin chào! Rất vui được làm quen với bạn.)',
      status: 'new',
      next_review_date: todayStart,
      interval: 0,
      lessonId: 'les-hsk1-1',
      levelId: 'lvl-hsk1',
      ease_factor: 2.5,
      repetitions: 0
    },
    {
      id: 'hsk1-w2',
      hanzi: '您',
      pinyin: 'nín',
      meaning: 'Ngài, ông, bà (ngôi thứ 2 trang trọng)',
      example_sentence: '王老师，您好！(Em chào thầy Vương ạ!)',
      status: 'learning',
      next_review_date: todayStart,
      interval: 1,
      lessonId: 'les-hsk1-1',
      levelId: 'lvl-hsk1',
      ease_factor: 2.5,
      repetitions: 1
    },
    {
      id: 'hsk1-w3',
      hanzi: '你们',
      pinyin: 'nǐ men',
      meaning: 'Các bạn, các anh chị',
      example_sentence: '同学们，你们好！(Chào các bạn học sinh!)',
      status: 'learning',
      next_review_date: todayStart,
      interval: 2,
      lessonId: 'les-hsk1-1',
      levelId: 'lvl-hsk1',
      ease_factor: 2.5,
      repetitions: 1
    },
    {
      id: 'hsk1-w4',
      hanzi: '对不起',
      pinyin: 'duì bu qǐ',
      meaning: 'Xin lỗi',
      example_sentence: '对不起，我来晚了。(Xin lỗi, tôi đến muộn.)',
      status: 'new',
      next_review_date: todayStart,
      interval: 0,
      lessonId: 'les-hsk1-1',
      levelId: 'lvl-hsk1',
      ease_factor: 2.5,
      repetitions: 0
    },
    {
      id: 'hsk1-w5',
      hanzi: '没关系',
      pinyin: 'méi guān xi',
      meaning: 'Không sao đâu, đừng bận tâm',
      example_sentence: 'A: 对不起！ B: 没关系。(A: Xin lỗi! B: Không sao đâu.)',
      status: 'graduated',
      next_review_date: todayStart + 2 * DAY_MS,
      interval: 14,
      lessonId: 'les-hsk1-1',
      levelId: 'lvl-hsk1',
      ease_factor: 2.6,
      repetitions: 4
    },
    // Existing HSK 2 & Communication Vocabulary linked to lessons/levels
    {
      id: 'voc-1',
      hanzi: '学习',
      pinyin: 'xué xí',
      meaning: 'Học tập, nghiên cứu',
      example_sentence: '我每天都努力学习中文。(Tôi đều chăm chỉ học tiếng Trung mỗi ngày.)',
      status: 'learning',
      next_review_date: todayStart - 3600 * 1000,
      interval: 1,
      lessonId: 'les-hsk2-1',
      levelId: 'lvl-hsk2',
      ease_factor: 2.5,
      repetitions: 1
    },
    {
      id: 'voc-2',
      hanzi: '坚持',
      pinyin: 'jiān chí',
      meaning: 'Kiên trì, bền bỉ',
      example_sentence: '只要坚持下去，你一定能成功。(Chỉ cần kiên trì, bạn nhất định sẽ thành công.)',
      status: 'new',
      next_review_date: todayStart,
      interval: 0,
      lessonId: 'les-hsk2-1',
      levelId: 'lvl-hsk2',
      ease_factor: 2.5,
      repetitions: 0
    },
    {
      id: 'voc-3',
      hanzi: '机会',
      pinyin: 'jī huì',
      meaning: 'Cơ hội, dịp',
      example_sentence: '这是一个难得的学习机会。(Đây là một cơ hội học tập hiếm có.)',
      status: 'learning',
      next_review_date: todayStart,
      interval: 3,
      lessonId: 'les-hsk2-1',
      levelId: 'lvl-hsk2',
      ease_factor: 2.4,
      repetitions: 2
    },
    {
      id: 'voc-4',
      hanzi: '流利',
      pinyin: 'liú lì',
      meaning: 'Lưu loát, trôi chảy',
      example_sentence: '她的汉语说得非常流利。(Cô ấy nói tiếng Hán rất lưu loát.)',
      status: 'new',
      next_review_date: todayStart,
      interval: 0,
      lessonId: 'les-hsk2-1',
      levelId: 'lvl-hsk2',
      ease_factor: 2.5,
      repetitions: 0
    },
    {
      id: 'voc-5',
      hanzi: '交流',
      pinyin: 'jiāo liú',
      meaning: 'Giao lưu, trao đổi',
      example_sentence: '用中文和朋友交流很有趣。(Giao tiếp với bạn bè bằng tiếng Trung rất thú vị.)',
      status: 'learning',
      next_review_date: todayStart,
      interval: 2,
      lessonId: 'les-comm1-1',
      levelId: 'lvl-comm1',
      ease_factor: 2.5,
      repetitions: 1
    },
    {
      id: 'voc-6',
      hanzi: '经验',
      pinyin: 'jīng yàn',
      meaning: 'Kinh nghiệm',
      example_sentence: '他在软件开发方面有丰富经验。(Anh ấy có kinh nghiệm phong phú về phát triển phần mềm.)',
      status: 'graduated',
      next_review_date: todayStart + 2 * DAY_MS,
      interval: 16,
      lessonId: 'les-hsk2-1',
      levelId: 'lvl-hsk2',
      ease_factor: 2.65,
      repetitions: 5
    },
    {
      id: 'voc-7',
      hanzi: '目标',
      pinyin: 'mù biāo',
      meaning: 'Mục tiêu',
      example_sentence: '今年的目标是通过HSK五级考试。(Mục tiêu năm nay là vượt qua kỳ thi HSK 5.)',
      status: 'learning',
      next_review_date: todayStart + 1 * DAY_MS,
      interval: 4,
      lessonId: 'les-hsk2-1',
      levelId: 'lvl-hsk2',
      ease_factor: 2.5,
      repetitions: 2
    },
    {
      id: 'voc-8',
      hanzi: '习惯',
      pinyin: 'xí guàn',
      meaning: 'Thói quen / Quen với',
      example_sentence: '每天复习生词是一个好习惯。(Ôn tập từ mới mỗi ngày là một thói quen tốt.)',
      status: 'graduated',
      next_review_date: todayStart + 3 * DAY_MS,
      interval: 21,
      lessonId: 'les-hsk2-1',
      levelId: 'lvl-hsk2',
      ease_factor: 2.7,
      repetitions: 6
    },
    {
      id: 'voc-9',
      hanzi: '效率',
      pinyin: 'xiào lǜ',
      meaning: 'Hiệu suất, hiệu quả',
      example_sentence: '间隔重复能大大提高记忆效率。(Lặp lại ngắt quãng giúp tăng mạnh hiệu suất ghi nhớ.)',
      status: 'learning',
      next_review_date: todayStart + 2 * DAY_MS,
      interval: 6,
      lessonId: 'les-hsk2-1',
      levelId: 'lvl-hsk2',
      ease_factor: 2.45,
      repetitions: 3
    },
    {
      id: 'voc-10',
      hanzi: '文化',
      pinyin: 'wén huà',
      meaning: 'Văn hóa',
      example_sentence: '越南和中国有很多相似的文化传统。(Việt Nam và Trung Quốc có nhiều truyền thống văn hóa tương đồng.)',
      status: 'graduated',
      next_review_date: todayStart + 5 * DAY_MS,
      interval: 30,
      lessonId: 'les-comm1-1',
      levelId: 'lvl-comm1',
      ease_factor: 2.8,
      repetitions: 7
    }
  ];

  return {
    categories,
    levels,
    lessons,
    readingTexts,
    words,
    lessonVocabLinks: INITIAL_LESSON_VOCAB_LINKS
  };
}

export const VocabStorageService = {
  loadBundle(): HierarchicalSeedBundle {
    try {
      if (typeof window === 'undefined') return getInitialHierarchicalData();
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seed = getInitialHierarchicalData();
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return seed;
      }
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        Array.isArray(parsed.categories) &&
        Array.isArray(parsed.levels) &&
        Array.isArray(parsed.lessons) &&
        Array.isArray(parsed.readingTexts) &&
        Array.isArray(parsed.words)
      ) {
        // Migration: Deduplicate canonical words while preserving best SRS state and migrating LessonVocabulary links
        const canonicalMap = new Map<string, VocabularyItem>();
        const idRedirect = new Map<string, string>();
        for (const rawWord of parsed.words as VocabularyItem[]) {
          if (!rawWord || !rawWord.hanzi) continue;
          const key = normalizeCanonicalVocabKey(rawWord.hanzi, rawWord.pinyin, rawWord.meaning);
          const existing = canonicalMap.get(key) || Array.from(canonicalMap.values()).find((w) => w.hanzi.trim() === rawWord.hanzi.trim());
          if (!existing) {
            canonicalMap.set(key, rawWord);
            idRedirect.set(rawWord.id, rawWord.id);
          } else {
            idRedirect.set(rawWord.id, existing.id);
            // Keep whichever record has higher SRS progress (interval / repetitions)
            if ((rawWord.interval || 0) > (existing.interval || 0)) {
              canonicalMap.set(key, {
                ...existing,
                status: rawWord.status,
                interval: rawWord.interval,
                next_review_date: rawWord.next_review_date,
                ease_factor: rawWord.ease_factor ?? existing.ease_factor,
                repetitions: rawWord.repetitions ?? existing.repetitions
              });
            }
          }
        }
        const dedupedWords = Array.from(canonicalMap.values());
        const validWordIds = new Set(dedupedWords.map((w) => w.id));
        const validLessonIds = new Set((parsed.lessons as Lesson[]).map((l) => l.id));

        const rawLinks: LessonVocabulary[] = Array.isArray(parsed.lessonVocabLinks)
          ? parsed.lessonVocabLinks
          : INITIAL_LESSON_VOCAB_LINKS;

        const linkMap = new Map<string, LessonVocabulary>();
        for (const lnk of rawLinks) {
          const redirectedVocabId = idRedirect.get(lnk.vocabId) || lnk.vocabId;
          if (!validWordIds.has(redirectedVocabId) || !validLessonIds.has(lnk.lessonId)) {
            continue; // Strip orphan links
          }
          const linkKey = `${lnk.lessonId}::${redirectedVocabId}`;
          if (!linkMap.has(linkKey)) {
            linkMap.set(linkKey, { ...lnk, vocabId: redirectedVocabId });
          }
        }
        // Also ensure every word's primary lessonId has a corresponding LessonVocabulary link
        for (const w of dedupedWords) {
          if (w.lessonId && validLessonIds.has(w.lessonId)) {
            const linkKey = `${w.lessonId}::${w.id}`;
            if (!linkMap.has(linkKey)) {
              linkMap.set(linkKey, {
                id: `lv-mig-${w.lessonId}-${w.id}`,
                lessonId: w.lessonId,
                vocabId: w.id,
                trackId: w.lessonId.includes('comm') ? 'track-comm' : 'track-hsk',
                order: linkMap.size + 1
              });
            }
          }
        }

        return {
          ...parsed,
          words: dedupedWords,
          lessonVocabLinks: Array.from(linkMap.values())
        };
      }
      return getInitialHierarchicalData();
    } catch {
      return getInitialHierarchicalData();
    }
  },

  saveBundle(bundle: HierarchicalSeedBundle): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
      }
    } catch {
      // Fallback silently in restricted iframe environments
    }
  },

  getTheme(): 'light' | 'dark' {
    try {
      if (typeof window !== 'undefined') {
        const saved = window.localStorage.getItem(THEME_KEY);
        if (saved === 'dark' || saved === 'light') return saved;
      }
    } catch {
      return 'light';
    }
    return 'light';
  },

  saveTheme(theme: 'light' | 'dark'): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(THEME_KEY, theme);
      }
    } catch {
      // Ignore storage error
    }
  }
};