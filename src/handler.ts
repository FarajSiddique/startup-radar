// AWS Lambda entry point (template.yaml: Handler handler.handler), run daily by the schedule there
import { runDigest } from "./pipeline.js";

export const handler = async () => {
  await runDigest();
  return { ok: true };
};
