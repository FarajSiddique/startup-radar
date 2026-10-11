// App Store radar: finds apps with big demand but unhappy users.
//   1. Candidate pool from each genre's Top Grossing + Top Free charts
//   2. Ratings via the Lookup API, keeping apps between the demand floor and the giants
//   3. Recent reviews for the strongest candidates in each genre
//   4. Best-scoring apps, capped per genre
import { GENRES, type Genre } from "../../config/genres.js";
import { CONFIG } from "../../config/settings.js";
import { IGNORE } from "../../config/watchlist.js";
import { chunk } from "../../lib/array.js";
import { mapLimit } from "../../lib/concurrency.js";
import type { AppReview, UnhappyApp } from "../../types.js";
import {
  fetchChart,
  fetchRecentReviews,
  lookupApps,
  type ChartFeed,
  type LookupResult,
} from "./api.js";
import {
  demandScore,
  dissatisfactionScore,
  MIN_RECENT_REVIEWS,
  priorScore,
  round2,
} from "./scoring.js";

// Apple throttles bursts, so cap requests in flight per endpoint
const CHART_CONCURRENCY = 6;
const LOOKUP_CONCURRENCY = 2;
const REVIEW_CONCURRENCY = 4;

const LOOKUP_BATCH_SIZE = 100; // Lookup API's max ids per call
const MAX_COMPLAINTS = 8; // 1–2★ reviews passed to Claude per app
const MAX_COMPLAINT_CHARS = 500;

// Top grossing = people pay = real demand; top free widens the pool
const CHARTS: { feed: ChartFeed; label: string }[] = [
  { feed: "topgrossingapplications", label: "Top Grossing" },
  { feed: "topfreeapplications", label: "Top Free" },
];

// `home` is the first scanned genre an app charted in, used for the per-genre caps
type ChartedApp = { charts: string[]; home: string };
type Candidate = ChartedApp & { app: LookupResult; demand: number; prior: number };
type ScoredApp = UnhappyApp & { home: string };

// Rotate through GENRES a few per day so the digest doesn't show the same apps every morning
export function todaysGenres(date = new Date()): Genre[] {
  const n = Math.min(CONFIG.radar.genresPerDay, GENRES.length);
  const day = Math.floor(date.getTime() / 86_400_000);

  return Array.from({ length: n }, (_, i) => GENRES[(day * n + i) % GENRES.length]);
}

export async function findUnhappyApps(genres: Genre[] = todaysGenres()): Promise<UnhappyApp[]> {
  const pool = await chartedApps(genres);
  const candidates = await rankCandidates(pool);

  const toCheck = genres.flatMap((genre) =>
    candidates.filter((c) => c.home === genre.name).slice(0, CONFIG.radar.reviewChecksPerGenre),
  );
  const scored = await mapLimit(toCheck, REVIEW_CONCURRENCY, scoreCandidate);

  return pickShortlist(scored, genres.length);
}

// 1. Every app on the scanned charts, keyed by app id
async function chartedApps(genres: Genre[]): Promise<Map<string, ChartedApp>> {
  const pool = new Map<string, ChartedApp>();
  const feeds = genres.flatMap((genre) => CHARTS.map((chart) => ({ genre, ...chart })));

  await mapLimit(feeds, CHART_CONCURRENCY, async ({ genre, feed, label }) => {
    try {
      const ids = await fetchChart(feed, genre.id);

      ids.forEach((id, i) => {
        const app = pool.get(id) ?? { charts: [], home: genre.name };
        app.charts.push(`${label} #${i + 1} in ${genre.name}`);
        pool.set(id, app);
      });
    } catch (err) {
      console.error(`[appStoreRadar] ${label} ${genre.name} failed`, err);
    }
  });

  return pool;
}

// 2. Drop tiny apps and untouchable giants, then rank the rest so the review budget goes to the
//    likeliest targets
async function rankCandidates(pool: Map<string, ChartedApp>): Promise<Candidate[]> {
  const { minRatings, maxRatings } = CONFIG.radar;
  const ids = [...pool.keys()].filter((id) => !IGNORE.includes(id));
  const batches = await mapLimit(chunk(ids, LOOKUP_BATCH_SIZE), LOOKUP_CONCURRENCY, lookupApps);

  return batches
    .flat()
    .filter((app) => app.userRatingCount >= minRatings && app.userRatingCount <= maxRatings)
    .map((app) => {
      const { charts, home } = pool.get(String(app.trackId))!;
      const isTopGrossing = charts.some((c) => c.startsWith("Top Grossing"));
      const demand = demandScore(app.userRatingCount, isTopGrossing);

      return { app, charts, home, demand, prior: priorScore(demand, app.averageUserRating) };
    })
    .sort((a, b) => b.prior - a.prior);
}

// 3. Recent reviews catch apps whose lifetime rating hides a recent slide (new paywall, broken
//    update)
async function scoreCandidate({ app, charts, home, demand }: Candidate): Promise<ScoredApp> {
  const recent = await fetchRecentReviews(String(app.trackId)).catch(() => [] as AppReview[]);
  const negative = recent.filter((r) => r.rating <= 2);
  const negativeShare =
    recent.length >= MIN_RECENT_REVIEWS ? negative.length / recent.length : null;
  const dissatisfaction = dissatisfactionScore(app.averageUserRating, negativeShare);

  return {
    name: app.trackName,
    seller: app.sellerName,
    genre: app.primaryGenreName,
    url: app.trackViewUrl,
    price: app.price,
    rating: round2(app.averageUserRating),
    ratingCount: app.userRatingCount,
    charts,
    recentReviews: recent.length,
    recentNegativeShare: negativeShare === null ? null : round2(negativeShare),
    complaints: negative
      .slice(0, MAX_COMPLAINTS)
      .map((r) => ({ ...r, body: r.body.slice(0, MAX_COMPLAINT_CHARS) })),
    score: round2(demand * dissatisfaction),
    home,
  };
}

// 4. Best scores first, capped per genre so one category (e.g. dating in Lifestyle) can't take over
function pickShortlist(scored: ScoredApp[], genreCount: number): UnhappyApp[] {
  const { shortlist } = CONFIG.radar;
  const perGenre = Math.ceil(shortlist / genreCount) + 1;
  const taken = new Map<string, number>();

  return scored
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .filter((a) => {
      const n = taken.get(a.home) ?? 0;
      taken.set(a.home, n + 1);
      return n < perGenre;
    })
    .slice(0, shortlist)
    .map(({ home, ...app }) => app);
}
