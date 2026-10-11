import { CONFIG, GENRES, IGNORE, type Genre } from "./config.js";

export type AppReview = { rating: number; title: string; body: string };

// A high-demand app whose users are unhappy. Download counts aren't public, so rating count
// stands in for demand; dissatisfaction blends lifetime rating with the share of recent 1–2★ reviews.
export type UnhappyApp = {
  name: string; seller: string; genre: string; url: string; price: number;
  rating: number; ratingCount: number; charts: string[];
  recentReviews: number; recentNegativeShare: number | null; // null when too few recent reviews to judge
  complaints: AppReview[];
  score: number;
};

const getJson = async (url: string): Promise<any> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
};

// Apple's RSS returns a bare object instead of an array when there's exactly one entry
const entries = (json: any): any[] => [].concat(json.feed?.entry ?? []);

// Run fn over items with at most `limit` requests in flight (Apple throttles bursts)
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// Rotate through GENRES a few per day so the digest doesn't show the same apps every morning
export function todaysGenres(date = new Date()): Genre[] {
  const n = Math.min(CONFIG.radar.genresPerDay, GENRES.length);
  const day = Math.floor(date.getTime() / 86_400_000);
  return Array.from({ length: n }, (_, i) => GENRES[(day * n + i) % GENRES.length]);
}

// Most recent written reviews for an app (up to 50, Apple's customer-review RSS)
export async function fetchReviews(id: string): Promise<AppReview[]> {
  const json = await getJson(
    `https://itunes.apple.com/${CONFIG.country}/rss/customerreviews/page=1/id=${id}/sortby=mostrecent/json`
  );
  return entries(json)
    .map((e) => ({ rating: Number(e["im:rating"]?.label), title: e.title?.label ?? "", body: e.content?.label ?? "" }))
    .filter((r) => r.rating > 0);
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lowRating = (rating: number) => clamp01((4.7 - rating) / 2.2); // 4.7★ → 0, 2.5★ → 1
// Written reviews skew negative even for loved apps (~30% are 1–2★ at the median), so score the excess
const recentAnger = (negShare: number) => clamp01((negShare - 0.3) / 0.6); // 30% → 0, 90% → 1

export async function unhappyApps(genres: Genre[] = todaysGenres()): Promise<UnhappyApp[]> {
  const { minRatings, maxRatings, reviewChecksPerGenre, shortlist } = CONFIG.radar;

  // 1. Candidate pool: top grossing (people pay = real demand) + top free, per genre
  const charts = new Map<string, string[]>();
  const homeGenre = new Map<string, string>(); // first scanned genre an app charted in, for per-genre caps
  const feeds = genres.flatMap((g) => [["topgrossingapplications", "Top Grossing"], ["topfreeapplications", "Top Free"]].map(([path, label]) => ({ g, path, label })));
  await mapLimit(feeds, 6, async ({ g, path, label }) => {
    try {
      const json = await getJson(`https://itunes.apple.com/${CONFIG.country}/rss/${path}/limit=100/genre=${g.id}/json`);
      entries(json).forEach((e, i) => {
        const id = e.id.attributes["im:id"];
        charts.set(id, [...(charts.get(id) ?? []), `${label} #${i + 1} in ${g.name}`]);
        if (!homeGenre.has(id)) homeGenre.set(id, g.name);
      });
    } catch (err) { console.error(`[appStoreRadar] ${label} ${g.name} failed`, err); }
  });

  // 2. Ratings via the Lookup API (100 ids per call), dropping tiny apps and untouchable giants
  const ids = [...charts.keys()].filter((id) => !IGNORE.includes(id));
  const batches = Array.from({ length: Math.ceil(ids.length / 100) }, (_, i) => ids.slice(i * 100, (i + 1) * 100));
  const looked = (await mapLimit(batches, 2, (b) => getJson(`https://itunes.apple.com/lookup?country=${CONFIG.country}&id=${b.join(",")}`)))
    .flatMap((j) => j.results as any[]);
  const candidates = looked
    .filter((r) => r.userRatingCount >= minRatings && r.userRatingCount <= maxRatings)
    .map((r) => {
      const appCharts = charts.get(String(r.trackId)) ?? [];
      const demand = Math.log10(r.userRatingCount) * (appCharts.some((c) => c.startsWith("Top Grossing")) ? 1.5 : 1);
      // Weighted toward demand so highly rated apps still get their recent reviews checked
      return { r, appCharts, demand, home: homeGenre.get(String(r.trackId))!, prior: demand * (0.5 + lowRating(r.averageUserRating)) };
    })
    .sort((a, b) => b.prior - a.prior);
  const toCheck = genres.flatMap((g) => candidates.filter((c) => c.home === g.name).slice(0, reviewChecksPerGenre));

  // 3. Recent reviews catch apps whose lifetime rating hides a recent slide (new paywall, broken update)
  const scored = await mapLimit(toCheck, 4, async ({ r, appCharts, demand, home }): Promise<UnhappyApp & { home: string }> => {
    const recent = await fetchReviews(String(r.trackId)).catch(() => [] as AppReview[]);
    const negative = recent.filter((x) => x.rating <= 2);
    const negShare = recent.length >= 10 ? negative.length / recent.length : null;
    const dissatisfaction = negShare === null ? lowRating(r.averageUserRating) : 0.6 * recentAnger(negShare) + 0.4 * lowRating(r.averageUserRating);
    return {
      name: r.trackName, seller: r.sellerName, genre: r.primaryGenreName, url: r.trackViewUrl, price: r.price,
      rating: Math.round(r.averageUserRating * 100) / 100, ratingCount: r.userRatingCount, charts: appCharts,
      recentReviews: recent.length, recentNegativeShare: negShare === null ? null : Math.round(negShare * 100) / 100,
      complaints: negative.slice(0, 8).map((x) => ({ ...x, body: x.body.slice(0, 500) })),
      score: Math.round(demand * dissatisfaction * 100) / 100, home,
    };
  });

  // 4. Best-scoring apps, capped per genre so one category (e.g. dating in Lifestyle) can't take over
  const perGenre = Math.ceil(shortlist / genres.length) + 1;
  const taken = new Map<string, number>();
  return scored
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .filter((a) => { const n = taken.get(a.home) ?? 0; taken.set(a.home, n + 1); return n < perGenre; })
    .slice(0, shortlist)
    .map(({ home, ...a }) => a);
}
