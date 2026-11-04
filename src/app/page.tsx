'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Layers,
  LayoutDashboard,
  Plus,
  Search,
  Edit3,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  Sun,
  Moon,
  Volume2,
  Brain,
  Code2,
  ChevronRight,
  Copy,
  Check,
  Filter,
  Trophy,
  ArrowRight,
  ArrowLeft,
  X,
  FileText,
  FileJson,
  RefreshCw,
  Flame,
  FolderKanban,
  GraduationCap,
  MessageCircle,
  Compass,
  Eye,
  EyeOff,
  Play,
  Mic,
  Headphones,
  PenTool,
  Repeat,
  Users,
  Award,
  Zap,
  UserCheck,
  LogIn,
  Star,
  Shuffle,
  ClipboardCheck,
  TrendingUp,
  Timer
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import type {
  VocabStatus,
  ReviewRating,
  Category,
  CourseLevel,
  Lesson,
  ReadingText,
  VocabularyItem,
  VocabFormInput,
  TrackCode,
  LessonVocabulary
} from '@/types/vocabulary';
import { useVocabStore } from '@/store/useVocabStore';
import {
  isDueForReview,
  calculateNextReview,
  getStartOfTodayMs,
  DAY_MS,
  previewRatingIntervals
} from '@/lib/srs';
import {
  stripPinyinTones,
  speakChinese,
  exportWordsToCSV,
  parseImportPayload,
  formatRelativeReviewDate,
  STEP_1_STRUCTURE_CODE,
  STEP_2_MODELS_CODE
} from '@/lib/utils';
import {
  INITIAL_LESSON_VOCAB_LINKS,
} from '@/services/vocabStorage';

export type { TrackCode, LessonVocabulary };
export { INITIAL_LESSON_VOCAB_LINKS };


// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================

export type ActiveTab =
  | 'dashboard'
  | 'library'
  | 'vocabulary'
  | 'review'
  | 'exams'
  | 'quiz'
  | 'progress'
  | 'profile'
  | 'blueprint';

// TrackCode imported from @/types/vocabulary

export interface LearningTrack {
  id: TrackCode;
  code: 'HSK' | 'COMMUNICATION';
  name: string;
  subtitle: string;
  description: string;
  categoryId: string;
  focusTags: string[];
}

export type LessonActivityType =
  | 'introduction'
  | 'vocabulary'
  | 'grammar'
  | 'reading'
  | 'listening'
  | 'speaking'
  | 'writing'
  | 'practice_quiz'
  | 'final_assessment'
  | 'summary';

export interface GrammarPoint {
  id: string;
  pattern: string;
  pinyin: string;
  meaning: string;
  exampleHanzi: string;
  examplePinyin: string;
  exampleVi: string;
}

export interface LessonActivity {
  id: string;
  lessonId: string;
  type: LessonActivityType;
  title: string;
  order: number;
  requiredForCompletion: boolean;
  introSummary?: string;
  grammarPoints?: GrammarPoint[];
  passScorePct?: number;
}

export interface UserTrackEnrollment {
  trackId: TrackCode;
  isEnrolled: boolean;
  enrolledAt: number;
  currentLevelId: string;
  currentLessonId: string;
  lastStudiedAt: number;
}

export interface UserLessonProgress {
  lessonId: string;
  trackId: TrackCode;
  status: 'not_started' | 'in_progress' | 'completed' | 'needs_review';
  currentActivityId: string;
  currentStepIndex: number;
  completedActivityIds: string[];
  assessmentScorePct?: number;
  updatedAt: number;
}

export interface UserActivityProgress {
  key: string; // `${lessonId}:${activityId}`
  lessonId: string;
  activityId: string;
  completed: boolean;
  scorePct?: number;
  updatedAt: number;
}

// LessonVocabulary imported from @/types/vocabulary

export interface ReviewHistory {
  id: string;
  vocabId: string;
  hanzi: string;
  rating: ReviewRating;
  reviewedAt: number;
  nextInterval: number;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  examTitle: string;
  scorePct: number;
  correctCount: number;
  totalQuestions: number;
  completedAt: number;
  durationSec?: number;
  answers?: Record<string, string>;
}

export interface AssessmentQuestion {
  id: string;
  lessonId: string;
  activityType: 'vocabulary' | 'grammar' | 'listening' | 'practice_quiz' | 'final_assessment';
  questionType: 'mcq_meaning' | 'mcq_hanzi' | 'grammar_application' | 'listening_comp' | 'dialogue_response';
  prompt: string;
  audioText?: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface LessonAttemptRecord {
  id: string;
  lessonId: string;
  activityId: string;
  scorePct: number;
  passScorePct: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  answers: Record<string, string>;
  submittedAt: number;
}

export const STRUCTURED_LESSON_QUESTION_BANK: Record<string, AssessmentQuestion[]> = {
  'les-hsk1-1': [
    {
      id: 'q-hsk1-1-listen-1',
      lessonId: 'les-hsk1-1',
      activityType: 'listening',
      questionType: 'listening_comp',
      prompt: 'Nghe câu phát âm và chọn đúng nghĩa Tiếng Việt của từ/câu vừa nghe:',
      audioText: '王老师，您好！',
      options: [
        'Em chào thầy Vương ạ! (Chào trang trọng)',
        'Xin lỗi thầy Vương, em đến muộn.',
        'Các bạn học sinh có khỏe không?',
        'Không sao đâu, mời thầy ngồi.'
      ],
      correctAnswer: 'Em chào thầy Vương ạ! (Chào trang trọng)',
      explanation: '“王老师，您好！” dùng đại từ trang trọng 您 (nín) để chào giáo viên.',
      difficulty: 'easy'
    },
    {
      id: 'q-hsk1-1-gram-1',
      lessonId: 'les-hsk1-1',
      activityType: 'grammar',
      questionType: 'grammar_application',
      prompt: 'Khi muốn chào thầy giáo hoặc người lớn tuổi một cách kính trọng, bạn chọn câu nào?',
      options: [
        '你好 (Nǐ hǎo)',
        '您好 (Nín hǎo)',
        '你们好 (Nǐmen hǎo)',
        '没关系 (Méi guānxi)'
      ],
      correctAnswer: '您好 (Nín hǎo)',
      explanation: '您 (nín) là ngôi thứ hai số ít trang trọng, có bộ Tâm (心) ở dưới chữ 你.',
      difficulty: 'easy'
    },
    {
      id: 'q-hsk1-1-assess-1',
      lessonId: 'les-hsk1-1',
      activityType: 'final_assessment',
      questionType: 'mcq_meaning',
      prompt: 'Từ “对不起” trong câu “对不起，我来晚了” có nghĩa là gì?',
      audioText: '对不起',
      options: [
        'Không sao đâu',
        'Xin lỗi',
        'Xin chào các bạn',
        'Rất vui được gặp ngài'
      ],
      correctAnswer: 'Xin lỗi',
      explanation: '对不起 (duìbuqǐ) nghĩa là Xin lỗi; câu đáp lại lịch sự là 没关系 (méi guānxi).',
      difficulty: 'easy'
    },
    {
      id: 'q-hsk1-1-assess-2',
      lessonId: 'les-hsk1-1',
      activityType: 'final_assessment',
      questionType: 'dialogue_response',
      prompt: 'Khi người khác nói “对不起！” (Xin lỗi!), bạn đáp lại thế nào cho tự nhiên nhất?',
      audioText: '没关系',
      options: [
        '你们好！ (Chào các bạn!)',
        '您好！ (Chào ngài!)',
        '没关系！ (Không sao đâu!)',
        '对不起！ (Xin lỗi!)'
      ],
      correctAnswer: '没关系！ (Không sao đâu!)',
      explanation: 'Cặp hội thoại chuẩn: A: 对不起 (Xin lỗi) → B: 没关系 (Không sao đâu).',
      difficulty: 'easy'
    },
    {
      id: 'q-hsk1-1-assess-3',
      lessonId: 'les-hsk1-1',
      activityType: 'final_assessment',
      questionType: 'mcq_hanzi',
      prompt: 'Đại từ nào dùng để xưng hô với một nhóm người (“Các bạn / Các anh chị”)?',
      options: ['你们', '你好', '您', '没关系'],
      correctAnswer: '你们',
      explanation: 'Hậu tố 们 (men) thêm sau đại từ nhân xưng để chỉ số nhiều: 你们 (nǐmen - các bạn).',
      difficulty: 'medium'
    }
  ],
  'les-hsk2-1': [
    {
      id: 'q-hsk2-1-gram-1',
      lessonId: 'les-hsk2-1',
      activityType: 'grammar',
      questionType: 'grammar_application',
      prompt: 'Chọn câu sử dụng đúng cấu trúc “只要... 一定能...” (Chỉ cần... nhất định có thể...):',
      options: [
        '只要坚持学习，你一定能说得流利。',
        '虽然坚持学习，但是流利。',
        '因为没关系，所以坚持。',
        '你们好，只要对不起。'
      ],
      correctAnswer: '只要坚持学习，你一定能说得流利。',
      explanation: '只要 (chỉ cần) đi với mệnh đề điều kiện, vế sau dùng 一定能 (nhất định có thể).',
      difficulty: 'medium'
    },
    {
      id: 'q-hsk2-1-assess-1',
      lessonId: 'les-hsk2-1',
      activityType: 'final_assessment',
      questionType: 'mcq_meaning',
      prompt: 'Từ “坚持” (jiānchí) trong câu “每天坚持复习生词” mang ý nghĩa gì?',
      audioText: '坚持',
      options: [
        'Cơ hội hiếm có',
        'Kiên trì, bền bỉ',
        'Hiệu suất cao',
        'Thói quen tốt'
      ],
      correctAnswer: 'Kiên trì, bền bỉ',
      explanation: '坚持 (jiānchí) nghĩa là kiên trì, duy trì nỗ lực liên tục.',
      difficulty: 'medium'
    },
    {
      id: 'q-hsk2-1-assess-2',
      lessonId: 'les-hsk2-1',
      activityType: 'final_assessment',
      questionType: 'mcq_meaning',
      prompt: 'Trong câu “间隔重复能大大提高记忆效率”, từ “效率” có nghĩa là gì?',
      audioText: '效率',
      options: [
        'Kinh nghiệm',
        'Mục tiêu',
        'Văn hóa',
        'Hiệu suất, hiệu quả'
      ],
      correctAnswer: 'Hiệu suất, hiệu quả',
      explanation: '效率 (xiàolǜ) nghĩa là hiệu suất / hiệu quả công việc hoặc học tập.',
      difficulty: 'medium'
    },
    {
      id: 'q-hsk2-1-assess-3',
      lessonId: 'les-hsk2-1',
      activityType: 'final_assessment',
      questionType: 'mcq_hanzi',
      prompt: 'Từ tiếng Trung nào mang nghĩa “Mục tiêu” (như trong “Mục tiêu vượt qua kỳ thi HSK”)?',
      options: ['经验', '目标', '机会', '习惯'],
      correctAnswer: '目标',
      explanation: '目标 (mùbiāo) là mục tiêu; 经验 là kinh nghiệm; 机会 là cơ hội; 习惯 là thói quen.',
      difficulty: 'medium'
    }
  ],
  'les-comm1-1': [
    {
      id: 'q-comm1-1-listen-1',
      lessonId: 'les-comm1-1',
      activityType: 'listening',
      questionType: 'listening_comp',
      prompt: 'Nghe câu hội thoại giao tiếp và chọn nội dung đúng:',
      audioText: '很高兴有机会和你交流。',
      options: [
        'Rất vui có cơ hội được giao lưu với bạn.',
        'Xin lỗi vì tôi đến muộn buổi học hôm nay.',
        'Bạn có thói quen đọc sách tiếng Trung không?',
        'Mục tiêu năm nay của tôi là thi đỗ HSK.'
      ],
      correctAnswer: 'Rất vui có cơ hội được giao lưu với bạn.',
      explanation: '机会 (cơ hội) + 和你交流 (giao lưu/trao đổi với bạn).',
      difficulty: 'easy'
    },
    {
      id: 'q-comm1-1-quiz-1',
      lessonId: 'les-comm1-1',
      activityType: 'practice_quiz',
      questionType: 'dialogue_response',
      prompt: 'Khi người bản xứ khen bạn: “你的汉语说得真流利！” (Tiếng Trung của bạn nói lưu loát thật!), bạn đáp lại thế nào?',
      options: [
        '谢谢，我每天都坚持学习中文。 (Cảm ơn, mỗi ngày tôi đều kiên trì học tiếng Trung.)',
        '对不起，我来晚了。 (Xin lỗi, tôi đến muộn.)',
        '请问您是王老师吗？ (Xin hỏi ngài có phải thầy Vương không?)',
        '你们好，请进！ (Chào các bạn, mời vào!)'
      ],
      correctAnswer: '谢谢，我每天都坚持学习中文。 (Cảm ơn, mỗi ngày tôi đều kiên trì học tiếng Trung.)',
      explanation: 'Đáp lại lời khen một cách lịch sự bằng lời cảm ơn và chia sẻ thói quen học tập.',
      difficulty: 'easy'
    },
    {
      id: 'q-comm1-1-quiz-2',
      lessonId: 'les-comm1-1',
      activityType: 'practice_quiz',
      questionType: 'mcq_meaning',
      prompt: 'Từ “文化” (wénhuà) được dùng chung ở cả lộ trình HSK và Giao tiếp có nghĩa là gì?',
      audioText: '文化',
      options: ['Lưu loát', 'Giao lưu', 'Văn hóa', 'Thói quen'],
      correctAnswer: 'Văn hóa',
      explanation: '文化 (wénhuà) nghĩa là văn hóa.',
      difficulty: 'easy'
    }
  ]
};

export const DUAL_TRACKS_CONFIG: LearningTrack[] = [
  {
    id: 'track-hsk',
    code: 'HSK',
    name: 'Lộ trình HSK Chuẩn Quốc Tế',
    subtitle: 'HSK 1 → HSK 2 → HSK Sơ-Trung cấp',
    description: 'Tập trung hệ thống từ vựng cốt lõi, ngữ pháp trọng tâm, đọc hiểu chữ Hán và kiểm tra chuẩn đầu ra HSK.',
    categoryId: 'cat-hsk',
    focusTags: ['Kiến thức hệ thống', 'Ngữ pháp HSK', 'Đọc mặt chữ', 'Thi đánh giá']
  },
  {
    id: 'track-comm',
    code: 'COMMUNICATION',
    name: 'Lộ trình Giao Tiếp Thực Tế',
    subtitle: 'Phản xạ Nghe – Nói – Hội thoại Đóng vai',
    description: 'Ưu tiên hội thoại tình huống đời sống, nghe phản xạ, đóng vai 2 chiều (A ↔ B) và nói lưu loát không phụ thuộc Pinyin.',
    categoryId: 'cat-comm',
    focusTags: ['Hội thoại đóng vai', 'Phản xạ Nghe-Nói', 'Tình huống thực tế', 'Không phụ thuộc Pinyin']
  }
];

export const LESSON_ACTIVITIES_CONFIG: Record<string, LessonActivity[]> = {
  'les-hsk1-1': [
    {
      id: 'act-hsk1-1-intro',
      lessonId: 'les-hsk1-1',
      type: 'introduction',
      title: '1. Giới thiệu & Mục tiêu bài học',
      order: 1,
      requiredForCompletion: true,
      introSummary: 'Làm chủ cách chào hỏi cơ bản (你好, 您好), phân biệt đại từ ngôi thứ 2 số ít/trang trọng/số nhiều và cặp câu xin lỗi - đáp lễ lịch sự (对不起 - 没关系).'
    },
    {
      id: 'act-hsk1-1-vocab',
      lessonId: 'les-hsk1-1',
      type: 'vocabulary',
      title: '2. Từ vựng cốt lõi (Canonical SRS)',
      order: 2,
      requiredForCompletion: true
    },
    {
      id: 'act-hsk1-1-grammar',
      lessonId: 'les-hsk1-1',
      type: 'grammar',
      title: '3. Ngữ pháp trọng tâm HSK 1',
      order: 3,
      requiredForCompletion: true,
      grammarPoints: [
        {
          id: 'gp-1',
          pattern: 'Chủ ngữ + 好 (Nǐ hǎo / Nín hǎo / Nǐmen hǎo)',
          pinyin: 'Nǐ hǎo / Nín hǎo / Nǐmen hǎo',
          meaning: 'Cấu trúc chào hỏi phổ biến nhất trong tiếng Trung. Dùng 您 (nín) khi chào thầy cô, người lớn tuổi hoặc cấp trên.',
          exampleHanzi: '王老师，您好！同学们，你们好！',
          examplePinyin: 'Wáng lǎoshī, nín hǎo! Tóngxuémen, nǐmen hǎo!',
          exampleVi: 'Em chào thầy Vương ạ! Chào các bạn học sinh!'
        },
        {
          id: 'gp-2',
          pattern: '对不起 (Duìbuqǐ) → 没关系 (Méi guānxi)',
          pinyin: 'Duìbuqǐ → Méi guānxi',
          meaning: 'Cặp câu chuẩn mực khi nói lời xin lỗi và đáp lại lịch sự rằng không có vấn đề gì.',
          exampleHanzi: 'A: 对不起，我来晚了。 B: 没关系！',
          examplePinyin: 'A: Duìbuqǐ, wǒ lái wǎn le. B: Méi guānxi!',
          exampleVi: 'A: Xin lỗi, tôi đến muộn. B: Không sao đâu!'
        }
      ]
    },
    {
      id: 'act-hsk1-1-reading',
      lessonId: 'les-hsk1-1',
      type: 'reading',
      title: '4. Bài khóa & Đọc hiểu mặt chữ',
      order: 4,
      requiredForCompletion: true
    },
    {
      id: 'act-hsk1-1-listen',
      lessonId: 'les-hsk1-1',
      type: 'listening',
      title: '5. Luyện Nghe nhận diện chữ Hán',
      order: 5,
      requiredForCompletion: true
    },
    {
      id: 'act-hsk1-1-write',
      lessonId: 'les-hsk1-1',
      type: 'writing',
      title: '6. Tập viết chữ Hán (Điền Tự Cách)',
      order: 6,
      requiredForCompletion: false
    },
    {
      id: 'act-hsk1-1-assess',
      lessonId: 'les-hsk1-1',
      type: 'final_assessment',
      title: '7. Kiểm tra hoàn thành bài học',
      order: 7,
      requiredForCompletion: true,
      passScorePct: 80
    },
    {
      id: 'act-hsk1-1-summary',
      lessonId: 'les-hsk1-1',
      type: 'summary',
      title: '8. Tổng kết & Đồng bộ SRS',
      order: 8,
      requiredForCompletion: true
    }
  ],
  'les-hsk2-1': [
    {
      id: 'act-hsk2-1-intro',
      lessonId: 'les-hsk2-1',
      type: 'introduction',
      title: '1. Giới thiệu chủ đề Học tập & Thói quen',
      order: 1,
      requiredForCompletion: true,
      introSummary: 'Mở rộng vốn từ HSK 2 về phương pháp học tập (学习, 坚持, 效率), cách diễn đạt mục tiêu (目标) và kinh nghiệm (经验).'
    },
    {
      id: 'act-hsk2-1-vocab',
      lessonId: 'les-hsk2-1',
      type: 'vocabulary',
      title: '2. Từ vựng HSK 2 (Dùng chung lịch SRS)',
      order: 2,
      requiredForCompletion: true
    },
    {
      id: 'act-hsk2-1-grammar',
      lessonId: 'les-hsk2-1',
      type: 'grammar',
      title: '3. Ngữ pháp: 只要... 就/一定... (Chỉ cần... thì nhất định...)',
      order: 3,
      requiredForCompletion: true,
      grammarPoints: [
        {
          id: 'gp-hsk2-1',
          pattern: '只要 + Điều kiện, 主语 + 一定能 + Kết quả',
          pinyin: 'Zhǐyào ..., ... yīdìng néng ...',
          meaning: 'Nhấn mạnh điều kiện đủ để đạt được kết quả tích cực.',
          exampleHanzi: '只要每天坚持复习，你一定能说得流利。',
          examplePinyin: 'Zhǐyào měitiān jiānchí fùxí, nǐ yīdìng néng shuō de liúlì.',
          exampleVi: 'Chỉ cần mỗi ngày kiên trì ôn tập, bạn nhất định có thể nói lưu loát.'
        }
      ]
    },
    {
      id: 'act-hsk2-1-reading',
      lessonId: 'les-hsk2-1',
      type: 'reading',
      title: '4. Bài khóa HSK 2',
      order: 4,
      requiredForCompletion: true
    },
    {
      id: 'act-hsk2-1-assess',
      lessonId: 'les-hsk2-1',
      type: 'final_assessment',
      title: '5. Kiểm tra cuối bài HSK 2',
      order: 5,
      requiredForCompletion: true,
      passScorePct: 80
    },
    {
      id: 'act-hsk2-1-summary',
      lessonId: 'les-hsk2-1',
      type: 'summary',
      title: '6. Tổng kết bài học',
      order: 6,
      requiredForCompletion: true
    }
  ],
  'les-comm1-1': [
    {
      id: 'act-comm1-1-intro',
      lessonId: 'les-comm1-1',
      type: 'introduction',
      title: '1. Tình huống Giao tiếp: Làm quen & Giao lưu',
      order: 1,
      requiredForCompletion: true,
      introSummary: 'Lộ trình Giao tiếp ưu tiên Nghe – Nói – Phản xạ hội thoại. Các từ vựng trùng với HSK (như 你好, 交流, 学习) tự động dùng chung 1 lịch ôn SRS duy nhất!'
    },
    {
      id: 'act-comm1-1-vocab',
      lessonId: 'les-comm1-1',
      type: 'vocabulary',
      title: '2. Từ vựng phản xạ tình huống',
      order: 2,
      requiredForCompletion: true
    },
    {
      id: 'act-comm1-1-reading',
      lessonId: 'les-comm1-1',
      type: 'reading',
      title: '3. Hội thoại mẫu & Đóng vai A ↔ B',
      order: 3,
      requiredForCompletion: true
    },
    {
      id: 'act-comm1-1-listen',
      lessonId: 'les-comm1-1',
      type: 'listening',
      title: '4. Nghe bắt ý câu giao tiếp',
      order: 4,
      requiredForCompletion: true
    },
    {
      id: 'act-comm1-1-speak',
      lessonId: 'les-comm1-1',
      type: 'speaking',
      title: '5. Luyện Nói phản xạ không nhìn Pinyin',
      order: 5,
      requiredForCompletion: true
    },
    {
      id: 'act-comm1-1-quiz',
      lessonId: 'les-comm1-1',
      type: 'practice_quiz',
      title: '6. Xử lý tình huống giao tiếp',
      order: 6,
      requiredForCompletion: true,
      passScorePct: 75
    },
    {
      id: 'act-comm1-1-summary',
      lessonId: 'les-comm1-1',
      type: 'summary',
      title: '7. Tổng kết tình huống giao tiếp',
      order: 7,
      requiredForCompletion: true
    }
  ]
};

// Canonical LessonVocabulary M:N Mapping:
// Notice how 'hsk1-w1' (你好), 'hsk1-w4' (对不起), 'voc-1' (学习), 'voc-4' (流利), 'voc-5' (交流), 'voc-10' (文化)
// are linked to BOTH HSK lessons and Communication lessons while maintaining a SINGLE VocabularyItem SRS schedule!
// INITIAL_LESSON_VOCAB_LINKS imported from @/services/vocabStorage


export interface CustomExamQuestion {
  id: string;
  promptHanzi: string;
  promptAudioText?: string;
  questionType: 'listen' | 'reading' | 'context';
  levelTag: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface PracticeExam {
  id: string;
  title: string;
  examMode: 'hsk1' | 'hsk2' | 'elementary' | 'mixed_adaptive';
  badge: string;
  durationMinutes: number;
  description: string;
  customQuestions?: CustomExamQuestion[];
}

const TONE_MARKS = [
  'ā', 'á', 'ǎ', 'à',
  'ē', 'é', 'ě', 'è',
  'ī', 'í', 'ǐ', 'ì',
  'ō', 'ó', 'ǒ', 'ò',
  'ū', 'ú', 'ǔ', 'ù',
  'ǖ', 'ǘ', 'ǚ', 'ǜ'
];


// Stable external store for system time to prevent infinite re-renders with useSyncExternalStore
let cachedClientTime = 0;
const timeListeners = new Set<() => void>();
let timeIntervalId: ReturnType<typeof setInterval> | null = null;

function subscribeTime(callback: () => void) {
  timeListeners.add(callback);
  if (timeListeners.size === 1) {
    cachedClientTime = Date.now();
    timeIntervalId = setInterval(() => {
      cachedClientTime = Date.now();
      timeListeners.forEach((cb) => cb());
    }, 15000);
  }
  return () => {
    timeListeners.delete(callback);
    if (timeListeners.size === 0 && timeIntervalId) {
      clearInterval(timeIntervalId);
      timeIntervalId = null;
    }
  };
}

function getTimeSnapshot(): number {
  if (cachedClientTime === 0 && typeof window !== 'undefined') {
    cachedClientTime = Date.now();
  }
  return cachedClientTime;
}

function getServerTimeSnapshot(): number {
  return 0;
}

function App() {
  const {
    categories,
    levels,
    lessons,
    readingTexts,
    words,
    lessonVocabLinks,
    isInitialized,
    darkMode,
    reviewsCompletedToday,
    initialize,
    toggleDarkMode,
    addWord,
    linkWordToLesson,
    updateWord,
    deleteWord,
    rateWord,
    addLesson,
    saveReadingText,
    bulkImport,
    resetDemoData
  } = useVocabStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isAdminDrawerOpen, setIsAdminDrawerOpen] = useState<boolean>(false);

  // Dual Learning Paths State (HSK & Giao tiếp independent enrollments & progress)
  const [activeTrackId, setActiveTrackId] = useState<TrackCode>('track-hsk');
  const [trackEnrollments, setTrackEnrollments] = useState<Record<TrackCode, UserTrackEnrollment>>(() => {
    try {
      const saved = window.localStorage.getItem('hanziflow_enrollments_v3');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      'track-hsk': {
        trackId: 'track-hsk',
        isEnrolled: true,
        enrolledAt: 1730000000000,
        currentLevelId: 'lvl-hsk1',
        currentLessonId: 'les-hsk1-1',
        lastStudiedAt: 1730000000000
      },
      'track-comm': {
        trackId: 'track-comm',
        isEnrolled: true,
        enrolledAt: 1730000000000,
        currentLevelId: 'lvl-comm1',
        currentLessonId: 'les-comm1-1',
        lastStudiedAt: 1730000000000
      }
    };
  });

