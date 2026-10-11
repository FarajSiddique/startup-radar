# Startup Radar

[![CI](https://github.com/FarajSiddique/startup-radar/actions/workflows/ci.yml/badge.svg)](https://github.com/FarajSiddique/startup-radar/actions/workflows/ci.yml)

A daily Lambda that pulls new launches (Product Hunt, Show HN), scans the App Store for apps with
big demand but unhappy users, plus 1–2 star reviews for apps on your watchlist, has Claude turn it
into a digest, and emails it via SES.

## App Store radar
Each day it scans 3 of the genres in `src/config/genres.ts` (rotating, so all are covered every ~4 days):
top grossing + top free charts → ratings via Apple's Lookup API → recent written reviews for the
strongest candidates. Apps score on demand (rating count, extra weight for top grossing) times
dissatisfaction (low lifetime rating, and recent 1–2★ share above the ~30% that's normal for
written reviews). Claude splits the shortlist into contestable apps and captive ones.

    npm run scan             # print today's shortlist, no Claude call
    npm run scan -- --all    # scan every genre

Tune thresholds in `CONFIG.radar` (`src/config/settings.ts`), and add app ids to `IGNORE`
(`src/config/watchlist.ts`) to stop seeing them.

## Run it locally first
Requires Node 22+.

    npm install
    cp .env.example .env     # then fill in ANTHROPIC_API_KEY (PRODUCT_HUNT_TOKEN optional)
    npm run local            # loads .env, writes preview.html, sends nothing
    npm run local -- --send  # also emails it (needs DIGEST_TO / DIGEST_FROM + AWS creds)

## Deploy (AWS SAM)
Requires the AWS CLI and SAM CLI, with credentials for your account (e.g. `export AWS_PROFILE=...`).
To pin a profile for just this project's npm scripts, set `STARTUP_RADAR_AWS_PROFILE` instead; it takes precedence over `AWS_PROFILE`.
With SSO profiles, `npm run login` runs `aws sso login` for that profile.

1. Verify your email in SES (in sandbox mode, verify both sender and recipient). Sending *from* a
   Gmail address works but may land in spam; a domain you own with Easy DKIM is more reliable.
2. First deploy: `npm run build && sam deploy --guided` (saves your answers to `samconfig.toml`, which is gitignored).
3. After that:

       npm run deploy   # build + sam deploy
       npm run invoke   # run the deployed Lambda once (sends a real email)

It runs daily at 7:00 AM America/New_York (see `template.yaml`). Add app ids to `WATCHLIST` in
`src/config/watchlist.ts` to track specific apps' bad reviews.

Tip: for production, move the API keys to Secrets Manager or SSM instead of env params.

## Project layout

    src/
      handler.ts           Lambda entry point (bundled to dist/handler.mjs)
      pipeline.ts          runDigest(): gather sources → Claude → email
      types.ts             data passed from the sources into the digest
      config/              settings, App Store genres, watchlist + ignore lists
      sources/             one file per source: product-hunt, show-hn, watchlist-reviews
        app-store/         api (Apple endpoints), scoring (pure math), radar (the 4-step scan)
      digest/              prompt, build (Claude call), send (SES)
      lib/                 small generic helpers (http, concurrency, array, time)
      cli/                 local.ts and scan.ts, behind `npm run local` / `npm run scan`

Formatting is Prettier (`npm run format`); CI fails on unformatted code.

## CI
GitHub Actions runs a format check, typecheck, build, and `npm run check:bundle` (imports the bundle as an ES module the
way Lambda does) on every push and PR. Deploys are manual.
