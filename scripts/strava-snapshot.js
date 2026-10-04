// Run this in a logged-in strava.com tab (Claude in Chrome: javascript_tool).
// It returns one snapshot for data.json plus every run since the competition start:
// {"t":..., "v":{...}, "r":{...}, "runs":{"mathias":[{id,d,km,name,pace}], ...}}
// v = 2026 year-to-date running km, r = 2026 year-to-date number of runs (profile sidebar, "sport-0" = running).
// runs = individual runs from the weekly activity feed on each profile (ISO weeks).
(async () => {
  const athletes = { mathias: '122226265', ida: '132593466', anna: '84447586' };
  const START = new Date('2026-09-25T00:00:00');
  const hdr = { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } };
  const v = {}, r = {}, runs = {};

  const isoWeek = d => {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y = t.getUTCFullYear();
    const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
    return y + String(w).padStart(2, '0');
  };
  const weeks = [];
  for (let d = new Date(START); d <= new Date(); d.setDate(d.getDate() + 7)) weeks.push(isoWeek(d));
  if (!weeks.includes(isoWeek(new Date()))) weeks.push(isoWeek(new Date()));

  const text = s => String(s || '').replace(/<[^>]+>/g, '').trim();
  const stat = (stats, key) => { const s = (stats || []).find(x => x.key === key); return s ? text(s.value) : ''; };
  const kmOf = stats => { const s = stat(stats, 'stat_one'); return /km/.test(s) ? parseFloat(s.replace(/[^\d,]/g, '').replace(',', '.')) : null; };

  async function weekFeed(id, week) {
    const js = await fetch('/athletes/' + id + '/interval?interval=' + week + '&interval_type=week&chart_type=miles&year_offset=0', hdr).then(x => x.text());
    const html = [];
    const fake = () => { const o = {}; ['html', 'append', 'replaceWith', 'show', 'hide', 'addClass', 'removeClass', 'text', 'attr', 'find', 'trigger', 'each', 'remove'].forEach(m => o[m] = x => { if (typeof x === 'string') html.push(x); return o; }); return o; };
    new Function('jQuery', '$', js)(fake, fake);
    const el = new DOMParser().parseFromString(html.join(''), 'text/html').querySelector('[data-react-props]');
    return el ? JSON.parse(el.getAttribute('data-react-props')) : {};
  }

  for (const [k, id] of Object.entries(athletes)) {
    // Year-to-date totals
    const res = await fetch('/athletes/' + id + '/profile_sidebar_comparison?hl=da-DK&ytd_year=2026', hdr);
    if (!res.ok) throw new Error(k + ': HTTP ' + res.status);
    const doc = new DOMParser().parseFromString('<table>' + await res.text() + '</table>', 'text/html');
    const rows = [...doc.querySelectorAll('#sport-0-ytd tr')];
    const cell = re => { const row = rows.find(x => re.test(x.children[0] && x.children[0].textContent)); return row ? row.children[1].textContent : null; };
    const dist = cell(/distance/i), acts = cell(/aktivitet|activit/i);
    if (!dist || !/km/.test(dist)) throw new Error(k + ': fandt ikke distance (' + dist + ')');
    v[k] = parseFloat(dist.replace(/[^\d,]/g, '').replace(',', '.'));
    if (acts) r[k] = parseInt(acts.replace(/\D/g, ''), 10);

    // Individual runs (solo activities and group activities)
    const seen = {};
    for (const w of weeks) {
      const props = await weekFeed(id, w);
      (function walk(o) {
        if (!o || typeof o !== 'object') return;
        if (o.entity === 'Activity' && o.activity && String(o.activity.athlete && o.activity.athlete.athleteId) === id) {
          const a = o.activity;
          seen[a.id] = { id: String(a.id), d: a.startDate, type: a.type, km: kmOf(a.stats), name: a.activityName, pace: stat(a.stats, 'stat_two') };
        }
        if (o.entity === 'GroupActivity' && o.rowData) {
          for (const a of o.rowData.activities || []) if (a.athlete_id_str === id) {
            const aid = String(a.activity_id_str || a.entity_id_str);
            seen[aid] = { id: aid, d: a.start_date, type: a.type || a.activity_class_name, km: kmOf(a.stats), name: a.name, pace: stat(a.stats, 'stat_two') };
          }
        }
        for (const kk in o) walk(o[kk]);
      })(props);
    }
    runs[k] = Object.values(seen)
      .filter(a => /run/i.test(a.type) && a.km != null && new Date(a.d) >= START)
      .sort((a, b) => (a.d < b.d ? -1 : 1))
      .map(a => ({ id: a.id, d: a.d, km: a.km, name: text(a.name), pace: a.pace }));
  }
  return JSON.stringify({ t: Date.now(), v, r, runs });
})();
