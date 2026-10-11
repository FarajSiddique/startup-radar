// Prints the App Store radar shortlist without calling Claude. `npm run scan -- --all` scans every genre.
import { GENRES } from "./config.js";
import { todaysGenres, unhappyApps } from "./appstore.js";

const genres = process.argv.includes("--all") ? GENRES : todaysGenres();
console.log(`Genres: ${genres.map((g) => g.name).join(", ")}\n`);
for (const a of await unhappyApps(genres)) {
  const neg = a.recentNegativeShare === null ? "  n/a" : `${Math.round(a.recentNegativeShare * 100)}%`.padStart(5);
  console.log(`${a.score.toFixed(2).padStart(5)}  ${a.rating.toFixed(2)}★ ${a.ratingCount.toLocaleString().padStart(9)}  ${neg} recent 1–2★  ${a.name.slice(0, 34).padEnd(34)}  ${a.charts[0]}`);
}
