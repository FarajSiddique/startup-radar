import { CONFIG } from "../config/settings.js";
import { hoursAgo } from "../lib/time.js";
import type { Launch } from "../types.js";

const MIN_POINTS = 5; // drop the zero-traction noise

type Hit = { objectID: string; title: string; url: string | null; points?: number };

// Recent "Show HN" posts via the public Algolia API (no key needed)
export async function fetchShowHNLaunches(): Promise<Launch[]> {
  const after = Math.floor(hoursAgo(CONFIG.lookbackHours).getTime() / 1000);
  const res = await fetch(
    "https://hn.algolia.com/api/v1/search_by_date" +
      `?tags=show_hn&numericFilters=created_at_i>${after}&hitsPerPage=40`,
  );
  const json = (await res.json()) as { hits: Hit[] };

  return json.hits
    .filter((hit) => (hit.points ?? 0) >= MIN_POINTS)
    .map((hit) => ({
      source: "Show HN",
      name: hit.title.replace(/^Show HN:\s*/i, ""),
      tagline: "",
      url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
      score: hit.points,
    }));
}
