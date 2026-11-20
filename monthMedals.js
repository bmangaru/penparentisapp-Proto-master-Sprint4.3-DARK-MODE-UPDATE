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
import { medalProgress, TIERS } from './medals';

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
// under the date (max). Grows on a log scale: 1 → min, 1,000+ → max.
export const INK = '#16181D';
export function inkSize(words, min = 12, max = 30) {
  if (!words || words <= 0) return 0;
  const t = Math.min(1, Math.log10(Math.max(1, words)) / 3);
  return Math.round(min + (max - min) * t);
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
export function wordBadge(words) {
  if (!words || words <= 0) return null;
  const g = WORD_GREENS.reduce((a, x) => (words >= x.from ? x : a), WORD_GREENS[0]);
  const big = words >= 500;
  return { text: `+${shortWords(words)}${big ? '!' : ''}`, bg: g.bg, fg: g.fg, big };
}
