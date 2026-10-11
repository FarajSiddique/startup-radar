import { productHunt, showHN, appStoreTop, badReviews, safe } from "./sources.js";
import { buildDigest } from "./summarize.js";
import { sendDigest } from "./email.js";

export async function run({ send = true } = {}) {
  const [ph, hn, top, reviews] = await Promise.all([
    safe("productHunt", productHunt),
    safe("showHN", showHN),
    safe("appStoreTop", appStoreTop),
    safe("badReviews", badReviews),
  ]);
  const launches = [...ph, ...hn, ...top];
  console.log(`launches=${launches.length} reviews=${reviews.length}`);

  const html = await buildDigest(launches, reviews);
  if (send) await sendDigest(html);
  return html;
}

export const handler = async () => { await run(); return { ok: true }; };
