// Apple's public, keyless iTunes endpoints. Response types cover only the fields we read.
import { CONFIG } from "../../config/settings.js";
import { getJson } from "../../lib/http.js";
import type { AppReview } from "../../types.js";

const ITUNES = "https://itunes.apple.com";

export type ChartFeed = "topgrossingapplications" | "topfreeapplications";

export type LookupResult = {
  trackId: number;
  trackName: string;
  sellerName: string;
  primaryGenreName: string;
  trackViewUrl: string;
  price: number;
  averageUserRating: number;
  userRatingCount: number;
};

type Label = { label: string };
type ChartEntry = { id: { attributes: { "im:id": string } } };
type ReviewEntry = { "im:rating"?: Label; title?: Label; content?: Label };
type RssFeed<Entry> = { feed?: { entry?: Entry | Entry[] } };

// Apple's RSS returns a bare object instead of an array when there's exactly one entry
const entries = <Entry>(json: RssFeed<Entry>): Entry[] =>
  ([] as Entry[]).concat(json.feed?.entry ?? []);

// App ids on one of a genre's top-100 charts, best-ranked first
export async function fetchChart(feed: ChartFeed, genreId: number): Promise<string[]> {
  const json = await getJson<RssFeed<ChartEntry>>(
    `${ITUNES}/${CONFIG.country}/rss/${feed}/limit=100/genre=${genreId}/json`,
  );

  return entries(json).map((e) => e.id.attributes["im:id"]);
}

// Ratings and store metadata for up to 100 apps in one call
export async function lookupApps(ids: string[]): Promise<LookupResult[]> {
  const json = await getJson<{ results: LookupResult[] }>(
    `${ITUNES}/lookup?country=${CONFIG.country}&id=${ids.join(",")}`,
  );

  return json.results;
}

// Most recent written reviews for an app (up to 50, Apple's customer-review RSS)
export async function fetchRecentReviews(appId: string): Promise<AppReview[]> {
  const json = await getJson<RssFeed<ReviewEntry>>(
    `${ITUNES}/${CONFIG.country}/rss/customerreviews/page=1/id=${appId}/sortby=mostrecent/json`,
  );

  return entries(json)
    .map((e) => ({
      rating: Number(e["im:rating"]?.label),
      title: e.title?.label ?? "",
      body: e.content?.label ?? "",
    }))
    .filter((r) => r.rating > 0);
}
