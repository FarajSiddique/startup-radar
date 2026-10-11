import { productHunt, showHN, badReviews, safe } from "./sources.js";
import { unhappyApps } from "./appstore.js";
import { buildDigest } from "./summarize.js";
import { sendDigest } from "./email.js";

export async function run({ send = true } = {}) {
  const [ph, hn, apps, reviews] = await Promise.all([
    safe("productHunt", productHunt),
    safe("showHN", showHN),
    safe("appStoreRadar", () => unhappyApps()),
    safe("badReviews", badReviews),
  ]);
  const launches = [...ph, ...hn];
  console.log(`productHunt=${ph.length} showHN=${hn.length} unhappyApps=${apps.length} watchlistReviews=${reviews.length}`);

  const html = await buildDigest(launches, apps, reviews);
  if (send) await sendDigest(html);
  return html;
}

export const handler = async () => { await run(); return { ok: true }; };
