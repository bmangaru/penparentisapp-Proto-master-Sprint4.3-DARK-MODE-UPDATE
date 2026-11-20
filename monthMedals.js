// monthMedals.js — a medal for every month. Words you write in a month earn
// it: Bronze 500 · Silver 1,000 · Gold 5,000 · Diamond 10,000. It starts
// fresh on the 1st, and a missed month never takes anything away.
//
// Every month has a name, and the name changes each year: each month has a
// list of five, used in order (2026 → the first, 2027 → the second…), and
// after the fifth it goes back to the first. So November is "First Frost" in
// 2026, "Warm Socks" in 2027, and "First Frost" again in 2031. All written
// for Pen Parentis: the small seasons of family life.
//
// Pure functions, no React Native imports (unit-tested in Node).

import { summarize } from './writingLogic';
import { allMedalProgress, medalProgress, TIERS } from './medals';

export const MONTH_TIERS = [500, 1000, 5000, 10000];
export const FIRST_YEAR = 2026; // the year each list starts at its first name

export const MONTH_NAMES = [
  ['Fresh Page', 'Clean Slate', 'Frost Window', 'New Ink', 'Snow Light'],                    // January
  ['Candle Hours', 'Paper Hearts', 'Short Days', 'Thaw Line', 'Quiet Mornings'],             // February
  ['First Shoots', 'Muddy Boots', 'Kite Weather', 'Open Window', 'Spring Draft'],            // March
  ['Puddle Season', 'Rain Notes', 'Blossom Week', 'Green Margins', 'April Showers'],         // April
  ['Garden Hours', 'Long Light', 'Chalk Days', 'Porch Light', 'Bloom Pages'],                // May
  ['School’s Out', 'Sprinkler Days', 'Firefly Nights', 'Picnic Pages', 'Midsummer Lines'],   // June
  ['Ice Pop Hours', 'Heat Haze', 'Beach Bag', 'Thunder Notes', 'Late Light'],                // July
  ['Last Swims', 'Golden Hour', 'Backpack Prep', 'Slow Sundays', 'Dog Days'],                // August
  ['New Pencils', 'First Bell', 'Apple Season', 'Lunchbox Notes', 'Harvest Draft'],          // September
  ['Leaf Fall', 'Costume Week', 'Cider Pages', 'Lantern Light', 'Pumpkin Ink'],              // October
  ['First Frost', 'Warm Socks', 'Cocoa Hours', 'Gathering', 'Grateful Pages'],               // November
  ['Snow Day', 'Twinkle Lights', 'Long Nights', 'Cozy Draft', 'Year’s End'],                 // December
];
const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// "2026-11" ⇄ { year: 2026, m: 10 }
export const monthKeyOf = (dayKey) => String(dayKey).slice(0, 7);
export const splitMonth = (mk) => ({ year: Number(mk.slice(0, 4)), m: Number(mk.slice(5, 7)) - 1 });
export const monthKey = (year, m) => `${year}-${String(m + 1).padStart(2, '0')}`;

// The month's name that year (cycles every five years, in order).
export function monthNameFor(year, m) {
  const list = MONTH_NAMES[m];
  const i = (((year - FIRST_YEAR) % list.length) + list.length) % list.length;
  return list[i];
}

// The medal for a month, shaped like the other medals (so medalProgress,
// the Medal art and the Next medals rows all work with it). Its glyph is
// the month ("NOV").
export function monthMedal(mk) {
  const { year, m } = splitMonth(mk);
  const name = monthNameFor(year, m);
  return {
    id: `month:${mk}`,
    monthly: true,
    monthKey: mk,
    year,
    monthIndex: m,
    name,
    when: `${MONTH_LONG[m]} ${year}`,
    title: `${MONTH_LONG[m]} ${year} · ${name}`,
    glyph: MONTH_ABBR[m],
    unit: 'words',
    tiers: MONTH_TIERS,
    track: 'Counts the words you write this month. It starts fresh on the 1st.',
  };
}

