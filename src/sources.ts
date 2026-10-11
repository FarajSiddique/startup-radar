import { CONFIG, WATCHLIST } from "./config.js";
import { fetchReviews } from "./appstore.js";

export type Launch = { source: string; name: string; tagline: string; url: string; score?: number };
export type Review = { app: string; rating: number; title: string; body: string };

const since = () => new Date(Date.now() - CONFIG.lookbackHours * 3600_000);

// Product Hunt (GraphQL v2) — needs a developer token from producthunt.com/v2/oauth/applications
export async function productHunt(): Promise<Launch[]> {
  const token = process.env.PRODUCT_HUNT_TOKEN;
  if (!token) return [];
  const query = `query($after: DateTime) {
    posts(postedAfter: $after, order: VOTES, first: 20) {
      edges { node { name tagline url votesCount } }
    }}`;
  const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { after: since().toISOString() } }),
  });
  const json: any = await res.json();
  return (json.data?.posts?.edges ?? []).map(({ node }: any) => ({
    source: "Product Hunt", name: node.name, tagline: node.tagline, url: node.url, score: node.votesCount,
  }));
}

// Hacker News "Show HN" via the public Algolia API (no key needed)
export async function showHN(): Promise<Launch[]> {
  const ts = Math.floor(since().getTime() / 1000);
  const res = await fetch(
    `https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&numericFilters=created_at_i>${ts}&hitsPerPage=40`
  );
  const json: any = await res.json();
  return json.hits
    .filter((h: any) => (h.points ?? 0) >= 5) // drop the zero-traction noise
    .map((h: any) => ({
      source: "Show HN", name: h.title.replace(/^Show HN:\s*/i, ""), tagline: "",
      url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`, score: h.points,
    }));
}

// 1–2 star reviews for each manually watchlisted app
export async function badReviews(): Promise<Review[]> {
  const all = await Promise.all(
    WATCHLIST.map(async (app) =>
      (await fetchReviews(app.id)).filter((r) => r.rating <= 2).map((r) => ({ app: app.name, ...r }))
    )
  );
  return all.flat();
}

// One failing source shouldn't kill the whole digest
export async function safe<T>(name: string, fn: () => Promise<T[]>): Promise<T[]> {
  try { return await fn(); } catch (err) { console.error(`[${name}] failed`, err); return []; }
}
