# Startup Radar

A daily Lambda that pulls new launches (Product Hunt, Show HN), scans the App Store for apps with
big demand but unhappy users, plus 1–2 star reviews for apps on your watchlist, has Claude turn it
into a digest, and emails it via SES.

## App Store radar
Each day it scans 3 of the genres in `src/config.ts` (rotating, so all are covered every ~4 days):
top grossing + top free charts → ratings via Apple's Lookup API → recent written reviews for the
strongest candidates. Apps score on demand (rating count, extra weight for top grossing) times
dissatisfaction (low lifetime rating, and recent 1–2★ share above the ~30% that's normal for
written reviews). Claude splits the shortlist into contestable apps and captive ones.

    npm run scan             # print today's shortlist, no Claude call
    npm run scan -- --all    # scan every genre

Tune thresholds in `CONFIG.radar`, and add app ids to `IGNORE` to stop seeing them.

## Run it locally first
    npm install
    cp .env.example .env     # then fill in ANTHROPIC_API_KEY (PRODUCT_HUNT_TOKEN optional)
    npm run local            # loads .env, writes preview.html, sends nothing
    npm run local -- --send  # also emails it (needs DIGEST_TO / DIGEST_FROM + AWS creds)

## Deploy
1. Verify your email in SES (in sandbox mode, verify both sender and recipient).
2. `npm run build && sam deploy --guided`
3. Add app ids to `src/config.ts` WATCHLIST as you find underperformers.

Tip: for production, move the API keys to Secrets Manager or SSM instead of env params.
