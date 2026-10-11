// Dry run: builds the digest and writes it to preview.html instead of emailing.
import { writeFileSync } from "node:fs";
import { run } from "./handler.js";

const html = await run({ send: process.argv.includes("--send") });
writeFileSync("preview.html", html);
console.log("Wrote preview.html");
