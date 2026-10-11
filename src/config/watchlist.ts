// Apps you want to watch for bad reviews. Grab the numeric id from the App Store URL:
// https://apps.apple.com/us/app/some-app/id1234567890  ->  "1234567890"
export const WATCHLIST: { id: string; name: string }[] = [
  // { id: "1234567890", name: "Some Budgeting App" },
];

// App ids the App Store radar should never surface (e.g. captive apps you've already seen)
export const IGNORE: string[] = [];
