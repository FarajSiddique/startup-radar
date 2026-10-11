import Anthropic from "@anthropic-ai/sdk";
import { CONFIG } from "./config.js";
import type { Launch, Review } from "./sources.js";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

const SYSTEM = `You write a daily startup-radar email for a full-stack engineer who builds mobile apps
and is hunting for app ideas to build or compete on. Be sharp and opinionated, skip filler.
Return ONLY an HTML fragment (no <html>/<body>), using simple inline styles that render in Gmail.

Sections, in order:
1. "Today's signal" — 2–3 sentences on the most interesting pattern across everything below.
2. "Launches worth a look" — the 6–8 most interesting launches. For each: name (linked), one line on
   what it does, and one line starting "Gap:" naming what it leaves open or how a mobile-first take could beat it.
3. "Pain points from bad reviews" — cluster the reviews into themes per app, ranked by how often they come up,
   with a short paraphrase of what users want. Skip this section if there are no reviews.
4. "Idea of the day" — one concrete mobile app concept that falls out of today's data: who it's for,
   the core loop, and why now. Then one question to pressure-test it.`;

export async function buildDigest(launches: Launch[], reviews: Review[]): Promise<string> {
  const msg = await client.messages.create({
    model: CONFIG.model,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{
      role: "user",
      content: `LAUNCHES (JSON):\n${JSON.stringify(launches)}\n\nBAD REVIEWS (JSON):\n${JSON.stringify(reviews)}`,
    }],
  });
  return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}
