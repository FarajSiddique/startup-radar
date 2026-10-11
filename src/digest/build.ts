import Anthropic from "@anthropic-ai/sdk";
import { CONFIG } from "../config/settings.js";
import type { DigestInputs } from "../types.js";
import { buildUserMessage, SYSTEM_PROMPT } from "./prompt.js";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

// Has Claude write the digest as an HTML fragment
export async function buildDigest(inputs: DigestInputs): Promise<string> {
  const msg = await client.beta.messages.create({
    model: CONFIG.model,
    max_tokens: 16000, // thinking counts against this, so leave room beyond the ~3k-token digest
    // On a safety-classifier refusal, the API re-runs the request on a suitable fallback model
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(inputs) }],
  });

  if (msg.stop_reason === "refusal") {
    throw new Error(`Digest refused: ${msg.stop_details?.category ?? "unknown"}`);
  }
  if (msg.stop_reason === "max_tokens") {
    console.warn("Digest hit max_tokens; output may be truncated");
  }

  return msg.content.map((block) => (block.type === "text" ? block.text : "")).join("");
}
