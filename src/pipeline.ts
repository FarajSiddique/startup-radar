import { buildDigest } from "./digest/build.js";
import { sendDigest } from "./digest/send.js";
import { findUnhappyApps } from "./sources/app-store/radar.js";
import { fetchProductHuntLaunches } from "./sources/product-hunt.js";
import { fetchShowHNLaunches } from "./sources/show-hn.js";
import { fetchWatchlistReviews } from "./sources/watchlist-reviews.js";

// Gathers every source in parallel, has Claude write the digest, and emails it unless told not to.
// Returns the digest HTML.
export async function runDigest({ send = true } = {}): Promise<string> {
  const [productHunt, showHN, apps, reviews] = await Promise.all([
    safe("productHunt", fetchProductHuntLaunches),
    safe("showHN", fetchShowHNLaunches),
    safe("appStoreRadar", findUnhappyApps),
    safe("badReviews", fetchWatchlistReviews),
  ]);

  console.log(
    `productHunt=${productHunt.length} showHN=${showHN.length} ` +
      `unhappyApps=${apps.length} watchlistReviews=${reviews.length}`,
  );

  const html = await buildDigest({ launches: [...productHunt, ...showHN], apps, reviews });
  if (send) await sendDigest(html);

  return html;
}

// One failing source shouldn't kill the whole digest
async function safe<T>(name: string, fetchSource: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fetchSource();
  } catch (err) {
    console.error(`[${name}] failed`, err);
    return [];
  }
}
