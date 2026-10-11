// Runtime settings. Email addresses come from the environment (see .env.example / template.yaml).
export const CONFIG = {
  country: "us",
  lookbackHours: 24,
  model: "claude-sonnet-5-5",

  radar: {
    genresPerDay: 3, // rotates through GENRES; all 10 are covered every ~4 days
    minRatings: 2_000, // demand floor: rating count is the best public proxy for downloads
    maxRatings: 1_000_000, // skip giants you can't realistically compete with
    reviewChecksPerGenre: 15, // candidates per genre whose recent reviews get pulled
    shortlist: 10, // apps handed to Claude
  },

  toEmail: process.env.DIGEST_TO!,
  fromEmail: process.env.DIGEST_FROM!, // must be a verified SES identity
};
