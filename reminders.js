// reminders.js — what the app's notifications say, and when. Pure logic (no
// React Native), so it can be tested in Node; notify.js does the scheduling.
//
// Settings (saved with the salon switches in notify.js, pp.notify.v1):
//   reminders  [{ id, name, h, m, days: [0..6], on }]   writing reminders
//   skipDone   no reminders once today's rings are closed
//   streak     Streak saver: at your evening time, only if you're on a
//              streak and haven't written; buttons Write now / 🌙 Rest day
//   almost     a medal's next tier is close (once per tier)
//   month      on the 1st (last month's medal + the new one), and 3 days
//              before the month ends (how close the next tier is)
//   quiet      { on, from: [h, m], to: [h, m] }  nothing automatic in between
//   (A Sunday "last week" summary was tried and removed: too many kinds of
//   notification. This week's review is on Brainstorm.)
//              (your own reminders still come at the time you set)
//
// planNotifications(prefs, data, now) → [{ id, at, title, body, data, category }]
// for the next 7 days (plus the month ones), re-planned whenever you write,
// take a rest day or change a setting, so the numbers in them stay true.

import {
  dailyPct, dayKey, goalForDay, isRestGoal, restLeft, sessionsOnDay, startOfWeek, streakDays,
  summarize, weekSummary,
} from './writingLogic';
import { allMedalProgress, formatAmount, TIER_LABEL } from './medals';
import { monthKey, monthMedal, monthProgress, monthWords } from './monthMedals';

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS = [1, 2, 3, 4, 5];
export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const HORIZON_DAYS = 7;

export const DEFAULT_REMINDERS = [
  { id: 'morning', name: 'Morning', h: 7, m: 30, days: ALL_DAYS, on: true },
  { id: 'lunch', name: 'Lunch', h: 12, m: 15, days: WEEKDAYS, on: false },
  { id: 'evening', name: 'Evening', h: 20, m: 30, days: ALL_DAYS, on: true },
];

export const DEFAULT_PREFS = {
  live: false, episodes: false,
  reminders: DEFAULT_REMINDERS,
  skipDone: true, streak: true, almost: true, month: true,
  quiet: { on: true, from: [21, 30], to: [7, 0] },
};

// Saved settings over the defaults (older saves only had live / episodes).
export function withDefaults(saved) {
  const s = saved || {};
  return {
    ...DEFAULT_PREFS,
    ...s,
    reminders: Array.isArray(s.reminders) ? s.reminders : DEFAULT_REMINDERS,
    quiet: { ...DEFAULT_PREFS.quiet, ...(s.quiet || {}) },
  };
}

