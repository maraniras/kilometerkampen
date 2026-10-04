# Ironmans 2026 Kilometerkampen

A running competition between Mathias, Ida and Anna: who runs the most km from 25 Sep to 31 Dec 2026. The loser bakes cake for the others.

- Live site (GitHub Pages): https://maraniras.github.io/kilometerkampen/
- `index.html` is a static page that renders everything from `data.json`. Normally only `data.json` changes.
- The site is in Danish. Talk to the user in Danish.

## How the score works

Competition km = Strava 2026 year-to-date running distance − `base` (each runner's 2026 YTD km on 25 Sep, from the Strava app, rounded to whole km). Runs work the same way with `baseRuns`. Only runs count. Never change `base`/`baseRuns` unless the user asks.

## Updating the standings ("opdater Kilometerkampen")

1. **Read Strava** with Claude in Chrome. The user must be logged in to Strava in Chrome.
   - Open `https://www.strava.com/dashboard` in a tab.
   - Run the contents of `scripts/strava-snapshot.js` in that tab with the javascript tool. It returns `{"t":..., "v":{...}, "r":{...}}`.
   - If it fails (Strava changed something), open each profile, `https://www.strava.com/athletes/<athleteId>` (ids in `data.json`), and read the "2026" block in the running stats sidebar (Aktiviteter = runs, Distance = km). Note: on other people's profiles the sidebar compares two columns; the **first** column is the profile owner, the second is the logged-in user.
2. **Sanity check** before writing:
   - every km value ≥ that runner's `base`;
   - compared with the latest snapshot, values should normally be equal or higher. If any value went down, or jumped by more than ~150 km, stop and ask the user.
3. **Write `data.json`:** append the snapshot to `snaps`. If the latest snapshot is from the same calendar day (Europe/Copenhagen), replace it instead of appending. Keep `snaps` sorted by `t`. Don't touch anything else.
4. **Publish:** `git pull`, then commit `data.json` with a message like `Opdatering 12. okt` and `git push`. GitHub Pages updates the site in about a minute.
5. **Report** to the user in Danish: standings in km since 25/9 (with runs), gaps, who is currently baking cake, and the site link.

## Files

- `index.html`: the page (Danish, mobile friendly, light/dark).
- `data.json`: competition settings and the history of snapshots.
- `scripts/strava-snapshot.js`: snippet that reads all three totals from Strava.
