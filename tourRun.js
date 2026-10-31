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

export function stepOf(r = run) {
  if (!r || r.phase !== 'step') return null;
  return CHAPTERS[r.ch]?.steps?.[r.step] || null;
}
// Is this target the one being shown right now?
export function isTourTarget(id, r = run) {
  const st = stepOf(r);
  return !!st && st.target === id;
}

// App-level hooks (set by components/TourOverlay.js).
let goTo = null;        // (go) => navigate somewhere for a step
let chapterDone = null; // (chapterIndex) => mark it, medals…
export function setTourNavigator(fn) { goTo = fn; }
export function setTourChapterDone(fn) { chapterDone = fn; }

let advanceTimer = null;

export function startChapter(idx) {
  clearTimeout(advanceTimer);
  if (!CHAPTERS[idx]?.steps) return;
  set({ ch: idx, step: 0, phase: 'step', data: {}, progress: '', taskDone: false });
  enter();
}

function enter() {
  const st = stepOf();
  if (st?.go && goTo) goTo(st.go);
}

export function nextStep() {
  clearTimeout(advanceTimer);
  if (!run) return;
  const steps = CHAPTERS[run.ch].steps;
  if (run.step + 1 < steps.length) {
    set({ ...run, step: run.step + 1, phase: 'step', data: {}, progress: '', taskDone: false });
    enter();
  } else {
    const ch = run.ch;
    set({ ...run, phase: 'done' });
    if (chapterDone) chapterDone(ch);
  }
}

export function stopTour() {
  clearTimeout(advanceTimer);
  set(null);
}

// The real app reports what happened: tourEvent('sheet-open', 'settings'),
// tourEvent('tab', 'Calendar'), tourEvent('words', 7)…
// A step's on(name, value, data) answers true / false, or
// { done, progress, data } to show progress ("3 of 5 tabs seen").
export function tourEvent(name, value) {
  if (!run || run.phase !== 'step' || run.taskDone) return;
  const st = stepOf();
  if (!st?.on) return;
  let r;
  try { r = st.on(name, value, run.data || {}); } catch { r = null; }
  if (!r) return;
  const res = r === true ? { done: true } : r;
  set({
    ...run,
    data: res.data !== undefined ? res.data : run.data,
    progress: res.progress !== undefined ? res.progress : run.progress,
    taskDone: !!res.done,
  });
  if (res.done) advanceTimer = setTimeout(nextStep, st.hold ?? 900);
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