const inMonth = (sessions, mk) => sessions.filter((s) => s.day && s.day.startsWith(mk));

export function monthWords(sessions, mk) {
  return summarize(inMonth(sessions, mk)).words;
}

// Where you are on a month's medal (medalProgress: tier, next, toGo…).
export function monthProgress(sessions, mk, words = null) {
  return medalProgress(monthMedal(mk), words ?? monthWords(sessions, mk));
}

// Words written each day of the month, and the day each tier was reached:
//   { days: { '2026-11-03': 150, … }, reached: { bronze: '2026-11-06', … } }
export function monthDays(sessions, mk) {
  const days = {};
  for (const s of inMonth(sessions, mk)) days[s.day] = (days[s.day] || 0) + (s.words || 0);
  const reached = {};
  let total = 0;
  for (const k of Object.keys(days).sort()) {
    total += days[k];
    MONTH_TIERS.forEach((t, i) => { if (total >= t && !reached[TIERS[i]]) reached[TIERS[i]] = k; });
  }
  return { days, reached };
}

// A year of monthly medals (Jan–Dec) for the Medals page: each month's
// progress, or null for months still to come.
export function yearMedals(sessions, year, todayKey) {
  const nowMk = monthKeyOf(todayKey);
  return MONTH_NAMES.map((_, m) => {
    const mk = monthKey(year, m);
    if (mk > nowMk) return null;
    return monthProgress(sessions, mk);
  });
}

// Years to list on the Medals page, newest first: from the first year you
// wrote (or this year) to this year.
export function medalYears(sessions, todayKey) {
  const now = Number(todayKey.slice(0, 4));
  let first = now;
  for (const s of sessions) {
    const y = Number(String(s.day || '').slice(0, 4));
    if (y && y < first) first = y;
  }
  const out = [];
  for (let y = now; y >= first; y--) out.push(y);
  return out;
}

// One line for a folded year: "10 medals · best: Gold (Snow Day)".
export function yearSummary(list) {
  const earned = list.filter((p) => p && p.tier);
  if (!earned.length) return { count: 0, best: null };
  const best = earned.reduce((a, b) => (b.tierIndex > a.tierIndex ? b : a));
  return { count: earned.length, best };
}

// The milestone bar: four equal parts (to Bronze, Silver, Gold, Diamond),
// each filled in its own tier's colour as you pass through it.
//   [{ tier: 'bronze', fill: 0–1 }, …]
export function milestoneParts(words) {
  let lo = 0;
  return MONTH_TIERS.map((hi, i) => {
    const fill = Math.max(0, Math.min(1, (words - lo) / (hi - lo)));
    lo = hi;
    return { tier: TIERS[i], fill };
  });
}

// ---------- The ink-drop calendar ----------
// Each day you wrote gets an ink drop: the more words, the bigger the drop.
// Even a few words leave a clear dot (min), and the biggest drop still fits
// under the date (max). Grows with the square root of the words (so the
// drop's area tracks the words): 5 words → a small dot, 100 → about a third
// of the way, 1,000+ → the biggest.
export const INK = '#16181D';
//
// With `typical` (your typical day: see typicalDay), drops are sized against
// you rather than a fixed scale: a typical day is a medium drop, twice it or
// more (or 1,000+ words) the biggest, and a light day a small one.
export function inkSize(words, min = 12, max = 30, typical = null) {
  if (!words || words <= 0) return 0;
  const t = typical
    ? (words >= 1000 ? 1 : Math.min(1, (words / typical / 2.2) ** 0.75))
    : Math.sqrt(Math.min(1000, words) / 1000);
  return Math.round(min + (max - min) * t);
}

// The middle value (median) of some days' words, so one huge day doesn't
// move it. null with none.
export function typicalDay(days) {
  const list = Object.values(days || {}).filter((n) => n > 0);
  if (!list.length) return null;
  list.sort((a, b) => a - b);
  const m = list.length >> 1;
  return list.length % 2 ? list[m] : (list[m - 1] + list[m]) / 2;
}

