// medals.js — the writing medals: what each one counts, its four tiers
// (bronze, silver, gold, diamond), and how far along you are.
// Pure functions, no React Native imports, so this can be unit-tested in Node.
//
// Everything is worked out from saved sessions, so medals also count writing
// done before medals existed. Letter/punctuation/long-word medals count the
// writing you KEPT (each day's final text), so deleted letters don't count
// and continued writing isn't counted twice.

import { calendarDay, clampOffline, dailyPct, dayPieces, formatDuration, goalForDay, longestStreak, makeOfflineSession, sessionsOnDay, summarize } from './writingLogic';

// The top tier used to be called platinum. Saved progress is stored by tier
// number (0–3), not name, so the rename doesn't affect anyone's medals.
export const TIERS = ['bronze', 'silver', 'gold', 'diamond'];
export const TIER_LABEL = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', diamond: 'Diamond' };

const HOUR = 3600;

// icon: an Ionicons name, or glyph: short text drawn in the medal.
export const MEDALS = [
  {
    id: 'words', name: 'Wordsmith', icon: 'pencil', unit: 'words',
    desc: 'Every word you type, across every session. Words you typed and then deleted still count. Pasted text never does.',
    tiers: [100, 1000, 10000, 50000],
  },
  {
    id: 'time', name: 'Timekeeper', icon: 'time-outline', unit: 'time', isTime: true,
    desc: 'Total time spent writing. The timer pauses when the app is in the background.',
    tiers: [1 * HOUR, 10 * HOUR, 50 * HOUR, 200 * HOUR],
  },
  {
    id: 'sessions', name: 'Regular', icon: 'calendar-outline', unit: 'sessions',
    desc: 'Every time you sit down to write and save a session.',
    tiers: [5, 25, 100, 365],
  },
  {
    id: 'streak', name: 'On a Roll', icon: 'flame-outline', unit: 'days in a row',
    desc: 'Your longest run of days in a row with at least one session. Your best streak is kept, even if it ends.',
    tiers: [3, 7, 30, 100],
  },
  {
    id: 'goals', name: 'Goal Getter', icon: 'locate-outline', unit: 'goals met',
    desc: 'Days you closed all three rings: minutes, words and sessions.',
    tiers: [1, 10, 50, 200],
  },
  {
    id: 'vowels', name: 'Vowel Voyager', glyph: 'Ae', unit: 'vowels',
    desc: 'Every a, e, i, o and u in the writing you kept.',
    tiers: [500, 5000, 50000, 250000],
  },
  {
    id: 'consonants', name: 'Consonant Collector', glyph: 'Bk', unit: 'consonants',
    desc: 'Every letter that isn’t a vowel (y counts here) in the writing you kept.',
    tiers: [1000, 10000, 100000, 500000],
  },
  {
    id: 'punctuation', name: 'Punctuation Pro', glyph: '?!', unit: 'marks',
    desc: 'Periods, commas, question marks, exclamation points, quotes, dashes and the rest.',
    tiers: [25, 250, 2500, 10000],
  },
  {
    id: 'longWords', name: 'Big Words', glyph: '10+', unit: 'long words',
    desc: 'Words longer than 10 letters, like “extraordinary” or “imagination”.',
    tiers: [10, 100, 500, 2000],
  },
  {
    // One tier only: finishing the app tour earns it straight at Diamond.
    id: 'tour', name: 'Tour Guide', icon: 'compass-outline', unit: 'tour', single: true,
    desc: 'Finish every chapter of the app tour. It goes straight to Diamond.',
    tiers: [1, 1, 1, 1],
  },
];

// Single-tier medals (the Tour Guide) count once.
export const TOTAL_TIERS = MEDALS.reduce((n, m) => n + (m.single ? 1 : TIERS.length), 0);

// ---------------------------------------------------------------------------
// Counting text.
// ---------------------------------------------------------------------------

