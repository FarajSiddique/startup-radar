// Prints the App Store radar shortlist without calling Claude. `npm run scan -- --all` scans every genre.
import { GENRES } from "../config/genres.js";
import { findUnhappyApps, todaysGenres } from "../sources/app-store/radar.js";
import type { UnhappyApp } from "../types.js";

const genres = process.argv.includes("--all") ? GENRES : todaysGenres();
console.log(`Genres: ${genres.map((g) => g.name).join(", ")}\n`);

for (const app of await findUnhappyApps(genres)) {
  console.log(formatRow(app));
}

// score  rating★ ratingCount  recent 1–2★ share  name  top chart position
function formatRow(app: UnhappyApp): string {
  const negativeShare =
    app.recentNegativeShare === null
      ? "  n/a"
      : `${Math.round(app.recentNegativeShare * 100)}%`.padStart(5);

  return [
    app.score.toFixed(2).padStart(5),
    `${app.rating.toFixed(2)}★ ${app.ratingCount.toLocaleString().padStart(9)}`,
    `${negativeShare} recent 1–2★`,
    app.name.slice(0, 34).padEnd(34),
    app.charts[0],
  ].join("  ");
}