// Words written each day, all time: { '2026-11-03': 150, … }
export function dayTotals(sessions) {
  const out = {};
  for (const s of sessions) if (s.day) out[s.day] = (out[s.day] || 0) + (s.words || 0);
  return out;
}

// Your typical day right now: the middle value of your writing days in the
// last 7 days (up to today). Every day on the calendar is compared with this
// one number, so more words always means a bigger drop and a darker green.
// Back after time away (nothing in the last 7 days): your 7 most recent
// writing days instead. null if you've never written.
export function recentReference(totals, today) {
  const [y, mo, d] = today.split('-').map(Number);
  const week = {};
  for (let i = 0; i < RECENT_DAYS; i++) {
    const k = new Date(Date.UTC(y, mo - 1, d - i)).toISOString().slice(0, 10);
    if (totals[k] > 0) week[k] = totals[k];
  }
  if (Object.keys(week).length) return typicalDay(week);
  const last = {};
  Object.keys(totals).filter((k) => k <= today && totals[k] > 0).sort().slice(-RECENT_DAYS).forEach((k) => { last[k] = totals[k]; });
  return typicalDay(last);
}

// (Not used by the calendar any more: each day against the 7 days before
// it, which could make a bigger day look lighter than a smaller one.)
// A day's typical day: your writing days in the 7 days before it (not
// counting the day itself). So a day is always compared with your most
// recent week; nothing older ever counts (back after a month away, nothing
// stale), and a day's colour never changes later. With no writing in the 7
// days before (a first day, or the first day back), the day is its own
// typical day: a medium drop and green. null on a day with no words.
export const RECENT_DAYS = 7;
export function recentTypical(totals, key) {
  const [y, mo, d] = key.split('-').map(Number);
  const prev = {};
  for (let i = 1; i <= RECENT_DAYS; i++) {
    const t = new Date(Date.UTC(y, mo - 1, d - i));
    const k = t.toISOString().slice(0, 10);
    if (totals[k] > 0) prev[k] = totals[k];
  }
  return typicalDay(prev) ?? (totals[key] > 0 ? totals[key] : null);
}

// How a day compares with your typical day: 0 (light) … 4 (big, "!").
//   under 0.6× · 0.6–1× · 1–1.5× · 1.5–2× · 2× or more (1,000+ is always 4)
export function dayLevel(words, typical) {
  if (words >= 1000) return 4;
  const r = words / typical;
  return r < 0.6 ? 0 : r < 1 ? 1 : r < 1.5 ? 2 : r < 2 ? 3 : 4;
}

// The green "+words" badge on a day: pale lime for a few words, darker as it
// grows, and a "!" from 500 words.
//   { text: '+620!', bg, fg, big }
export const WORD_GREENS = [
  { from: 1, bg: '#E4FBC2', fg: '#2F5A0C' },
  { from: 50, bg: '#B8F07A', fg: '#24480A' },
  { from: 200, bg: '#5FD07A', fg: '#0B3A1C' },
  { from: 500, bg: '#1F9D4C', fg: '#FFFFFF' },
  { from: 1000, bg: '#0E6B32', fg: '#FFFFFF' },
];
export function shortWords(words) {
  if (words >= 1000) {
    const k = words / 1000;
    return `${k >= 10 || Number.isInteger(k) ? Math.round(k) : k.toFixed(1)}k`;
  }
  return String(words);
}
// With `typical`, the green comes from dayLevel (compared with your month)
// and the "!" marks a big day for you (2× typical or more, or 1,000+).
export function wordBadge(words, typical = null) {
  if (!words || words <= 0) return null;
  const lv = typical ? dayLevel(words, typical) : null;
  const g = lv != null ? WORD_GREENS[lv] : WORD_GREENS.reduce((a, x) => (words >= x.from ? x : a), WORD_GREENS[0]);
  const big = lv != null ? lv === 4 : words >= 500;
  return { text: `+${shortWords(words)}${big ? '!' : ''}`, bg: g.bg, fg: g.fg, big };
}

