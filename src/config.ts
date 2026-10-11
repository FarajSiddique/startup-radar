// Apps you want to watch for bad reviews. Grab the numeric id from the App Store URL:
// https://apps.apple.com/us/app/some-app/id1234567890  ->  "1234567890"
export const WATCHLIST: { id: string; name: string }[] = [
  // { id: "1234567890", name: "Some Budgeting App" },
];

// App ids the App Store radar should never surface (e.g. captive apps you've already seen)
export const IGNORE: string[] = [];

export type Genre = { id: number; name: string };

// App Store genres the radar scans (ids from Apple's genre list; games deliberately excluded)
export const GENRES: Genre[] = [
  { id: 6007, name: "Productivity" },
  { id: 6013, name: "Health & Fitness" },
  { id: 6015, name: "Finance" },
  { id: 6012, name: "Lifestyle" },
  { id: 6017, name: "Education" },
  { id: 6008, name: "Photo & Video" },
  { id: 6002, name: "Utilities" },
  { id: 6023, name: "Food & Drink" },
  { id: 6003, name: "Travel" },
  { id: 6000, name: "Business" },
];

export const CONFIG = {
  country: "us",
  lookbackHours: 24,
  model: "claude-sonnet-5-5",
  radar: {
    genresPerDay: 3,        // rotates through GENRES; all 10 are covered every ~4 days
    minRatings: 2_000,      // demand floor: rating count is the best public proxy for downloads
    maxRatings: 1_000_000,  // skip giants you can't realistically compete with
    reviewChecksPerGenre: 15, // candidates per genre whose recent reviews get pulled
    shortlist: 10,          // apps handed to Claude
  },
  toEmail: process.env.DIGEST_TO!,
  fromEmail: process.env.DIGEST_FROM!, // must be a verified SES identity
};
