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