  // P1 Fix: New users start from an honest unstarted state ({}); only real completed activities update progress!
  const [lessonProgressMap, setLessonProgressMap] = useState<Record<string, UserLessonProgress>>(() => {
    try {
      const saved = window.localStorage.getItem('hanziflow_lesson_progress_v4');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  const [lessonAssessmentAttempts, setLessonAssessmentAttempts] = useState<LessonAttemptRecord[]>(() => {
    try {
      const saved = window.localStorage.getItem('hanziflow_lesson_attempts_v4');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [reviewHistoryList, setReviewHistoryList] = useState<ReviewHistory[]>(() => {
    try {
      const saved = window.localStorage.getItem('hanziflow_review_history_v4');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const _DEMO_ATTEMPT_REF = { id: 'att-seed-1' }; void _DEMO_ATTEMPT_REF;
  const [examAttemptsList, setExamAttemptsList] = useState<ExamAttempt[]>(() => {
    try {
      const saved = window.localStorage.getItem('hanziflow_exam_attempts_v4');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Focus Mode Lesson Player State
  const [isFocusPlayerOpen, setIsFocusPlayerOpen] = useState<boolean>(false);
  const [playerLessonId, setPlayerLessonId] = useState<string>('les-hsk1-1');
  const [playerStepIndex, setPlayerStepIndex] = useState<number>(0);
  const [playerAssessmentAnswers, setPlayerAssessmentAnswers] = useState<Record<string, string>>({});
  const [playerAssessmentSubmitted, setPlayerAssessmentSubmitted] = useState<boolean>(false);
  const [playerAssessmentError, setPlayerAssessmentError] = useState<string | null>(null);
  const [playerVocabFocusIdx, setPlayerVocabFocusIdx] = useState<number>(0);
  const [playerVocabCheckAns, setPlayerVocabCheckAns] = useState<string | null>(null);
  const [playerGrammarCheckAns, setPlayerGrammarCheckAns] = useState<string | null>(null);
  const [playerListenCheckAns, setPlayerListenCheckAns] = useState<string | null>(null);
  const [writingCheckMode, setWritingCheckMode] = useState<'freehand' | 'stroke_verify'>('freehand');
  const [strokeVerifyFeedback, setStrokeVerifyFeedback] = useState<string | null>(null);

  // User Auth / Onboarding & Honest Activity-Driven Streak / XP States
  const [userProfile, setUserProfile] = useState<{
    name: string;
    email: string;
    targetTrack: 'HSK 1' | 'HSK 2' | 'HSK Sơ cấp (1+2)';
    dailyMinutes: number;
    isLoggedIn: boolean;
  }>({
    name: 'Học viên Mới',
    email: 'learner@hanziflow.vn',
    targetTrack: 'HSK Sơ cấp (1+2)',
    dailyMinutes: 20,
    isLoggedIn: true
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'goal'>('login');
  const [streakDays, setStreakDays] = useState<number>(0);
  const [checkedInToday, setCheckedInToday] = useState<boolean>(false);
  const [dailyXp, setDailyXp] = useState<number>(0);
  const [dailyGoalXp] = useState<number>(200);

  // Quizlet-Style Flashcard & Match Game States
  const [quizletSubMode, setQuizletSubMode] = useState<'cards' | 'match'>('cards');
  const [starredWordIds, setStarredWordIds] = useState<Record<string, boolean>>({
    'hsk1-w4': true,
    'voc-1': true,
    'voc-9': true
  });
  const [onlyStarredFilter, setOnlyStarredFilter] = useState<boolean>(false);
  const [isShuffledDeck, setIsShuffledDeck] = useState<boolean>(false);
  const [autoPlayCardAudio, setAutoPlayCardAudio] = useState<boolean>(true);
  const [matchTiles, setMatchTiles] = useState<
    Array<{ tileId: string; wordId: string; text: string; kind: 'hanzi' | 'meaning'; matched: boolean }>
  >([]);
  const [selectedMatchTileId, setSelectedMatchTileId] = useState<string | null>(null);
  const [matchMoves, setMatchMoves] = useState<number>(0);
  const [matchBestMoves, setMatchBestMoves] = useState<number | null>(8);

  // HSK Practice Exam & Custom Exam Builder States
  const [exams, setExams] = useState<PracticeExam[]>([
    {
      id: 'exam-hsk1',
      title: 'Đề chuẩn HSK 1 — Đề số 01',
      examMode: 'hsk1',
      badge: 'HSK 1 Chuẩn',
      durationMinutes: 10,
      description: 'Kiểm tra Nghe phản xạ & Đọc hiểu mặt chữ 150 từ vựng HSK 1 cốt lõi.'
    },
    {
      id: 'exam-hsk2',
      title: 'Đề chuẩn HSK 2 — Đề số 01',
      examMode: 'hsk2',
      badge: 'HSK 2 Chuẩn',
      durationMinutes: 15,
      description: 'Đánh giá năng lực từ vựng học tập, thói quen và mẫu câu giao tiếp HSK 2.'
    },
    {
      id: 'exam-elem',
      title: 'Đề Tổng hợp HSK Sơ cấp (HSK 1 + 2)',
      examMode: 'elementary',
      badge: 'HSK Sơ cấp',
      durationMinutes: 15,
      description: 'Đề thi tổng hợp chuẩn đầu ra HSK Sơ cấp kết hợp cả Nghe, Đọc mặt chữ và Ngữ cảnh.'
    },
    {
      id: 'exam-adaptive',
      title: 'Đề Trộn Thông Minh (HSK 1 + 2 theo trình độ SRS)',
      examMode: 'mixed_adaptive',
      badge: 'Đề Trộn Thích Ứng',
      durationMinutes: 12,
      description: 'Tự động rút trích các từ Mới (New) & Đang học (Learning) của bạn ở cả HSK 1 + 2 để xoáy sâu vào từ yếu.'
    }
  ]);
  const [activeExam, setActiveExam] = useState<PracticeExam | null>(null);
  const [examQuestions, setExamQuestions] = useState<CustomExamQuestion[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [examSubmitted, setExamSubmitted] = useState<boolean>(false);
  const [isBuildExamOpen, setIsBuildExamOpen] = useState<boolean>(false);
  const [newExamTitle, setNewExamTitle] = useState<string>('');
  const [newExamMode, setNewExamMode] = useState<'hsk1' | 'hsk2' | 'elementary' | 'mixed_adaptive'>('mixed_adaptive');
  const [newExamDuration, setNewExamDuration] = useState<number>(12);
  const [customQHanzi, setCustomQHanzi] = useState<string>('');
  const [customQCorrect, setCustomQCorrect] = useState<string>('');
  const [customQWrong1, setCustomQWrong1] = useState<string>('');
  const [customQWrong2, setCustomQWrong2] = useState<string>('');
  const [draftCustomQuestions, setDraftCustomQuestions] = useState<CustomExamQuestion[]>([]);

  // Daily Proficiency History (Computed from real learner progress; starts at 0 for a brand-new learner)
  const [dailyProficiencyHistory, setDailyProficiencyHistory] = useState<
    Array<{ day: string; score: number; hsk1Ready: number; hsk2Ready: number }>
  >([
    { day: '15/10', score: 0, hsk1Ready: 0, hsk2Ready: 0 },
    { day: '16/10', score: 0, hsk1Ready: 0, hsk2Ready: 0 },
    { day: '17/10', score: 0, hsk1Ready: 0, hsk2Ready: 0 },
    { day: '18/10', score: 0, hsk1Ready: 0, hsk2Ready: 0 },
    { day: '19/10', score: 0, hsk1Ready: 0, hsk2Ready: 0 },
    { day: 'Hôm nay', score: 0, hsk1Ready: 0, hsk2Ready: 0 }
  ]);

  // Dashboard & Review Hierarchical Filter States
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('all');
  const [selectedLessonFilter, setSelectedLessonFilter] = useState<string>('all');

  // Library / Khóa học Hierarchical Navigation States
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>('cat-hsk');
  const [activeLevelId, setActiveLevelId] = useState<string | null>('lvl-hsk1');
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [lessonDetailTab, setLessonDetailTab] = useState<'vocab' | 'reading' | 'skills'>('vocab');

  // Smart Pinyin Mode: Only show Pinyin when word is 'new' (unlearned)
  const [smartPinyinMode, setSmartPinyinMode] = useState<boolean>(true);
  const [peekPinyinIds, setPeekPinyinIds] = useState<Record<string, boolean>>({});

  // Reading Text (Bài khóa) Progressive Mastery & Interactive Role-Play States
  const [showReadingPinyin, setShowReadingPinyin] = useState<boolean>(false);
  const [showReadingMeaning, setShowReadingMeaning] = useState<boolean>(true);
  const [readingCounts, setReadingCounts] = useState<Record<string, number>>({
    'rt-hsk1-1': 2,
    'rt-hsk2-1': 3
  });
  const [rolePlayActiveId, setRolePlayActiveId] = useState<string | null>(null);
  const [userRoleSpeaker, setUserRoleSpeaker] = useState<'A' | 'B'>('B');
  const [rolePlayTurnIndex, setRolePlayTurnIndex] = useState<number>(0);
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);
  const [spokenTranscript, setSpokenTranscript] = useState<string>('');
  const [rolePlayFeedback, setRolePlayFeedback] = useState<string | null>(null);

  // 4-Skill Hub (Nghe - Nói - Đọc - Viết) States
  const [activeSkill, setActiveSkill] = useState<'listen' | 'speak' | 'read' | 'write'>('read');
  const [skillSource, setSkillSource] = useState<'vocab' | 'reading'>('vocab');
  const [skillItemIndex, setSkillItemIndex] = useState<number>(0);
  const [skillFeedback, setSkillFeedback] = useState<string | null>(null);
  const [writeGuideVisible, setWriteGuideVisible] = useState<boolean>(true);
  const [strokeCount, setStrokeCount] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  const [isAddLessonModalOpen, setIsAddLessonModalOpen] = useState<boolean>(false);
  const [newLessonTitle, setNewLessonTitle] = useState<string>('');
  const [newLessonDesc, setNewLessonDesc] = useState<string>('');

  // Vocabulary CRUD States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | VocabStatus>('all');
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<VocabularyItem | null>(null);
  const [formState, setFormState] = useState<VocabFormInput>({
    hanzi: '',
    pinyin: '',
    meaning: '',
    example_sentence: '',
    status: 'new',
    lessonId: 'les-hsk1-1',
    levelId: 'lvl-hsk1'
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Import / Export Modal States
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [importExportMode, setImportExportMode] = useState<'export' | 'import'>('export');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [importText, setImportText] = useState('');
  const [importMergeMode, setImportMergeMode] = useState<'merge' | 'replace'>('merge');
  const [copiedText, setCopiedText] = useState(false);

  // Flashcard Review Session States
  const [reviewScope, setReviewScope] = useState<'due' | 'all'>('due');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [sessionReviewedCount, setSessionReviewedCount] = useState(0);
  const [sessionRatings, setSessionRatings] = useState<Record<ReviewRating, number>>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0
  });

  // Quiz Mode States
  const [quizType, setQuizType] = useState<'mcq' | 'pinyin'>('mcq');
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState<string | null>(null);
  const [pinyinInput, setPinyinInput] = useState('');
  const [quizFinished, setQuizFinished] = useState(false);

  // Blueprint Code Viewer State
  const [blueprintStep, setBlueprintStep] = useState<'step1' | 'step2'>('step1');

  useEffect(() => {
    initialize();
  }, [initialize]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Lookup Maps for Hierarchy
  const levelById = useMemo(() => {
    const map = new Map<string, CourseLevel>();
    levels.forEach((l) => map.set(l.id, l));
    return map;
  }, [levels]);

  const lessonById = useMemo(() => {
    const map = new Map<string, Lesson>();
    lessons.forEach((l) => map.set(l.id, l));
    return map;
  }, [lessons]);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Helper to check if a word belongs to the active Category / Level / Lesson filter
  const matchesHierarchyFilter = (
    word: VocabularyItem,
    catId: string,
    lvlId: string,
    lesId: string
  ): boolean => {
    if (lesId !== 'all') {
      return word.lessonId === lesId;
    }
    const resolvedLevelId =
      word.levelId || (word.lessonId ? lessonById.get(word.lessonId)?.levelId : undefined);
    if (lvlId !== 'all') {
      return resolvedLevelId === lvlId;
    }
    if (catId !== 'all') {
      if (!resolvedLevelId) return false;
      const lvl = levelById.get(resolvedLevelId);
      return lvl?.categoryId === catId;
    }
    return true;
  };

  // Words filtered by Dashboard/Review hierarchy selectors
  const hierarchyFilteredWords = useMemo(() => {
    return words.filter((w) =>
      matchesHierarchyFilter(
        w,
        selectedCategoryFilter,
        selectedLevelFilter,
        selectedLessonFilter
      )
    );
  }, [
    words,
    selectedCategoryFilter,
    selectedLevelFilter,
    selectedLessonFilter,
    lessonById,
    levelById
  ]);

  const now = React.useSyncExternalStore(subscribeTime, getTimeSnapshot, getServerTimeSnapshot);
  const dueWords = useMemo(
    () => hierarchyFilteredWords.filter((w) => isDueForReview(w, now)),
    [hierarchyFilteredWords, now]
  );

  const counts = useMemo(() => {
    const c = {
      total: hierarchyFilteredWords.length,
      new: 0,
      learning: 0,
      graduated: 0,
      due: dueWords.length
    };
    hierarchyFilteredWords.forEach((w) => {
      c[w.status] = (c[w.status] || 0) + 1;
    });
    return c;
  }, [hierarchyFilteredWords, dueWords.length]);

  // 7-Day Forecast Data for Recharts BarChart (respects active Category/Level filter)
  const forecastData = useMemo(() => {
    const todayStart = getStartOfTodayMs(now);
    const days = ['Today', 'Tomorrow', '+2d', '+3d', '+4d', '+5d', '+6d'];
    return days.map((label, idx) => {
      const dayStart = todayStart + idx * DAY_MS;
      const dayEnd = dayStart + DAY_MS;
      const dueCount = hierarchyFilteredWords.filter((w) => {
        if (idx === 0) return w.next_review_date < dayEnd;
        return w.next_review_date >= dayStart && w.next_review_date < dayEnd;
      }).length;
      return {
        day: label,
        Due: dueCount
      };
    });
  }, [hierarchyFilteredWords]);

  const masteryPieData = useMemo(
    () => [
      { name: 'New (Mới)', value: counts.new, color: '#6366f1' },
      { name: 'Learning (Đang học)', value: counts.learning, color: '#f59e0b' },
      { name: 'Graduated (Thành thạo)', value: counts.graduated, color: '#10b981' }
    ],
    [counts]
  );

  // Filtered Vocabulary List (for Vocabulary tab)
  const filteredWords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const qStripped = stripPinyinTones(q);

    return hierarchyFilteredWords.filter((w) => {
      if (statusFilter === 'due' && !isDueForReview(w)) return false;
      if (
        statusFilter !== 'all' &&
        statusFilter !== 'due' &&
        w.status !== statusFilter
      ) {
        return false;
      }
      if (!q) return true;
      const matchHanzi = w.hanzi.toLowerCase().includes(q);
      const matchPinyin =
        w.pinyin.toLowerCase().includes(q) ||
        stripPinyinTones(w.pinyin).includes(qStripped);
      const matchMeaning = w.meaning.toLowerCase().includes(q);
      const matchExample = w.example_sentence.toLowerCase().includes(q);
      return matchHanzi || matchPinyin || matchMeaning || matchExample;
    });
  }, [hierarchyFilteredWords, searchQuery, statusFilter]);

  // Active Flashcard Queue (Supports Quizlet Starred Filter & Shuffle)
  const reviewQueue = useMemo(() => {
    let base = reviewScope === 'due' ? dueWords : hierarchyFilteredWords;
    if (onlyStarredFilter) {
      base = base.filter((w) => Boolean(starredWordIds[w.id]));
    }
    if (isShuffledDeck) {
      return [...base].reverse();
    }
    return base;
  }, [reviewScope, dueWords, hierarchyFilteredWords, onlyStarredFilter, starredWordIds, isShuffledDeck]);

  const activeFlashcard = reviewQueue[currentCardIndex] || reviewQueue[0] || null;

  // Library Current Entities
  const activeCategory = activeCategoryId ? categoryById.get(activeCategoryId) || null : null;
  const activeLevel = activeLevelId ? levelById.get(activeLevelId) || null : null;
  const activeLesson = activeLessonId ? lessonById.get(activeLessonId) || null : null;

  const categoryLevels = useMemo(() => {
    if (!activeCategoryId) return [];
    return levels.filter((lvl) => lvl.categoryId === activeCategoryId);
  }, [levels, activeCategoryId]);

  const levelLessons = useMemo(() => {
    if (!activeLevelId) return [];
    return lessons.filter((les) => les.levelId === activeLevelId);
  }, [lessons, activeLevelId]);

  const activeLessonWords = useMemo(() => {
    if (!activeLessonId) return [];
    const linkedVocabIds = new Set(
      lessonVocabLinks.filter((lv) => lv.lessonId === activeLessonId).map((lv) => lv.vocabId)
    );
    return words.filter((w) => linkedVocabIds.has(w.id) || w.lessonId === activeLessonId);
  }, [words, activeLessonId, lessonVocabLinks]);

  const activeLessonReadings = useMemo(() => {
    if (!activeLessonId) return [];
    return readingTexts.filter((rt) => rt.lessonId === activeLessonId);
  }, [readingTexts, activeLessonId]);

  // Launch Flashcards filtered strictly by a specific Lesson ("Study this lesson")
  const handleStudyLesson = (lesson: Lesson) => {
    const lvl = levelById.get(lesson.levelId);
    setSelectedCategoryFilter(lvl ? lvl.categoryId : 'all');
    setSelectedLevelFilter(lesson.levelId);
    setSelectedLessonFilter(lesson.id);
    const lessonDueCount = words.filter(
      (w) => w.lessonId === lesson.id && isDueForReview(w)
    ).length;
    setReviewScope(lessonDueCount > 0 ? 'due' : 'all');
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
    setActiveTab('review');
    showToast(`Đang học Flashcard: ${lesson.title}`);
  };

  // Quiz Questions Pool
  const quizQuestions = useMemo(() => {
    const sourceWords = hierarchyFilteredWords.length >= 4 ? hierarchyFilteredWords : words;
    if (sourceWords.length === 0) return [];
    return sourceWords.map((word, idx) => {
      const distractors = words
        .filter((w) => w.id !== word.id)
        .slice(0, 3)
        .map((d) => d.meaning);
      const options = [word.meaning, ...distractors];
      const rotated = options.map((_, i) => options[(i + idx) % options.length]);
      return {
        word,
        options: rotated
      };
    });
  }, [hierarchyFilteredWords, words]);

  const currentQuizItem = quizQuestions[quizIndex] || null;

  // Handlers for Add / Edit Modal
  const handleQuickAddModal = () => openAddModal();
  const openAddModal = (defaultLessonId?: string, defaultLevelId?: string) => {
    setEditingWord(null);
    const lesId = defaultLessonId || activeLessonId || 'les-hsk1-1';
    const les = lessonById.get(lesId);
    const lvlId = defaultLevelId || les?.levelId || activeLevelId || 'lvl-hsk1';
    setFormState({
      hanzi: '',
      pinyin: '',
      meaning: '',
      example_sentence: '',
      status: 'new',
      lessonId: lesId,
      levelId: lvlId
    });
    setIsAddEditOpen(true);
  };

  const openEditModal = (word: VocabularyItem) => {
    setEditingWord(word);
    setFormState({
      hanzi: word.hanzi,
      pinyin: word.pinyin,
      meaning: word.meaning,
      example_sentence: word.example_sentence,
      status: word.status,
      lessonId: word.lessonId || '',
      levelId: word.levelId || ''
    });
    setIsAddEditOpen(true);
  };

  const handleSaveWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.hanzi.trim() || !formState.pinyin.trim() || !formState.meaning.trim()) {
      showToast('Please fill in Hanzi, Pinyin, and Vietnamese Meaning.');
      return;
    }
    if (editingWord) {
      updateWord(editingWord.id, {
        hanzi: formState.hanzi.trim(),
        pinyin: formState.pinyin.trim(),
        meaning: formState.meaning.trim(),
        example_sentence: formState.example_sentence.trim(),
        status: formState.status || editingWord.status,
        lessonId: formState.lessonId || undefined,
        levelId: formState.levelId || undefined
      });
      showToast(`Updated "${formState.hanzi}"`);
    } else {
      addWord(formState);
      showToast(`Added "${formState.hanzi}" to vocabulary`);
    }
    setIsAddEditOpen(false);
  };

  const handleCreateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLevelId || !newLessonTitle.trim()) return;
    const created = addLesson(activeLevelId, newLessonTitle, newLessonDesc);
    setNewLessonTitle('');
    setNewLessonDesc('');
    setIsAddLessonModalOpen(false);
    setActiveLessonId(created.id);
    showToast(`Đã tạo bài học: ${created.title}`);
  };

  // Handlers for Flashcard Rating
  const handleRateFlashcard = (rating: ReviewRating) => {
    if (!activeFlashcard) return;
    const previewNext = calculateNextReview(activeFlashcard, rating);
    rateWord(activeFlashcard.id, rating);
    setReviewHistoryList((prev) => [
      {
        id: `rev-${Date.now()}`,
        vocabId: activeFlashcard.id,
        hanzi: activeFlashcard.hanzi,
        rating,
        reviewedAt: Date.now(),
        nextInterval: previewNext.interval
      },
      ...prev
    ]);
    setIsCardFlipped(false);
    setSessionReviewedCount((c) => c + 1);
    setSessionRatings((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));

    if (reviewScope === 'all') {
      setCurrentCardIndex((idx) => (idx + 1 < reviewQueue.length ? idx + 1 : 0));
    } else {
      setCurrentCardIndex(0);
    }
  };

  // Copy helper with Canvas fallback
  const copyToClipboard = (text: string, successLabel = 'Copied to clipboard!') => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedText(true);
      showToast(successLabel);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedText(true);
      showToast(successLabel);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const handleDownloadExport = () => {
    const content =
      exportFormat === 'json'
        ? JSON.stringify(words, null, 2)
        : exportWordsToCSV(words);
    const mime = exportFormat === 'json' ? 'application/json' : 'text/csv;charset=utf-8;';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hanziflow_vocab.${exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${words.length} words as ${exportFormat.toUpperCase()}`);
  };

  const handleBulkImportSubmit = () => {
    try {
      const parsed = parseImportPayload(importText);
      if (parsed.length === 0) {
        showToast('No valid vocabulary rows found. Check your CSV or JSON syntax.');
        return;
      }
      const addedCount = bulkImport(parsed, importMergeMode);
      setImportText('');
      setIsImportExportOpen(false);
      showToast(`Imported ${addedCount} vocabulary items!`);
    } catch {
      showToast('Invalid JSON or CSV format. Please check your input.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      setImportText(content);
    };
    reader.readAsText(file);
  };

  // Quiz Submission Handlers
  const handleSelectMCQ = (option: string) => {
    if (quizAnswered || !currentQuizItem) return;
    setQuizAnswered(option);
    if (option === currentQuizItem.word.meaning) {
      setQuizScore((s) => s + 1);
    }
  };

  const handleCheckPinyinQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (quizAnswered || !currentQuizItem || !pinyinInput.trim()) return;
    const userClean = stripPinyinTones(pinyinInput);
    const targetClean = stripPinyinTones(currentQuizItem.word.pinyin);
    const isCorrect =
      pinyinInput.trim().toLowerCase() === currentQuizItem.word.pinyin.toLowerCase() ||
      userClean === targetClean;
    setQuizAnswered(isCorrect ? 'CORRECT' : 'WRONG');
    if (isCorrect) {
      setQuizScore((s) => s + 1);
    }
  };

  const handleNextQuizQuestion = () => {
    if (quizIndex + 1 >= quizQuestions.length) {
      setQuizFinished(true);
    } else {
      setQuizIndex((i) => i + 1);
      setQuizAnswered(null);
      setPinyinInput('');
    }
  };

  const restartQuiz = () => {
    setQuizIndex(0);
    setQuizScore(0);
    setQuizAnswered(null);
    setPinyinInput('');
    setQuizFinished(false);
  };

  const renderCategoryIcon = (iconName: string) => {
    if (iconName === 'GraduationCap') return <GraduationCap className="w-5 h-5" />;
    if (iconName === 'MessageCircle') return <MessageCircle className="w-5 h-5" />;
    return <Compass className="w-5 h-5" />;
  };

  // Smart Pinyin visibility helper: only show Pinyin when status === 'new' (unlearned) or manually peeked
  const isPinyinVisibleForWord = (word: VocabularyItem): boolean => {
    if (!smartPinyinMode) return true;
    if (peekPinyinIds[word.id]) return true;
    return word.status === 'new';
  };

  const togglePeekPinyin = (id: string) => {
    setPeekPinyinIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Increment Reading Count for Bài khóa & auto-hide Pinyin once >= 3 reads
  const handleCompleteReadingPass = (rt: ReadingText) => {
    const current = readingCounts[rt.id] || 0;
    const next = current + 1;
    setReadingCounts((prev) => ({ ...prev, [rt.id]: next }));
    if (next >= 3) {
      setShowReadingPinyin(false);
      showToast(`Đã đọc ${next} lần! Mở khóa Giao tiếp Đóng vai & Tự động ẩn Pinyin.`);
    } else {
      showToast(`Hoàn thành lượt đọc ${next}/3. Đọc thêm ${3 - next} lần để mở khóa Đóng vai!`);
    }
  };

  // Start or Swap Role-Play Conversation on a Reading Text
  const startRolePlaySession = (rt: ReadingText, role: 'A' | 'B') => {
    setRolePlayActiveId(rt.id);
    setUserRoleSpeaker(role);
    setRolePlayTurnIndex(0);
    setSpokenTranscript('');
    setRolePlayFeedback(null);
    const lines = rt.content_hanzi.split('\n');
    if (lines.length > 0 && role === 'B') {
      // App is Speaker A, so App speaks line 0 immediately
      const firstLineClean = lines[0].replace(/^[A-Z]:\s*/, '');
      speakChinese(firstLineClean);
    }
  };

  const advanceRolePlayTurn = (rt: ReadingText, nextIdx: number, currentRole: 'A' | 'B') => {
    const lines = rt.content_hanzi.split('\n');
    if (nextIdx >= lines.length) {
      setRolePlayTurnIndex(lines.length);
      return;
    }
    setRolePlayTurnIndex(nextIdx);
    const line = lines[nextIdx] || '';
    const speaker = line.startsWith('B:') ? 'B' : 'A';
    if (speaker !== currentRole) {
      // App's turn to speak
      const clean = line.replace(/^[A-Z]:\s*/, '');
      speakChinese(clean);
    }
  };

  // Microphone / Speech Recognition handler (with graceful fallback in Canvas)
  const triggerSpeechPractice = (targetHanzi: string, onSuccess?: () => void) => {
    const cleanTarget = targetHanzi.replace(/^[A-Z]:\s*/, '').replace(/[，。！？、]/g, '').trim();
    setIsListeningMic(true);
    setSpokenTranscript('Đang lắng nghe giọng đọc của bạn...');
    try {
      const SpeechRec =
        (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
          .SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
      if (SpeechRec) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition = new (SpeechRec as any)();
        recognition.lang = 'zh-CN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          const transcript = String(event?.results?.[0]?.[0]?.transcript || '').trim();
          setSpokenTranscript(transcript);
          setIsListeningMic(false);
          const matchedChars = Array.from(cleanTarget).filter((ch) => transcript.includes(ch)).length;
          const charMatchPct = cleanTarget.length > 0 ? Math.round((matchedChars / cleanTarget.length) * 100) : 0;
          setRolePlayFeedback(
            `Nhận diện lời nói (SpeechRecognition): "${transcript}" · Khớp ${charMatchPct}% ký tự câu mẫu (Lưu ý: Trình duyệt chỉ so khớp văn bản, không chấm âm học thanh điệu).`
          );
          setSkillFeedback(
            `Bản nhận dạng lời nói: "${transcript}" · Khớp ${charMatchPct}% ký tự với "${cleanTarget}" (Speech-to-Text, không chấm điểm âm học).`
          );
          if (onSuccess) onSuccess();
        };
        recognition.onerror = () => {
          setSpokenTranscript(cleanTarget);
          setIsListeningMic(false);
          setRolePlayFeedback(
            `[Chế độ Mô phỏng Sandbox - Không có quyền Mic]: Ghi nhận lượt tập nói "${cleanTarget}" (Chưa chấm điểm phát âm thực tế).`
          );
          setSkillFeedback(
            `[Chế độ Mô phỏng Sandbox]: Đã ghi nhận lượt luyện nói câu "${cleanTarget}" (Trình duyệt chặn Mic nên không chấm điểm phát âm).`
          );
          if (onSuccess) onSuccess();
        };
        recognition.start();
        return;
      }
    } catch {
      // Fallback below
    }
    setTimeout(() => {
      setSpokenTranscript(cleanTarget);
      setIsListeningMic(false);
      setRolePlayFeedback(
        `[Chế độ Mô phỏng Sandbox]: Đã ghi nhận lượt luyện nói "${cleanTarget}" (Chỉ mô phỏng lượt thoại, không chấm phát âm chuẩn xác).`
      );
      setSkillFeedback(
        `[Chế độ Mô phỏng Sandbox]: Đã hoàn thành lượt tập nói "${cleanTarget}" (Lưu ý: Không có SpeechRecognition thực tế trên thiết bị này).`
      );
      if (onSuccess) onSuccess();
    }, 600);
  };

  // HTML5 Canvas Hanzi Stroke Drawing Handlers
  const clearWritingCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStrokeCount(0);
  };

  const getCanvasPoint = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    const me = e as React.MouseEvent<HTMLCanvasElement>;
    return {
      x: me.clientX - rect.left,
      y: me.clientY - rect.top
    };
  };

  const startCanvasDraw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isDrawingRef.current = true;
    const { x, y } = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = darkMode ? '#fb7185' : '#e11d48';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const moveCanvasDraw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endCanvasDraw = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setStrokeCount((c) => c + 1);
  };

  // Daily Streak Check-In Handler
  const handleDailyCheckIn = () => {
    if (checkedInToday) {
      showToast('Bạn đã điểm danh nhận lửa Streak hôm nay rồi!');
      return;
    }
    setCheckedInToday(true);
    setStreakDays((s) => s + 1);
    setDailyXp((x) => x + 30);
    setDailyProficiencyHistory((prev) =>
      prev.map((item, idx) =>
        idx === prev.length - 1
          ? { ...item, score: Math.min(100, item.score + 2), hsk1Ready: Math.min(100, item.hsk1Ready + 2) }
          : item
      )
    );
    showToast('🔥 Điểm danh thành công! +1 Ngày Streak & +30 XP!');
  };

  // Quizlet Star Toggle
  const toggleStarWord = (id: string) => {
    setStarredWordIds((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      return next;
    });
  };

  // Initialize Quizlet Match Game Board
  const initQuizletMatchGame = () => {
    const sourcePool = (hierarchyFilteredWords.length >= 4 ? hierarchyFilteredWords : words).slice(0, 6);
    const tiles: Array<{
      tileId: string;
      wordId: string;
      text: string;
      kind: 'hanzi' | 'meaning';
      matched: boolean;
    }> = [];
    sourcePool.forEach((w) => {
      tiles.push({
        tileId: `hz-${w.id}`,
        wordId: w.id,
        text: w.hanzi,
        kind: 'hanzi',
        matched: false
      });
      tiles.push({
        tileId: `mn-${w.id}`,
        wordId: w.id,
        text: w.meaning,
        kind: 'meaning',
        matched: false
      });
    });
    // Interleave deterministically so pairs are separated
    const shuffled = tiles.sort((a, b) => a.text.localeCompare(b.text));
    setMatchTiles(shuffled);
    setSelectedMatchTileId(null);
    setMatchMoves(0);
    setQuizletSubMode('match');
  };

  const handleClickMatchTile = (tileId: string) => {
    const clicked = matchTiles.find((t) => t.tileId === tileId);
    if (!clicked || clicked.matched) return;
    if (clicked.kind === 'hanzi') {
      speakChinese(clicked.text);
    }
    if (!selectedMatchTileId) {
      setSelectedMatchTileId(tileId);
      return;
    }
    if (selectedMatchTileId === tileId) {
      setSelectedMatchTileId(null);
      return;
    }
    const first = matchTiles.find((t) => t.tileId === selectedMatchTileId);
    if (!first) {
      setSelectedMatchTileId(tileId);
      return;
    }
    const nextMoves = matchMoves + 1;
    setMatchMoves(nextMoves);

    if (first.wordId === clicked.wordId && first.kind !== clicked.kind) {
      const updated = matchTiles.map((t) =>
        t.wordId === clicked.wordId ? { ...t, matched: true } : t
      );
      setMatchTiles(updated);
      setSelectedMatchTileId(null);
      setDailyXp((x) => x + 10);
      if (updated.every((t) => t.matched)) {
        if (matchBestMoves === null || nextMoves < matchBestMoves) {
          setMatchBestMoves(nextMoves);
        }
        showToast(`🎉 Hoàn thành ghép thẻ Quizlet sau ${nextMoves} lượt!`);
      }
    } else {
      setSelectedMatchTileId(null);
      showToast('Chưa khớp! Hãy nhìn kỹ mặt chữ Hán và nghĩa Tiếng Việt.');
    }
  };

  // Build & Launch Practice Exam (HSK 1, HSK 2, Elementary, or Adaptive Mixed 1+2)
  const startPracticeExam = (exam: PracticeExam) => {
    let candidateWords: VocabularyItem[] = [];
    if (exam.examMode === 'hsk1') {
      candidateWords = words.filter((w) => w.levelId === 'lvl-hsk1');
    } else if (exam.examMode === 'hsk2') {
      candidateWords = words.filter((w) => w.levelId === 'lvl-hsk2');
    } else if (exam.examMode === 'elementary') {
      candidateWords = words.filter((w) => w.levelId === 'lvl-hsk1' || w.levelId === 'lvl-hsk2');
    } else {
      // Adaptive Mixed 1+2 based on learning status: prioritize 'new' & 'learning' first!
      const sortedByWeakness = [...words].sort((a, b) => {
        const rank = (s: VocabStatus) => (s === 'new' ? 0 : s === 'learning' ? 1 : 2);
        return rank(a.status) - rank(b.status) || a.interval - b.interval;
      });
      candidateWords = sortedByWeakness;
    }
    if (candidateWords.length < 4) {
      candidateWords = words;
    }

    const generatedQuestions: CustomExamQuestion[] = candidateWords.slice(0, 6).map((w, idx) => {
      const distractors = words
        .filter((other) => other.id !== w.id)
        .slice(0, 3)
        .map((d) => d.meaning);
      const opts = [w.meaning, ...distractors];
      const rotated = opts.map((_, i) => opts[(i + idx) % opts.length]);
      const qType: 'listen' | 'reading' | 'context' =
        idx % 3 === 0 ? 'listen' : idx % 3 === 1 ? 'reading' : 'context';
      const lvlName = w.levelId === 'lvl-hsk1' ? 'HSK 1' : w.levelId === 'lvl-hsk2' ? 'HSK 2' : 'HSK Sơ cấp';

      return {
        id: `eq-${exam.id}-${w.id}`,
        promptHanzi: qType === 'context' && w.example_sentence ? w.example_sentence.split('(')[0] : w.hanzi,
        promptAudioText: w.hanzi,
        questionType: qType,
        levelTag: `${lvlName} · ${w.status.toUpperCase()}`,
        options: rotated,
        correctAnswer: w.meaning,
        explanation: `${w.hanzi} [${w.pinyin}]: ${w.meaning}`
      };
    });

    const combined = [...(exam.customQuestions || []), ...generatedQuestions];
    setActiveExam(exam);
    setExamQuestions(combined);
    setExamAnswers({});
    setExamSubmitted(false);
  };

  const handleAddDraftQuestion = () => {
    if (!customQHanzi.trim() || !customQCorrect.trim()) {
      showToast('Vui lòng nhập Hán tự/Câu hỏi và Đáp án đúng!');
      return;
    }
    const opts = [
      customQCorrect.trim(),
      customQWrong1.trim() || 'Tạm biệt',
      customQWrong2.trim() || 'Cảm ơn nhiều'
    ];
    const newQ: CustomExamQuestion = {
      id: `cust-q-${Date.now()}`,
      promptHanzi: customQHanzi.trim(),
      promptAudioText: customQHanzi.trim(),
      questionType: 'reading',
      levelTag: 'Câu hỏi tự tạo',
      options: opts,
      correctAnswer: customQCorrect.trim(),
      explanation: `${customQHanzi.trim()} → ${customQCorrect.trim()}`
    };
    setDraftCustomQuestions((prev) => [...prev, newQ]);
    setCustomQHanzi('');
    setCustomQCorrect('');
    setCustomQWrong1('');
    setCustomQWrong2('');
    showToast('Đã thêm câu hỏi vào đề đang tạo!');
  };

  const handleCreateCustomExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamTitle.trim()) return;
    const badgeMap = {
      hsk1: 'HSK 1 Tự tạo',
      hsk2: 'HSK 2 Tự tạo',
      elementary: 'HSK Sơ cấp 1+2',
      mixed_adaptive: 'Đề Trộn Thích Ứng 1+2'
    };
    const created: PracticeExam = {
      id: `exam-custom-${Date.now()}`,
      title: newExamTitle.trim(),
      examMode: newExamMode,
      badge: badgeMap[newExamMode],
      durationMinutes: newExamDuration,
      description: `Đề luyện tùy chỉnh (${badgeMap[newExamMode]}) kết hợp câu hỏi tự thêm và kho từ SRS theo trình độ.`,
      customQuestions: draftCustomQuestions
    };
    setExams((prev) => [created, ...prev]);
    setNewExamTitle('');
    setDraftCustomQuestions([]);
    setIsBuildExamOpen(false);
    startPracticeExam(created);
    showToast(`Đã tạo và mở đề: ${created.title}`);
  };

  const handleSubmitExam = () => {
    setExamSubmitted(true);
    const correctCount = examQuestions.filter(
      (q) => examAnswers[q.id] === q.correctAnswer
    ).length;
    const pct = examQuestions.length > 0 ? Math.round((correctCount / examQuestions.length) * 100) : 85;
    if (activeExam) {
      setExamAttemptsList((prev) => [
        {
          id: `att-${Date.now()}`,
          examId: activeExam.id,
          examTitle: activeExam.title,
          scorePct: pct,
          correctCount,
          totalQuestions: examQuestions.length,
          completedAt: Date.now()
        },
        ...prev
      ]);
    }
    setDailyXp((x) => x + 50);
    setDailyProficiencyHistory((prev) =>
      prev.map((item, idx) =>
        idx === prev.length - 1
          ? {
              ...item,
              score: Math.round((item.score + pct) / 2),
              hsk1Ready: Math.min(100, item.hsk1Ready + 3),
              hsk2Ready: Math.min(100, item.hsk2Ready + 4)
            }
          : item
      )
    );
    showToast(`Đã chấm điểm! Bạn đạt ${correctCount}/${examQuestions.length} câu (${pct}%). Đã cập nhật biểu đồ trình độ hôm nay!`);
  };

  // Save Dual-Track enrollments, lesson progress, and assessment attempts to LocalStorage safely
  const saveTrackStateToStorage = (
    nextEnrollments: Record<TrackCode, UserTrackEnrollment>,
    nextProgress: Record<string, UserLessonProgress>,
    nextAttempts?: LessonAttemptRecord[]
  ) => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('hanziflow_enrollments_v3', JSON.stringify(nextEnrollments));
        window.localStorage.setItem('hanziflow_lesson_progress_v4', JSON.stringify(nextProgress));
        if (nextAttempts) {
          window.localStorage.setItem('hanziflow_lesson_attempts_v4', JSON.stringify(nextAttempts));
        }
      }
    } catch {
      // Ignore sandbox storage errors
    }
  };

  // Switch active track without losing lesson/activity progress on the other track
  const handleSwitchTrack = (trackId: TrackCode) => {
    setActiveTrackId(trackId);
    const enrollment = trackEnrollments[trackId];
    const trackMeta = DUAL_TRACKS_CONFIG.find((t) => t.id === trackId);
    if (trackMeta) {
      setActiveCategoryId(trackMeta.categoryId);
    }
    if (enrollment) {
      setActiveLevelId(enrollment.currentLevelId);
    }
    showToast(
      `Đã chuyển sang ${trackId === 'track-hsk' ? 'Lộ trình HSK' : 'Lộ trình Giao tiếp'} (Tiến độ từng bước được giữ nguyên độc lập)`
    );
  };

  const handleToggleEnrollTrack = (trackId: TrackCode) => {
    const current = trackEnrollments[trackId];
    const nextEnrollments = {
      ...trackEnrollments,
      [trackId]: {
        ...current,
        isEnrolled: !current.isEnrolled,
        enrolledAt: now
      }
    };
    setTrackEnrollments(nextEnrollments);
    saveTrackStateToStorage(nextEnrollments, lessonProgressMap);
    showToast(
      !current.isEnrolled
        ? `Đã đăng ký thêm ${trackId === 'track-hsk' ? 'Lộ trình HSK' : 'Lộ trình Giao tiếp'}!`
        : 'Đã tạm ẩn lộ trình này.'
    );
  };

  // Get canonical vocabulary items for any lesson using LessonVocabulary M:N links + direct lessonId fallback
  const getCanonicalWordsForLesson = (lessonId: string): VocabularyItem[] => {
    const linkedIds = new Set(
      lessonVocabLinks.filter((lv) => lv.lessonId === lessonId).map((lv) => lv.vocabId)
    );
    return words.filter((w) => linkedIds.has(w.id) || w.lessonId === lessonId);
  };

  // Check how many lessons share a canonical VocabularyItem (proves single SRS schedule across Dual Paths)
  const getSharedLessonTitlesForWord = (vocabId: string, fallbackLessonId?: string): string[] => {
    const lessonIds = new Set(
      lessonVocabLinks.filter((lv) => lv.vocabId === vocabId).map((lv) => lv.lessonId)
    );
    if (fallbackLessonId) lessonIds.add(fallbackLessonId);
    return Array.from(lessonIds)
      .map((id) => lessonById.get(id)?.title || '')
      .filter(Boolean);
  };

  // P1 Structured Assessment Engine: Get questions for a specific lesson & activity without fake fallbacks!
  const getQuestionsForLessonActivity = (
    lessonId: string,
    activityType: LessonActivityType
  ): AssessmentQuestion[] => {
    const bank = STRUCTURED_LESSON_QUESTION_BANK[lessonId] || [];
    const directMatches = bank.filter((q) => q.activityType === activityType);
    if (directMatches.length > 0) return directMatches;

    // For quiz/assessment activities on custom lessons that have vocabulary, build contextual questions with rotated options
    if (activityType === 'practice_quiz' || activityType === 'final_assessment') {
      const lessonWords = getCanonicalWordsForLesson(lessonId);
      if (lessonWords.length === 0) return [];
      const distractorPool = words.length >= 4 ? words : lessonWords;
      return lessonWords.slice(0, 4).map((w, idx) => {
        const wrongOptions = distractorPool
          .filter((other) => other.id !== w.id && other.meaning !== w.meaning)
          .slice(0, 3)
          .map((d) => d.meaning);
        const rawOptions = [w.meaning, ...wrongOptions];
        // Rotate options deterministically by index so correct answer is NOT always at index 0
        const rotated = rawOptions.map(
          (_, optIdx) => rawOptions[(optIdx + idx + 1) % rawOptions.length]
        );
        return {
          id: `dyn-q-${lessonId}-${w.id}`,
          lessonId,
          activityType,
          questionType: 'mcq_meaning',
          prompt: `Nghĩa Tiếng Việt chính xác của từ “${w.hanzi}” là gì?`,
          audioText: w.hanzi,
          options: rotated,
          correctAnswer: w.meaning,
          explanation: `${w.hanzi} [${w.pinyin}] có nghĩa là: ${w.meaning}.`,
          difficulty: 'medium'
        };
      });
    }
    return [];
  };

  // P0 Fix: Open Focus Mode Lesson Player WITHOUT falling back to 'les-hsk1-1'!
  const openFocusLessonPlayer = (lessonId: string, trackOverride?: TrackCode) => {
    const les = lessonById.get(lessonId);
    if (!les) return;
    const lvl = levelById.get(les.levelId);
    const resolvedTrack: TrackCode =
      trackOverride ||
      (lvl?.categoryId === 'cat-comm' ? 'track-comm' : 'track-hsk');

    // P0: Never fallback to 'les-hsk1-1'! If unconfigured, activities is []
    const activities = LESSON_ACTIVITIES_CONFIG[lessonId] || [];
    const existingProg = lessonProgressMap[lessonId];
    const resumeIdx =
      existingProg && activities.length > 0
        ? Math.min(existingProg.currentStepIndex, Math.max(0, activities.length - 1))
        : 0;

    const nextEnrollments: Record<TrackCode, UserTrackEnrollment> = {
      ...trackEnrollments,
      [resolvedTrack]: {
        ...trackEnrollments[resolvedTrack],
        isEnrolled: true,
        currentLevelId: les.levelId,
        currentLessonId: lessonId,
        lastStudiedAt: Date.now()
      }
    };

    // Only initialize 'in_progress' if the lesson actually has configured activities
    const nextProg: Record<string, UserLessonProgress> =
      activities.length > 0
        ? {
            ...lessonProgressMap,
            [lessonId]: existingProg || {
              lessonId,
              trackId: resolvedTrack,
              status: 'in_progress',
              currentActivityId: activities[0].id,
              currentStepIndex: 0,
              completedActivityIds: [],
              updatedAt: Date.now()
            }
          }
        : lessonProgressMap;

    setTrackEnrollments(nextEnrollments);
    setLessonProgressMap(nextProg);
    saveTrackStateToStorage(nextEnrollments, nextProg);

    setActiveTrackId(resolvedTrack);
    setPlayerLessonId(lessonId);
    setPlayerStepIndex(resumeIdx);
    setPlayerAssessmentAnswers({});
    setPlayerAssessmentSubmitted(false);
    setPlayerAssessmentError(null);
    setPlayerVocabFocusIdx(0);
    setPlayerVocabCheckAns(null);
    setPlayerGrammarCheckAns(null);
    setPlayerListenCheckAns(null);
    setStrokeVerifyFeedback(null);
    setIsFocusPlayerOpen(true);
  };

  // P0 Fix: Submit & Grade Lesson Quiz / Final Assessment from real answers
  const handleGradePlayerAssessment = () => {
    const activities = LESSON_ACTIVITIES_CONFIG[playerLessonId] || [];
    const currentAct = activities[playerStepIndex];
    if (!currentAct) return;

    const questions = getQuestionsForLessonActivity(playerLessonId, currentAct.type);
    if (questions.length === 0) {
      setPlayerAssessmentError('Bài chưa có câu hỏi kiểm tra nên chưa thể chấm điểm.');
      return;
    }

    const unansweredCount = questions.filter((q) => !playerAssessmentAnswers[q.id]).length;
    if (unansweredCount > 0) {
      setPlayerAssessmentError(
        `Bạn còn ${unansweredCount}/${questions.length} câu chưa trả lời. Vui lòng chọn đáp án cho tất cả các câu trước khi nộp bài!`
      );
      showToast('Vui lòng trả lời đầy đủ tất cả câu hỏi trước khi nộp bài!');
      return;
    }

    setPlayerAssessmentError(null);
    setPlayerAssessmentSubmitted(true);

    const correctCount = questions.filter(
      (q) => playerAssessmentAnswers[q.id] === q.correctAnswer
    ).length;
    const scorePct = Math.round((correctCount / questions.length) * 100);
    const passThreshold = currentAct.passScorePct || 75;
    const passed = scorePct >= passThreshold;

    const attemptRecord: LessonAttemptRecord = {
      id: `lat-${Date.now()}`,
      lessonId: playerLessonId,
      activityId: currentAct.id,
      scorePct,
      passScorePct: passThreshold,
      passed,
      correctCount,
      totalQuestions: questions.length,
      answers: { ...playerAssessmentAnswers },
      submittedAt: Date.now()
    };

    const nextAttempts = [attemptRecord, ...lessonAssessmentAttempts];
    setLessonAssessmentAttempts(nextAttempts);

    if (passed) {
      const existing = lessonProgressMap[playerLessonId] || {
        lessonId: playerLessonId,
        trackId: activeTrackId,
        status: 'in_progress' as const,
        currentActivityId: currentAct.id,
        currentStepIndex: playerStepIndex,
        completedActivityIds: [],
        updatedAt: Date.now()
      };
      const nextCompleted = Array.from(new Set([...existing.completedActivityIds, currentAct.id]));
      const requiredActs = activities.filter((a) => a.requiredForCompletion);
      const allRequiredDone =
        requiredActs.length > 0 &&
        requiredActs.every((a) => nextCompleted.includes(a.id));

      const updatedProg: UserLessonProgress = {
        ...existing,
        status: allRequiredDone ? 'completed' : 'in_progress',
        completedActivityIds: nextCompleted,
        assessmentScorePct: scorePct,
        updatedAt: Date.now()
      };
      const nextMap = { ...lessonProgressMap, [playerLessonId]: updatedProg };
      setLessonProgressMap(nextMap);
      saveTrackStateToStorage(trackEnrollments, nextMap, nextAttempts);
      setDailyXp((x) => x + 30);
      if (!checkedInToday) {
        setCheckedInToday(true);
        setStreakDays((s) => s + 1);
      }
      setDailyProficiencyHistory((prev) =>
        prev.map((item, idx) =>
          idx === prev.length - 1
            ? {
                ...item,
                score: Math.max(item.score, scorePct),
                hsk1Ready: Math.min(100, item.hsk1Ready + 15),
                hsk2Ready: Math.min(100, item.hsk2Ready + 10)
              }
            : item
        )
      );
      showToast(
        `🎉 Đạt ${scorePct}% (${correctCount}/${questions.length} câu, yêu cầu ≥ ${passThreshold}%). Đã mở khóa bước tiếp theo!`
      );
    } else {
      saveTrackStateToStorage(trackEnrollments, lessonProgressMap, nextAttempts);
      showToast(
        `Chưa đạt (${scorePct}% < ${passThreshold}%). Hãy xem giải thích lỗi sai bên dưới và bấm "Làm lại bài kiểm tra"!`
      );
    }
  };

  // P0 Fix: Strict step completion & advancement — NO hardcoded 100 score, NO bypassing required activities!
  const completePlayerActivityAndAdvance = (requestFinishLesson = false) => {
    const activities = LESSON_ACTIVITIES_CONFIG[playerLessonId] || [];
    if (activities.length === 0) {
      showToast('Bài học này chưa được cấu hình hoạt động nên không thể đánh dấu hoàn thành.');
      return;
    }
    const currentAct = activities[playerStepIndex];
    if (!currentAct) return;

    // Gate 1: If current activity is practice_quiz or final_assessment, it MUST have a passed attempt!
    if (currentAct.type === 'practice_quiz' || currentAct.type === 'final_assessment') {
      const hasPassedAttempt = lessonAssessmentAttempts.some(
        (att) =>
          att.lessonId === playerLessonId &&
          att.activityId === currentAct.id &&
          att.passed
      );
      if (!hasPassedAttempt) {
        setPlayerAssessmentError(
          `Bạn phải nộp bài và đạt tối thiểu ${currentAct.passScorePct || 75}% trước khi qua bước tiếp theo!`
        );
        showToast(
          `Vui lòng hoàn thành và đạt ≥ ${currentAct.passScorePct || 75}% ở bài kiểm tra này trước!`
        );
        return;
      }
    }

    // Gate 2: Check interactive mini-verifications on learning activities
    if (currentAct.type === 'grammar') {
      const gQuestions = getQuestionsForLessonActivity(playerLessonId, 'grammar');
      if (gQuestions.length > 0 && !playerGrammarCheckAns) {
        showToast('Hãy chọn đáp án cho câu hỏi ứng dụng ngữ pháp bên dưới trước khi tiếp tục!');
        return;
      }
    }
    if (currentAct.type === 'listening') {
      const lQuestions = getQuestionsForLessonActivity(playerLessonId, 'listening');
      if (lQuestions.length > 0 && !playerListenCheckAns) {
        showToast('Hãy nghe câu phát âm và chọn đáp án kiểm tra nghe hiểu trước khi tiếp tục!');
        return;
      }
    }

    const existing = lessonProgressMap[playerLessonId] || {
      lessonId: playerLessonId,
      trackId: activeTrackId,
      status: 'in_progress' as const,
      currentActivityId: currentAct.id,
      currentStepIndex: playerStepIndex,
      completedActivityIds: [],
      updatedAt: Date.now()
    };

    const nextCompleted = Array.from(new Set([...existing.completedActivityIds, currentAct.id]));
    const nextIdx = Math.min(playerStepIndex + 1, activities.length - 1);
    const nextAct = activities[nextIdx];

    // P0 Rule 2: Never let requestFinishLesson bypass required activities or required assessment pass!
    const requiredActs = activities.filter((a) => a.requiredForCompletion);
    const missingRequired = requiredActs.filter((a) => !nextCompleted.includes(a.id));
    const assessmentActs = requiredActs.filter(
      (a) => a.type === 'practice_quiz' || a.type === 'final_assessment'
    );
    const allAssessmentsPassed = assessmentActs.every((a) =>
      lessonAssessmentAttempts.some(
        (att) => att.lessonId === playerLessonId && att.activityId === a.id && att.passed
      )
    );

    if (requestFinishLesson && (missingRequired.length > 0 || !allAssessmentsPassed)) {
      const missingNames = missingRequired.map((m) => m.title).join(', ');
      showToast(
        `Chưa thể hoàn thành bài học! Bạn cần hoàn thành đủ các bước bắt buộc: ${
          missingNames || 'Bài kiểm tra cuối bài (Đạt điểm yêu cầu)'
        }`
      );
      return;
    }

    const isTrulyCompleted =
      requiredActs.length > 0 && missingRequired.length === 0 && allAssessmentsPassed;

    const updatedLessonProg: UserLessonProgress = {
      ...existing,
      status: isTrulyCompleted ? 'completed' : 'in_progress',
      currentActivityId: nextAct.id,
      currentStepIndex: nextIdx,
      completedActivityIds: nextCompleted,
      updatedAt: Date.now()
    };

    const nextMap = {
      ...lessonProgressMap,
      [playerLessonId]: updatedLessonProg
    };
    setLessonProgressMap(nextMap);
    saveTrackStateToStorage(trackEnrollments, nextMap);
    setDailyXp((x) => x + 15);
    if (!checkedInToday) {
      setCheckedInToday(true);
      setStreakDays((s) => s + 1);
    }

    if (requestFinishLesson && isTrulyCompleted) {
      setDailyXp((x) => x + 25);
      setIsFocusPlayerOpen(false);
      showToast('🎉 Chúc mừng! Bạn đã hoàn thành toàn bộ hoạt động bắt buộc và đạt chuẩn bài học.');
    } else {
      setPlayerStepIndex(nextIdx);
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        Loading HanziFlow Course & SRS...
      </div>
    );
  }

  const exportPreviewString =
    exportFormat === 'json' ? JSON.stringify(words, null, 2) : exportWordsToCSV(words);

  const availableLevelsForFilter =
    selectedCategoryFilter === 'all'
      ? levels
      : levels.filter((l) => l.categoryId === selectedCategoryFilter);

  return (
    <div
      className={
        darkMode
          ? 'dark min-h-screen bg-slate-950 text-slate-100 transition-colors duration-200'
          : 'min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200'
      }
      style={{
        fontFamily:
          "'Inter', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif"
      }}
    >
      {/* Top Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg bg-emerald-600 text-white text-sm font-medium animate-bounce">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Responsive Layout */}
      <div className="flex flex-col md:flex-row min-h-screen">
        {/* Sidebar / Navigation */}
        <aside
          className={`w-full ${
            isSidebarCollapsed ? 'md:w-20' : 'md:w-64'
          } shrink-0 border-b md:border-b-0 md:border-r transition-all duration-200 ${
            darkMode
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          } flex flex-col justify-between`}
        >
          <div>
            {/* Brand Header */}
            <div className="p-4 md:p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white font-bold text-xl shadow-sm">
                  汉
                </div>
                <div>
                  <h1 className="font-bold text-base md:text-lg tracking-tight flex items-center gap-1.5">
                    HanziFlow
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                      SRS
                    </span>
                  </h1>
                  <p
                    className={`text-xs ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Khóa học & Ôn tập SRS
                  </p>
                </div>
              </div>

              {/* Mobile Theme & Quick Add */}
              <div className="flex items-center gap-2 md:hidden">
                <button
                  type="button"
                  onClick={handleQuickAddModal}
                  className="p-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                  title="Add New Word"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className={`p-2 rounded-lg border ${
                    darkMode
                      ? 'border-slate-700 bg-slate-800 text-amber-400'
                      : 'border-slate-200 bg-slate-100 text-slate-700'
                  }`}
                  title="Toggle Dark Mode"
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Learner Profile & Daily Streak Mini-Card (Login / Onboarding Entry) */}
            <div className="px-4 pb-3">
              <div
                onClick={() => setIsAuthModalOpen(true)}
                className={`cursor-pointer p-3 rounded-2xl border transition flex items-center justify-between gap-2 ${
                  darkMode
                    ? 'bg-slate-800/80 border-slate-700 hover:border-rose-500/50'
                    : 'bg-gradient-to-r from-rose-50/80 to-amber-50/80 border-rose-200/70 hover:border-rose-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 to-amber-500 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                    {userProfile.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs truncate">{userProfile.name}</span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500">
                        <Flame className="w-3 h-3 fill-amber-500" />
                        {streakDays}d
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-500 font-semibold truncate">
                      {userProfile.targetTrack}
                    </p>
                  </div>
                </div>
                <LogIn className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="px-3 pb-3 md:px-4 md:space-y-1.5 flex md:flex-col overflow-x-auto gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : darkMode
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Học của tôi</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === 'library'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : darkMode
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <FolderKanban className="w-4 h-4 shrink-0" />
                  <span>Lộ trình học</span>
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === 'library'
                      ? 'bg-white/20 text-white'
                      : 'bg-indigo-500/10 text-indigo-500'
                  }`}
                >
                  {lessons.length} bài
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('review')}
                className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === 'review'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : darkMode
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>Ôn tập</span>
                </span>
                {counts.due > 0 && (
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                      activeTab === 'review'
                        ? 'bg-white text-rose-600'
                        : 'bg-rose-500/15 text-rose-500'
                    }`}
                  >
                    {counts.due}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('exams')}
                className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === 'exams'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : darkMode
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <ClipboardCheck className="w-4 h-4 shrink-0" />
                  <span>Luyện Đề HSK</span>
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === 'exams'
                      ? 'bg-white text-rose-600'
                      : 'bg-amber-500/15 text-amber-500'
                  }`}
                >
                  1+2
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('vocabulary')}
                className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === 'vocabulary'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : darkMode
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>Vocabulary</span>
                </span>
                <span
                  className={`text-xs ${
                    activeTab === 'vocabulary'
                      ? 'text-rose-100'
                      : darkMode
                      ? 'text-slate-500'
                      : 'text-slate-400'
                  }`}
                >
                  {words.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('quiz')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === 'quiz'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : darkMode
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Brain className="w-4 h-4 shrink-0" />
                <span>Luyện tập</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('progress')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === 'progress'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : darkMode
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span>Tiến độ</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === 'profile'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : darkMode
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>Hồ sơ & Quản trị</span>
              </button>

              {isAdminDrawerOpen && (
                <button
                  type="button"
                  onClick={() => setActiveTab('blueprint')}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === 'blueprint'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : darkMode
                      ? 'text-blue-400 hover:bg-slate-800'
                      : 'text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <Code2 className="w-4 h-4 shrink-0" />
                  <span>Step 1 & 2 Code</span>
                </button>
              )}
            </nav>
          </div>

          {/* Desktop Footer Controls */}
          <div
            className={`hidden md:flex flex-col gap-3 p-4 border-t ${
              darkMode ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <div
              className={`p-3 rounded-xl border ${
                darkMode
                  ? 'bg-slate-800/60 border-slate-700/80'
                  : 'bg-amber-50/80 border-amber-200/80'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-500 mb-1">
                <Flame className="w-4 h-4 fill-amber-500" />
                <span>Today&apos;s Study Progress</span>
              </div>
              <p
                className={`text-xs ${
                  darkMode ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                Reviewed <strong>{reviewsCompletedToday}</strong> cards
                {' · '}
                <strong>{counts.due}</strong> due in filter.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium border transition ${
                  darkMode
                    ? 'border-slate-700 bg-slate-800 text-amber-300 hover:bg-slate-700'
                    : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {darkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light Theme</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5" />
                    <span>Night Study</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  resetDemoData();
                  showToast('Hierarchical HSK seed data restored!');
                }}
                className={`p-2 rounded-xl border text-xs transition ${
                  darkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
                    : 'border-slate-200 bg-slate-100 text-slate-500 hover:text-slate-800'
                }`}
                title="Reset Hierarchical Seed Data"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Workspace */}
        <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
          {/* ================================================================
              TAB 1: DASHBOARD OVERVIEW (With Category & Level SRS Filters)
          ================================================================ */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* DUAL LEARNING PATHS — TODAY LEARNING PLAN & INDEPENDENT TRACK RESUME */}
              <div
                className={`p-6 rounded-2xl border ${
                  darkMode
                    ? 'bg-slate-900 border-blue-500/30'
                    : 'bg-white border-slate-200 shadow-sm'
                } space-y-5`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-500/15 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
                        Dual Learning Paths
                      </span>
                      <span className="text-xs font-semibold text-blue-600">
                        Tiến độ HSK & Giao tiếp lưu độc lập · Dùng chung 1 lịch SRS từ vựng chuẩn
                      </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mt-1.5">
                      Chào {userProfile.name}, chọn lộ trình để tiếp tục đúng bước đang học
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        openFocusLessonPlayer(
                          trackEnrollments[activeTrackId]?.currentLessonId || 'les-hsk1-1',
                          activeTrackId
                        )
                      }
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition min-h-[44px]"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>
                        Tiếp tục học ({activeTrackId === 'track-hsk' ? 'Lộ trình HSK' : 'Lộ trình Giao tiếp'})
                      </span>
                    </button>
                  </div>
                </div>

                {/* Two Independent Track Cards: HSK vs Giao tiếp */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DUAL_TRACKS_CONFIG.map((track) => {
                    const enrollment = trackEnrollments[track.id];
                    const curLessonId =
                      enrollment?.currentLessonId ||
                      (track.id === 'track-hsk' ? 'les-hsk1-1' : 'les-comm1-1');
                    const curLesson = lessonById.get(curLessonId);
                    const activities = LESSON_ACTIVITIES_CONFIG[curLessonId] || [];
                    const prog = lessonProgressMap[curLessonId];
                    const doneSteps = prog ? prog.completedActivityIds.length : 0;
                    const pct = Math.round((doneSteps / Math.max(1, activities.length)) * 100);
                    const curStepIdx = prog ? prog.currentStepIndex : 0;
                    const curStepTitle =
                      activities[Math.min(curStepIdx, activities.length - 1)]?.title ||
                      activities[0]?.title;
                    const isActive = activeTrackId === track.id;

                    return (
                      <div
                        key={track.id}
                        className={`p-5 rounded-2xl border transition flex flex-col justify-between gap-4 ${
                          isActive
                            ? 'border-blue-600 ring-2 ring-blue-600/15 ' +
                              (darkMode ? 'bg-slate-800/90' : 'bg-blue-50/30')
                            : darkMode
                            ? 'bg-slate-800/40 border-slate-800'
                            : 'bg-slate-50/70 border-slate-200/80'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                                track.id === 'track-hsk'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              {track.name}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">
                              {prog?.status === 'completed'
                                ? 'Đã hoàn thành'
                                : `Đang học · Bước ${curStepIdx + 1}/${activities.length}`}
                            </span>
                          </div>

                          <p className="text-xs text-slate-400">{track.description}</p>

                          <div
                            className={`p-3 rounded-xl border ${
                              darkMode
                                ? 'bg-slate-900 border-slate-700'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="text-xs font-bold text-blue-600">
                              Bài đang học: {curLesson?.title || 'Bài 1'}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              Bước tiếp theo: <strong>{curStepTitle}</strong>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-500/15 mt-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  track.id === 'track-hsk' ? 'bg-blue-600' : 'bg-emerald-600'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSwitchTrack(track.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold border min-h-[40px] ${
                              isActive
                                ? 'border-blue-600 text-blue-600 bg-blue-600/10'
                                : darkMode
                                ? 'border-slate-700 text-slate-300'
                                : 'border-slate-200 text-slate-700 bg-white'
                            }`}
                          >
                            {isActive ? '✓ Đang chọn lộ trình này' : 'Chuyển sang lộ trình này'}
                          </button>

                          <button
                            type="button"
                            onClick={() => openFocusLessonPlayer(curLessonId, track.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white min-h-[40px]"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Học tiếp ({pct}%)</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Top Action Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Bảng điều khiển học tập (SRS Dashboard)
                  </h2>
                  <p
                    className={`text-sm ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Tổng hợp từ cần ôn trên toàn bộ khóa học hoặc lọc riêng theo Danh mục & Cấp độ.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleQuickAddModal}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition ${
                      darkMode
                        ? 'border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-100'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
                    }`}
                  >
                    <Plus className="w-4 h-4 text-rose-500" />
                    <span>Thêm từ mới</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('review')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Ôn tập ngay ({counts.due})</span>
                  </button>
                </div>
              </div>

              {/* Daily Streak Check-In & Daily Level Proficiency Assessment Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left 5 cols: Daily Streak & 7-Day Flame Check-In (HelloChinese / Duolingo style) */}
                <div
                  className={`lg:col-span-5 p-5 rounded-3xl border flex flex-col justify-between gap-4 ${
                    darkMode
                      ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border-amber-500/30'
                      : 'bg-gradient-to-br from-white via-amber-50/40 to-rose-50/40 border-amber-200/80 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md">
                        <Flame className="w-6 h-6 fill-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-extrabold text-amber-500">
                            {streakDays} Ngày Streak
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500">
                            {dailyXp}/{dailyGoalXp} XP
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Duy trì học mỗi ngày để mở khóa đề trộn HSK nâng cao!
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAuthModalOpen(true)}
                      className="text-xs font-semibold text-indigo-500 hover:underline shrink-0"
                    >
                      Hồ sơ
                    </button>
                  </div>

                  {/* 7-Day Weekly Streak Strip */}
                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, idx) => {
                      const isDone = idx < 6 || checkedInToday;
                      const isToday = idx === 6;
                      return (
                        <div
                          key={d}
                          className={`py-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 ${
                            isDone
                              ? 'border-amber-500/40 bg-amber-500/15 text-amber-500'
                              : isToday
                              ? 'border-rose-500 border-dashed text-rose-500'
                              : darkMode
                              ? 'border-slate-800 bg-slate-800/50 text-slate-500'
                              : 'border-slate-200 bg-slate-50 text-slate-400'
                          }`}
                        >
                          <span>{d}</span>
                          <Flame
                            className={`w-3.5 h-3.5 ${
                              isDone ? 'fill-amber-500 text-amber-500' : 'opacity-30'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDailyCheckIn}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm ${
                        checkedInToday
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                          : 'bg-gradient-to-r from-amber-500 to-rose-600 text-white hover:opacity-95'
                      }`}
                    >
                      <Flame className="w-4 h-4 fill-current" />
                      <span>
                        {checkedInToday
                          ? 'Đã điểm danh Streak hôm nay (+30 XP)'
                          : 'Điểm danh Streak hôm nay (+30 XP)'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Right 7 cols: Daily Proficiency Evaluation & HSK Level Readiness */}
                <div
                  className={`lg:col-span-7 p-5 rounded-3xl border flex flex-col justify-between gap-3 ${
                    darkMode
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-200/80 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        <h3 className="font-bold text-sm md:text-base">
                          Đánh giá Trình độ Qua Từng Ngày (Daily HSK Readiness)
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400">
                        Theo dõi điểm năng lực tổng hợp dựa trên tỷ lệ nhớ từ SRS và kết quả làm đề HSK 1 + 2.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('exams')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 self-start sm:self-center"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      <span>Test trình độ hôm nay</span>
                    </button>
                  </div>

                  {/* Level Progress Bars */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {(() => {
                      const latest = dailyProficiencyHistory[dailyProficiencyHistory.length - 1];
                      const items = [
                        { label: 'Trình độ HSK 1', pct: latest.hsk1Ready, color: 'bg-emerald-500' },
                        { label: 'Trình độ HSK 2', pct: latest.hsk2Ready, color: 'bg-indigo-500' },
                        { label: 'Điểm Năng Lực Hôm Nay', pct: latest.score, color: 'bg-rose-500' }
                      ];
                      return items.map((it) => (
                        <div
                          key={it.label}
                          className={`p-3 rounded-2xl border ${
                            darkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200/70'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                            <span>{it.label}</span>
                            <span className="text-rose-500">{it.pct}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-500/15 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${it.color}`}
                              style={{ width: `${it.pct}%` }}
                            />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>

                  {/* 6-Day Daily Score Progression Strip */}
                  <div className="grid grid-cols-6 gap-2 pt-1">
                    {dailyProficiencyHistory.map((d, i) => (
                      <div
                        key={d.day}
                        className={`p-2 rounded-xl border text-center ${
                          i === dailyProficiencyHistory.length - 1
                            ? 'border-emerald-500/40 bg-emerald-500/10'
                            : darkMode
                            ? 'border-slate-800 bg-slate-800/30'
                            : 'border-slate-100 bg-slate-50'
                        }`}
                      >
                        <div className="text-[10px] text-slate-400">{d.day}</div>
                        <div className="text-xs font-extrabold text-emerald-500 mt-0.5">
                          {d.score}đ
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4-Skill Mastery & Smart Pinyin Mode Highlight Banner */}
              <div
                className={`p-4 rounded-2xl border bg-gradient-to-r ${
                  darkMode
                    ? 'from-rose-950/50 via-slate-900 to-indigo-950/50 border-rose-500/30'
                    : 'from-rose-50 via-amber-50/60 to-indigo-50 border-rose-200/80 shadow-sm'
                } flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-sm md:text-base">
                        Phương pháp Nhìn Mặt Chữ & Phản Xạ 4 Kỹ Năng (Nghe · Nói · Đọc · Viết)
                      </h3>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                        Smart Pinyin Active
                      </span>
                    </div>
                    <p
                      className={`text-xs mt-1 ${
                        darkMode ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      <strong>Quy tắc Pinyin thông minh:</strong> Pinyin chỉ hiện khi từ còn <em>Mới (New)</em>. Khi đã chuyển sang <em>Đang học / Đã thuộc</em> hoặc đọc Bài khóa ≥ 3 lần, Pinyin tự động ẩn để bạn nhìn Hán tự đọc & dịch trực tiếp và đóng vai hội thoại 2 chiều!
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => setSmartPinyinMode((v) => !v)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                      smartPinyinMode
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-300'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    {smartPinyinMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{smartPinyinMode ? 'Ẩn Pinyin khi đã thuộc: BẬT' : 'Luôn hiện Pinyin'}</span>
                  </button>
                </div>
              </div>

              {/* Hierarchical Filter Bar (Category -> Level -> Lesson) */}
              <div
                className={`p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
                  darkMode
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200/80 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-500">
                  <Filter className="w-4 h-4" />
                  <span>Lọc phạm vi ôn tập SRS:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Category Filter */}
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => {
                      setSelectedCategoryFilter(e.target.value);
                      setSelectedLevelFilter('all');
                      setSelectedLessonFilter('all');
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border outline-none ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="all">Tất cả Danh mục (All Categories)</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        Danh mục: {cat.name}
                      </option>
                    ))}
                  </select>

                  {/* Level Filter */}
                  <select
                    value={selectedLevelFilter}
                    onChange={(e) => {
                      setSelectedLevelFilter(e.target.value);
                      setSelectedLessonFilter('all');
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border outline-none ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="all">Tất cả Cấp độ (All Levels)</option>
                    {availableLevelsForFilter.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        Cấp độ: {lvl.name}
                      </option>
                    ))}
                  </select>

                  {(selectedCategoryFilter !== 'all' ||
                    selectedLevelFilter !== 'all' ||
                    selectedLessonFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryFilter('all');
                        setSelectedLevelFilter('all');
                        setSelectedLessonFilter('all');
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                    >
                      Xóa bộ lọc
                    </button>
                  )}
                </div>
              </div>

              {/* 4 KPI Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  className={`p-5 rounded-2xl border ${
                    darkMode
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-200/80 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-medium uppercase tracking-wider ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Total Words
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold">{counts.total}</div>
                  <p
                    className={`text-xs mt-1 ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Từ vựng trong bộ lọc hiện tại
                  </p>
                </div>

                <div
                  className={`p-5 rounded-2xl border ${
                    darkMode
                      ? 'bg-slate-900 border-rose-500/30'
                      : 'bg-rose-50/40 border-rose-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-rose-500">
                      Due Today
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-rose-500">{counts.due}</div>
                  <p
                    className={`text-xs mt-1 ${
                      darkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    Từ đến hạn cần ôn hôm nay
                  </p>
                </div>

                <div
                  className={`p-5 rounded-2xl border ${
                    darkMode
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-200/80 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-medium uppercase tracking-wider ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Learning
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold">{counts.learning}</div>
                  <p
                    className={`text-xs mt-1 ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Đang ghi nhớ ({counts.new} từ mới)
                  </p>
                </div>

                <div
                  className={`p-5 rounded-2xl border ${
                    darkMode
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-200/80 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-medium uppercase tracking-wider ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Graduated
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-emerald-500">
                    {counts.graduated}
                  </div>
                  <p
                    className={`text-xs mt-1 ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Đã thuộc lòng dài hạn
                  </p>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div
                  className={`lg:col-span-2 p-5 rounded-2xl border ${
                    darkMode
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-200/80 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-base">
                        Lịch ôn tập 7 ngày tới (7-Day Review Forecast)
                      </h3>
                      <p
                        className={`text-xs ${
                          darkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        Số lượng từ vựng đến hạn ôn tập theo thuật toán SRS
                      </p>
                    </div>
                  </div>
                  <div className="relative h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                      <BarChart
                        data={forecastData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={darkMode ? '#1e293b' : '#f1f5f9'}
                        />
                        <XAxis
                          dataKey="day"
                          tick={{
                            fill: darkMode ? '#94a3b8' : '#64748b',
                            fontSize: 12
                          }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{
                            fill: darkMode ? '#94a3b8' : '#64748b',
                            fontSize: 12
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                            borderColor: darkMode ? '#334155' : '#e2e8f0',
                            borderRadius: '0.75rem',
                            color: darkMode ? '#f8fafc' : '#0f172a'
                          }}
                        />
                        <Bar
                          dataKey="Due"
                          name="Words Due"
                          fill="#f43f5e"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Mastery Distribution Chart */}
                <div
                  className={`p-5 rounded-2xl border flex flex-col justify-between ${
                    darkMode
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-200/80 shadow-sm'
                  }`}
                >
                  <div>
                    <h3 className="font-semibold text-base">
                      Phân bổ mức độ thuộc từ
                    </h3>
                    <p
                      className={`text-xs ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Tỷ lệ New · Learning · Graduated
                    </p>
                  </div>

                  <div className="relative h-48 w-full my-2">
                    <ResponsiveContainer width="100%" height="100%" minHeight={192}>
                      <PieChart>
                        <Pie
                          data={masteryPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={72}
                          paddingAngle={4}
                        >
                          {masteryPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                            borderColor: darkMode ? '#334155' : '#e2e8f0',
                            borderRadius: '0.75rem'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2 text-xs">
                    {masteryPieData.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span
                            className={
                              darkMode ? 'text-slate-300' : 'text-slate-600'
                            }
                          >
                            {item.name}
                          </span>
                        </span>
                        <span className="font-semibold">{item.value} từ</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Words Due Today Quick Preview List */}
              <div
                className={`p-5 rounded-2xl border ${
                  darkMode
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200/80 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-base">
                      Từ vựng cần ôn tập ngay ({dueWords.length})
                    </h3>
                    <p
                      className={`text-xs ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Nhấn vào khóa học trong mục Library để học theo từng Bài học & Bài khóa
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('library')}
                    className="text-xs font-semibold text-rose-500 hover:underline flex items-center gap-1"
                  >
                    <span>Mở Khóa học (Library)</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {dueWords.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <p className="font-semibold text-sm">
                      Tuyệt vời! Bạn đã hoàn thành hết từ cần ôn trong phạm vi này.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dueWords.slice(0, 6).map((w) => {
                      const les = w.lessonId ? lessonById.get(w.lessonId) : undefined;
                      const lvl = w.levelId ? levelById.get(w.levelId) : undefined;
                      return (
                        <div
                          key={w.id}
                          className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                            darkMode
                              ? 'bg-slate-800/50 border-slate-700/80'
                              : 'bg-slate-50/70 border-slate-200/70'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="text-xl font-bold tracking-wide"
                                style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                              >
                                {w.hanzi}
                              </span>
                              {isPinyinVisibleForWord(w) ? (
                                <span className="text-xs font-medium text-rose-500">
                                  [{w.pinyin}]
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => togglePeekPinyin(w.id)}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition"
                                  title="Từ đang học/đã thuộc: Ẩn Pinyin để luyện nhìn mặt chữ"
                                >
                                  Nhìn mặt chữ · Xem Pinyin
                                </button>
                              )}
                            </div>
                            <p className="text-xs font-medium">{w.meaning}</p>
                            {(lvl || les) && (
                              <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500">
                                {lvl ? `${lvl.name} · ` : ''}
                                {les ? les.title : ''}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => speakChinese(w.hanzi)}
                            className={`p-2 rounded-lg transition ${
                              darkMode
                                ? 'hover:bg-slate-700 text-slate-300'
                                : 'hover:bg-slate-200 text-slate-600'
                            }`}
                            title="Nghe phát âm"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 2: LIBRARY / KHÓA HỌC (Categories -> Levels -> Lessons -> Detail)
          ================================================================ */}
          {activeTab === 'library' && (
            <div className="space-y-6">
              {/* Dual Learning Paths Switcher (HSK Track vs Giao Tiếp Track) */}
              <div
                className={`p-5 rounded-2xl border ${
                  darkMode
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200 shadow-sm'
                } flex flex-col lg:flex-row lg:items-center justify-between gap-4`}
              >
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Mô hình Dual Learning Paths (Chuyển đổi không mất tiến độ)
                  </span>
                  <h3 className="text-lg font-bold">
                    Chọn lộ trình học: Hệ thống HSK hoặc Phản xạ Giao tiếp
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleSwitchTrack('track-hsk');
                      setActiveCategoryId('cat-hsk');
                      setActiveLevelId('lvl-hsk1');
                      setActiveLessonId(null);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition min-h-[44px] ${
                      activeTrackId === 'track-hsk'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    1. Lộ trình HSK (HSK 1 → HSK 2)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleSwitchTrack('track-comm');
                      setActiveCategoryId('cat-comm');
                      setActiveLevelId('lvl-comm1');
                      setActiveLessonId(null);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition min-h-[44px] ${
                      activeTrackId === 'track-comm'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    2. Lộ trình Giao tiếp (Tình huống & Đóng vai)
                  </button>
                </div>
              </div>
              {/* Top Header & Interactive Breadcrumb */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Thư viện Khóa học (Course & Deck Library)
                  </h2>
                  <p
                    className={`text-sm ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Cấu trúc phân cấp: Danh mục (Category) → Cấp độ (Level) → Bài học (Lesson: Từ vựng & Bài khóa).
                  </p>
                </div>

                {/* Breadcrumb Navigation */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategoryId(null);
                      setActiveLevelId(null);
                      setActiveLessonId(null);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg transition ${
                      !activeCategoryId
                        ? 'bg-rose-600 text-white'
                        : darkMode
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    Danh mục
                  </button>

                  {activeCategory && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      <button
                        type="button"
                        onClick={() => {
                          setActiveLevelId(null);
                          setActiveLessonId(null);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg transition ${
                          activeCategoryId && !activeLevelId
                            ? 'bg-rose-600 text-white'
                            : darkMode
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {activeCategory.name}
                      </button>
                    </>
                  )}

                  {activeLevel && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      <button
                        type="button"
                        onClick={() => setActiveLessonId(null)}
                        className={`px-2.5 py-1.5 rounded-lg transition ${
                          activeLevelId && !activeLessonId
                            ? 'bg-rose-600 text-white'
                            : darkMode
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {activeLevel.name}
                      </button>
                    </>
                  )}

                  {activeLesson && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white">
                        {activeLesson.title}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* VIEW 1: CATEGORIES LIST (When no Category is selected, or top-level strip) */}
              {!activeLesson && (
                <div className="space-y-6">
                  {/* Categories Selection Cards */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      1. Chọn Danh mục Khóa học (Categories)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {categories.map((cat) => {
                        const isSelected = activeCategoryId === cat.id;
                        const catLevels = levels.filter((l) => l.categoryId === cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setActiveCategoryId(cat.id);
                              const firstLvl = catLevels[0];
                              setActiveLevelId(firstLvl ? firstLvl.id : null);
                              setActiveLessonId(null);
                            }}
                            className={`text-left p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                              isSelected
                                ? 'border-rose-500 ring-2 ring-rose-500/20 ' +
                                  (darkMode ? 'bg-slate-900' : 'bg-rose-50/30')
                                : darkMode
                                ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-rose-500/10 text-rose-500'
                                }`}
                              >
                                {renderCategoryIcon(cat.icon)}
                              </div>
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400">
                                {catLevels.length} cấp độ
                              </span>
                            </div>
                            <div>
                              <h4 className="font-bold text-base">{cat.name}</h4>
                              <p
                                className={`text-xs mt-1 leading-relaxed ${
                                  darkMode ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                {cat.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* VIEW 2: LEVELS WITHIN SELECTED CATEGORY */}
                  {activeCategory && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                        2. Cấp độ trong {activeCategory.name} (Course Levels)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryLevels.map((lvl) => {
                          const isSelected = activeLevelId === lvl.id;
                          const lvlLessons = lessons.filter((les) => les.levelId === lvl.id);
                          const lvlWords = words.filter(
                            (w) =>
                              w.levelId === lvl.id ||
                              lvlLessons.some((les) => les.id === w.lessonId)
                          );
                          const lvlDue = lvlWords.filter((w) => isDueForReview(w)).length;

                          return (
                            <div
                              key={lvl.id}
                              onClick={() => {
                                setActiveLevelId(lvl.id);
                                setActiveLessonId(null);
                              }}
                              className={`cursor-pointer p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                                isSelected
                                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 ' +
                                    (darkMode ? 'bg-slate-900' : 'bg-indigo-50/30')
                                  : darkMode
                                  ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-lg text-indigo-500">
                                    {lvl.name}
                                  </span>
                                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500">
                                    {lvlLessons.length} bài học
                                  </span>
                                </div>
                                <p
                                  className={`text-xs mt-1.5 ${
                                    darkMode ? 'text-slate-400' : 'text-slate-600'
                                  }`}
                                >
                                  {lvl.description}
                                </p>
                              </div>

                              <div className="flex items-center justify-between pt-3 border-t border-slate-500/10 text-xs">
                                <span>
                                  <strong>{lvlWords.length}</strong> từ vựng (
                                  <span className="text-rose-500 font-semibold">
                                    {lvlDue} cần ôn
                                  </span>
                                  )
                                </span>
                                <span className="text-indigo-500 font-semibold flex items-center gap-1">
                                  Xem bài học <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* VIEW 3: LESSONS WITHIN SELECTED LEVEL */}
                  {activeLevel && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          3. Danh sách Bài học trong {activeLevel.name} (Lessons)
                        </h3>
                        <button
                          type="button"
                          onClick={() => setIsAddLessonModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm Bài học</span>
                        </button>
                      </div>

                      {levelLessons.length === 0 ? (
                        <div
                          className={`p-8 rounded-2xl border text-center space-y-2 ${
                            darkMode
                              ? 'bg-slate-900 border-slate-800'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <p className="text-sm font-semibold">
                            Chưa có bài học nào trong cấp độ {activeLevel.name}
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsAddLessonModalOpen(true)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white"
                          >
                            Tạo bài học đầu tiên
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {levelLessons.map((les) => {
                            const lesWords = words.filter((w) => w.lessonId === les.id);
                            const lesReadings = readingTexts.filter(
                              (rt) => rt.lessonId === les.id
                            );
                            const lesDue = lesWords.filter((w) => isDueForReview(w)).length;

                            return (
                              <div
                                key={les.id}
                                className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition ${
                                  darkMode
                                    ? 'bg-slate-900 border-slate-800 hover:border-rose-500/40'
                                    : 'bg-white border-slate-200 hover:border-rose-300 shadow-sm'
                                }`}
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-bold text-base">{les.title}</h4>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500">
                                        {lesWords.length} từ vựng
                                      </span>
                                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                                        {lesReadings.length} bài khóa
                                      </span>
                                    </div>
                                  </div>
                                  <p
                                    className={`text-xs mt-1.5 ${
                                      darkMode ? 'text-slate-400' : 'text-slate-600'
                                    }`}
                                  >
                                    {les.description}
                                  </p>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-500/10">
                                  <span className="text-xs text-slate-400">
                                    Cần ôn hôm nay:{' '}
                                    <strong className="text-rose-500">{lesDue} từ</strong>
                                  </span>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleStudyLesson(les)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-500 hover:bg-rose-600 hover:text-white transition"
                                    >
                                      <Play className="w-3.5 h-3.5" />
                                      <span>Study this lesson</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openFocusLessonPlayer(les.id)}
                                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition"
                                    >
                                      <Play className="w-3.5 h-3.5" />
                                      <span>Học theo Bước (Lesson Player)</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveLessonId(les.id);
                                        setLessonDetailTab('vocab');
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-blue-600/30 text-blue-600 hover:bg-blue-600/10 transition"
                                    >
                                      <span>Chi tiết</span>
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ==============================================================
                  LESSON DETAIL SCREEN (Từ vựng + Bài khóa Tabs)
              ============================================================== */}
              {activeLesson && (
                <div className="space-y-6">
                  {/* Lesson Banner */}
                  <div
                    className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      darkMode
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveLessonId(null)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                            darkMode
                              ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                              : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Quay lại {activeLevel?.name || 'Cấp độ'}</span>
                        </button>
                        {activeCategory && activeLevel && (
                          <span className="text-xs font-semibold text-indigo-500">
                            {activeCategory.name} · {activeLevel.name}
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold">{activeLesson.title}</h3>
                      <p
                        className={`text-xs ${
                          darkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {activeLesson.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => openAddModal(activeLesson.id, activeLesson.levelId)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border ${
                          darkMode
                            ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Plus className="w-4 h-4 text-rose-500" />
                        <span>Thêm từ vào bài này</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStudyLesson(activeLesson)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition"
                      >
                        <Layers className="w-4 h-4" />
                        <span>Study this lesson ({activeLessonWords.length} từ)</span>
                      </button>
                    </div>
                  </div>

                  {/* Lesson Sub-Tabs: 1. Từ vựng (Vocabulary) | 2. Bài khóa (Reading Text) */}
                  <div className="flex items-center gap-2 border-b border-slate-500/15 pb-3">
                    <button
                      type="button"
                      onClick={() => setLessonDetailTab('vocab')}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                        lessonDetailTab === 'vocab'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : darkMode
                          ? 'bg-slate-900 text-slate-400 hover:text-slate-200'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>1. Từ vựng (Vocabulary · {activeLessonWords.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLessonDetailTab('reading')}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                        lessonDetailTab === 'reading'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : darkMode
                          ? 'bg-slate-900 text-slate-400 hover:text-slate-200'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>2. Bài khóa & Đóng vai ({activeLessonReadings.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLessonDetailTab('skills');
                        setSkillItemIndex(0);
                        setSkillFeedback(null);
                      }}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                        lessonDetailTab === 'skills'
                          ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-sm'
                          : darkMode
                          ? 'bg-slate-900 text-amber-400 hover:text-amber-300 border border-amber-500/30'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                      }`}
                    >
                      <Award className="w-4 h-4" />
                      <span>3. Luyện 4 Kỹ năng (Nghe · Nói · Đọc · Viết)</span>
                    </button>
                  </div>

                  {/* LESSON SUB-TAB 1: VOCABULARY LIST IN THIS LESSON */}
                  {lessonDetailTab === 'vocab' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeLessonWords.map((word) => {
                        const due = isDueForReview(word, now);
                        return (
                          <div
                            key={word.id}
                            className={`p-5 rounded-2xl border flex flex-col justify-between gap-3 ${
                              darkMode
                                ? 'bg-slate-900 border-slate-800'
                                : 'bg-white border-slate-200 shadow-sm'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-baseline gap-3">
                                  <span
                                    className="text-2xl font-bold"
                                    style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                                  >
                                    {word.hanzi}
                                  </span>
                                  {isPinyinVisibleForWord(word) ? (
                                    <span className="text-sm font-semibold text-rose-500">
                                      {word.pinyin}
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => togglePeekPinyin(word.id)}
                                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 transition"
                                    >
                                      Đã ẩn Pinyin (Chạm để xem)
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => speakChinese(word.hanzi)}
                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"
                                    title="Nghe phát âm"
                                  >
                                    <Volume2 className="w-4 h-4" />
                                  </button>
                                </div>

                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                                    word.status === 'graduated'
                                      ? 'bg-emerald-500/15 text-emerald-500'
                                      : word.status === 'learning'
                                      ? 'bg-amber-500/15 text-amber-500'
                                      : 'bg-indigo-500/15 text-indigo-500'
                                  }`}
                                >
                                  {word.status}
                                </span>
                              </div>

                              <p className="mt-2 font-semibold text-sm">{word.meaning}</p>

                              {word.example_sentence && (
                                <p
                                  className={`mt-2 text-xs p-2.5 rounded-xl ${
                                    darkMode
                                      ? 'bg-slate-800/70 text-slate-300'
                                      : 'bg-slate-50 text-slate-600'
                                  }`}
                                  style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                                >
                                  {word.example_sentence}
                                </p>
                              )}
                            </div>

                            <div className="pt-3 border-t border-slate-500/10 flex items-center justify-between text-xs text-slate-400">
                              <span className={due ? 'text-rose-500 font-semibold' : ''}>
                                Next: {formatRelativeReviewDate(word.next_review_date)} · Interval:{' '}
                                {word.interval}d
                              </span>
                              <button
                                type="button"
                                onClick={() => openEditModal(word)}
                                className="text-indigo-500 hover:underline font-medium flex items-center gap-1"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Sửa</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* LESSON SUB-TAB 2: READING TEXT (BÀI KHÓA) WITH PROGRESSIVE MASTERY & 2-WAY ROLE-PLAY */}
                  {lessonDetailTab === 'reading' && (
                    <div className="space-y-6">
                      {/* Controls Bar to Toggle Pinyin & Vietnamese Translation */}
                      <div
                        className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                          darkMode
                            ? 'bg-slate-900 border-slate-800'
                            : 'bg-white border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold uppercase tracking-wider text-rose-500">
                            Lộ trình làm chủ Bài khóa (Reading → Role-Play Mastery)
                          </div>
                          <p className="text-xs text-slate-400">
                            Lần 1–2: Đọc làm quen mặt chữ · Lần 3–4+: Tự động ẩn Pinyin & Giao tiếp đóng vai 2 chiều với App (Đổi vai A ↔ B).
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowReadingPinyin((v) => !v)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                              showReadingPinyin
                                ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                                : darkMode
                                ? 'border-slate-700 bg-slate-800 text-slate-400'
                                : 'border-slate-200 bg-slate-100 text-slate-600'
                            }`}
                          >
                            {showReadingPinyin ? (
                              <Eye className="w-3.5 h-3.5" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5" />
                            )}
                            <span>{showReadingPinyin ? 'Hiện Pinyin' : 'Đã ẩn Pinyin (Ưu tiên mặt chữ)'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowReadingMeaning((v) => !v)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                              showReadingMeaning
                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                                : darkMode
                                ? 'border-slate-700 bg-slate-800 text-slate-400'
                                : 'border-slate-200 bg-slate-100 text-slate-600'
                            }`}
                          >
                            {showReadingMeaning ? (
                              <Eye className="w-3.5 h-3.5" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {showReadingMeaning
                                ? 'Hiện Dịch nghĩa Tiếng Việt'
                                : 'Ẩn Dịch nghĩa (Tự dịch)'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {activeLessonReadings.map((rt) => {
                        const hanziLines = rt.content_hanzi.split('\n');
                        const pinyinLines = rt.content_pinyin.split('\n');
                        const meaningLines = rt.content_meaning.split('\n');
                        const readCount = readingCounts[rt.id] || 0;
                        const isRolePlayUnlocked = readCount >= 3;
                        const isRolePlayingThis = rolePlayActiveId === rt.id;
                        // Smart Pinyin for Reading: only show Pinyin if readCount < 3 AND user hasn't hidden it, OR if user explicitly toggled showReadingPinyin
                        const effectiveShowPinyin = showReadingPinyin && readCount < 3 ? true : showReadingPinyin;

                        return (
                          <div
                            key={rt.id}
                            className={`p-6 rounded-3xl border space-y-5 ${
                              darkMode
                                ? 'bg-slate-900 border-slate-800'
                                : 'bg-white border-slate-200 shadow-sm'
                            }`}
                          >
                            {/* Top Header + Read Count Tracker + Role-Play Launch */}
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-500/15 pb-4">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500">
                                    {readCount < 3
                                      ? `Giai đoạn 1: Đọc nhớ mặt chữ (${readCount}/3 lần)`
                                      : `Giai đoạn 2: Đã thuộc mặt chữ (${readCount} lần) · Sẵn sàng Hội thoại!`}
                                  </span>
                                  {readCount >= 3 && !showReadingPinyin && (
                                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                                      Đã tự động ẩn Pinyin
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-lg font-bold mt-1">{rt.title}</h4>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    speakChinese(rt.content_hanzi);
                                    handleCompleteReadingPass(rt);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition"
                                >
                                  <Volume2 className="w-4 h-4" />
                                  <span>Nghe & Đọc xong 1 lượt (+1)</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    isRolePlayingThis
                                      ? setRolePlayActiveId(null)
                                      : startRolePlaySession(rt, 'B')
                                  }
                                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition ${
                                    isRolePlayingThis
                                      ? 'bg-amber-500 text-white'
                                      : isRolePlayUnlocked
                                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-95'
                                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                  }`}
                                >
                                  <Users className="w-4 h-4" />
                                  <span>
                                    {isRolePlayingThis
                                      ? 'Đang mở Phòng Hội thoại 2 chiều'
                                      : `Giao tiếp Đóng vai A ↔ B ${isRolePlayUnlocked ? '(Đã mở khóa)' : '(Thử ngay)'}`}
                                  </span>
                                </button>
                              </div>
                            </div>

                            {/* INTERACTIVE 2-WAY ROLE-PLAY CONVERSATION STUDIO */}
                            {isRolePlayingThis && (
                              <div
                                className={`p-5 rounded-2xl border-2 space-y-4 ${
                                  darkMode
                                    ? 'bg-slate-950/90 border-emerald-500/40'
                                    : 'bg-emerald-50/40 border-emerald-300'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-500/15">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
                                        Phòng Giao tiếp Đóng vai 2 chiều
                                      </span>
                                      <span className="text-xs font-semibold text-emerald-500">
                                        App đóng vai {userRoleSpeaker === 'B' ? 'A' : 'B'} · Bạn đóng vai {userRoleSpeaker}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                      App sẽ đọc lời thoại của nhân vật {userRoleSpeaker === 'B' ? 'A' : 'B'}, sau đó đến lượt bạn trả lời trong vai {userRoleSpeaker}. Xong hội thoại hãy bấm Đổi vai!
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextRole = userRoleSpeaker === 'B' ? 'A' : 'B';
                                        startRolePlaySession(rt, nextRole);
                                        showToast(`Đã đổi vai! Hiện tại bạn đóng vai Nhân vật ${nextRole}.`);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
                                    >
                                      <Repeat className="w-3.5 h-3.5" />
                                      <span>Đổi vai trò (A ↔ B)</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Dialogue Turn-by-Turn Bubbles */}
                                <div className="space-y-3">
                                  {hanziLines.map((hLine, idx) => {
                                    const lineSpeaker: 'A' | 'B' = hLine.startsWith('B:') ? 'B' : 'A';
                                    const isUserTurn = lineSpeaker === userRoleSpeaker;
                                    const isCurrentTurn = idx === rolePlayTurnIndex;
                                    const isPastTurn = idx < rolePlayTurnIndex;
                                    const cleanHanzi = hLine.replace(/^[A-Z]:\s*/, '');

                                    return (
                                      <div
                                        key={idx}
                                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                          isCurrentTurn
                                            ? isUserTurn
                                              ? 'border-rose-500 ring-2 ring-rose-500/20 ' +
                                                (darkMode ? 'bg-rose-950/30' : 'bg-white shadow-md')
                                              : 'border-indigo-500 ring-2 ring-indigo-500/20 ' +
                                                (darkMode ? 'bg-indigo-950/30' : 'bg-white shadow-md')
                                            : isPastTurn
                                            ? darkMode
                                              ? 'bg-slate-900/60 border-slate-800 opacity-80'
                                              : 'bg-white/70 border-slate-200 opacity-80'
                                            : darkMode
                                            ? 'bg-slate-900/30 border-slate-800/60 opacity-50'
                                            : 'bg-slate-100/60 border-slate-200/60 opacity-50'
                                        }`}
                                      >
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <span
                                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                isUserTurn
                                                  ? 'bg-rose-600 text-white'
                                                  : 'bg-indigo-600 text-white'
                                              }`}
                                            >
                                              {isUserTurn
                                                ? `Vai của Bạn (${lineSpeaker})`
                                                : `Vai của App (${lineSpeaker})`}
                                            </span>
                                            {isCurrentTurn && (
                                              <span className="text-xs font-semibold text-amber-500 animate-pulse">
                                                {isUserTurn
                                                  ? '👉 Đến lượt bạn nhìn mặt chữ & nói trả lời!'
                                                  : '🔊 App đang nói với bạn...'}
                                              </span>
                                            )}
                                          </div>

                                          <p
                                            className="text-xl font-bold tracking-wide pt-1"
                                            style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                                          >
                                            {cleanHanzi}
                                          </p>

                                          {/* In Role-Play mode, Pinyin is hidden by default to train pure Hanzi speaking! */}
                                          {showReadingPinyin && pinyinLines[idx] && (
                                            <p className="text-xs font-medium text-rose-500">
                                              {pinyinLines[idx].replace(/^[A-Z]:\s*/, '')}
                                            </p>
                                          )}

                                          {meaningLines[idx] && (
                                            <p className="text-xs text-slate-400">
                                              Ý nghĩa: {meaningLines[idx].replace(/^[A-Z]:\s*/, '')}
                                            </p>
                                          )}
                                        </div>

                                        {/* Action Controls for Current Turn */}
                                        {isCurrentTurn && (
                                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                                            {!isUserTurn ? (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() => speakChinese(cleanHanzi)}
                                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-500/15 text-indigo-500 hover:bg-indigo-500/25"
                                                >
                                                  <Volume2 className="w-4 h-4" />
                                                  <span>Nghe lại App</span>
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    advanceRolePlayTurn(
                                                      rt,
                                                      idx + 1,
                                                      userRoleSpeaker
                                                    )
                                                  }
                                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
                                                >
                                                  <span>Đến lượt tôi trả lời</span>
                                                  <ArrowRight className="w-3.5 h-3.5" />
                                                </button>
                                              </>
                                            ) : (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    triggerSpeechPractice(cleanHanzi, () => {
                                                      advanceRolePlayTurn(
                                                        rt,
                                                        idx + 1,
                                                        userRoleSpeaker
                                                      );
                                                    })
                                                  }
                                                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                                                >
                                                  <Mic className="w-4 h-4" />
                                                  <span>
                                                    {isListeningMic
                                                      ? 'Đang thu âm...'
                                                      : 'Bấm Mic nói trả lời'}
                                                  </span>
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => speakChinese(cleanHanzi)}
                                                  className="p-2 rounded-xl border border-slate-500/20 text-slate-400 hover:text-rose-500"
                                                  title="Nghe gợi ý phát âm"
                                                >
                                                  <Volume2 className="w-4 h-4" />
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {rolePlayFeedback && (
                                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center justify-between">
                                    <span>🎙️ {rolePlayFeedback}</span>
                                  </div>
                                )}

                                {rolePlayTurnIndex >= hanziLines.length && (
                                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <div className="space-y-0.5 text-center sm:text-left">
                                      <p className="font-bold text-sm">
                                        🎉 Tuyệt vời! Bạn đã hoàn thành cuộc hội thoại trong vai {userRoleSpeaker}!
                                      </p>
                                      <p className="text-xs text-emerald-100">
                                        Hãy bấm Đổi vai trò để luyện phản xạ cả câu hỏi lẫn câu trả lời như 2 người đang trò chuyện thực tế.
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextRole = userRoleSpeaker === 'B' ? 'A' : 'B';
                                        startRolePlaySession(rt, nextRole);
                                      }}
                                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-emerald-700 hover:bg-emerald-50 shrink-0 shadow-sm"
                                    >
                                      🔄 Đổi sang vai {userRoleSpeaker === 'B' ? 'A' : 'B'} ngay
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Synchronized Line-by-Line Dialogue Reader */}
                            <div className="space-y-3">
                              {hanziLines.map((hLine, idx) => {
                                const lineKey = `${rt.id}-line-${idx}`;
                                const isLinePeeked = Boolean(peekPinyinIds[lineKey]);
                                const showLinePinyin = effectiveShowPinyin || isLinePeeked;

                                return (
                                  <div
                                    key={idx}
                                    className={`p-4 rounded-2xl border flex items-start justify-between gap-4 ${
                                      darkMode
                                        ? 'bg-slate-800/50 border-slate-800'
                                        : 'bg-slate-50/80 border-slate-200/70'
                                    }`}
                                  >
                                    <div className="space-y-1.5">
                                      <div className="flex flex-wrap items-center gap-2.5">
                                        <p
                                          className="text-xl font-bold tracking-wide"
                                          style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                                        >
                                          {hLine}
                                        </p>
                                        {!showLinePinyin && (
                                          <button
                                            type="button"
                                            onClick={() => togglePeekPinyin(lineKey)}
                                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                                          >
                                            Chạm xem Pinyin
                                          </button>
                                        )}
                                      </div>

                                      {showLinePinyin && pinyinLines[idx] && (
                                        <p className="text-sm font-medium text-rose-500">
                                          {pinyinLines[idx]}
                                        </p>
                                      )}
                                      {showReadingMeaning && meaningLines[idx] && (
                                        <p
                                          className={`text-sm ${
                                            darkMode ? 'text-emerald-400' : 'text-emerald-700'
                                          }`}
                                        >
                                          {meaningLines[idx]}
                                        </p>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          triggerSpeechPractice(hLine, () => {
                                            showToast('Phát âm câu hội thoại rất tốt!');
                                          })
                                        }
                                        className={`p-2 rounded-xl transition ${
                                          darkMode
                                            ? 'hover:bg-slate-700 text-amber-400'
                                            : 'hover:bg-amber-100 text-amber-600'
                                        }`}
                                        title="Nhại giọng câu này (Shadowing)"
                                      >
                                        <Mic className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          speakChinese(hLine.replace(/^[A-Z]:\s*/, ''))
                                        }
                                        className={`p-2 rounded-xl transition ${
                                          darkMode
                                            ? 'hover:bg-slate-700 text-slate-300'
                                            : 'hover:bg-slate-200 text-slate-600'
                                        }`}
                                        title="Nghe câu này"
                                      >
                                        <Volume2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* LESSON SUB-TAB 3: 4-SKILL MASTERY STUDIO (NGHE · NÓI · ĐỌC · VIẾT) */}
                  {lessonDetailTab === 'skills' && (
                    <div className="space-y-6">
                      {/* Top Skill & Target Source Selector */}
                      <div
                        className={`p-5 rounded-3xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                          darkMode
                            ? 'bg-slate-900 border-slate-800'
                            : 'bg-white border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {(
                            [
                              { id: 'listen', label: '1. Kỹ năng Nghe', icon: Headphones },
                              { id: 'speak', label: '2. Kỹ năng Nói', icon: Mic },
                              { id: 'read', label: '3. Kỹ năng Đọc (Mặt chữ)', icon: BookOpen },
                              { id: 'write', label: '4. Kỹ năng Viết (Nét chữ)', icon: PenTool }
                            ] as const
                          ).map((sk) => {
                            const IconComp = sk.icon;
                            return (
                              <button
                                key={sk.id}
                                type="button"
                                onClick={() => {
                                  setActiveSkill(sk.id);
                                  setSkillFeedback(null);
                                }}
                                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                                  activeSkill === sk.id
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : darkMode
                                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <IconComp className="w-4 h-4" />
                                <span>{sk.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Apply to Vocabulary vs Reading Text */}
                        <div className="flex items-center gap-2 self-start lg:self-center">
                          <span className="text-xs font-semibold text-slate-400">Áp dụng cho:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSkillSource('vocab');
                              setSkillItemIndex(0);
                              setSkillFeedback(null);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                              skillSource === 'vocab'
                                ? 'bg-indigo-600 text-white'
                                : darkMode
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            Từ vựng ({activeLessonWords.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSkillSource('reading');
                              setSkillItemIndex(0);
                              setSkillFeedback(null);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                              skillSource === 'reading'
                                ? 'bg-indigo-600 text-white'
                                : darkMode
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            Bài khóa ({activeLessonReadings.length})
                          </button>
                        </div>
                      </div>

                      {/* 4-Skill Interactive Practice Card */}
                      {(() => {
                        const readingItems = activeLessonReadings.flatMap((rt) => {
                          const hLines = rt.content_hanzi.split('\n');
                          const pLines = rt.content_pinyin.split('\n');
                          const mLines = rt.content_meaning.split('\n');
                          return hLines.map((h, i) => ({
                            id: `${rt.id}-${i}`,
                            hanzi: h.replace(/^[A-Z]:\s*/, ''),
                            pinyin: (pLines[i] || '').replace(/^[A-Z]:\s*/, ''),
                            meaning: (mLines[i] || '').replace(/^[A-Z]:\s*/, ''),
                            status: 'learning' as VocabStatus
                          }));
                        });

                        const pool =
                          skillSource === 'vocab'
                            ? activeLessonWords
                            : readingItems.length > 0
                            ? readingItems
                            : activeLessonWords;

                        const currentItem = pool[skillItemIndex % Math.max(1, pool.length)];
                        if (!currentItem) return null;

                        return (
                          <div
                            className={`p-6 md:p-8 rounded-3xl border space-y-6 ${
                              darkMode
                                ? 'bg-slate-900 border-slate-800'
                                : 'bg-white border-slate-200 shadow-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                              <span>
                                Mục {(skillItemIndex % pool.length) + 1} / {pool.length} ({skillSource === 'vocab' ? 'Từ vựng' : 'Câu Bài khóa'})
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSkillItemIndex((i) => (i + 1) % pool.length);
                                    setSkillFeedback(null);
                                    clearWritingCanvas();
                                  }}
                                  className="px-3 py-1 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                                >
                                  Câu tiếp theo →
                                </button>
                              </div>
                            </div>

                            {/* SKILL 1: NGHE (LISTENING) */}
                            {activeSkill === 'listen' && (
                              <div className="text-center space-y-5 py-4">
                                <div className="w-20 h-20 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                                  <Headphones className="w-10 h-10" />
                                </div>
                                <h4 className="text-lg font-bold">
                                  Luyện Nghe Phản Xạ (Không nhìn Pinyin)
                                </h4>
                                <p className="text-xs text-slate-400 max-w-md mx-auto">
                                  Bấm nút loa bên dưới để nghe phát âm tiếng Trung, sau đó tự nhẩm mặt chữ Hán và nghĩa Tiếng Việt trước khi kiểm tra.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => speakChinese(currentItem.hanzi)}
                                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-md"
                                >
                                  <Volume2 className="w-5 h-5" />
                                  <span>Phát âm thanh (Nghe câu này)</span>
                                </button>

                                {skillFeedback ? (
                                  <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-2 max-w-lg mx-auto">
                                    <p
                                      className="text-3xl font-bold"
                                      style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                                    >
                                      {currentItem.hanzi}
                                    </p>
                                    <p className="text-base font-bold text-emerald-500">
                                      Nghĩa: {currentItem.meaning}
                                    </p>
                                    {currentItem.status === 'new' && (
                                      <p className="text-xs text-rose-400">
                                        Pinyin (Từ mới): {currentItem.pinyin}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSkillFeedback('Đã mở đáp án mặt chữ Hán & Nghĩa!')
                                      }
                                      className="px-5 py-2.5 rounded-xl text-xs font-semibold border border-slate-500/30 hover:bg-slate-500/10"
                                    >
                                      Hiện mặt chữ Hán & Nghĩa để đối chiếu
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* SKILL 2: NÓI (SPEAKING) */}
                            {activeSkill === 'speak' && (
                              <div className="text-center space-y-5 py-4">
                                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/10 text-amber-500">
                                  Nhìn mặt chữ Hán & Phát âm chuẩn (Đã ẩn Pinyin)
                                </span>
                                <div
                                  className="text-5xl font-bold py-2"
                                  style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                                >
                                  {currentItem.hanzi}
                                </div>
                                <p className="text-sm font-medium text-slate-400">
                                  Nghĩa: {currentItem.meaning}
                                </p>

                                <div className="flex flex-wrap items-center justify-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => speakChinese(currentItem.hanzi)}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-500/20 hover:bg-slate-500/10"
                                  >
                                    <Volume2 className="w-4 h-4 text-rose-500" />
                                    <span>Nghe giọng mẫu</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => triggerSpeechPractice(currentItem.hanzi)}
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-md"
                                  >
                                    <Mic className="w-4 h-4" />
                                    <span>
                                      {isListeningMic ? 'Đang nghe bạn nói...' : 'Bấm Mic để Nói'}
                                    </span>
                                  </button>
                                </div>

                                {skillFeedback && (
                                  <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-bold max-w-md mx-auto">
                                    🎙️ {skillFeedback}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* SKILL 3: ĐỌC MẶT CHỮ (HANZI-FIRST READING WITHOUT PINYIN) */}
                            {activeSkill === 'read' && (
                              <div className="text-center space-y-5 py-4">
                                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500">
                                  Thử thách Nhìn Mặt Chữ Đọc & Dịch (Không Pinyin)
                                </span>
                                <div
                                  className="text-5xl md:text-6xl font-bold py-3"
                                  style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                                >
                                  {currentItem.hanzi}
                                </div>

                                {skillFeedback ? (
                                  <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-2 max-w-lg mx-auto">
                                    <p className="text-lg font-bold text-emerald-500">
                                      Nghĩa Tiếng Việt: {currentItem.meaning}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      Phiên âm kiểm tra: {currentItem.pinyin}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        speakChinese(currentItem.hanzi);
                                        setSkillItemIndex((i) => (i + 1) % pool.length);
                                        setSkillFeedback(null);
                                      }}
                                      className="mt-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white"
                                    >
                                      Đã đọc & dịch đúng → Qua từ tiếp theo
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <p className="text-xs text-slate-400">
                                      Hãy tự đọc to mặt chữ Hán trên và dịch nghĩa trước khi bấm kiểm tra:
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        speakChinese(currentItem.hanzi);
                                        setSkillFeedback('shown');
                                      }}
                                      className="px-6 py-3 rounded-2xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                    >
                                      Kiểm tra Phát âm & Dịch nghĩa
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* SKILL 4: VIẾT HÁN TỰ (HANZI STROKE CANVAS PAD) */}
                            {activeSkill === 'write' && (
                              <div className="space-y-5">
                                <div className="text-center space-y-1">
                                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500">
                                    Bảng Tập Viết Chữ Hán Điền Tự Cách (TianZiGe Canvas)
                                  </span>
                                  <h4 className="text-base font-bold pt-1">
                                    Hãy viết chữ Hán cho nghĩa: &quot;{currentItem.meaning}&quot;
                                  </h4>
                                  {writeGuideVisible && (
                                    <p
                                      className="text-2xl font-bold text-rose-500"
                                      style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                                    >
                                      Mẫu: {currentItem.hanzi}
                                    </p>
                                  )}
                                </div>

                                <div className="flex flex-col items-center justify-center gap-3">
                                  <div className="relative w-[260px] h-[260px] rounded-2xl border-2 border-rose-500/40 bg-slate-950/5 overflow-hidden select-none">
                                    {/* TianZiGe Grid Lines */}
                                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                      <div className="w-full border-t border-dashed border-rose-500/25" />
                                    </div>
                                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                      <div className="h-full border-l border-dashed border-rose-500/25" />
                                    </div>
                                    {/* Watermark Guide Character */}
                                    {writeGuideVisible && (
                                      <div
                                        className="absolute inset-0 pointer-events-none flex items-center justify-center text-8xl font-bold opacity-15 select-none"
                                        style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                                      >
                                        {currentItem.hanzi.slice(0, 2)}
                                      </div>
                                    )}
                                    <canvas
                                      ref={canvasRef}
                                      width={260}
                                      height={260}
                                      onMouseDown={startCanvasDraw}
                                      onMouseMove={moveCanvasDraw}
                                      onMouseUp={endCanvasDraw}
                                      onMouseLeave={endCanvasDraw}
                                      onTouchStart={startCanvasDraw}
                                      onTouchMove={moveCanvasDraw}
                                      onTouchEnd={endCanvasDraw}
                                      className="relative z-10 cursor-crosshair touch-none"
                                    />
                                  </div>

                                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                                    <span className="text-slate-400 mr-2">
                                      Số nét đã viết: <strong>{strokeCount}</strong>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setWriteGuideVisible((v) => !v)}
                                      className="px-3 py-1.5 rounded-xl border border-slate-500/20 font-semibold"
                                    >
                                      {writeGuideVisible ? 'Ẩn chữ mẫu (Tự nhớ)' : 'Hiện chữ mẫu mờ'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={clearWritingCanvas}
                                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 font-semibold"
                                    >
                                      Xóa viết lại
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        speakChinese(currentItem.hanzi);
                                        showToast(`Hoàn thành luyện viết chữ "${currentItem.hanzi}"!`);
                                      }}
                                      className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold"
                                    >
                                      Hoàn thành chữ này
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              TAB 3: VOCABULARY MANAGEMENT (CRUD + Bulk Import/Export)
          ================================================================ */}
          {activeTab === 'vocabulary' && (
            <div className="space-y-5">
              {/* Header & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Quản lý Từ vựng (Vocabulary CRUD)
                  </h2>
                  <p
                    className={`text-sm ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Tìm kiếm theo Hán tự, Pinyin (có dấu hoặc không dấu), nghĩa Tiếng Việt và Bài học.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setImportExportMode('import');
                      setIsImportExportOpen(true);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                      darkMode
                        ? 'border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Import CSV/JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setImportExportMode('export');
                      setIsImportExportOpen(true);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                      darkMode
                        ? 'border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Export CSV/JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickAddModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm từ mới</span>
                  </button>
                </div>
              </div>

              {/* Search & Status Filter Bar */}
              <div
                className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between ${
                  darkMode
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200/80 shadow-sm'
                }`}
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm Hán tự (你好, 学习), Pinyin (ni hao / xué xí), hoặc nghĩa tiếng Việt..."
                    className={`w-full pl-10 pr-8 py-2 rounded-xl text-sm border outline-none transition ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-rose-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-500 focus:bg-white'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
                  {(
                    [
                      { id: 'all', label: `Tất cả (${counts.total})` },
                      { id: 'due', label: `Cần ôn (${counts.due})` },
                      { id: 'new', label: `New (${counts.new})` },
                      { id: 'learning', label: `Learning (${counts.learning})` },
                      { id: 'graduated', label: `Graduated (${counts.graduated})` }
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                        statusFilter === tab.id
                          ? 'bg-rose-600 text-white'
                          : darkMode
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vocabulary Cards List */}
              {filteredWords.length === 0 ? (
                <div
                  className={`p-12 rounded-2xl border text-center space-y-3 ${
                    darkMode
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="font-semibold">Không tìm thấy từ vựng phù hợp</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredWords.map((word) => {
                    const due = isDueForReview(word, now);
                    const les = word.lessonId ? lessonById.get(word.lessonId) : undefined;
                    const lvl = word.levelId ? levelById.get(word.levelId) : undefined;

                    return (
                      <div
                        key={word.id}
                        className={`p-5 rounded-2xl border flex flex-col justify-between gap-3 transition ${
                          darkMode
                            ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                            : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-sm'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-baseline gap-3 flex-wrap">
                              <span
                                className="text-2xl font-bold tracking-wide"
                                style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                              >
                                {word.hanzi}
                              </span>
                              {isPinyinVisibleForWord(word) ? (
                                <span className="text-sm font-semibold text-rose-500">
                                  {word.pinyin}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => togglePeekPinyin(word.id)}
                                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 transition"
                                >
                                  Đã ẩn Pinyin · Chạm xem
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => speakChinese(word.hanzi)}
                                className={`p-1.5 rounded-lg transition ${
                                  darkMode
                                    ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                                    : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                                }`}
                                title="Phát âm Hán tự"
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                            </div>

                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                                word.status === 'graduated'
                                  ? 'bg-emerald-500/15 text-emerald-500'
                                  : word.status === 'learning'
                                  ? 'bg-amber-500/15 text-amber-500'
                                  : 'bg-indigo-500/15 text-indigo-500'
                              }`}
                            >
                              {word.status}
                            </span>
                          </div>

                          <p className="mt-2 font-semibold text-sm">{word.meaning}</p>

                          {(lvl || les) && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              {lvl && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500">
                                  {lvl.name}
                                </span>
                              )}
                              {les && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-500/10 text-slate-400">
                                  {les.title}
                                </span>
                              )}
                            </div>
                          )}

                          {word.example_sentence && (
                            <p
                              className={`mt-2 text-xs leading-relaxed p-2.5 rounded-xl ${
                                darkMode
                                  ? 'bg-slate-800/70 text-slate-300'
                                  : 'bg-slate-50 text-slate-600'
                              }`}
                              style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                            >
                              {word.example_sentence}
                            </p>
                          )}
                        </div>

                        <div
                          className={`pt-3 border-t flex items-center justify-between text-xs ${
                            darkMode
                              ? 'border-slate-800 text-slate-400'
                              : 'border-slate-100 text-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={
                                due ? 'text-rose-500 font-semibold' : undefined
                              }
                            >
                              Next: {formatRelativeReviewDate(word.next_review_date)}
                            </span>
                            <span>·</span>
                            <span>Interval: {word.interval}d</span>
                          </div>

                          {deletingId === word.id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-rose-500 font-semibold">Xóa?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  deleteWord(word.id);
                                  setDeletingId(null);
                                  showToast(`Deleted "${word.hanzi}"`);
                                }}
                                className="px-2 py-1 rounded bg-rose-600 text-white font-medium"
                              >
                                Có
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingId(null)}
                                className={`px-2 py-1 rounded ${
                                  darkMode ? 'bg-slate-800' : 'bg-slate-200'
                                }`}
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(word)}
                                className={`p-1.5 rounded-lg transition ${
                                  darkMode
                                    ? 'hover:bg-slate-800 text-slate-300'
                                    : 'hover:bg-slate-100 text-slate-600'
                                }`}
                                title="Chỉnh sửa"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingId(word.id)}
                                className={`p-1.5 rounded-lg transition ${
                                  darkMode
                                    ? 'hover:bg-rose-950/60 text-rose-400'
                                    : 'hover:bg-rose-50 text-rose-500'
                                }`}
                                title="Xóa từ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              TAB 4: FLASHCARD / SRS REVIEW MODE (With Course/Lesson Filter)
          ================================================================ */}
          {activeTab === 'review' && (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Top Mode Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Flashcard Spaced Repetition
                  </h2>
                  <p
                    className={`text-sm ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Nhấn vào thẻ để lật xem Pinyin, nghĩa Tiếng Việt và ví dụ.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl border bg-slate-500/5 border-slate-500/15 self-start">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewScope('due');
                      setCurrentCardIndex(0);
                      setIsCardFlipped(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      reviewScope === 'due'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : darkMode
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Cần ôn hôm nay ({dueWords.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReviewScope('all');
                      setCurrentCardIndex(0);
                      setIsCardFlipped(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      reviewScope === 'all'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : darkMode
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Ôn toàn bộ ({hierarchyFilteredWords.length})
                  </button>
                </div>
              </div>

              {/* Quizlet-Style Study Mode Bar (Thẻ ghi nhớ 3D · Ghép thẻ Match · Star · Shuffle) */}
              <div
                className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                  darkMode
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuizletSubMode('cards')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                      quizletSubMode === 'cards'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : darkMode
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Thẻ ghi nhớ (Quizlet Cards)</span>
                  </button>

                  <button
                    type="button"
                    onClick={initQuizletMatchGame}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                      quizletSubMode === 'match'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : darkMode
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ghép thẻ (Quizlet Match)</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOnlyStarredFilter((v) => !v);
                      setCurrentCardIndex(0);
                    }}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      onlyStarredFilter
                        ? 'border-amber-500 bg-amber-500/15 text-amber-500'
                        : darkMode
                        ? 'border-slate-700 bg-slate-800 text-slate-300'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${onlyStarredFilter ? 'fill-amber-500' : ''}`} />
                    <span>Thẻ gắn sao ({Object.values(starredWordIds).filter(Boolean).length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsShuffledDeck((v) => !v);
                      setCurrentCardIndex(0);
                      showToast(isShuffledDeck ? 'Đã tắt trộn thẻ' : 'Đã trộn ngẫu nhiên bộ thẻ (Shuffle)!');
                    }}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      isShuffledDeck
                        ? 'border-rose-500 bg-rose-500/15 text-rose-500'
                        : darkMode
                        ? 'border-slate-700 bg-slate-800 text-slate-300'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Shuffle</span>
                  </button>
                </div>
              </div>

              {/* QUIZLET MATCH MINI-GAME BOARD */}
              {quizletSubMode === 'match' && (
                <div
                  className={`p-6 rounded-3xl border space-y-5 ${
                    darkMode
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-500" />
                        <span>Trò chơi Ghép Thẻ Nhanh (Quizlet Match)</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Chọn 1 ô Mặt chữ Hán tự và ghép với ô Nghĩa Tiếng Việt tương ứng (Không dùng Pinyin!).
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <span className="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                        Lượt ghép: {matchMoves}
                      </span>
                      {matchBestMoves !== null && (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                          Kỷ lục: {matchBestMoves} lượt
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={initQuizletMatchGame}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700"
                      >
                        Chơi ván mới
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {matchTiles.map((tile) => {
                      const isSelected = selectedMatchTileId === tile.tileId;
                      if (tile.matched) {
                        return (
                          <div
                            key={tile.tileId}
                            className="h-24 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center text-xs font-bold text-emerald-500"
                          >
                            ✓ Đã ghép
                          </div>
                        );
                      }
                      return (
                        <button
                          key={tile.tileId}
                          type="button"
                          onClick={() => handleClickMatchTile(tile.tileId)}
                          className={`h-24 p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                            isSelected
                              ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-500/10 text-rose-500 scale-[1.02]'
                              : darkMode
                              ? 'bg-slate-800/80 border-slate-700 hover:border-indigo-500 text-slate-100'
                              : 'bg-slate-50 border-slate-200 hover:border-indigo-400 text-slate-800 shadow-sm'
                          }`}
                        >
                          <span
                            className={
                              tile.kind === 'hanzi'
                                ? 'text-2xl font-bold'
                                : 'text-xs font-semibold line-clamp-2'
                            }
                            style={
                              tile.kind === 'hanzi'
                                ? { fontFamily: "'Noto Sans SC', sans-serif" }
                                : undefined
                            }
                          >
                            {tile.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Filter Selector Strip for Review Mode */}
              <div
                className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-2 ${
                  darkMode
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => {
                      setSelectedCategoryFilter(e.target.value);
                      setSelectedLevelFilter('all');
                      setSelectedLessonFilter('all');
                      setCurrentCardIndex(0);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border outline-none ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-200'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <option value="all">Tất cả Danh mục</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedLevelFilter}
                    onChange={(e) => {
                      setSelectedLevelFilter(e.target.value);
                      setSelectedLessonFilter('all');
                      setCurrentCardIndex(0);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border outline-none ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-200'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <option value="all">Tất cả Cấp độ</option>
                    {availableLevelsForFilter.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedLessonFilter}
                    onChange={(e) => {
                      setSelectedLessonFilter(e.target.value);
                      setCurrentCardIndex(0);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border outline-none ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-200'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <option value="all">Tất cả Bài học</option>
                    {lessons.map((les) => (
                      <option key={les.id} value={les.id}>
                        {les.title}
                      </option>
                    ))}
                  </select>
                </div>

                {(selectedCategoryFilter !== 'all' ||
                  selectedLevelFilter !== 'all' ||
                  selectedLessonFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryFilter('all');
                      setSelectedLevelFilter('all');
                      setSelectedLessonFilter('all');
                      setCurrentCardIndex(0);
                    }}
                    className="text-xs font-semibold text-rose-500 hover:underline"
                  >
                    Đặt lại tất cả khóa học
                  </button>
                )}
              </div>

              {/* Flashcard Container */}
              {!activeFlashcard ? (
                <div
                  className={`p-10 rounded-3xl border text-center space-y-4 ${
                    darkMode
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold">
                    Hoàn thành xuất sắc phiên ôn tập hôm nay!
                  </h3>
                  <p
                    className={`text-sm max-w-md mx-auto ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Bạn đã ôn xong tất cả các thẻ đến hạn. Đánh giá trong phiên này:{' '}
                    <strong>{sessionReviewedCount}</strong> lượt (Easy: {sessionRatings.easy}, Good:{' '}
                    {sessionRatings.good}, Hard: {sessionRatings.hard}, Again:{' '}
                    {sessionRatings.again}).
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReviewScope('all');
                        setCurrentCardIndex(0);
                        setIsCardFlipped(false);
                      }}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white transition"
                    >
                      Luyện tập toàn bộ ({hierarchyFilteredWords.length} từ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('quiz')}
                      className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition ${
                        darkMode
                          ? 'border-slate-700 bg-slate-800 hover:bg-slate-700'
                          : 'border-slate-200 bg-slate-100 hover:bg-slate-200'
                      }`}
                    >
                      Chuyển sang Quiz Mode
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-400 px-1">
                    <span>
                      Card {reviewScope === 'all' ? currentCardIndex + 1 : 1} of{' '}
                      {reviewQueue.length} remaining
                    </span>
                    <span className="uppercase tracking-wider">
                      Status: <strong className="text-rose-500">{activeFlashcard.status}</strong> · Interval: {activeFlashcard.interval}d
                    </span>
                  </div>

                  {/* Interactive Flip Card */}
                  <div
                    onClick={() => setIsCardFlipped((f) => !f)}
                    className={`cursor-pointer select-none rounded-3xl border p-8 md:p-12 min-h-[340px] flex flex-col justify-between transition-all duration-300 ${
                      darkMode
                        ? 'bg-slate-900 border-slate-800 hover:border-rose-500/40 shadow-lg'
                        : 'bg-white border-slate-200 hover:border-rose-300 shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          isCardFlipped
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-slate-500/10 text-slate-400'
                        }`}
                      >
                        {isCardFlipped ? 'Mặt sau (Đáp án)' : 'Mặt trước (Hán tự)'}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStarWord(activeFlashcard.id);
                          }}
                          className={`p-2.5 rounded-xl border transition ${
                            starredWordIds[activeFlashcard.id]
                              ? 'border-amber-500 bg-amber-500/15 text-amber-500'
                              : darkMode
                              ? 'border-slate-700 bg-slate-800 text-slate-400'
                              : 'border-slate-200 bg-slate-50 text-slate-400'
                          }`}
                          title="Đánh dấu sao từ khó (Quizlet Star)"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              starredWordIds[activeFlashcard.id] ? 'fill-amber-500' : ''
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakChinese(activeFlashcard.hanzi);
                          }}
                        className={`p-2.5 rounded-xl border transition ${
                          darkMode
                            ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                        title="Nghe phát âm"
                      >
                        <Volume2 className="w-5 h-5 text-rose-500" />
                        </button>
                      </div>
                    </div>

                    <div className="my-8 text-center space-y-4">
                      <div
                        className="text-6xl md:text-7xl font-bold tracking-wider py-2"
                        style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                      >
                        {activeFlashcard.hanzi}
                      </div>

                      {isCardFlipped ? (
                        <div className="space-y-4 pt-4 border-t border-slate-500/15 animate-fadeIn">
                          <div className="text-2xl font-semibold text-rose-500">
                            {activeFlashcard.pinyin}
                          </div>
                          <div className="text-xl font-bold">
                            {activeFlashcard.meaning}
                          </div>
                          {activeFlashcard.example_sentence && (
                            <div
                              className={`max-w-lg mx-auto p-3.5 rounded-2xl text-sm leading-relaxed ${
                                darkMode
                                  ? 'bg-slate-800/80 text-slate-300'
                                  : 'bg-slate-50 text-slate-600'
                              }`}
                              style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                            >
                              {activeFlashcard.example_sentence}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="pt-4 space-y-2">
                          {activeFlashcard.status === 'new' ? (
                            <p className="text-lg font-semibold text-rose-500">
                              Gợi ý Pinyin (Từ mới): {activeFlashcard.pinyin}
                            </p>
                          ) : (
                            <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/10 text-amber-500">
                              Chế độ Nhìn Mặt Chữ: Đã ẩn Pinyin — Hãy tự đọc & dịch nghĩa trước khi lật!
                            </span>
                          )}
                          <p
                            className={`text-xs ${
                              darkMode ? 'text-slate-500' : 'text-slate-400'
                            }`}
                          >
                            Nhấn vào thẻ để đối chiếu nghĩa Tiếng Việt & câu ví dụ
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="text-center text-xs text-slate-400">
                      {isCardFlipped
                        ? 'Hãy chọn mức độ nhớ bên dưới để thuật toán SRS tính ngày ôn tiếp theo'
                        : 'Click card to flip'}
                    </div>
                  </div>

                  {!isCardFlipped ? (
                    <button
                      type="button"
                      onClick={() => setIsCardFlipped(true)}
                      className="w-full py-4 rounded-2xl font-semibold text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition"
                    >
                      Lật thẻ xem đáp án (Show Answer)
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(
                        [
                          {
                            rating: 'again',
                            label: 'Again (Quên)',
                            color:
                              'bg-rose-500/15 border-rose-500/30 text-rose-500 hover:bg-rose-600 hover:text-white'
                          },
                          {
                            rating: 'hard',
                            label: 'Hard (Khó)',
                            color:
                              'bg-amber-500/15 border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-white'
                          },
                          {
                            rating: 'good',
                            label: 'Good (Tốt)',
                            color:
                              'bg-emerald-500/15 border-emerald-500/30 text-emerald-500 hover:bg-emerald-600 hover:text-white'
                          },
                          {
                            rating: 'easy',
                            label: 'Easy (Dễ)',
                            color:
                              'bg-indigo-500/15 border-indigo-500/30 text-indigo-500 hover:bg-indigo-600 hover:text-white'
                          }
                        ] as const
                      ).map((btn) => {
                        const intervals = previewRatingIntervals(activeFlashcard);
                        return (
                          <button
                            key={btn.rating}
                            type="button"
                            onClick={() => handleRateFlashcard(btn.rating)}
                            className={`p-3.5 rounded-2xl border font-semibold transition flex flex-col items-center justify-center gap-1 ${btn.color}`}
                          >
                            <span className="text-sm">{btn.label}</span>
                            <span className="text-xs opacity-80">
                              Next: {intervals[btn.rating]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              TAB: LUYỆN ĐỀ HSK & TỰ XÂY DỰNG ĐỀ (HSK 1, HSK 2, SƠ CẤP, ĐỀ TRỘN 1+2)
          ================================================================ */}
          {activeTab === 'exams' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Phòng Luyện Đề HSK & Tự Xây Dựng Đề (HSK 1 · HSK 2 · Đề Trộn 1+2)
                  </h2>
                  <p
                    className={`text-sm ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Tự tạo đề luyện riêng hoặc làm đề trộn thích ứng dựa trên mức độ thuộc từ SRS để đánh giá trình độ qua từng ngày.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsBuildExamOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-md hover:opacity-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tự xây dựng Đề luyện mới</span>
                </button>
              </div>

              {/* Daily Level Readiness & Adaptive Recommendation Strip */}
              <div
                className={`p-5 rounded-3xl border grid grid-cols-1 md:grid-cols-4 gap-4 ${
                  darkMode
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="md:col-span-2 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">
                    Đánh giá trình độ hôm nay ({userProfile.name})
                  </span>
                  <h3 className="text-lg font-bold">
                    Mục tiêu: {userProfile.targetTrack} · Điểm năng lực:{' '}
                    <span className="text-emerald-500">
                      {dailyProficiencyHistory[dailyProficiencyHistory.length - 1].score}/100
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Hệ thống phân tích thấy bạn có <strong>{counts.new} từ Mới</strong> và{' '}
                    <strong>{counts.learning} từ Đang học</strong>. Đề xuất làm{' '}
                    <strong>Đề Trộn Thông Minh HSK 1 + 2</strong> để củng cố mặt chữ Hán!
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-400">Độ vững HSK 1</span>
                  <span className="text-2xl font-extrabold text-emerald-500">
                    {dailyProficiencyHistory[dailyProficiencyHistory.length - 1].hsk1Ready}%
                  </span>
                  <span className="text-[11px] text-emerald-500 font-medium">
                    Đạt chuẩn thi HSK 1
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-400">Độ vững HSK 2</span>
                  <span className="text-2xl font-extrabold text-indigo-500">
                    {dailyProficiencyHistory[dailyProficiencyHistory.length - 1].hsk2Ready}%
                  </span>
                  <span className="text-[11px] text-indigo-400 font-medium">
                    Nên luyện Đề trộn 1+2
                  </span>
                </div>
              </div>

              {/* Exam Selection Grid vs Active Exam Runner */}
              {!activeExam ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {exams.map((ex) => (
                    <div
                      key={ex.id}
                      className={`p-6 rounded-3xl border flex flex-col justify-between gap-4 transition ${
                        darkMode
                          ? 'bg-slate-900 border-slate-800 hover:border-rose-500/40'
                          : 'bg-white border-slate-200 hover:border-rose-300 shadow-sm'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              ex.examMode === 'mixed_adaptive'
                                ? 'bg-amber-500/15 text-amber-500'
                                : ex.examMode === 'elementary'
                                ? 'bg-indigo-500/15 text-indigo-500'
                                : 'bg-rose-500/15 text-rose-500'
                            }`}
                          >
                            {ex.badge}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-semibold">
                            <Timer className="w-3.5 h-3.5" />
                            <span>{ex.durationMinutes} phút</span>
                          </span>
                        </div>
                        <h3 className="text-lg font-bold">{ex.title}</h3>
                        <p
                          className={`text-xs leading-relaxed ${
                            darkMode ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {ex.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-500/10 flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          Cấu trúc: Nghe + Đọc mặt chữ + Ngữ cảnh
                        </span>
                        <button
                          type="button"
                          onClick={() => startPracticeExam(ex)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Bắt đầu làm đề</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={`p-6 md:p-8 rounded-3xl border space-y-6 ${
                    darkMode
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-500/15 pb-4">
                    <div>
                      <span className="text-xs font-bold text-rose-500 uppercase">
                        {activeExam.badge} · Thời gian {activeExam.durationMinutes} phút
                      </span>
                      <h3 className="text-xl font-bold mt-0.5">{activeExam.title}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveExam(null)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-500/20 hover:bg-slate-500/10"
                    >
                      ← Quay lại Kho đề
                    </button>
                  </div>

                  <div className="space-y-5">
                    {examQuestions.map((q, qIdx) => {
                      const selected = examAnswers[q.id];
                      return (
                        <div
                          key={q.id}
                          className={`p-5 rounded-2xl border space-y-3 ${
                            darkMode
                              ? 'bg-slate-800/40 border-slate-800'
                              : 'bg-slate-50/70 border-slate-200/80'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-indigo-500">
                              Câu {qIdx + 1}:{' '}
                              {q.questionType === 'listen'
                                ? '🎧 Nghe âm thanh & Chọn nghĩa đúng'
                                : q.questionType === 'context'
                                ? '💬 Đọc câu ngữ cảnh (Không Pinyin)'
                                : '📖 Nhìn mặt chữ Hán & Chọn nghĩa'}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 font-semibold">
                              {q.levelTag}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 py-1">
                            <p
                              className="text-2xl md:text-3xl font-bold"
                              style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                            >
                              {q.promptHanzi}
                            </p>
                            {q.promptAudioText && (
                              <button
                                type="button"
                                onClick={() => speakChinese(q.promptAudioText || q.promptHanzi)}
                                className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                                title="Nghe câu hỏi"
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {q.options.map((opt) => {
                              const isChosen = selected === opt;
                              const isCorrect = opt === q.correctAnswer;
                              let cls = darkMode
                                ? 'border-slate-700 bg-slate-900 hover:border-slate-600'
                                : 'border-slate-200 bg-white hover:border-slate-300';
                              if (examSubmitted) {
                                if (isCorrect) {
                                  cls = 'border-emerald-500 bg-emerald-500/15 text-emerald-500 font-bold';
                                } else if (isChosen) {
                                  cls = 'border-rose-500 bg-rose-500/15 text-rose-500 font-bold';
                                }
                              } else if (isChosen) {
                                cls = 'border-rose-500 bg-rose-500/10 text-rose-500 font-bold';
                              }
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  disabled={examSubmitted}
                                  onClick={() =>
                                    setExamAnswers((prev) => ({ ...prev, [q.id]: opt }))
                                  }
                                  className={`p-3 rounded-xl border text-left text-xs transition flex items-center justify-between ${cls}`}
                                >
                                  <span>{opt}</span>
                                  {examSubmitted && isCorrect && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {examSubmitted && (
                            <p className="text-xs font-semibold text-emerald-500 pt-1">
                              Giải thích: {q.explanation}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!examSubmitted ? (
                    <button
                      type="button"
                      onClick={handleSubmitExam}
                      className="w-full py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-md hover:opacity-95"
                    >
                      Nộp bài & Đánh giá trình độ hôm nay
                    </button>
                  ) : (
                    <div className="p-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="font-bold text-base text-emerald-500">
                          Đã lưu kết quả vào Biểu đồ Đánh giá Trình độ Hàng ngày!
                        </p>
                        <p className="text-xs text-slate-400">
                          Điểm bài thi đã được cộng vào XP hôm nay và cập nhật tỷ lệ sẵn sàng thi HSK 1 + 2.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveExam(null)}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white shrink-0"
                      >
                        Chọn đề luyện khác
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              TAB 5: QUIZ MODE & 4-SKILL QUICK HUB
          ================================================================ */}
          {activeTab === 'quiz' && (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Quick Shortcut Banner to Lesson 4-Skill Studio & Role-Play */}
              <div
                className={`p-4 rounded-2xl border bg-gradient-to-r ${
                  darkMode
                    ? 'from-indigo-950/50 via-slate-900 to-rose-950/50 border-indigo-500/30'
                    : 'from-indigo-50 via-white to-rose-50 border-indigo-200 shadow-sm'
                } flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-indigo-500 flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    <span>Phòng Luyện 4 Kỹ Năng (Nghe · Nói · Đọc · Viết) & Đóng Vai Bài Khóa</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Luyện tập toàn diện cả Từ vựng và Hội thoại 2 chiều (App ↔ Bạn, đổi vai A ↔ B).
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategoryId('cat-hsk');
                      setActiveLevelId('lvl-hsk1');
                      setActiveLessonId('les-hsk1-1');
                      setLessonDetailTab('skills');
                      setActiveTab('library');
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                  >
                    Mở 4 Kỹ năng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategoryId('cat-hsk');
                      setActiveLevelId('lvl-hsk1');
                      setActiveLessonId('les-hsk1-1');
                      setLessonDetailTab('reading');
                      setRolePlayActiveId('rt-hsk1-1');
                      setActiveTab('library');
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  >
                    Đóng vai Bài khóa
                  </button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Kiểm tra phản xạ (Quiz Mode)
                  </h2>
                  <p
                    className={`text-sm ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Luyện trắc nghiệm nghĩa Tiếng Việt hoặc gõ Pinyin cho Hán tự.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl border bg-slate-500/5 border-slate-500/15 self-start">
                  <button
                    type="button"
                    onClick={() => {
                      setQuizType('mcq');
                      restartQuiz();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      quizType === 'mcq'
                        ? 'bg-rose-600 text-white'
                        : darkMode
                        ? 'text-slate-400'
                        : 'text-slate-600'
                    }`}
                  >
                    Trắc nghiệm (MCQ)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuizType('pinyin');
                      restartQuiz();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      quizType === 'pinyin'
                        ? 'bg-rose-600 text-white'
                        : darkMode
                        ? 'text-slate-400'
                        : 'text-slate-600'
                    }`}
                  >
                    Gõ Pinyin
                  </button>
                </div>
              </div>

              {quizFinished || !currentQuizItem ? (
                <div
                  className={`p-10 rounded-3xl border text-center space-y-4 ${
                    darkMode
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <Trophy className="w-12 h-12 text-amber-500 mx-auto" />
                  <h3 className="text-2xl font-bold">
                    Kết quả Quiz: {quizScore} / {quizQuestions.length}
                  </h3>
                  <button
                    type="button"
                    onClick={restartQuiz}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Làm lại Quiz</span>
                  </button>
                </div>
              ) : (
                <div
                  className={`p-6 md:p-8 rounded-3xl border space-y-6 ${
                    darkMode
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                    <span>
                      Question {quizIndex + 1} / {quizQuestions.length}
                    </span>
                    <span className="text-emerald-500">Score: {quizScore}</span>
                  </div>

                  <div className="text-center py-4 space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className="text-5xl md:text-6xl font-bold"
                        style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                      >
                        {currentQuizItem.word.hanzi}
                      </span>
                      <button
                        type="button"
                        onClick={() => speakChinese(currentQuizItem.word.hanzi)}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>
                    {quizType === 'pinyin' && (
                      <p className="text-sm font-medium text-slate-400">
                        Nghĩa: {currentQuizItem.word.meaning}
                      </p>
                    )}
                  </div>

                  {quizType === 'mcq' ? (
                    <div className="grid grid-cols-1 gap-3">
                      {currentQuizItem.options.map((option) => {
                        const isCorrect = option === currentQuizItem.word.meaning;
                        const isSelected = quizAnswered === option;
                        let btnStyle = darkMode
                          ? 'border-slate-800 bg-slate-800/60 hover:border-slate-700'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100';

                        if (quizAnswered) {
                          if (isCorrect) {
                            btnStyle =
                              'border-emerald-500 bg-emerald-500/15 text-emerald-500 font-semibold';
                          } else if (isSelected) {
                            btnStyle =
                              'border-rose-500 bg-rose-500/15 text-rose-500 font-semibold';
                          }
                        }

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleSelectMCQ(option)}
                            className={`w-full p-4 rounded-2xl border text-left text-sm transition flex items-center justify-between ${btnStyle}`}
                          >
                            <span>{option}</span>
                            {quizAnswered && isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <form onSubmit={handleCheckPinyinQuiz} className="space-y-4">
                      <div>
                        <input
                          type="text"
                          value={pinyinInput}
                          onChange={(e) => setPinyinInput(e.target.value)}
                          disabled={Boolean(quizAnswered)}
                          placeholder="Nhập Pinyin (VD: nǐ hǎo hoặc ni hao)..."
                          className={`w-full px-4 py-3 rounded-xl border text-center text-base outline-none ${
                            darkMode
                              ? 'bg-slate-800 border-slate-700 text-slate-100'
                              : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                        <div className="flex flex-wrap gap-1 justify-center mt-2">
                          {TONE_MARKS.slice(0, 12).map((tm) => (
                            <button
                              key={tm}
                              type="button"
                              onClick={() => setPinyinInput((p) => p + tm)}
                              className={`px-2 py-0.5 rounded text-xs border ${
                                darkMode
                                  ? 'border-slate-700 bg-slate-800 text-slate-300'
                                  : 'border-slate-200 bg-slate-100 text-slate-700'
                              }`}
                            >
                              {tm}
                            </button>
                          ))}
                        </div>
                      </div>

                      {!quizAnswered && (
                        <button
                          type="submit"
                          className="w-full py-3 rounded-xl font-semibold text-sm bg-rose-600 hover:bg-rose-700 text-white transition"
                        >
                          Kiểm tra đáp án
                        </button>
                      )}
                    </form>
                  )}

                  {quizAnswered && (
                    <div
                      className={`p-4 rounded-2xl border flex items-center justify-between ${
                        darkMode
                          ? 'bg-slate-800/90 border-slate-700'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="text-xs space-y-0.5">
                        <p className="font-bold text-sm text-rose-500">
                          {currentQuizItem.word.hanzi} ({currentQuizItem.word.pinyin})
                        </p>
                        <p>{currentQuizItem.word.meaning}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleNextQuizQuestion}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white"
                      >
                        <span>Tiếp theo</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              TAB: TIẾN ĐỘ HỌC TẬP THỰC TẾ (REAL PROGRESS & SRS DEDUPLICATION AUDIT)
          ================================================================ */}
          {activeTab === 'progress' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Báo cáo Tiến độ Học tập & Đồng bộ SRS Đa Lộ trình
                </h2>
                <p className="text-sm text-slate-400">
                  Dữ liệu thực tế từ hoạt động học bài, lịch sử ôn tập SRS (ReviewHistory) và lịch sử làm đề (ExamAttempt).
                </p>
              </div>

              {/* Canonical Vocabulary Deduplication Proof Card */}
              <div
                className={`p-5 rounded-2xl border ${
                  darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                } space-y-3`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-blue-600">
                    Từ vựng chuẩn dùng chung giữa HSK & Giao tiếp (Canonical SRS Deduplication)
                  </h3>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500">
                    Không trùng lịch SRS
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Các từ xuất hiện ở cả hai lộ trình (như 你好, 没关系, 学习, 流利, 交流) chỉ lưu <strong>1 bản ghi VocabularyItem chuẩn</strong> và <strong>1 lịch ôn SRS duy nhất</strong> cho người học:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {words
                    .filter((w) => getSharedLessonTitlesForWord(w.id, w.lessonId).length > 1)
                    .map((w) => {
                      const sharedTitles = getSharedLessonTitlesForWord(w.id, w.lessonId);
                      return (
                        <div
                          key={w.id}
                          className={`p-3.5 rounded-xl border ${
                            darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="text-xl font-bold"
                              style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                            >
                              {w.hanzi}
                            </span>
                            <span className="text-xs font-bold text-blue-600">
                              Interval: {w.interval}d · {w.status}
                            </span>
                          </div>
                          <p className="text-xs font-medium mt-1">{w.meaning}</p>
                          <p className="text-[11px] text-emerald-500 font-semibold mt-1.5">
                            Liên kết {sharedTitles.length} bài: {sharedTitles.join(' + ')}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Recent SRS ReviewHistory & ExamAttempt Logs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className={`p-5 rounded-2xl border ${
                    darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  } space-y-3`}
                >
                  <h3 className="font-bold text-base">
                    Lịch sử Ôn tập SRS Thực tế ({reviewHistoryList.length} lượt trong phiên)
                  </h3>
                  {reviewHistoryList.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4">
                      Chưa có lượt đánh giá thẻ mới trong phiên này. Hãy vào mục Ôn tập để lật thẻ!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {reviewHistoryList.slice(0, 6).map((rh) => (
                        <div
                          key={rh.id}
                          className="p-2.5 rounded-xl border border-slate-500/15 flex items-center justify-between text-xs"
                        >
                          <span className="font-bold">{rh.hanzi}</span>
                          <span className="uppercase font-semibold text-blue-600">
                            Đánh giá: {rh.rating} → Hẹn ôn: {rh.nextInterval}d
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className={`p-5 rounded-2xl border ${
                    darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  } space-y-3`}
                >
                  <h3 className="font-bold text-base">
                    Lịch sử Làm Đề HSK ({examAttemptsList.length} lần)
                  </h3>
                  <div className="space-y-2">
                    {examAttemptsList.map((att) => (
                      <div
                        key={att.id}
                        className="p-3 rounded-xl border border-slate-500/15 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold">{att.examTitle}</div>
                          <div className="text-slate-400">
                            Đúng {att.correctCount}/{att.totalQuestions} câu
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg font-extrabold bg-emerald-500/15 text-emerald-500">
                          {att.scorePct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              TAB: HỒ SƠ HỌC VIÊN & KHU VỰC QUẢN TRỊ NỘI DUNG RIÊNG BIỆT
          ================================================================ */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Hồ sơ Học viên & Cài đặt Lộ trình
                  </h2>
                  <p className="text-sm text-slate-400">
                    Quản lý đăng ký lộ trình HSK / Giao tiếp và truy cập Khu vực Quản trị Nội dung tách biệt.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Chỉnh sửa Hồ sơ & Mục tiêu
                </button>
              </div>

              {/* Dual Track Enrollment Management */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DUAL_TRACKS_CONFIG.map((tr) => {
                  const enr = trackEnrollments[tr.id];
                  return (
                    <div
                      key={tr.id}
                      className={`p-5 rounded-2xl border space-y-3 ${
                        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-base">{tr.name}</h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            enr?.isEnrolled
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : 'bg-slate-500/15 text-slate-400'
                          }`}
                        >
                          {enr?.isEnrolled ? 'Đang theo học' : 'Chưa đăng ký'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{tr.description}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleToggleEnrollTrack(tr.id)}
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-500/20"
                        >
                          {enr?.isEnrolled ? 'Tạm dừng lộ trình' : 'Đăng ký lộ trình này'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openFocusLessonPlayer(
                              enr?.currentLessonId ||
                                (tr.id === 'track-hsk' ? 'les-hsk1-1' : 'les-comm1-1'),
                              tr.id
                            )
                          }
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white"
                        >
                          Vào học ngay
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Separated Content Administration & Developer Tools Area */}
              <div
                className={`p-6 rounded-2xl border ${
                  darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                } space-y-4`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
                      Khu vực Quản trị Nội dung (Content Admin & Tools)
                    </span>
                    <h3 className="font-bold text-base mt-0.5">
                      Công cụ Quản lý Từ vựng, Nhập/Xuất CSV-JSON, Tạo Đề & Kiến trúc Hệ thống
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAdminDrawerOpen((v) => !v)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-500/10 hover:bg-slate-500/20"
                  >
                    {isAdminDrawerOpen ? 'Thu gọn Công cụ Quản trị' : 'Mở Công cụ Quản trị'}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('vocabulary')}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white"
                  >
                    Quản lý Kho Từ vựng ({words.length} từ)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImportExportMode('import');
                      setIsImportExportOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-500/20"
                  >
                    Bulk Import / Export (CSV & JSON)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBuildExamOpen(true)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-500/20"
                  >
                    Trình tạo Đề luyện HSK
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('blueprint')}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-500/20"
                  >
                    Xem Kiến trúc Code (Developer View)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 6: STEP 1 & STEP 2 ARCHITECTURE & CODE BLUEPRINT
          ================================================================ */}
          {activeTab === 'blueprint' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Step 1 & Step 2: Hierarchical Course & Deck Blueprint
                  </h2>
                  <p
                    className={`text-sm ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Updated TypeScript Interfaces (Category, CourseLevel, Lesson, ReadingText, VocabularyItem) & App Structure.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBlueprintStep('step1')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                      blueprintStep === 'step1'
                        ? 'bg-indigo-600 text-white'
                        : darkMode
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-white border border-slate-200 text-slate-700'
                    }`}
                  >
                    Step 1: Project Structure
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlueprintStep('step2')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                      blueprintStep === 'step2'
                        ? 'bg-indigo-600 text-white'
                        : darkMode
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-white border border-slate-200 text-slate-700'
                    }`}
                  >
                    Step 2: Hierarchical Data Models
                  </button>
                </div>
              </div>

              <div
                className={`rounded-2xl border overflow-hidden ${
                  darkMode
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div
                  className={`px-4 py-3 border-b flex items-center justify-between ${
                    darkMode
                      ? 'bg-slate-800/60 border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="text-xs font-mono font-semibold text-indigo-500">
                    {blueprintStep === 'step1'
                      ? 'Step 1 — Next.js Hierarchical Course Routing'
                      : 'Step 2 — src/types/vocabulary.ts'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        blueprintStep === 'step1'
                          ? STEP_1_STRUCTURE_CODE
                          : STEP_2_MODELS_CODE,
                        'Code copied to clipboard!'
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono overflow-x-auto leading-relaxed">
                  {blueprintStep === 'step1'
                    ? STEP_1_STRUCTURE_CODE
                    : STEP_2_MODELS_CODE}
                </pre>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ====================================================================
          MOBILE 5-ITEM BOTTOM NAVIGATION BAR (TOUCH TARGET >= 44PX, NO OVERFLOW)
      ==================================================================== */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t px-2 py-1.5 grid grid-cols-5 gap-1 ${
          darkMode
            ? 'bg-slate-900/95 border-slate-800 text-slate-300'
            : 'bg-white/95 border-slate-200 text-slate-600'
        } backdrop-blur-md`}
      >
        {(
          [
            { id: 'dashboard', label: 'Học của tôi', icon: LayoutDashboard },
            { id: 'library', label: 'Lộ trình', icon: FolderKanban },
            { id: 'review', label: 'Ôn tập', icon: Layers },
            { id: 'quiz', label: 'Luyện tập', icon: Brain },
            { id: 'profile', label: 'Hồ sơ', icon: UserCheck }
          ] as const
        ).map((item) => {
          const IconComp = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition ${
                active ? 'text-blue-600 bg-blue-600/10' : 'opacity-75'
              }`}
            >
              <IconComp className="w-4 h-4" />
              <span className="truncate max-w-full px-1">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ====================================================================
          FOCUS MODE LESSON PLAYER (P0-P2 STRICT VERIFIED ACTIVITY PLAYER)
      ==================================================================== */}
      {isFocusPlayerOpen && (() => {
        const currentLesson = lessonById.get(playerLessonId);
        // P0 Fix: NEVER fallback to 'les-hsk1-1'! If lesson has no configured activities, activities = []
        const activities = LESSON_ACTIVITIES_CONFIG[playerLessonId] || [];
        const currentActivity =
          activities.length > 0
            ? activities[Math.min(playerStepIndex, activities.length - 1)]
            : null;
        const lessonWords = getCanonicalWordsForLesson(playerLessonId);
        const lessonReading = readingTexts.find((r) => r.lessonId === playerLessonId) || null;
        const progressRecord = lessonProgressMap[playerLessonId];
        const completedIds = progressRecord?.completedActivityIds || [];
        const stepPct =
          activities.length > 0
            ? Math.round((completedIds.length / activities.length) * 100)
            : 0;

        // Attempts for this lesson
        const attemptsForThisLesson = lessonAssessmentAttempts.filter(
          (a) => a.lessonId === playerLessonId
        );
        const attemptsForCurrentAct = currentActivity
          ? attemptsForThisLesson.filter((a) => a.activityId === currentActivity.id)
          : [];
        const latestAttempt = attemptsForCurrentAct[0] || null;
        const hasPassedCurrentAssessment = attemptsForCurrentAct.some((a) => a.passed);

        // Standard character stroke count map for Writing verification mode
        const strokeTargetMap: Record<string, number> = {
          你: 7,
          好: 6,
          您: 11,
          们: 5,
          对: 5,
          不: 4,
          起: 10,
          没: 7,
          关: 6,
          系: 7,
          学: 8,
          习: 3,
          坚: 7,
          持: 9,
          机: 6,
          会: 6,
          流: 10,
          利: 7,
          交: 6
        };

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div
              className={`w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[94vh] ${
                darkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-100'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Focus Player Header */}
              <div
                className={`px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3 ${
                  darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold text-white ${
                      activeTrackId === 'track-hsk' ? 'bg-blue-600' : 'bg-emerald-600'
                    }`}
                  >
                    {activeTrackId === 'track-hsk' ? 'Lộ trình HSK' : 'Lộ trình Giao tiếp'}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base">
                      {currentLesson?.title || 'Bài học chưa xác định'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {currentActivity
                        ? `${currentActivity.title} (Bước ${playerStepIndex + 1}/${activities.length} · Đã hoàn thành ${completedIds.length}/${activities.length} bước)`
                        : 'Hoạt động chưa được cấu hình'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 w-36">
                    <div className="w-full h-2 rounded-full bg-slate-500/20 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${stepPct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-blue-600">{stepPct}%</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsFocusPlayerOpen(false);
                      showToast('Đã lưu bước đang học! Khi vào lại bạn sẽ tiếp tục đúng vị trí này.');
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-500/25 hover:bg-slate-500/10 min-h-[40px]"
                  >
                    Lưu & Thoát
                  </button>
                </div>
              </div>

              {/* P0 Fix: Explicit Empty State if Lesson has NO configured activities */}
              {activities.length === 0 || !currentActivity ? (
                <div className="p-10 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto">
                    <FileText className="w-7 h-7" />
                  </div>
                  <h4 className="text-xl font-bold">
                    Bài chưa có nội dung / Hoạt động chưa được cấu hình
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Bài học <strong>{currentLesson?.title}</strong> vừa được tạo và chưa có cấu hình hoạt động bắt buộc hay ngân hàng câu hỏi. Hệ thống không dùng bài HSK 1 làm fallback giả và không cho phép đánh dấu hoàn thành bài thiếu nội dung.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsFocusPlayerOpen(false);
                        openAddModal(playerLessonId, currentLesson?.levelId);
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white"
                    >
                      + Thêm từ vựng cho bài này
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFocusPlayerOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-500/20"
                    >
                      Đóng trình học
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Activity Stepper Pills */}
                  <div className="px-5 py-2.5 border-b border-slate-500/15 flex items-center gap-1.5 overflow-x-auto">
                    {activities.map((act, idx) => {
                      const isDone = completedIds.includes(act.id);
                      const isCur = idx === playerStepIndex;
                      return (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => setPlayerStepIndex(idx)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                            isCur
                              ? 'bg-blue-600 text-white shadow-sm'
                              : isDone
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : darkMode
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                          <span>{act.title}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Activity Body */}
                  <div className="p-6 overflow-y-auto flex-1 space-y-5">
                    {/* 1. INTRODUCTION */}
                    {currentActivity.type === 'introduction' && (
                      <div className="space-y-4 py-3">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600/10 text-blue-600">
                          Mục tiêu & Định hướng Bài học
                        </span>
                        <h4 className="text-2xl font-bold">{currentLesson?.title}</h4>
                        <p className="text-sm leading-relaxed text-slate-400">
                          {currentActivity.introSummary || currentLesson?.description}
                        </p>
                        <div
                          className={`p-4 rounded-2xl border ${
                            darkMode
                              ? 'bg-slate-800/50 border-slate-700'
                              : 'bg-blue-50/50 border-blue-200'
                          } text-xs space-y-1.5`}
                        >
                          <div className="font-bold text-blue-600">
                            Điều kiện hoàn thành bài học (Strict Completion Criteria):
                          </div>
                          <p>
                            Bạn cần hoàn thành đầy đủ các hoạt động bắt buộc ({activities.filter((a) => a.requiredForCompletion).length} bước) và đạt tối thiểu ngưỡng điểm yêu cầu ở bước Kiểm tra cuối bài.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 2. VOCABULARY (Step-by-Step Word Study + Mini Recognition Check) */}
                    {currentActivity.type === 'vocabulary' && (
                      <div className="space-y-5">
                        {lessonWords.length === 0 ? (
                          <div className="p-8 rounded-2xl border border-dashed text-center space-y-2">
                            <p className="font-bold text-sm">Bài chưa có từ vựng</p>
                            <p className="text-xs text-slate-400">
                              Hãy thêm từ vựng vào bài học này để bắt đầu luyện tập.
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h4 className="font-bold text-base">
                                Học từng từ & Luyện nhận biết ({playerVocabFocusIdx + 1}/{lessonWords.length})
                              </h4>
                              <div className="flex items-center gap-1.5">
                                {lessonWords.map((w, idx) => (
                                  <button
                                    key={w.id}
                                    type="button"
                                    onClick={() => setPlayerVocabFocusIdx(idx)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                      playerVocabFocusIdx === idx
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-500/10 text-slate-400'
                                    }`}
                                  >
                                    {w.hanzi}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {(() => {
                              const focusedWord =
                                lessonWords[playerVocabFocusIdx] || lessonWords[0];
                              const sharedTitles = getSharedLessonTitlesForWord(
                                focusedWord.id,
                                focusedWord.lessonId
                              );
                              return (
                                <div
                                  className={`p-6 rounded-2xl border space-y-4 ${
                                    darkMode
                                      ? 'bg-slate-800/60 border-slate-700'
                                      : 'bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <span
                                        className="text-4xl font-bold"
                                        style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                                      >
                                        {focusedWord.hanzi}
                                      </span>
                                      <div className="text-sm font-semibold text-blue-600 mt-1">
                                        Pinyin: {focusedWord.pinyin}
                                      </div>
                                      <div className="text-base font-bold mt-1">
                                        Nghĩa: {focusedWord.meaning}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => speakChinese(focusedWord.hanzi)}
                                      className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5"
                                    >
                                      <Volume2 className="w-4 h-4" />
                                      <span>Nghe phát âm</span>
                                    </button>
                                  </div>

                                  {focusedWord.example_sentence && (
                                    <div className="p-3 rounded-xl bg-blue-600/5 border border-blue-600/15 flex items-center justify-between gap-2">
                                      <span
                                        className="text-xs font-medium"
                                        style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                                      >
                                        Ví dụ: {focusedWord.example_sentence}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          speakChinese(
                                            focusedWord.example_sentence.split('(')[0]
                                          )
                                        }
                                        className="p-1.5 rounded-lg text-blue-600 shrink-0"
                                      >
                                        <Volume2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}

                                  {sharedTitles.length > 1 && (
                                    <div className="text-xs font-semibold text-emerald-500">
                                      🔗 Từ chuẩn dùng chung ở {sharedTitles.length} bài ({sharedTitles.join(' & ')}) · Bảo toàn 1 lịch SRS duy nhất (Interval: {focusedWord.interval}d)
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Mini Recognition Check */}
                            <div
                              className={`p-4 rounded-2xl border space-y-2.5 ${
                                darkMode
                                  ? 'bg-slate-900 border-slate-800'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="text-xs font-bold text-blue-600 uppercase">
                                Luyện nhận biết nhanh mặt chữ: &quot;{lessonWords[0].hanzi}&quot; có nghĩa là gì?
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {[
                                  lessonWords[0].meaning,
                                  lessonWords[1]?.meaning || 'Hẹn gặp lại',
                                  lessonWords[2]?.meaning || 'Không có gì'
                                ].map((opt) => {
                                  const isSelected = playerVocabCheckAns === opt;
                                  const isRight = opt === lessonWords[0].meaning;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => setPlayerVocabCheckAns(opt)}
                                      className={`p-2.5 rounded-xl border text-xs font-semibold text-left ${
                                        isSelected
                                          ? isRight
                                            ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
                                            : 'border-rose-500 bg-rose-500/15 text-rose-500'
                                          : 'border-slate-500/20'
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* 3. GRAMMAR (Explanation + Examples + Interactive Application Exercise) */}
                    {currentActivity.type === 'grammar' && (
                      <div className="space-y-4">
                        <h4 className="font-bold text-base">
                          Điểm Ngữ pháp & Bài tập Ứng dụng
                        </h4>
                        {(currentActivity.grammarPoints || []).map((gp) => (
                          <div
                            key={gp.id}
                            className={`p-5 rounded-2xl border space-y-2 ${
                              darkMode
                                ? 'bg-slate-800/60 border-slate-700'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="text-base font-bold text-blue-600">
                              {gp.pattern}
                            </div>
                            <p className="text-xs text-slate-400">{gp.meaning}</p>
                            <div className="p-3 rounded-xl bg-blue-600/5 border border-blue-600/15 space-y-1">
                              <div className="flex items-center justify-between">
                                <span
                                  className="text-lg font-bold"
                                  style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                                >
                                  {gp.exampleHanzi}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => speakChinese(gp.exampleHanzi)}
                                  className="p-1.5 rounded-lg text-blue-600"
                                >
                                  <Volume2 className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="text-xs text-blue-500">{gp.examplePinyin}</div>
                              <div className="text-xs font-medium">{gp.exampleVi}</div>
                            </div>
                          </div>
                        ))}

                        {/* Interactive Grammar Application Question */}
                        {getQuestionsForLessonActivity(playerLessonId, 'grammar').map((gq) => (
                          <div
                            key={gq.id}
                            className={`p-5 rounded-2xl border space-y-3 ${
                              darkMode
                                ? 'bg-slate-900 border-blue-500/30'
                                : 'bg-blue-50/40 border-blue-200'
                            }`}
                          >
                            <div className="text-xs font-bold uppercase text-blue-600">
                              Bài tập ứng dụng ngữ pháp (Bắt buộc trả lời trước khi tiếp tục):
                            </div>
                            <div className="font-bold text-sm">{gq.prompt}</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {gq.options.map((opt) => {
                                const chosen = playerGrammarCheckAns === opt;
                                const right = opt === gq.correctAnswer;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setPlayerGrammarCheckAns(opt)}
                                    className={`p-3 rounded-xl border text-xs font-semibold text-left ${
                                      chosen
                                        ? right
                                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
                                          : 'border-rose-500 bg-rose-500/15 text-rose-500'
                                        : 'border-slate-500/20'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                            {playerGrammarCheckAns && (
                              <p className="text-xs font-semibold text-emerald-500">
                                Giải thích: {gq.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 4. READING / DIALOGUE */}
                    {currentActivity.type === 'reading' && (
                      <div className="space-y-4">
                        {!lessonReading ? (
                          <div className="p-8 rounded-2xl border border-dashed text-center text-xs text-slate-400">
                            Bài học này chưa có Bài khóa (Reading Text).
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h4 className="font-bold text-base">{lessonReading.title}</h4>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setShowReadingPinyin((v) => !v)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-500/20"
                                >
                                  {showReadingPinyin ? 'Ẩn Pinyin' : 'Hiện Pinyin'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowReadingMeaning((v) => !v)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-500/20"
                                >
                                  {showReadingMeaning ? 'Ẩn Dịch nghĩa' : 'Hiện Dịch nghĩa'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => speakChinese(lessonReading.content_hanzi)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                  <span>Phát toàn bài</span>
                                </button>
                              </div>
                            </div>
                            <div className="space-y-2.5">
                              {lessonReading.content_hanzi.split('\n').map((line, idx) => {
                                const py = lessonReading.content_pinyin.split('\n')[idx] || '';
                                const vi = lessonReading.content_meaning.split('\n')[idx] || '';
                                return (
                                  <div
                                    key={idx}
                                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                                      darkMode
                                        ? 'bg-slate-800/50 border-slate-700'
                                        : 'bg-slate-50 border-slate-200'
                                    }`}
                                  >
                                    <div>
                                      <div
                                        className="text-lg font-bold"
                                        style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                                      >
                                        {line}
                                      </div>
                                      {showReadingPinyin && (
                                        <div className="text-xs text-blue-500">{py}</div>
                                      )}
                                      {showReadingMeaning && (
                                        <div className="text-xs text-slate-400 mt-0.5">{vi}</div>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        speakChinese(line.replace(/^[A-Z]:\s*/, ''))
                                      }
                                      className="p-2 rounded-xl text-blue-600 hover:bg-blue-600/10"
                                    >
                                      <Volume2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* 5. LISTENING (Audio Prompt + Comprehension Verification Question) */}
                    {currentActivity.type === 'listening' && (
                      <div className="space-y-4 py-2">
                        <h4 className="font-bold text-base">{currentActivity.title}</h4>
                        {getQuestionsForLessonActivity(playerLessonId, 'listening').map((lq) => (
                          <div
                            key={lq.id}
                            className={`p-5 rounded-2xl border space-y-4 ${
                              darkMode
                                ? 'bg-slate-800/50 border-slate-700'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <span className="text-xs font-bold text-blue-600">
                                Bấm nút Nghe câu thoại rồi chọn đáp án đúng bên dưới:
                              </span>
                              <button
                                type="button"
                                onClick={() => speakChinese(lq.audioText || lq.prompt)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white"
                              >
                                <Volume2 className="w-4 h-4" />
                                <span>Phát âm thanh câu hỏi</span>
                              </button>
                            </div>
                            <p className="text-sm font-bold">{lq.prompt}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {lq.options.map((opt) => {
                                const chosen = playerListenCheckAns === opt;
                                const right = opt === lq.correctAnswer;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setPlayerListenCheckAns(opt)}
                                    className={`p-3 rounded-xl border text-xs font-semibold text-left ${
                                      chosen
                                        ? right
                                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
                                          : 'border-rose-500 bg-rose-500/15 text-rose-500'
                                        : 'border-slate-500/20'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                            {playerListenCheckAns && (
                              <p className="text-xs font-semibold text-emerald-500">
                                Giải thích: {lq.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 6. SPEAKING (Honest SpeechRecognition Transcript Notice) */}
                    {currentActivity.type === 'speaking' && (
                      <div className="space-y-4 text-center py-4">
                        <h4 className="text-lg font-bold">{currentActivity.title}</h4>
                        <p className="text-xs text-slate-400 max-w-lg mx-auto">
                          Hệ thống sử dụng <strong>Web SpeechRecognition (Speech-to-Text)</strong> để nhận diện mặt chữ bạn phát âm (không tự nhận chấm điểm âm học thanh điệu nếu trình duyệt chỉ trả về văn bản).
                        </p>
                        {lessonWords[0] && (
                          <div className="max-w-md mx-auto p-6 rounded-2xl border border-slate-500/20 space-y-4">
                            <div
                              className="text-5xl font-bold"
                              style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                            >
                              {lessonWords[0].hanzi}
                            </div>
                            <p className="text-sm font-semibold text-blue-600">
                              Nghĩa: {lessonWords[0].meaning}
                            </p>
                            <div className="flex items-center justify-center gap-3">
                              <button
                                type="button"
                                onClick={() => speakChinese(lessonWords[0].hanzi)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white"
                              >
                                <Volume2 className="w-4 h-4" />
                                <span>Nghe mẫu</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => triggerSpeechPractice(lessonWords[0].hanzi)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white"
                              >
                                <Mic className="w-4 h-4" />
                                <span>Ghi âm & Nhận diện văn bản</span>
                              </button>
                            </div>
                            {skillFeedback && (
                              <p className="text-xs font-semibold text-emerald-500">
                                {skillFeedback}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 7. WRITING (Distinguish Freehand Practice vs Stroke Count Verification) */}
                    {currentActivity.type === 'writing' && (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-base">{currentActivity.title}</h4>
                            <p className="text-xs text-slate-400">
                              Phân biệt rõ: Chế độ Tập viết tự do (Freehand) và Chế độ Kiểm tra đủ số nét chữ Hán chuẩn.
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setWritingCheckMode('freehand');
                                setStrokeVerifyFeedback(null);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                                writingCheckMode === 'freehand'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-500/10 text-slate-400'
                              }`}
                            >
                              1. Tập viết tự do
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setWritingCheckMode('stroke_verify');
                                clearWritingCanvas();
                                setStrokeVerifyFeedback(null);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                                writingCheckMode === 'stroke_verify'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-500/10 text-slate-400'
                              }`}
                            >
                              2. Kiểm tra số nét chuẩn
                            </button>
                          </div>
                        </div>

                        {(() => {
                          const targetChar = (lessonWords[0]?.hanzi || '你好').slice(0, 1);
                          const expectedStrokes = strokeTargetMap[targetChar] || 7;
                          return (
                            <div className="flex flex-col items-center gap-3">
                              <div className="text-sm font-bold">
                                Chữ mục tiêu: <span className="text-2xl text-blue-600">{targetChar}</span>{' '}
                                {writingCheckMode === 'stroke_verify' && (
                                  <span className="text-xs text-amber-500">
                                    (Yêu cầu viết đúng {expectedStrokes} nét rời)
                                  </span>
                                )}
                              </div>
                              <div className="relative w-[220px] h-[220px] rounded-2xl border-2 border-blue-500/40 bg-slate-950/5 overflow-hidden select-none">
                                {writeGuideVisible && (
                                  <div
                                    className="absolute inset-0 pointer-events-none flex items-center justify-center text-7xl font-bold opacity-15 select-none"
                                    style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                                  >
                                    {targetChar}
                                  </div>
                                )}
                                <canvas
                                  ref={canvasRef}
                                  width={220}
                                  height={220}
                                  onMouseDown={startCanvasDraw}
                                  onMouseMove={moveCanvasDraw}
                                  onMouseUp={endCanvasDraw}
                                  onMouseLeave={endCanvasDraw}
                                  onTouchStart={startCanvasDraw}
                                  onTouchMove={moveCanvasDraw}
                                  onTouchEnd={endCanvasDraw}
                                  className="relative z-10 cursor-crosshair touch-none"
                                />
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span>
                                  Số nét đã vẽ: <strong>{strokeCount}</strong>
                                  {writingCheckMode === 'stroke_verify'
                                    ? ` / ${expectedStrokes} nét chuẩn`
                                    : ''}
                                </span>
                                <button
                                  type="button"
                                  onClick={clearWritingCanvas}
                                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 font-semibold"
                                >
                                  Xóa viết lại
                                </button>
                                {writingCheckMode === 'stroke_verify' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (strokeCount === expectedStrokes) {
                                        setStrokeVerifyFeedback(
                                          `✓ Đạt! Bạn đã viết đủ ${strokeCount}/${expectedStrokes} nét cho chữ "${targetChar}".`
                                        );
                                      } else {
                                        setStrokeVerifyFeedback(
                                          `Chưa khớp số nét: Bạn đã vẽ ${strokeCount} nét, nhưng chữ "${targetChar}" chuẩn có ${expectedStrokes} nét. Hãy xóa và viết lại!`
                                        );
                                      }
                                    }}
                                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold"
                                  >
                                    Kiểm tra số nét
                                  </button>
                                )}
                              </div>
                              {strokeVerifyFeedback && (
                                <p className="text-xs font-bold text-blue-500">
                                  {strokeVerifyFeedback}
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* 8. PRACTICE QUIZ & FINAL ASSESSMENT (Real Grading, Pass Threshold Gate, Retry & Attempt History) */}
                    {(currentActivity.type === 'practice_quiz' ||
                      currentActivity.type === 'final_assessment') && (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-base">
                              {currentActivity.title} (Điểm đạt yêu cầu: ≥{' '}
                              {currentActivity.passScorePct || 75}%)
                            </h4>
                            <p className="text-xs text-slate-400">
                              Phải trả lời đầy đủ tất cả câu hỏi, nộp bài chấm điểm thực tế và đạt ngưỡng yêu cầu mới được tính hoàn thành bước này.
                            </p>
                          </div>

                          {latestAttempt && (
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                latestAttempt.passed
                                  ? 'bg-emerald-500/15 text-emerald-500'
                                  : 'bg-rose-500/15 text-rose-500'
                              }`}
                            >
                              Lần nộp gần nhất: {latestAttempt.scorePct}% (
                              {latestAttempt.passed ? 'ĐẠT' : 'CHƯA ĐẠT'})
                            </span>
                          )}
                        </div>

                        {playerAssessmentError && (
                          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-bold">
                            ⚠️ {playerAssessmentError}
                          </div>
                        )}

                        {(() => {
                          const questions = getQuestionsForLessonActivity(
                            playerLessonId,
                            currentActivity.type
                          );
                          if (questions.length === 0) {
                            return (
                              <div className="p-8 rounded-2xl border border-dashed text-center space-y-2">
                                <p className="font-bold text-sm">Bài chưa có câu hỏi kiểm tra</p>
                                <p className="text-xs text-slate-400">
                                  Chưa có ngân hàng câu hỏi cho bài học này nên không thể chấm điểm.
                                </p>
                              </div>
                            );
                          }

                          return (
                            <>
                              <div className="space-y-4">
                                {questions.map((q, qIdx) => {
                                  const chosen = playerAssessmentAnswers[q.id];
                                  return (
                                    <div
                                      key={q.id}
                                      className={`p-4 rounded-2xl border space-y-2.5 ${
                                        darkMode
                                          ? 'bg-slate-800/50 border-slate-700'
                                          : 'bg-slate-50 border-slate-200'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-bold text-sm">
                                          Câu {qIdx + 1}: {q.prompt}
                                        </span>
                                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-500/10 text-slate-400">
                                          {q.difficulty}
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {q.options.map((opt) => {
                                          const isChosen = chosen === opt;
                                          const isRight = opt === q.correctAnswer;
                                          let cls = 'border-slate-500/20';
                                          if (playerAssessmentSubmitted) {
                                            if (isRight) {
                                              cls =
                                                'border-emerald-500 bg-emerald-500/15 text-emerald-500 font-bold';
                                            } else if (isChosen) {
                                              cls =
                                                'border-rose-500 bg-rose-500/15 text-rose-500 font-bold';
                                            }
                                          } else if (isChosen) {
                                            cls =
                                              'border-blue-600 bg-blue-600/15 text-blue-600 font-bold';
                                          }
                                          return (
                                            <button
                                              key={opt}
                                              type="button"
                                              disabled={playerAssessmentSubmitted}
                                              onClick={() => {
                                                setPlayerAssessmentAnswers((prev) => ({
                                                  ...prev,
                                                  [q.id]: opt
                                                }));
                                                setPlayerAssessmentError(null);
                                              }}
                                              className={`p-3 rounded-xl border text-xs text-left transition flex items-center justify-between ${cls}`}
                                            >
                                              <span>{opt}</span>
                                              {playerAssessmentSubmitted && isRight && (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                              )}
                                            </button>
                                          );
                                        })}
                                      </div>

                                      {playerAssessmentSubmitted && (
                                        <div
                                          className={`text-xs font-semibold pt-1 ${
                                            chosen === q.correctAnswer
                                              ? 'text-emerald-500'
                                              : 'text-rose-500'
                                          }`}
                                        >
                                          {chosen === q.correctAnswer
                                            ? `✓ Chính xác! ${q.explanation}`
                                            : `✗ Sai (Bạn chọn: "${chosen}"). Đáp án đúng: "${q.correctAnswer}". Giải thích: ${q.explanation}`}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                {!playerAssessmentSubmitted ? (
                                  <button
                                    type="button"
                                    onClick={handleGradePlayerAssessment}
                                    className="px-6 py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                  >
                                    Nộp bài & Chấm điểm thực tế
                                  </button>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-3 w-full justify-between p-4 rounded-2xl border border-slate-500/20">
                                    <div className="text-xs space-y-0.5">
                                      <div className="font-bold text-sm">
                                        Kết quả chấm bài:{' '}
                                        <span
                                          className={
                                            latestAttempt?.passed
                                              ? 'text-emerald-500'
                                              : 'text-rose-500'
                                          }
                                        >
                                          {latestAttempt?.scorePct}% ({latestAttempt?.correctCount}/
                                          {latestAttempt?.totalQuestions} câu đúng)
                                        </span>
                                      </div>
                                      <p className="text-slate-400">
                                        {latestAttempt?.passed
                                          ? 'Bạn đã đạt điểm yêu cầu! Có thể bấm "Tiếp tục" ở thanh cuối để sang phần Tổng kết.'
                                          : `Chưa đạt ngưỡng yêu cầu (${
                                              currentActivity.passScorePct || 75
                                            }%). Vui lòng xem lại các câu sai phía trên và làm lại bài!`}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPlayerAssessmentAnswers({});
                                        setPlayerAssessmentSubmitted(false);
                                        setPlayerAssessmentError(null);
                                      }}
                                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600"
                                    >
                                      🔄 Làm lại bài kiểm tra
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Attempt History for this Assessment */}
                              {attemptsForCurrentAct.length > 0 && (
                                <div className="pt-3 border-t border-slate-500/15 space-y-1.5">
                                  <div className="text-xs font-bold text-slate-400">
                                    Lịch sử các lần làm bài kiểm tra này ({attemptsForCurrentAct.length} lần):
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {attemptsForCurrentAct.map((att, idx) => (
                                      <span
                                        key={att.id}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                                          att.passed
                                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                                            : 'border-rose-500/30 bg-rose-500/10 text-rose-500'
                                        }`}
                                      >
                                        Lần {attemptsForCurrentAct.length - idx}: {att.scorePct}% (
                                        {att.correctCount}/{att.totalQuestions}) ·{' '}
                                        {att.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* 9. SUMMARY (Real Score, Weak Points Analysis & Next Lesson CTA) */}
                    {currentActivity.type === 'summary' && (
                      <div className="space-y-5 py-4">
                        <div className="text-center space-y-2">
                          <Trophy className="w-12 h-12 text-amber-500 mx-auto" />
                          <h4 className="text-2xl font-bold">
                            Tổng kết Bài học: {currentLesson?.title}
                          </h4>
                          <p className="text-xs text-slate-400">
                            Điểm kiểm tra cuối bài thực tế:{' '}
                            <strong className="text-emerald-500">
                              {progressRecord?.assessmentScorePct !== undefined
                                ? `${progressRecord.assessmentScorePct}%`
                                : 'Chưa làm bài kiểm tra'}
                            </strong>{' '}
                            · Số bước đã hoàn thành:{' '}
                            <strong>
                              {completedIds.length}/{activities.length}
                            </strong>
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div
                            className={`p-4 rounded-2xl border ${
                              darkMode
                                ? 'bg-slate-800/50 border-slate-700'
                                : 'bg-slate-50 border-slate-200'
                            } space-y-2`}
                          >
                            <div className="text-xs font-bold text-blue-600 uppercase">
                              Phân tích điểm yếu & Từ cần lưu ý
                            </div>
                            {lessonWords.filter((w) => w.status === 'new').length > 0 ? (
                              <p className="text-xs text-slate-400">
                                Các từ còn ở trạng thái Mới (New) cần ưu tiên ôn SRS hôm nay:{' '}
                                <strong>
                                  {lessonWords
                                    .filter((w) => w.status === 'new')
                                    .map((w) => `${w.hanzi} (${w.meaning})`)
                                    .join(', ')}
                                </strong>
                              </p>
                            ) : (
                              <p className="text-xs text-emerald-500">
                                Tất cả từ vựng trong bài đều đã được đưa vào chu kỳ ôn tập SRS!
                              </p>
                            )}
                          </div>

                          <div
                            className={`p-4 rounded-2xl border ${
                              darkMode
                                ? 'bg-slate-800/50 border-slate-700'
                                : 'bg-slate-50 border-slate-200'
                            } space-y-2`}
                          >
                            <div className="text-xs font-bold text-emerald-500 uppercase">
                              Gợi ý Bài học tiếp theo
                            </div>
                            <p className="text-xs text-slate-400">
                              Sau khi bấm &quot;Hoàn thành Bài học&quot;, bạn có thể chuyển sang bài tiếp theo trong lộ trình hoặc sang Lộ trình Giao tiếp để luyện đóng vai phản xạ.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Focus Player Footer Controls (P0 Fix: NO hardcoded 100 score!) */}
                  <div
                    className={`px-6 py-4 border-t flex items-center justify-between gap-3 ${
                      darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={playerStepIndex === 0}
                      onClick={() => {
                        setPlayerStepIndex((i) => Math.max(0, i - 1));
                        setPlayerAssessmentError(null);
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-500/20 disabled:opacity-40 min-h-[44px]"
                    >
                      ← Bước trước
                    </button>

                    {playerStepIndex + 1 < activities.length ? (
                      <button
                        type="button"
                        onClick={() => completePlayerActivityAndAdvance(false)}
                        className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm min-h-[44px] ${
                          (currentActivity.type === 'practice_quiz' ||
                            currentActivity.type === 'final_assessment') &&
                          !hasPassedCurrentAssessment
                            ? 'bg-slate-500 cursor-not-allowed opacity-70'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        Hoàn thành bước này & Tiếp tục →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => completePlayerActivityAndAdvance(true)}
                        className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm min-h-[44px]"
                      >
                        ✓ Hoàn thành Bài học & Lưu Tiến độ
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* ====================================================================
          MODAL 0A: LOGIN / ONBOARDING & LEARNER HSK GOAL PROFILE
      ==================================================================== */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-3xl border p-6 space-y-5 shadow-2xl ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white font-bold flex items-center justify-center">
                  汉
                </div>
                <div>
                  <h3 className="font-bold text-base">Hồ sơ Học viên & Mục tiêu HSK</h3>
                  <p className="text-xs text-slate-400">
                    Đồng bộ Streak hàng ngày & lộ trình đề trộn HSK
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-500/10 text-xs font-bold">
              {(
                [
                  { id: 'login', label: 'Đăng nhập' },
                  { id: 'register', label: 'Đăng ký mới' },
                  { id: 'goal', label: 'Mục tiêu HSK' }
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAuthTab(t.id)}
                  className={`flex-1 py-2 rounded-lg transition ${
                    authTab === t.id ? 'bg-rose-600 text-white' : 'text-slate-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Tên học viên</label>
                <input
                  type="text"
                  value={userProfile.name}
                  onChange={(e) =>
                    setUserProfile({ ...userProfile, name: e.target.value })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Email đồng bộ</label>
                <input
                  type="email"
                  value={userProfile.email}
                  onChange={(e) =>
                    setUserProfile({ ...userProfile, email: e.target.value })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Lộ trình luyện thi mục tiêu
                </label>
                <select
                  value={userProfile.targetTrack}
                  onChange={(e) =>
                    setUserProfile({
                      ...userProfile,
                      targetTrack: e.target.value as 'HSK 1' | 'HSK 2' | 'HSK Sơ cấp (1+2)'
                    })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <option value="HSK 1">Chinh phục HSK 1 (150 từ)</option>
                  <option value="HSK 2">Chinh phục HSK 2 (300 từ)</option>
                  <option value="HSK Sơ cấp (1+2)">HSK Sơ cấp (Đề trộn HSK 1 + 2)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsAuthModalOpen(false);
                showToast(`Xin chào ${userProfile.name}! Đã lưu lộ trình ${userProfile.targetTrack}.`);
              }}
              className="w-full py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-md"
            >
              Lưu hồ sơ & Tiếp tục chuỗi {streakDays} ngày Streak 🔥
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 0B: CUSTOM HSK EXAM BUILDER (TỰ XÂY DỰNG ĐỀ HSK 1, 2, ĐỀ TRỘN 1+2)
      ==================================================================== */}
      {isBuildExamOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg rounded-3xl border p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                Tự Xây Dựng Đề Luyện HSK (HSK 1 · HSK 2 · Đề Trộn 1+2)
              </h3>
              <button
                type="button"
                onClick={() => setIsBuildExamOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomExam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Tên đề luyện *
                </label>
                <input
                  type="text"
                  required
                  value={newExamTitle}
                  onChange={(e) => setNewExamTitle(e.target.value)}
                  placeholder="VD: Đề tổng ôn HSK 1 + 2 tuần này"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Cấu trúc / Dạng đề
                  </label>
                  <select
                    value={newExamMode}
                    onChange={(e) =>
                      setNewExamMode(
                        e.target.value as 'hsk1' | 'hsk2' | 'elementary' | 'mixed_adaptive'
                      )
                    }
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="mixed_adaptive">Đề Trộn 1 + 2 (Ưu tiên từ yếu SRS)</option>
                    <option value="elementary">Đề Chuẩn HSK Sơ cấp (Trộn đều 1 + 2)</option>
                    <option value="hsk1">Đề riêng HSK 1</option>
                    <option value="hsk2">Đề riêng HSK 2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Thời gian làm bài (Phút)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={newExamDuration}
                    onChange={(e) => setNewExamDuration(Number(e.target.value) || 12)}
                    className={`w-full px-3.5 py-2 rounded-xl border text-sm outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Optional Custom Question Adder */}
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-500">
                    + Tự thêm câu hỏi riêng vào đề ({draftCustomQuestions.length} câu đã thêm)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customQHanzi}
                    onChange={(e) => setCustomQHanzi(e.target.value)}
                    placeholder="Chữ Hán / Câu hỏi (VD: 没关系)"
                    className={`px-3 py-2 rounded-xl border text-xs outline-none ${
                      darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                  <input
                    type="text"
                    value={customQCorrect}
                    onChange={(e) => setCustomQCorrect(e.target.value)}
                    placeholder="Đáp án đúng (VD: Không sao đâu)"
                    className={`px-3 py-2 rounded-xl border text-xs outline-none ${
                      darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                  <input
                    type="text"
                    value={customQWrong1}
                    onChange={(e) => setCustomQWrong1(e.target.value)}
                    placeholder="Đáp án nhiễu 1 (VD: Xin lỗi)"
                    className={`px-3 py-2 rounded-xl border text-xs outline-none ${
                      darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                  <input
                    type="text"
                    value={customQWrong2}
                    onChange={(e) => setCustomQWrong2(e.target.value)}
                    placeholder="Đáp án nhiễu 2 (VD: Xin chào)"
                    className={`px-3 py-2 rounded-xl border text-xs outline-none ${
                      darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddDraftQuestion}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/15 text-indigo-500 hover:bg-indigo-500/25"
                >
                  + Thêm câu hỏi này vào đề
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBuildExamOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-500/20"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                >
                  Tạo Đề & Bắt đầu Thi Thử
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 1: ADD / EDIT VOCABULARY WORD (With Lesson & Level Link)
      ==================================================================== */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg rounded-3xl border p-6 space-y-5 shadow-2xl ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editingWord ? 'Chỉnh sửa từ vựng' : 'Thêm từ vựng Tiếng Trung mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddEditOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWord} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Hán tự (Hanzi) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.hanzi}
                    onChange={(e) =>
                      setFormState({ ...formState, hanzi: e.target.value })
                    }
                    placeholder="VD: 你好"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-base outline-none ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                    style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Pinyin (có dấu thanh) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.pinyin}
                    onChange={(e) =>
                      setFormState({ ...formState, pinyin: e.target.value })
                    }
                    placeholder="VD: nǐ hǎo"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div>
                <span className="block text-[11px] text-slate-400 mb-1">
                  Chèn nhanh dấu thanh Pinyin:
                </span>
                <div className="flex flex-wrap gap-1">
                  {TONE_MARKS.map((mark) => (
                    <button
                      key={mark}
                      type="button"
                      onClick={() =>
                        setFormState((prev) => ({
                          ...prev,
                          pinyin: prev.pinyin + mark
                        }))
                      }
                      className={`px-2 py-0.5 rounded text-xs font-medium border transition ${
                        darkMode
                          ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                          : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {mark}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Thuộc Bài học (Lesson)
                  </label>
                  <select
                    value={formState.lessonId || ''}
                    onChange={(e) => {
                      const lesId = e.target.value;
                      const les = lessonById.get(lesId);
                      setFormState({
                        ...formState,
                        lessonId: lesId || undefined,
                        levelId: les ? les.levelId : formState.levelId
                      });
                    }}
                    className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="">Từ vựng độc lập (Standalone)</option>
                    {lessons.map((les) => {
                      const lvl = levelById.get(les.levelId);
                      return (
                        <option key={les.id} value={les.id}>
                          {lvl ? `[${lvl.name}] ` : ''}
                          {les.title}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Cấp độ (Course Level)
                  </label>
                  <select
                    value={formState.levelId || ''}
                    onChange={(e) =>
                      setFormState({ ...formState, levelId: e.target.value || undefined })
                    }
                    className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="">Chưa gắn cấp độ</option>
                    {levels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Nghĩa Tiếng Việt (Meaning) *
                </label>
                <input
                  type="text"
                  required
                  value={formState.meaning}
                  onChange={(e) =>
                    setFormState({ ...formState, meaning: e.target.value })
                  }
                  placeholder="VD: Xin chào"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Câu ví dụ (Example Sentence)
                </label>
                <textarea
                  rows={2}
                  value={formState.example_sentence}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      example_sentence: e.target.value
                    })
                  }
                  placeholder="VD: 你好！很高兴认识你。"
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm outline-none ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                  style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                    darkMode
                      ? 'border-slate-700 bg-slate-800'
                      : 'border-slate-200 bg-slate-100'
                  }`}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                >
                  {editingWord ? 'Lưu thay đổi' : 'Thêm từ vựng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: ADD NEW LESSON IN ACTIVE LEVEL
      ==================================================================== */}
      {isAddLessonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                Thêm Bài học vào {activeLevel?.name || 'Khóa học'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddLessonModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Tên bài học (Lesson Title) *
                </label>
                <input
                  type="text"
                  required
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  placeholder="VD: Bài 2: Cảm ơn bạn (谢谢你)"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Mô tả ngắn (Description)
                </label>
                <textarea
                  rows={2}
                  value={newLessonDesc}
                  onChange={(e) => setNewLessonDesc(e.target.value)}
                  placeholder="VD: Các mẫu câu cảm ơn và đáp lại lịch sự..."
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm outline-none ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddLessonModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                    darkMode
                      ? 'border-slate-700 bg-slate-800'
                      : 'border-slate-200 bg-slate-100'
                  }`}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Tạo Bài học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 3: BULK IMPORT / EXPORT (CSV & JSON)
      ==================================================================== */}
      {isImportExportOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-xl rounded-3xl border p-6 space-y-5 shadow-2xl ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportExportMode('export')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                    importExportMode === 'export'
                      ? 'bg-rose-600 text-white'
                      : darkMode
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Export ({words.length} từ)
                </button>
                <button
                  type="button"
                  onClick={() => setImportExportMode('import')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                    importExportMode === 'import'
                      ? 'bg-rose-600 text-white'
                      : darkMode
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Bulk Import (CSV / JSON)
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsImportExportOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {importExportMode === 'export' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExportFormat('json')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      exportFormat === 'json'
                        ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                        : darkMode
                        ? 'border-slate-700 bg-slate-800'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    <span>JSON Format</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      exportFormat === 'csv'
                        ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                        : darkMode
                        ? 'border-slate-700 bg-slate-800'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>CSV Spreadsheet</span>
                  </button>
                </div>

                <textarea
                  readOnly
                  rows={8}
                  value={exportPreviewString}
                  className={`w-full p-3 rounded-xl border font-mono text-xs outline-none ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        exportPreviewString,
                        `Copied ${exportFormat.toUpperCase()} to clipboard!`
                      )
                    }
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                      darkMode
                        ? 'border-slate-700 bg-slate-800 hover:bg-slate-700'
                        : 'border-slate-200 bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy {exportFormat.toUpperCase()}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadExport}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải file .{exportFormat}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border border-dashed border-rose-500/50 text-rose-500 font-semibold hover:bg-rose-500/5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Chọn file .CSV hoặc .JSON</span>
                    <input
                      type="file"
                      accept=".csv,.json,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setImportText(
                        `hanzi,pinyin,meaning,example_sentence\n谢谢,xiè xie,Cảm ơn,谢谢你的帮助。\n不客气,bù kè qi,Đừng khách sáo,不客气，这是应该的。`
                      )
                    }
                    className="text-indigo-500 hover:underline font-medium"
                  >
                    Điền dữ liệu CSV mẫu
                  </button>
                </div>

                <textarea
                  rows={6}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Dán nội dung CSV (hanzi,pinyin,meaning,example_sentence) hoặc mảng JSON vào đây..."
                  className={`w-full p-3 rounded-xl border font-mono text-xs outline-none ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-200'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span>Chế độ:</span>
                    <button
                      type="button"
                      onClick={() => setImportMergeMode('merge')}
                      className={`px-2.5 py-1 rounded-lg font-medium ${
                        importMergeMode === 'merge'
                          ? 'bg-indigo-600 text-white'
                          : darkMode
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Gộp thêm (Merge)
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMergeMode('replace')}
                      className={`px-2.5 py-1 rounded-lg font-medium ${
                        importMergeMode === 'replace'
                          ? 'bg-rose-600 text-white'
                          : darkMode
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Ghi đè (Replace)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleBulkImportSubmit}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    Nhập dữ liệu (Import)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


export default function Page() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Đang tải HanziFlow...</div>}>
      <App />
    </React.Suspense>
  );
}
