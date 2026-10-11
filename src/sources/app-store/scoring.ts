// Scoring math for the App Store radar: score = demand × dissatisfaction.

// Fewer recent reviews than this is too small a sample to judge
export const MIN_RECENT_REVIEWS = 10;

const TOP_GROSSING_BOOST = 1.5;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export const round2 = (x: number) => Math.round(x * 100) / 100;

// 4.7★ → 0, 2.5★ → 1
const lowRating = (rating: number) => clamp01((4.7 - rating) / 2.2);

// Written reviews skew negative even for loved apps (~30% are 1–2★ at the median), so score the
// excess: 30% → 0, 90% → 1
const recentAnger = (negativeShare: number) => clamp01((negativeShare - 0.3) / 0.6);

// Rating count on a log scale, with extra weight when people are paying (Top Grossing)
export function demandScore(ratingCount: number, isTopGrossing: boolean): number {
  return Math.log10(ratingCount) * (isTopGrossing ? TOP_GROSSING_BOOST : 1);
}

// Ranks candidates before their reviews are fetched. Weighted toward demand so highly rated apps
// still get their recent reviews checked.
export function priorScore(demand: number, rating: number): number {
  return demand * (0.5 + lowRating(rating));
}

// 0–1. Leans on recent reviews when there are enough to judge, since they catch a slide the
// lifetime rating hides; negativeShare is null when there aren't.
export function dissatisfactionScore(rating: number, negativeShare: number | null): number {
  if (negativeShare === null) return lowRating(rating);

  return 0.6 * recentAnger(negativeShare) + 0.4 * lowRating(rating);
}
