// tourRun.js — the app tour while it runs ON TOP OF the real app.
// (tour.js keeps the saved progress; this file is the live run.)
//
//   • A chapter with `steps` (components/TourContent.js) runs as an overlay:
//     the app is dimmed except one spot (a TourTarget), and a speech bubble
//     says what it is and what to do. You use the real button; the real
//     screen reacts and tells the tour with tourEvent(name, value).
//   • When a step's task is done, the bubble turns green and the next step
//     follows by itself. Info steps have "Got it ›"; any step can be skipped.
//   • After the last step: the "Chapter done" card (marks the chapter,
//     the Tour Guide medal counts it).
//
// Targets: <TourTarget id="home.settings"> in a screen registers that spot.
// Sheets (Modals) are their own "host": a target inside a sheet is drawn by
// the TourLayer inside that sheet, because nothing can sit above a Modal.

import React, { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------
// run = { ch, step, phase: 'step' | 'done', data, progress, taskDone } or null
let run = null;
const listeners = new Set();
function set(next) {
  run = next;
  listeners.forEach((fn) => fn(run));
}
export const getRun = () => run;
export const tourRunning = () => !!run;

export function useRun() {
  const [v, setV] = useState(run);
  useEffect(() => {
    listeners.add(setV);
    setV(run);
    return () => listeners.delete(setV);
  }, []);
  return v;
}

let CHAPTERS = [];
export function setTourChapters(list) { CHAPTERS = list; }
export const getTourChapters = () => CHAPTERS;

// The in-page step's gold box (the spot minus its tip), measured relative to
// the spot, so the spot draws it itself (TourTarget) and it moves with the
// page with no lag. { id, top, left, width, height } or { id, full: true }.
let pulseBox = null;
const pulseListeners = new Set();
export function setPulseBox(b) {
  const same = (pulseBox === b) || (pulseBox && b && pulseBox.id === b.id && pulseBox.full === b.full
    && pulseBox.top === b.top && pulseBox.left === b.left && pulseBox.width === b.width && pulseBox.height === b.height);
  if (same) return;
  pulseBox = b;
  pulseListeners.forEach((fn) => fn(b));
}
export function usePulseBox(id) {
  const [v, setV] = useState(pulseBox);
  useEffect(() => { if (!id) return undefined; pulseListeners.add(setV); setV(pulseBox); return () => pulseListeners.delete(setV); }, [id]);
  return id && v && v.id === id ? v : null;
}

export function stepOf(r = run) {
  if (!r || r.phase !== 'step') return null;
  return CHAPTERS[r.ch]?.steps?.[r.step] || null;
}
// Is this target the one being shown right now?
// While you're doing a chapter, the tab bar (and swiping between tabs) is
// off, so you can't wander away mid-step; it works again when the chapter
// ends. Not on the steps that ask you to tap a tab, and not when the tour is
// tucked away as a "Tour paused" card (then you're using the app). Hidden on
// a page step (the slim strip, e.g. on the writing page) it stays off: you're
// still doing that step. The tour itself can still change tabs.
export function tabsLocked(r = run) {
  if (!r || r.phase !== 'step') return false;
  const st = stepOf(r);
  if (!st || !st.target) return false;
  if (/^tab(\.|bar$)/.test(st.target)) return false;
  if (r.min && !st.inline) return false;
  return true;
}

export function isTourTarget(id, r = run) {
  const st = stepOf(r);
  return !!st && st.target === id;
}

// App-level hooks (set by components/TourOverlay.js).
let goTo = null;        // (go) => navigate somewhere for a step
let reveal = null;      // (routeKey) => show that page (its tab, nothing on top of it)
let chapterDone = null; // (chapterIndex) => mark it, medals…
export function setTourNavigator(fn) { goTo = fn; }
export function setTourReveal(fn) { reveal = fn; }
let swiper = null;      // (dir) => the next tab (+1) or the one before (-1)
export function setTourSwipe(fn) { swiper = fn; }
export function swipeTab(dir) { if (swiper) swiper(dir); }

// Pages that scroll (components/ui.js Screen), so a drag on the tour's dim
// can scroll the page that's showing (you can always scroll during the tour).
const pageScrolls = new Set();
export function registerPageScroll(s) {
  pageScrolls.add(s);
  return () => pageScrolls.delete(s);
}
// What a drag on the dim should scroll: the step's own page or sheet; for a
// spot that isn't in one (the tab bar), the page showing behind it.
export function scrollForStep(host = 'root') {
  const st = stepOf();
  const t = st?.target ? getTarget(st.target) : null;
  if (t?.scroll) return t.scroll;
  if (host !== 'root') return null; // a sheet: never scroll the page behind it
  for (const s of pageScrolls) if (!s.onScreen || safe(s.onScreen)) return s;
  return null;
}

// Is this spot on a page that's showing right now? (A spot can still be
// loaded while covered: Medals opened over Brainstorm, or another tab.)
export function targetOnScreen(id) {
  const t = getTarget(id);
  if (!t) return false;
  return !t.onScreen || safe(t.onScreen);
}
// Bring a covered spot's page back into view.
export function revealTarget(id) {
  const t = getTarget(id);
  if (t?.routeKey && reveal) reveal(t.routeKey);
}
export function setTourChapterDone(fn) { chapterDone = fn; }

let advanceTimer = null;

// Start a chapter, or one of its sections (at = the section's first step).
// A section that needs you somewhere first (e.g. on the writing page) runs
// the chapter's `prelude` steps before it (they skip themselves if you're
// already there).
export function startChapter(idx, at = 0) {
  clearTimeout(advanceTimer);
  const chapter = CHAPTERS[idx];
  if (!chapter?.steps) return;
  const all = chapter.steps.map((_, i) => i);
  const order = at > 0 ? [...(chapter.prelude || []).filter((i) => i < at), ...all.slice(at)] : all;
  set({ ch: idx, order, pos: 0, step: order[0], phase: 'step', data: {}, progress: '', frac: null, taskDone: false, min: false });
  enter();
  const st = stepOf();
  if (at > 0 && st?.tab && goTo) goTo({ tab: st.tab });
}

const fresh = { phase: 'step', data: {}, progress: '', frac: null, taskDone: false, min: false };
// Move to the next step in this run's order; false when there's none left.
function advance() {
  const order = run.order || CHAPTERS[run.ch].steps.map((_, i) => i);
  const pos = (run.pos ?? order.indexOf(run.step)) + 1;
  if (pos >= order.length) return false;
  set({ ...run, ...fresh, order, pos, step: order[pos] });
  return true;
}

// Steps with skipIf() that's true right now are passed over (e.g. "open the
// writing page" when you're already on it).
function enter() {
  let st = stepOf();
  while (st && st.skipIf && safe(st.skipIf)) {
    if (!advance()) { finishChapter(); return; }
    st = stepOf();
  }
  if (st?.go && goTo) goTo(st.go);
}
const safe = (fn) => { try { return !!fn(); } catch { return false; } };

function finishChapter() {
  const ch = run.ch;
  set({ ...run, phase: 'done', earned: null, min: false });
  if (chapterDone) chapterDone(ch);
}

export function nextStep() {
  clearTimeout(advanceTimer);
  if (!run) return;
  if (advance()) enter();
  else finishChapter();
}

// Which section the current step is in: { num: '7.2', title } (or null).
export function sectionOf(r = run) {
  if (!r) return null;
  const steps = CHAPTERS[r.ch]?.steps || [];
  let n = 0;
  let found = null;
  steps.forEach((st, i) => {
    if (i > r.step) return;
    if (st.section) { n += 1; found = { num: `${r.ch + 1}.${n}`, title: st.section }; }
    // An extra part of a section, shown as e.g. 5.2a.
    if (st.subsection && i === r.step) found = { num: `${r.ch + 1}.${n}a`, title: st.subsection };
  });
  return found;
}
// A chapter's sections, for the table of contents: [{ num, title, at }].
export function sectionsOf(idx) {
  const steps = CHAPTERS[idx]?.steps || [];
  const out = [];
  let lastJump = 0;
  steps.forEach((st, i) => {
    if (!st.section) return;
    if (st.jump !== false) lastJump = i;
    out.push({ num: `${idx + 1}.${out.length + 1}`, title: st.section, at: st.jump === false ? lastJump : i });
  });
  return out;
}

// Back one step in this run's order (for steps marked back: true).
function stepBack() {
  if (!run) return;
  const order = run.order || CHAPTERS[run.ch].steps.map((_, i) => i);
  const pos = Math.max(0, (run.pos ?? order.indexOf(run.step)) - 1);
  set({ ...run, ...fresh, order, pos, step: order[pos] });
}

// ‹ Back: the nearest earlier step you can do again from where you are now.
// Its spot has to be on screen in the same place you are (over the app, or
// the same sheet). A step that names its tab (`tab`) is reached by going to
// that tab. -1 = no way back (the button hides).
export function backIndex(r = run) {
  if (!r || r.phase !== 'step') return -1;
  const steps = CHAPTERS[r.ch]?.steps || [];
  const cur = steps[r.step];
  const curHost = cur?.target ? getTarget(cur.target)?.host || 'root' : 'root';
  for (let i = r.step - 1; i >= 0; i -= 1) {
    const st = steps[i];
    if (st.kind === 'welcome') return -1;
    if (st.skipIf && safe(st.skipIf)) continue;
    if (!st.target) continue;
    const t = getTarget(st.target);
    if (!t) continue;
    if (t.host !== curHost) continue;
    return i;
  }
  return -1;
}

export function prevStep() {
  const i = backIndex();
  if (i < 0) return;
  clearTimeout(advanceTimer);
  const order = CHAPTERS[run.ch].steps.map((_, k) => k);
  set({ ...run, ...fresh, order, pos: i, step: i });
  const st = stepOf();
  if (st?.tab && goTo) goTo({ tab: st.tab });
}

// A Tour Guide tier earned by the chapter just finished (shown on its card).
export function setTourEarned(tiers) {
  if (run && run.phase === 'done') set({ ...run, earned: tiers });
}

// ✕ on the bubble tucks the tour away (a small "Tour" pill stays) so you
// can carry on using the app; it keeps listening, so doing the task (e.g.
// tapping Finish & check in) still moves it on, and the next step shows again.
export function minimizeTour(on = true) {
  if (!run) return;
  // `resumed` counts comebacks, so the page scrolls to the spot again.
  set({ ...run, min: on, resumed: on ? run.resumed || 0 : (run.resumed || 0) + 1 });
  if (!on) resumeHere();
}

// Back from ✕ after using the app: if the step's spot is gone (e.g. you
// closed the sheet or left the writing page it was on), start its section
// again, which walks you back there. A spot that's only covered (another
// page on top, another tab) is brought back by TourLayer instead.
function resumeHere() {
  if (!run || run.phase !== 'step' || run.taskDone) return;
  const st = stepOf();
  if (!st?.target || getTarget(st.target)) return;
  let at = null;
  sectionsOf(run.ch).forEach((s) => { if (s.at <= run.step) at = s.at; });
  if (at != null && at < run.step) startChapter(run.ch, at);
}

export function stopTour() {
  clearTimeout(advanceTimer);
  set(null);
}

// The real app reports what happened: tourEvent('sheet-open', 'settings'),
// tourEvent('tab', 'Calendar'), tourEvent('words', 7)…
// A step's on(name, value, data) answers true / false, or
// { done, progress, data, frac } to show progress ("3 of 5 tabs seen";
// frac 0–1 fills the little ring in the bubble).
export function tourEvent(name, value) {
  if (!run || run.phase !== 'step' || run.taskDone) return;
  const st = stepOf();
  if (!st?.on) return;
  let r;
  try { r = st.on(name, value, run.data || {}); } catch { r = null; }
  if (!r) return;
  const res = r === true ? { done: true } : r;
  // Doing the task while the tour is hidden (e.g. Finish & check in after
  // Hide on the writing page) brings the tour back for what comes next.
  // Steps that wait for you (manual) stay hidden: the hidden strip shows a ✓
  // instead, so nothing jumps while you're typing.
  const back = !!res.done && run.min && !st.manual;
  set({
    ...run,
    data: res.data !== undefined ? res.data : run.data,
    progress: res.progress !== undefined ? res.progress : run.progress,
    frac: res.frac !== undefined ? res.frac : run.frac,
    taskDone: !!res.done,
    ...(back ? { min: false, resumed: (run.resumed || 0) + 1 } : {}),
  });
  // manual steps wait for "Next ›" (time to read, or to keep writing).
  // back: when done, return to the step before (e.g. 5.2a → 5.2).
  if (res.done && !st.manual) advanceTimer = setTimeout(st.back ? stepBack : nextStep, st.hold ?? 900);
}

// ---------------------------------------------------------------------------
// Targets and hosts.
// ---------------------------------------------------------------------------
const targets = new Map(); // id → { ref, host, scroll }
export function registerTarget(id, entry) {
  targets.set(id, entry);
  return () => { if (targets.get(id) === entry) targets.delete(id); };
}
export const getTarget = (id) => targets.get(id) || null;

// Open sheets, newest last. Centred cards (welcome, chapter done) are drawn
// in the newest one, so they're never hidden behind a sheet.
const hosts = ['root'];
export function registerHost(id) {
  hosts.push(id);
  return () => { const i = hosts.lastIndexOf(id); if (i > 0) hosts.splice(i, 1); };
}
export const topHost = () => hosts[hosts.length - 1];

// Which host a target belongs to ('root', or the sheet it's in).
export const TourHostContext = React.createContext('root');
// The page's ScrollView, so a target below the fold can be scrolled into view.
export const TourScrollContext = React.createContext(null);
