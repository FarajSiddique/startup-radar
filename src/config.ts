// Apps you want to watch for bad reviews. Grab the numeric id from the App Store URL:
// https://apps.apple.com/us/app/some-app/id1234567890  ->  "1234567890"
export const WATCHLIST: { id: string; name: string }[] = [
  // { id: "1234567890", name: "Some Budgeting App" },
];

export const CONFIG = {
  country: "us",
  topChartSize: 25,
  lookbackHours: 24,
  model: "claude-sonnet-5-5",
  toEmail: process.env.DIGEST_TO!,
  fromEmail: process.env.DIGEST_FROM!, // must be a verified SES identity
};