const VOWEL = /[aeiou]/i;
const LETTER = /[a-z]/i;
const PUNCT = /[.,!?;:'"“”‘’()\[\]\-–—…/]/;

export function textStats(text) {
  let vowels = 0;
  let consonants = 0;
  let punctuation = 0;
  for (const ch of text || '') {
    if (LETTER.test(ch)) {
      if (VOWEL.test(ch)) vowels += 1;
      else consonants += 1;
    } else if (PUNCT.test(ch)) punctuation += 1;
  }
  let longWords = 0;
  for (const raw of (text || '').split(/\s+/)) {
    const letters = raw.replace(/[^a-z]/gi, '');
    if (letters.length > 10) longWords += 1;
  }
  return { vowels, consonants, punctuation, longWords };
}

// Everything the medals measure, from all saved sessions.
// extra: { tour: true } once the app tour is finished.
export function medalStats(sessions, dailyGoals = {}, goals = null, extra = {}) {
  const sum = summarize(sessions);
  const days = [...new Set(sessions.map((s) => s.day))];
  const totals = { vowels: 0, consonants: 0, punctuation: 0, longWords: 0 };
  let goalsMet = 0;
  for (const day of days) {
    for (const piece of dayPieces(sessions, day)) {
      const t = textStats(piece.text);
      totals.vowels += t.vowels;
      totals.consonants += t.consonants;
      totals.punctuation += t.punctuation;
      totals.longWords += t.longWords;
    }
    const pct = dailyPct(goalForDay(dailyGoals, goals, day), summarize(sessionsOnDay(sessions, day)));
    if (pct != null && pct >= 100) goalsMet += 1;
  }
  return {
    words: sum.words,
    time: sum.seconds,
    sessions: sum.count,
    streak: longestStreak(sessions),
    goals: goalsMet,
    tour: extra.tour ? 1 : 0,
    ...totals,
  };
}

// ---------------------------------------------------------------------------
// Progress.
// ---------------------------------------------------------------------------

export function formatAmount(medal, n) {
  if (medal.isTime) {
    if (n >= HOUR && n % HOUR === 0) return `${n / HOUR} hr`;
    return formatDuration(n);
  }
  return Math.round(n).toLocaleString();
}

// tierIndex: -1 = none yet, 0 = bronze … 3 = diamond.
export function medalProgress(medal, value) {
  let tierIndex = -1;
  medal.tiers.forEach((t, i) => { if (value >= t) tierIndex = i; });
  const maxed = tierIndex === TIERS.length - 1;
  const next = maxed ? null : medal.tiers[tierIndex + 1];
  const pct = maxed ? 100 : Math.max(0, Math.min(100, Math.floor((value / next) * 100)));
  const toGo = maxed ? 0 : next - value;
  const tier = tierIndex >= 0 ? TIERS[tierIndex] : null;
  const nextTier = maxed ? null : TIERS[tierIndex + 1];

  let progressText;
  if (maxed) progressText = `${formatAmount(medal, value)}${medal.isTime ? '' : ` ${medal.unit}`} · all tiers`;
  else if (medal.isTime) progressText = `${formatAmount(medal, value)} / ${formatAmount(medal, next)}`;
  else progressText = `${formatAmount(medal, value)} / ${formatAmount(medal, next)} ${medal.unit}`;

  const toGoText = maxed
    ? 'Every tier earned'
    : `${formatAmount(medal, toGo)}${medal.isTime ? '' : ` ${medal.unit}`} to go`;

  return { ...medal, value, tierIndex, tier, nextTier, next, pct, toGo, maxed, progressText, toGoText };
}

export function allMedalProgress(sessions, dailyGoals, goals, extra = {}) {
  const stats = medalStats(sessions, dailyGoals, goals, extra);
  return MEDALS.map((m) => medalProgress(m, stats[m.id]));
}

export function tierCounts(progressList) {
  const counts = { bronze: 0, silver: 0, gold: 0, diamond: 0, total: 0 };
  for (const p of progressList) {
    if (p.single) {
      if (p.tierIndex >= 0) { counts.diamond += 1; counts.total += 1; }
      continue;
    }
    for (let i = 0; i <= p.tierIndex; i += 1) counts[TIERS[i]] += 1;
    counts.total += p.tierIndex + 1;
  }
  return counts;
}

// The medal you're closest to levelling up (ignores maxed ones).
export function almostThere(progressList) {
  return progressList.filter((p) => !p.maxed).sort((a, b) => b.pct - a.pct)[0] || null;
}

// Compares what's earned now with what was recorded before.
// `record` = { [medalId]: { tierIndex, dates: [iso per tier] } }.
// Returns the updated record and the tiers that are new since last time.
export function diffMedals(progressList, record, nowIso = new Date().toISOString()) {
  const next = { ...(record || {}) };
  const newlyEarned = [];
  for (const p of progressList) {
    const prev = next[p.id] || { tierIndex: -1, dates: [] };
    if (p.tierIndex > prev.tierIndex) {
      const dates = [...prev.dates];
      for (let i = prev.tierIndex + 1; i <= p.tierIndex; i += 1) {
        dates[i] = nowIso;
        // A single-tier medal pops up once, as Diamond.
        if (p.single && i < p.tierIndex) continue;
        newlyEarned.push({ ...p, earnedTier: TIERS[i], earnedTierIndex: i, threshold: p.tiers[i] });
      }
      next[p.id] = { tierIndex: p.tierIndex, dates };
    }
  }
  // Highest tier first, so the celebration shows the biggest one.
  newlyEarned.sort((a, b) => b.earnedTierIndex - a.earnedTierIndex);
  return { record: next, newlyEarned };
}

// The most recently earned medals, newest first (for the Brainstorm card).
export function latestEarned(progressList, record, n = 3) {
  return progressList
    .filter((p) => p.tierIndex >= 0)
    .map((p) => ({ ...p, earnedAt: record?.[p.id]?.dates?.[p.tierIndex] || '' }))
    .sort((a, b) => String(b.earnedAt).localeCompare(String(a.earnedAt)) || b.tierIndex - a.tierIndex)
    .slice(0, n);
}

// ---------------------------------------------------------------------------
// "Log offline writing" preview: what a log would do before it's saved.
// ---------------------------------------------------------------------------

// Medals an offline log can move (from numbers), and the ones it never can
// (they read the words themselves, so only writing done in Brainstorm counts).
export const OFFLINE_MEDALS = ['words', 'time', 'sessions', 'streak', 'goals'];
export const TEXT_MEDALS = ['vowels', 'consonants', 'punctuation', 'longWords'];

// Given everything saved, `stats` from medalStats (pass it in so it's worked
// out once, not on every tap), the chosen day and the numbers typed so far:
//   before / after: that day's rings and totals (calendarDay)
//   added: what this log adds { words, seconds, sessions } (0s while empty)
//   medals: per counting medal { before, after (medalProgress), added, unlocks, why }
//     unlocks: the tier name this log would reach ('silver'…), or null
//     why: when nothing changes, a short reason (streak / goal medals)
//   text: the four text medals' progress, unchanged
export function offlinePreview(sessions, dailyGoals, goals, stats, day, values, now = new Date()) {
  const v = clampOffline(values);
  // empty: can't be saved yet (needs minutes or words). The preview still
  // shows every number you change, Sessions included.
  const empty = v.minutes === 0 && v.words === 0;
  const pending = makeOfflineSession(day, v, now);
  const withLog = pending ? [...sessions, pending] : sessions;
  const before = calendarDay(sessions, dailyGoals, goals, day, '9999-12-31');
  const after = pending ? calendarDay(withLog, dailyGoals, goals, day, '9999-12-31') : before;
  const added = { words: v.words, seconds: v.minutes * 60, sessions: v.sessions };

  const goal = goalForDay(dailyGoals, goals, day);
  const metBefore = (dailyPct(goal, before) ?? 0) >= 100 && dailyPct(goal, before) != null;
  const metAfter = (dailyPct(goal, after) ?? 0) >= 100 && dailyPct(goal, after) != null;
  const hadWriting = sessionsOnDay(sessions, day).length > 0;
  const streakAfter = pending ? longestStreak(withLog) : stats.streak;

  const afterValue = {
    words: stats.words + added.words,
    time: stats.time + added.seconds,
    sessions: stats.sessions + (pending ? added.sessions : 0),
    streak: streakAfter,
    goals: stats.goals + (pending && metAfter && !metBefore ? 1 : 0),
  };
  const medals = OFFLINE_MEDALS.map((id) => {
    const m = MEDALS.find((x) => x.id === id);
    const b = medalProgress(m, stats[id]);
    const a = medalProgress(m, afterValue[id]);
    const diff = afterValue[id] - stats[id];
    let why = null;
    if (pending && diff === 0) {
      if (id === 'streak') why = hadWriting ? 'That day already had writing, so no change' : 'Doesn\u2019t make your best run longer';
      if (id === 'goals') {
        if (goal == null || dailyPct(goal, before) == null) why = 'No goal that day';
        else if (metBefore) why = 'That day\u2019s rings were already closed';
        else why = 'Needs all of that day\u2019s rings closed';
      }
    }
    return summaryRow(b, a, why);
  });
  const text = TEXT_MEDALS.map((id) => medalProgress(MEDALS.find((x) => x.id === id), stats[id]));
  return { before, after, added, empty, medals, text };
}

// One row of a medal summary, before → after:
//   { id, before, after, added, unlocked, unlocks (tier name | null), why, bar: { now, add } }
// bar is measured against the tier you were working towards: gold-ish (your
// medal's colour) = before, green = what was added. Passing a tier fills it.
export function summaryRow(before, after, why = null) {
  const unlocked = after.tierIndex > before.tierIndex;
  let bar;
  if (before.maxed) bar = { now: 100, add: 0 };
  else {
    const now = Math.min(100, (before.value / before.next) * 100);
    bar = { now, add: Math.max(0, Math.min(100, (after.value / before.next) * 100) - now) };
  }
  return { id: before.id, before, after, added: after.value - before.value, unlocked, unlocks: unlocked ? after.tier : null, why, bar };
}

// Every medal, before → after, in the Medals page order (Session saved "See all").
export function summaryRows(beforeStats, after) {
  return after.map((a) => summaryRow(medalProgress(MEDALS.find((m) => m.id === a.id), beforeStats ? beforeStats[a.id] ?? a.value : a.value), a));
}

export function previewBar(row) {
  return row.bar;
}

// ---------------------------------------------------------------------------
// Bar colours: a medal's progress bar is the colour of the tier you hold now
// (soft blue when you don't have that medal yet). Green is always "just added".
// ---------------------------------------------------------------------------
export const TIER_BAR = { none: '#8FA3D6', bronze: '#B87A45', silver: '#9AA3B5', gold: '#E0AE45', diamond: '#8A7CF0' };
export const ADDED_BAR = '#2E9E6A';
export function tierBarColor(tier) {
  return TIER_BAR[tier || 'none'];
}

// ---------------------------------------------------------------------------
// "Next medals" on Session saved: the 3 closest medals this session moved.
// beforeStats: medalStats from before the session; after: allMedalProgress now.
// Medals this session took past a tier come first, then the highest %.
// Rows as summaryRow().
// ---------------------------------------------------------------------------
export function nextMedals(beforeStats, after, n = 3) {
  const rows = summaryRows(beforeStats, after);
  const unlocked = rows.filter((r) => r.unlocked).sort((x, y) => y.after.tierIndex - x.after.tierIndex);
  // Only medals this session moved (On a Roll doesn't move on a day you
  // already wrote, so it isn't listed). If nothing moved, the closest ones.
  const open = rows.filter((r) => !r.unlocked && !r.after.maxed).sort((x, y) => y.after.pct - x.after.pct);
  const moved = open.filter((r) => r.added > 0);
  return [...unlocked, ...(moved.length || unlocked.length ? moved : open)].slice(0, n);
}

// ---------------------------------------------------------------------------
// "Almost there!" while writing. Only when the next tier is truly within reach
// this session, judged by how much is LEFT (not a %), so a Diamond that's 95%
// done but thousands of words away never shows. Regular and On a Roll can't
// move until you save, so they never show.
// ---------------------------------------------------------------------------
export const REACH = { words: 50, time: 5 * 60, vowels: 75, consonants: 120, punctuation: 10, longWords: 3 };
export const GOAL_REACH_PCT = 75; // Goal Getter: today's rings at least this far (lowest ring)

// base: medalStats when the page opened. live: { words, seconds } added this
// session, and textAdded: textStats gained this session.
// goalNow: today's dailyPct now; goalMetBefore: today's rings were already closed.
export function liveMedalStats(base, live, textAdded = {}, goalNow = null, goalMetBefore = false) {
  const t = (k) => Math.max(0, textAdded[k] || 0);
  return {
    ...base,
    words: base.words + (live.words || 0),
    time: base.time + (live.seconds || 0),
    vowels: base.vowels + t('vowels'),
    consonants: base.consonants + t('consonants'),
    punctuation: base.punctuation + t('punctuation'),
    longWords: base.longWords + t('longWords'),
    goals: base.goals + (!goalMetBefore && goalNow != null && goalNow >= 100 ? 1 : 0),
  };
}

// The medal to nudge about now, or null. skip: ids already shown this session.
export function reachNudge(stats, skip = new Set(), goalNow = null, goalMetBefore = false) {
  const found = [];
  for (const m of MEDALS) {
    if (skip.has(m.id)) continue;
    const p = medalProgress(m, stats[m.id]);
    if (p.maxed || p.toGo <= 0) continue;
    if (REACH[m.id] != null && p.toGo <= REACH[m.id]) found.push(p);
    if (m.id === 'goals' && p.toGo === 1 && !goalMetBefore && goalNow != null && goalNow >= GOAL_REACH_PCT && goalNow < 100) found.push(p);
  }
  found.sort((a, b) => b.pct - a.pct);
  const p = found[0];
  return p ? { id: p.id, tier: p.nextTier, target: p.next, from: p.tier } : null;
}

const SINGULAR = { words: 'word', vowels: 'vowel', consonants: 'consonant', marks: 'mark', 'long words': 'long word' };
// "12 more words", "4 min more", "Close today's rings".
export function reachTitle(medal, toGo) {
  if (medal.id === 'goals') return 'Close today’s rings';
  if (medal.isTime) return `${formatDuration(toGo)} more`;
  const unit = toGo === 1 ? SINGULAR[medal.unit] || medal.unit : medal.unit;
  return `${Math.ceil(toGo).toLocaleString()} more ${unit}`;
}
