import { WATCHLIST } from "../config/watchlist.js";
import type { WatchlistReview } from "../types.js";
import { fetchRecentReviews } from "./app-store/api.js";

// Recent 1–2★ reviews for each app on the watchlist
export async function fetchWatchlistReviews(): Promise<WatchlistReview[]> {
  const perApp = await Promise.all(
    WATCHLIST.map(async (app) => {
      const reviews = await fetchRecentReviews(app.id);
      return reviews.filter((r) => r.rating <= 2).map((r) => ({ app: app.name, ...r }));
    }),
  );

  return perApp.flat();
}
