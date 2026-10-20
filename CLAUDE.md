# Ironmans 2026 Kilometerkampen

A running competition between Mathias, Ida and Anna: who runs the most km from 25 Sep to 31 Dec 2026. The **winner** bakes cake for the others (changed from loser on 20 Oct).

- Live site (GitHub Pages): https://maraniras.github.io/kilometerkampen/
- `index.html` is a static page that renders everything from `data.json`. Normally only `data.json` changes.
- The site is in Danish. Talk to the user in Danish.

## How the score works

Competition km = **the sum of each runner's individual runs since 25 Sep** (`runs` in `data.json`). Number of runs = how many runs are in that list. Only activities of type run count. The page computes everything from `runs`; snapshots (`snaps`) only mark when updates happened and give the 2026 year totals for the "Hele 2026" view.

`base`/`baseRuns` are the rounded 2026 totals on 25 Sep from the Strava app. They're only a fallback and a sanity check. Never change them unless the user asks.

### Cycling and swimming (just for fun)

The page also has tabs for cycling and swimming. They work the same way (since 25 Sep / all of 2026, chart, list, history) but are **not** part of the competition: no cake. Cycling also has an elevation chart.

- `rides[k]`: `{id, d, km, elev, name, time}` (all ride types, incl. VirtualRide). `swims[k]`: `{id, d, km, name, pace, time}`. Swim distance is stored in **km** (2.5 = 2.500 m); the page shows it in metres.
- Snapshots carry the 2026 year totals as `ride: {v, r, e}` (km, rides, elevation m) and `swim: {v, r}` (km, swims). Snapshots before 13 Oct don't have them; the page simply ignores those for cycling/swimming.
- There is no `base` for these. The year view uses the latest snapshot's totals.

## Updating the standings ("opdater Kilometerkampen")

1. **Read Strava** with Claude in Chrome. The user must be logged in to Strava in Chrome.
   - Open `https://www.strava.com/dashboard` in a tab.
   - Run the contents of `scripts/strava-snapshot.js` in that tab with the javascript tool. It returns `{"t":..., "v":{...}, "r":{...}, "ride":{...}, "swim":{...}, "runs":{...}, "rides":{...}, "swims":{...}}`. The output is usually too long to come back in one piece: store it on `window` (`window.__snap = await ...`) and read the totals first, then `runs`, `rides` and `swims` a runner or two at a time.
   - If it fails (Strava changed something), open each profile, `https://www.strava.com/athletes/<athleteId>` (ids in `data.json`), and read the "2026" block in the running stats sidebar (Aktiviteter = runs, Distance = km). Note: on other people's profiles the sidebar compares two columns; the **first** column is the profile owner, the second is the logged-in user.
2. **Sanity check** before writing:
   - every km value ≥ that runner's `base`;
   - compared with the latest snapshot, values should normally be equal or higher. If any value went down, or jumped by more than ~150 km, stop and ask the user.
   - the number of runs in `runs[k]` should equal `r[k] − baseRuns`. If it doesn't (e.g. a private run that isn't in the feed), still save, but tell the user which runner is off and by how many.
   - cycling/swimming: totals should be equal or higher than in the latest snapshot that has `ride`/`swim`, and the growth in `ride.r`/`swim.r` should match the number of new rides/swims. If not, still save, but mention it. Big jumps here are fine (long rides).
3. **Write `data.json`:**
   - Append `{t, v, r, ride, swim}` to `snaps`. If the latest snapshot is from the same calendar day (Europe/Copenhagen), replace it instead of appending. Keep `snaps` sorted by `t`.
   - Merge `runs`, `rides` and `swims` the same way: for each runner, combine the stored list with the new one by `id` (new data wins), keep only runs on/after 25 Sep, sort by date `d`. Never drop a stored run just because it's missing from a new fetch; ask the user if one seems to have been deleted.
   - Don't touch anything else. Keep the file layout: one line per runner in `runs`/`rides`/`swims`, one line per snapshot.
4. **Publish:** `git pull`, then commit `data.json` with a message like `Opdatering 12. okt` and `git push`. GitHub Pages updates the site in about a minute.
5. **Report** to the user in Danish: standings in km since 25/9 (with runs), gaps, who is currently baking cake (the leader), and the site link. Mention new rides/swims briefly in a line or two; the running competition comes first.

## Files

- `index.html`: the page (Danish, mobile friendly, light/dark).
- `data.json`: competition settings, the history of snapshots (`snaps`) and every individual run, ride and swim since 25 Sep (`runs`, `rides`, `swims`).
- `scripts/strava-snapshot.js`: snippet that reads everyone's 2026 totals (run, ride, swim) and every activity since 25 Sep from Strava.
