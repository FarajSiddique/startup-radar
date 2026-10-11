# Startup Radar

A daily Lambda that pulls new launches (Product Hunt, Show HN, App Store top free) plus
1–2 star reviews for apps on your watchlist, has Claude turn it into a digest, and emails it via SES.

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
