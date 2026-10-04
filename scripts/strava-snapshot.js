// Run this in a logged-in strava.com tab (Claude in Chrome: javascript_tool).
// It returns one snapshot for data.json: {"t":..., "v":{...}, "r":{...}}
// v = 2026 year-to-date running km, r = 2026 year-to-date number of runs.
// Uses Strava's profile sidebar endpoint; "sport-0" is the running tab.
(async () => {
  const athletes = { mathias: '122226265', ida: '132593466', anna: '84447586' };
  const v = {}, r = {};
  for (const [k, id] of Object.entries(athletes)) {
    const res = await fetch('/athletes/' + id + '/profile_sidebar_comparison?hl=da-DK&ytd_year=2026', {
      credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    if (!res.ok) throw new Error(k + ': HTTP ' + res.status);
    const doc = new DOMParser().parseFromString('<table>' + await res.text() + '</table>', 'text/html');
    const rows = [...doc.querySelectorAll('#sport-0-ytd tr')];
    const cell = re => { const row = rows.find(x => re.test(x.children[0] && x.children[0].textContent)); return row ? row.children[1].textContent : null; };
    const dist = cell(/distance/i), acts = cell(/aktivitet|activit/i);
    if (!dist || !/km/.test(dist)) throw new Error(k + ': fandt ikke distance (' + dist + ')');
    v[k] = parseFloat(dist.replace(/[^\d,]/g, '').replace(',', '.'));
    if (acts) r[k] = parseInt(acts.replace(/\D/g, ''), 10);
  }
  return JSON.stringify({ t: Date.now(), v, r });
})();