// ---------- small helpers ----------
export function timeText(h, m) {
  const ap = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ap}`;
}

export function daysText(days) {
  const d = [...new Set(days || [])].sort();
  if (d.length === 7) return 'Every day';
  if (!d.length) return 'Never';
  if (d.join() === WEEKDAYS.join()) return 'Weekdays';
  if (d.join() === '0,6') return 'Weekends';
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return d.map((i) => names[i]).join(', ');
}

// A new reminder: an hour after the latest one, or 3:00 PM.
export function newReminder(list, id = `r${Date.now()}`) {
  const latest = [...(list || [])].sort((a, b) => b.h * 60 + b.m - (a.h * 60 + a.m))[0];
  const h = latest ? Math.min(22, latest.h + 1) : 15;
  return { id, name: 'Reminder', h, m: latest && latest.h < 22 ? latest.m : 0, days: ALL_DAYS, on: true };
}

// Step a time by `mins` minutes, wrapping round the day.
export function stepTime(h, m, mins) {
  const t = (((h * 60 + m + mins) % 1440) + 1440) % 1440;
  return [Math.floor(t / 60), t % 60];
}

const at = (date, h, m) => { const d = new Date(date); d.setHours(h, m, 0, 0); return d; };
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };

// In quiet hours? (from 21:30 to 7:00 wraps past midnight.)
export function inQuiet(h, m, quiet) {
  if (!quiet || !quiet.on) return false;
  const t = h * 60 + m;
  const a = quiet.from[0] * 60 + quiet.from[1];
  const b = quiet.to[0] * 60 + quiet.to[1];
  if (a === b) return false;
  return a < b ? t >= a && t < b : t >= a || t < b;
}

// Moved to the end of quiet hours if it falls inside them.
export function afterQuiet(date, quiet) {
  if (!inQuiet(date.getHours(), date.getMinutes(), quiet)) return date;
  let d = at(date, quiet.to[0], quiet.to[1]);
  if (d <= date) d = addDays(d, 1);
  return d;
}

// The time the Streak saver comes: your Evening reminder (or the latest one
// after 5 PM), else 8:30 PM.
export function eveningTime(reminders) {
  const on = (reminders || []).filter((r) => r.on !== false);
  const ev = on.find((r) => r.id === 'evening') || [...on].filter((r) => r.h >= 17).sort((a, b) => b.h * 60 + b.m - (a.h * 60 + a.m))[0];
  return ev ? { h: ev.h, m: ev.m, id: ev.id } : { h: 20, m: 30, id: null };
}

// The time for the medal and month notes: your first morning reminder, else 9:00.
export function morningTime(reminders) {
  const on = (reminders || []).filter((r) => r.on !== false && r.h < 12).sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m));
  return on[0] ? { h: on[0].h, m: on[0].m } : { h: 9, m: 0 };
}

// ---------- what each one says ----------
function lead(h) {
  if (h < 11) return 'Coffee and a few lines?';
  if (h < 14) return 'A few minutes at lunch?';
  if (h < 17) return 'Ten quiet minutes this afternoon?';
  if (h < 21) return 'The house is quieter now. A few lines?';
  return 'Before bed: one small paragraph?';
}

// A writing reminder. progress: { words, goalWords, pct } for today (or none yet).
export function reminderText(rem, progress = null) {
  const goalWords = progress?.goalWords || null;
  if (progress && progress.words > 0 && goalWords) {
    return { title: rem.name, body: `${progress.words.toLocaleString()} of ${goalWords.toLocaleString()} words so far. A little more closes the ring.` };
  }
  return { title: rem.name, body: goalWords ? `${lead(rem.h)} Today: 0 of ${goalWords.toLocaleString()} words.` : lead(rem.h) };
}

export function streakText(n, restsLeft) {
  return {
    title: `Your ${n}-day streak`,
    body: restsLeft > 0 ? 'Nothing yet today. Write a few lines, or take a rest day.' : 'Nothing yet today. A few lines keeps it going.',
  };
}

export function restTakenText(n, restsLeft) {
  return {
    title: 'Rest day taken 🌙',
    body: `${n > 0 ? `Your ${n}-day streak is safe. ` : ''}See you tomorrow. (${restsLeft} rest day${restsLeft === 1 ? '' : 's'} left this week)`,
  };
}

export function almostText(p) {
  const amount = `${formatAmount(p, p.toGo)}${p.isTime ? '' : ` ${p.unit}`}`;
  return { title: `${amount} to ${TIER_LABEL[p.nextTier]}`, body: `${p.name} is nearly ${TIER_LABEL[p.nextTier]}. One more session would do it.` };
}

// On the 1st: last month (if you wrote) and the new month's medal.
export function monthStartText(sessions, newMk) {
  const { year, m } = { year: Number(newMk.slice(0, 4)), m: Number(newMk.slice(5, 7)) - 1 };
  const prevMk = m === 0 ? monthKey(year - 1, 11) : monthKey(year, m - 1);
  const words = monthWords(sessions, prevMk);
  const next = monthMedal(newMk);
  const prevName = MONTHS[Number(prevMk.slice(5, 7)) - 1];
  let body;
  if (words > 0) {
    const p = monthProgress(sessions, prevMk, words);
    body = p.tier
      ? `${prevName}’s done: ${TIER_LABEL[p.tier]} ${p.name}, ${words.toLocaleString()} words. This month’s medal is ${next.name}.`
      : `${prevName}’s done: ${words.toLocaleString()} words. This month’s medal is ${next.name}; 500 words earns Bronze.`;
  } else {
    body = `This month’s medal is ${next.name}. 500 words earns Bronze.`;
  }
  return { title: `Hello, ${MONTHS[m]}`, body };
}

export function monthEndText(sessions, mk) {
  const p = monthProgress(sessions, mk);
  if (p.maxed) return null;
  const m = Number(mk.slice(5, 7)) - 1;
  return { title: `3 days left in ${MONTHS[m]}`, body: `${p.toGo.toLocaleString()} words to ${TIER_LABEL[p.nextTier]} ${p.name}.` };
}

// Example text for Settings (what each one looks like).
export function examples(prefs, data, now = new Date()) {
  const { sessions = [], dailyGoals = {}, goals = null } = data || {};
  const today = dayKey(now);
  const goal = goalForDay(dailyGoals, goals, today);
  const goalWords = goal && !isRestGoal(goal) ? goal.words || null : null;
  const streak = Math.max(1, streakDays(sessions, now, dailyGoals));
  const prog = allMedalProgress(sessions, dailyGoals, goals).filter((p) => !p.maxed && !p.single && p.id !== 'tour' && p.next);
  const near = prog.sort((a, b) => b.pct - a.pct)[0];
  const thisMk = today.slice(0, 7);
  const y = Number(thisMk.slice(0, 4)); const mi = Number(thisMk.slice(5, 7)) - 1;
  const nextMk = mi === 11 ? monthKey(y + 1, 0) : monthKey(y, mi + 1);
  return {
    reminder: (rem) => reminderText(rem, goalWords ? { words: 0, goalWords } : null),
    streak: streakText(streak, 1),
    almost: near ? almostText(near) : { title: '120 words to Gold', body: 'Wordsmith is nearly Gold. One more session would do it.' },
    monthStart: monthStartText(sessions, nextMk),
    monthEnd: monthEndText(sessions, thisMk) || { title: '3 days left this month', body: 'Every tier is yours this month. Diamond!' },
  };
}

// ---------- the plan ----------
export function planNotifications(prefsIn, data, now = new Date(), sent = {}) {
  const prefs = withDefaults(prefsIn);
  const { sessions = [], dailyGoals = {}, goals = null } = data || {};
  const out = [];
  const today = dayKey(now);
  const push = (n) => { if (n.at > now) out.push(n); };
  const quiet = prefs.quiet;

  const writtenToday = sessionsOnDay(sessions, today).length > 0;
  const todayGoal = goalForDay(dailyGoals, goals, today);
  const restToday = dailyGoals?.[today]?.plan === 'rest';
  const sumToday = summarize(sessionsOnDay(sessions, today));
  const pctToday = dailyPct(todayGoal, sumToday);
  const closedToday = pctToday != null && pctToday >= 100;
  const goalWords = todayGoal && !isRestGoal(todayGoal) ? todayGoal.words || null : null;
  const streakNow = streakDays(sessions, now, dailyGoals); // runs through yesterday (or today)
  const ev = eveningTime(prefs.reminders);

  // Streak saver: today if you're on a streak and haven't written or rested;
  // tomorrow if today already counts (written or rested).
  const saverDays = new Set();
  if (prefs.streak) {
    if (streakNow > 0 && !writtenToday && !restToday) saverDays.add(0);
    if (writtenToday || restToday) saverDays.add(1);
    for (const off of saverDays) {
      const day = addDays(now, off);
      const key = dayKey(day);
      if (dailyGoals?.[key]?.plan === 'rest') continue;
      const n = off === 0 ? streakNow : streakNow; // tomorrow: the streak that today extended
      if (n <= 0) continue;
      const left = restLeft(dailyGoals, sessions, day);
      const t = streakText(n, left);
      push({
        id: `pp-streak-${key}`, at: at(day, ev.h, ev.m), ...t,
        data: { kind: 'streak', day: key }, category: left > 0 ? 'streak' : 'streak-write',
      });
    }
  }

  // Writing reminders, the next 7 days.
  for (let i = 0; i < HORIZON_DAYS; i += 1) {
    const day = addDays(now, i);
    const key = dayKey(day);
    if (dailyGoals?.[key]?.plan === 'rest') continue;
    if (i === 0 && prefs.skipDone && closedToday) continue;
    for (const rem of prefs.reminders || []) {
      if (rem.on === false || !(rem.days || []).includes(day.getDay())) continue;
      // The streak saver takes the evening reminder's place that day.
      if (saverDays.has(i) && rem.h === ev.h && rem.m === ev.m) continue;
      const t = reminderText(rem, i === 0 ? { words: sumToday.words, goalWords } : (goalWords ? { words: 0, goalWords } : null));
      push({ id: `pp-rem-${rem.id}-${key}`, at: at(day, rem.h, rem.m), ...t, data: { kind: 'reminder', day: key } });
    }
  }

  const morning = morningTime(prefs.reminders);

  // Medal almost there: the closest one within 10% of its next tier, the next
  // morning, once per tier.
  if (prefs.almost) {
    const near = allMedalProgress(sessions, dailyGoals, goals)
      .filter((p) => !p.maxed && !p.single && p.id !== 'tour' && p.next && p.toGo > 0 && p.toGo / p.next <= 0.1)
      .filter((p) => !sent[`${p.id}:${p.nextTier}`])
      .sort((a, b) => b.pct - a.pct)[0];
    if (near) {
      const when = afterQuiet(at(addDays(now, 1), morning.h, morning.m), quiet);
      push({ id: 'pp-almost', at: when, ...almostText(near), data: { kind: 'medals', once: `${near.id}:${near.nextTier}` } });
    }
  }

  // Month's medal: the 1st of next month, and 3 days before this one ends.
  if (prefs.month) {
    const y = now.getFullYear(); const m = now.getMonth();
    const first = new Date(y, m + 1, 1);
    const nextMk = monthKey(first.getFullYear(), first.getMonth());
    push({ id: 'pp-month-start', at: afterQuiet(at(first, morning.h, morning.m), quiet), ...monthStartText(sessions, nextMk), data: { kind: 'medals' } });
    const last = new Date(y, m + 1, 0);
    const end = monthEndText(sessions, monthKey(y, m));
    if (end) push({ id: 'pp-month-end', at: afterQuiet(at(addDays(last, -2), morning.h, morning.m), quiet), ...end, data: { kind: 'medals' } });
  }

  return out.sort((a, b) => a.at - b.at);
}

// How many switches are on (for the Settings row: "4 on").
export function countOn(prefsIn) {
  const p = withDefaults(prefsIn);
  return (p.reminders || []).filter((r) => r.on !== false).length
    + [p.streak, p.almost, p.month, p.live, p.episodes].filter(Boolean).length;
}
