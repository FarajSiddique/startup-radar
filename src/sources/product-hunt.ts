import { CONFIG } from "../config/settings.js";
import { hoursAgo } from "../lib/time.js";
import type { Launch } from "../types.js";

const ENDPOINT = "https://api.producthunt.com/v2/api/graphql";

const QUERY = `
  query ($after: DateTime) {
    posts(postedAfter: $after, order: VOTES, first: 20) {
      edges {
        node { name tagline url votesCount }
      }
    }
  }
`;

type Post = { name: string; tagline: string; url: string; votesCount: number };
type PostsResponse = { data?: { posts?: { edges: { node: Post }[] } } };

// Top Product Hunt launches in the lookback window (GraphQL v2). Needs a developer token from
// producthunt.com/v2/oauth/applications; returns nothing without one.
export async function fetchProductHuntLaunches(): Promise<Launch[]> {
  const token = process.env.PRODUCT_HUNT_TOKEN;
  if (!token) return [];

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: QUERY,
      variables: { after: hoursAgo(CONFIG.lookbackHours).toISOString() },
    }),
  });
  const json = (await res.json()) as PostsResponse;

  return (json.data?.posts?.edges ?? []).map(({ node }) => ({
    source: "Product Hunt",
    name: node.name,
    tagline: node.tagline,
    url: node.url,
    score: node.votesCount,
  }));
}
