// Data passed from the sources into the digest. Claude receives these as JSON, so field names matter.

// A new product from Product Hunt or Show HN
export type Launch = {
  source: string;
  name: string;
  tagline: string;
  url: string;
  score?: number;
};

// A written App Store review
export type AppReview = {
  rating: number;
  title: string;
  body: string;
};

// A 1–2★ review of an app on the watchlist
export type WatchlistReview = AppReview & { app: string };

// A high-demand app whose users are unhappy. Download counts aren't public, so rating count stands
// in for demand; dissatisfaction blends lifetime rating with the share of recent 1–2★ reviews.
export type UnhappyApp = {
  name: string;
  seller: string;
  genre: string;
  url: string;
  price: number;
  rating: number;
  ratingCount: number;
  charts: string[];
  recentReviews: number;
  recentNegativeShare: number | null; // null when too few recent reviews to judge
  complaints: AppReview[];
  score: number;
};

// Everything the digest is written from
export type DigestInputs = {
  launches: Launch[];
  apps: UnhappyApp[];
  reviews: WatchlistReview[];
};
