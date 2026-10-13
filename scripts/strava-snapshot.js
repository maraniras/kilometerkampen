// Run this in a logged-in strava.com tab (Claude in Chrome: javascript_tool).
// It returns one snapshot for data.json plus every activity since the competition start:
// {"t":..., "v":{...}, "r":{...}, "ride":{"v","r","e"}, "swim":{"v","r"},
//  "runs":{"mathias":[{id,d,km,name,pace}], ...}, "rides":{...[{id,d,km,elev,name,time}]}, "swims":{...[{id,d,km,name,pace,time}]}}
// v = 2026 year-to-date km, r = 2026 year-to-date number of activities, e = 2026 year-to-date elevation gain in metres.
// Profile sidebar: "sport-0" = running, "sport-1" = swimming (in metres), "sport-2" = cycling.
// Activities come from the weekly activity feed on each profile (ISO weeks).
(async () => {
  const athletes = { mathias: '122226265', ida: '132593466', anna: '84447586' };
  const START = new Date('2026-09-25T00:00:00');
  const hdr = { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } };
  const v = {}, r = {}, ride = { v: {}, r: {}, e: {} }, swim = { v: {}, r: {} };
  const runs = {}, rides = {}, swims = {};

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
  // Stat by its Danish subtitle ("Distance", "Samlet stigning", "Tid", "Tempo").
  const named = (stats, re) => { const sub = (stats || []).find(x => /_subtitle$/.test(x.key) && re.test(text(x.value))); return sub ? stat(stats, sub.key.replace(/_subtitle$/, '')) : ''; };
  const num = s => parseFloat(String(s).replace(/[^\d,]/g, '').replace(',', '.'));
  // Distance in km; swims are shown in metres ("2.500 m").
  const kmIn = s => /km/.test(s) ? num(s) : / m$/.test(s) ? num(s) / 1000 : null;
  const kmOf = stats => { const s = stat(stats, 'stat_one'); return /km/.test(s) ? num(s) : null; };

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
    const cell = (sport, re) => {
      const row = [...doc.querySelectorAll('#' + sport + '-ytd tr')].find(x => re.test(x.children[0] && x.children[0].textContent));
      return row ? row.children[1].textContent.trim() : null;
    };
    const dist = cell('sport-0', /distance/i), acts = cell('sport-0', /aktivitet|activit/i);
    if (!dist || !/km/.test(dist)) throw new Error(k + ': fandt ikke distance (' + dist + ')');
    v[k] = num(dist);
    if (acts) r[k] = parseInt(acts.replace(/\D/g, ''), 10);
    const rd = cell('sport-2', /distance/i), sd = cell('sport-1', /distance/i);
    if (!rd || !/km/.test(rd)) throw new Error(k + ': fandt ikke cykeldistance (' + rd + ')');
    if (!sd || !/ m$/.test(sd)) throw new Error(k + ': fandt ikke svømmedistance (' + sd + ')');
    ride.v[k] = num(rd);
    ride.r[k] = parseInt(cell('sport-2', /aktivitet|activit/i).replace(/\D/g, ''), 10);
    ride.e[k] = parseInt((cell('sport-2', /stigning|elev/i) || '0').replace(/\D/g, ''), 10);
    swim.v[k] = Math.round(kmIn(sd) * 1000) / 1000;
    swim.r[k] = parseInt(cell('sport-1', /aktivitet|activit/i).replace(/\D/g, ''), 10);

    // Individual activities (solo activities and group activities)
    const seen = {};
    const add = (aid, d, type, stats, name) => {
      seen[aid] = { id: String(aid), d, type, name, stats };
    };
    for (const w of weeks) {
      const props = await weekFeed(id, w);
      (function walk(o) {
        if (!o || typeof o !== 'object') return;
        if (o.entity === 'Activity' && o.activity && String(o.activity.athlete && o.activity.athlete.athleteId) === id) {
          const a = o.activity;
          add(a.id, a.startDate, a.type, a.stats, a.activityName);
        }
        if (o.entity === 'GroupActivity' && o.rowData) {
          for (const a of o.rowData.activities || []) if (a.athlete_id_str === id) {
            add(String(a.activity_id_str || a.entity_id_str), a.start_date, a.type || a.activity_class_name, a.stats, a.name);
          }
        }
        for (const kk in o) walk(o[kk]);
      })(props);
    }
    const all = Object.values(seen)
      .filter(a => new Date(a.d) >= START)
      .sort((a, b) => (a.d < b.d ? -1 : 1));
    runs[k] = all.filter(a => /run/i.test(a.type) && kmOf(a.stats) != null)
      .map(a => ({ id: a.id, d: a.d, km: kmOf(a.stats), name: text(a.name), pace: stat(a.stats, 'stat_two') }));
    rides[k] = all.filter(a => /ride/i.test(a.type) && kmIn(named(a.stats, /distance/i)) != null)
      .map(a => ({ id: a.id, d: a.d, km: kmIn(named(a.stats, /distance/i)), elev: parseInt(named(a.stats, /stigning|elev/i).replace(/\D/g, '') || '0', 10), name: text(a.name), time: named(a.stats, /^tid$|time/i) }));
    swims[k] = all.filter(a => /swim/i.test(a.type) && kmIn(named(a.stats, /distance/i)) != null)
      .map(a => ({ id: a.id, d: a.d, km: kmIn(named(a.stats, /distance/i)), name: text(a.name), pace: named(a.stats, /tempo|pace/i), time: named(a.stats, /^tid$|time/i) }));
  }
  return JSON.stringify({ t: Date.now(), v, r, ride, swim, runs, rides, swims });
})();
