# Ironmans 2026 Kagekilometerkampen

A running competition between Mathias, Ida and Anna: who runs the most km from 25 Sep to 31 Dec 2026. The loser bakes cake for the others.

- Live site (GitHub Pages): https://maraniras.github.io/kilometerkampen/
- `index.html` is a static page that renders everything from `data.json`. Normally only `data.json` changes.
- The site is in Danish. Talk to the user in Danish.

## How the score works

Competition km = **the sum of each runner's individual runs since 25 Sep** (`runs` in `data.json`). Number of runs = how many runs are in that list. Only activities of type run count. The page computes everything from `runs`; snapshots (`snaps`) only mark when updates happened and give the 2026 year totals for the "Hele 2026" view.

`base`/`baseRuns` are the rounded 2026 totals on 25 Sep from the Strava app. They're only a fallback and a sanity check. Never change them unless the user asks.

## Updating the standings ("opdater Kilometerkampen" / "opdater Kagekilometerkampen")

1. **Read Strava** with Claude in Chrome. The user must be logged in to Strava in Chrome.
   - Open `https://www.strava.com/dashboard` in a tab.
   - Run the contents of `scripts/strava-snapshot.js` in that tab with the javascript tool. It returns `{"t":..., "v":{...}, "r":{...}, "runs":{...}}`. If the output is too long to come back in one piece, store it on `window` and read `runs` one runner at a time.
   - If it fails (Strava changed something), open each profile, `https://www.strava.com/athletes/<athleteId>` (ids in `data.json`), and read the "2026" block in the running stats sidebar (Aktiviteter = runs, Distance = km). Note: on other people's profiles the sidebar compares two columns; the **first** column is the profile owner, the second is the logged-in user.
2. **Sanity check** before writing:
   - every km value ≥ that runner's `base`;
   - compared with the latest snapshot, values should normally be equal or higher. If any value went down, or jumped by more than ~150 km, stop and ask the user.
   - the number of runs in `runs[k]` should equal `r[k] − baseRuns`. If it doesn't (e.g. a private run that isn't in the feed), still save, but tell the user which runner is off and by how many.
3. **Write `data.json`:**
   - Append `{t, v, r}` to `snaps`. If the latest snapshot is from the same calendar day (Europe/Copenhagen), replace it instead of appending. Keep `snaps` sorted by `t`.
   - Merge `runs`: for each runner, combine the stored list with the new one by `id` (new data wins), keep only runs on/after 25 Sep, sort by date `d`. Never drop a stored run just because it's missing from a new fetch; ask the user if one seems to have been deleted.
   - Don't touch anything else.
4. **Publish:** `git pull`, then commit `data.json` with a message like `Opdatering 12. okt` and `git push`. GitHub Pages updates the site in about a minute.
5. **Report** to the user in Danish: standings in km since 25/9 (with runs), gaps, who is currently baking cake, and the site link.

## Files

- `index.html`: the page (Danish, mobile friendly, light/dark).
- `data.json`: competition settings, the history of snapshots (`snaps`) and every individual run since 25 Sep (`runs`, shown in the "Løbene" list).
- `scripts/strava-snapshot.js`: snippet that reads all three totals and every run since 25 Sep from Strava.