// ---------- New medal celebrations ----------
// The month's tiers a session (or an offline log) crossed, one item per tier,
// Bronze first: 4,000 → 6,000 words gives Gold; 0 → 5,000 gives Bronze,
// Silver and Gold. Shaped like medals.diffMedals' newlyEarned items.
export function monthTiersCrossed(mk, before, after) {
  const out = [];
  const p = monthProgress([], mk, after);
  MONTH_TIERS.forEach((t, i) => {
    if (before < t && after >= t) out.push({ ...p, earnedTier: TIERS[i], earnedTierIndex: i, threshold: t });
  });
  return out;
}

// The order celebrations play in: this month's medal first, then each other
// medal in turn; for every medal, its tiers in order (Bronze, Silver, Gold,
// Diamond), so a big offline log plays each one, smallest first.
export function celebrationOrder(list) {
  const groups = [];
  for (const m of list || []) {
    let g = groups.find((x) => x.id === m.id);
    if (!g) { g = { id: m.id, monthly: !!m.monthly, items: [] }; groups.push(g); }
    g.items.push(m);
  }
  groups.sort((a, b) => b.monthly - a.monthly);
  return groups.flatMap((g) => g.items.sort((a, b) => a.earnedTierIndex - b.earnedTierIndex));
}

// ---------- Before deleting ----------
// What deleting some saved entries takes away, for the confirm sheet:
//   { words, seconds, count, feelings, texts,
//     medals: [{ id, name, from, to, monthly }] }  (medals that drop a tier)
// removeIds: the session ids going. extra: as for allMedalProgress (tour).
export function deletionImpact(sessions, dailyGoals, goals, removeIds, extra = {}) {
  const gone = new Set(removeIds);
  const removed = sessions.filter((s) => gone.has(s.id));
  const kept = sessions.filter((s) => !gone.has(s.id));
  const sum = summarize(removed);
  const medals = [];
  const before = allMedalProgress(sessions, dailyGoals, goals, extra);
  const after = allMedalProgress(kept, dailyGoals, goals, extra);
  // This month's (or that month's) medal first.
  const months = [...new Set(removed.map((s) => monthKeyOf(s.day)))];
  for (const mk of months) {
    const b = monthProgress(sessions, mk);
    const a = monthProgress(kept, mk);
    if (a.tierIndex < b.tierIndex) medals.push({ id: b.id, name: `${b.name} (${b.when})`, from: b.tier, to: a.tier, monthly: true });
  }
  for (const b of before) {
    const a = after.find((x) => x.id === b.id);
    if (a && a.tierIndex < b.tierIndex) medals.push({ id: b.id, name: b.name, from: b.tier, to: a.tier, monthly: false });
  }
  return {
    words: sum.words,
    seconds: sum.seconds,
    count: sum.count,
    feelings: removed.filter((s) => s.feeling).length,
    texts: removed.filter((s) => (s.text || '').trim()).length,
    medals,
  };
}

// Medals reached during a week (start..end day keys): each medal whose tier
// went up, and the month's medal(s) too. For the week in review.
//   [{ id, name, tier, monthly }]
export function weekMedals(sessions, dailyGoals, goals, start, end) {
  const before = sessions.filter((s) => s.day < start);
  const upTo = sessions.filter((s) => s.day <= end);
  const a = allMedalProgress(before, dailyGoals, goals);
  const b = allMedalProgress(upTo, dailyGoals, goals);
  const out = [];
  b.forEach((p, i) => {
    if (p.id !== 'tour' && p.tierIndex > a[i].tierIndex && p.tier) out.push({ id: p.id, name: p.name, tier: p.tier, monthly: false });
  });
  for (const mk of [...new Set([monthKeyOf(start), monthKeyOf(end)])]) {
    const pa = monthProgress(before, mk);
    const pb = monthProgress(upTo, mk);
    if (pb.tierIndex > pa.tierIndex && pb.tier) out.push({ id: pb.id, name: pb.name, tier: pb.tier, monthly: true, when: pb.when });
  }
  return out;
}
