// Dry run: builds the digest and writes it to preview.html instead of emailing.
// `npm run local -- --send` emails it as well.
import { writeFileSync } from "node:fs";
import { runDigest } from "../pipeline.js";

const html = await runDigest({ send: process.argv.includes("--send") });

writeFileSync("preview.html", html);
console.log("Wrote preview.html");
