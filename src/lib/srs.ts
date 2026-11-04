// ============================================================================
// 2. SPACED REPETITION (SRS) ENGINE (src/lib/srs.ts)
// ============================================================================

import type { VocabularyItem, ReviewRating, VocabStatus } from '@/types/vocabulary';

export const DAY_MS = 24 * 60 * 60 * 1000;

export function getStartOfTodayMs(referenceTime?: number): number {
  if (referenceTime === 0) return 0;
  const now = referenceTime !== undefined ? new Date(referenceTime) : new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

export function isDueForReview(item: VocabularyItem, referenceTime = Date.now()): boolean {
  return item.next_review_date <= referenceTime;
}

export function calculateNextReview(
  item: VocabularyItem,
  rating: ReviewRating,
  now = Date.now()
): VocabularyItem {
  const currentInterval = Math.max(0, item.interval || 0);
  const currentEase = item.ease_factor ?? 2.5;
  const currentReps = item.repetitions ?? 0;

  let nextInterval = 0;
  let nextEase = currentEase;
  let nextReps = currentReps;
  let nextStatus: VocabStatus = item.status;

  if (rating === 'again') {
    nextInterval = 0;
    nextReps = 0;
    nextEase = Math.max(1.3, currentEase - 0.2);
    nextStatus = 'learning';
  } else if (rating === 'hard') {
    nextInterval = currentInterval === 0 ? 1 : Math.max(1, Math.round(currentInterval * 1.2));
    nextReps = currentReps + 1;
    nextEase = Math.max(1.3, currentEase - 0.15);
    nextStatus = nextInterval >= 14 ? 'graduated' : 'learning';
  } else if (rating === 'good') {
    if (currentInterval === 0) {
      nextInterval = 1;
    } else if (currentInterval === 1) {
      nextInterval = 3;
    } else {
      nextInterval = Math.max(currentInterval + 1, Math.round(currentInterval * currentEase));
    }
    nextReps = currentReps + 1;
    nextStatus = nextInterval >= 14 ? 'graduated' : 'learning';
  } else if (rating === 'easy') {
    if (currentInterval === 0) {
      nextInterval = 4;
    } else if (currentInterval <= 2) {
      nextInterval = 7;
    } else {
      nextInterval = Math.max(currentInterval + 2, Math.round(currentInterval * currentEase * 1.3));
    }
    nextReps = currentReps + 1;
    nextEase = Math.min(3.0, currentEase + 0.15);
    nextStatus = nextInterval >= 7 ? 'graduated' : 'learning';
  }

  const nextReviewDate =
    nextInterval === 0
      ? now + 5 * 60 * 1000
      : getStartOfTodayMs() + nextInterval * DAY_MS;

  return {
    ...item,
    status: nextStatus,
    interval: nextInterval,
    ease_factor: Number(nextEase.toFixed(2)),
    repetitions: nextReps,
    next_review_date: nextReviewDate,
    last_reviewed_at: now
  };
}

export function previewRatingIntervals(item: VocabularyItem): Record<ReviewRating, string> {
  const ratings: ReviewRating[] = ['again', 'hard', 'good', 'easy'];
  const result = {} as Record<ReviewRating, string>;
  ratings.forEach((r) => {
    const updated = calculateNextReview(item, r);
    result[r] = updated.interval === 0 ? '< 10m' : `${updated.interval}d`;
  });
  return result;
}
