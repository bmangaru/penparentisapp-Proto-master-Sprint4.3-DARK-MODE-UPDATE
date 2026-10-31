// tour.js — the app tour's progress, saved on this phone.
//   { done: { chapterId: true }, ever: { chapterId: true }, hidden: bool, finished: bool }
// ever = chapters ever finished (the Tour Guide medal counts these). Start
// over clears both, and the medal, so it's earned again.
// finished = every chapter done at least once (earns the Diamond Tour Guide
// medal; the Home card goes away). Replaying from Settings keeps the medal.
// Any screen can open the tour with openTour(chapterId?) — App.js shows it.

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TOUR_KEY = 'pp.tour.v1';
// The chapters, in order (components/TourContent.js uses the same ids).
// Only these count toward the Tour Guide medal, so a chapter that was
// renamed or removed in an update doesn't count twice.
export const TOUR_CHAPTER_IDS = ['welcome', 'home', 'goals', 'write', 'tools', 'finish', 'week', 'medals', 'calendar', 'community'];
const EMPTY = { done: {}, ever: {}, hidden: false, finished: false };

let state = null;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(state));

export async function loadTour() {
  if (state) return state;
  try { state = { ...EMPTY, ...JSON.parse((await AsyncStorage.getItem(TOUR_KEY)) || '{}') }; } catch { state = { ...EMPTY }; }
  return state;
}
async function save(next) {
  state = next;
  emit();
  try { await AsyncStorage.setItem(TOUR_KEY, JSON.stringify(next)); } catch {}
}

export function useTour() {
  const [v, setV] = useState(state);
  useEffect(() => {
    listeners.add(setV);
    loadTour().then(setV);
    return () => listeners.delete(setV);
  }, []);
  return v;
}

// Pure: is every chapter done?
export function allDone(done, chapterIds) {
  return chapterIds.every((id) => done && done[id]);
}

// Marks a chapter done. Returns true when this finished the whole tour for the first time.
export async function markChapter(id, chapterIds) {
  const cur = await loadTour();
  const done = { ...cur.done, [id]: true };
  const ever = { ...(cur.ever || cur.done || {}), [id]: true };
  const nowFinished = allDone(done, chapterIds);
  const first = nowFinished && !cur.finished;
  await save({ ...cur, done, ever, finished: cur.finished || nowFinished });
  return first;
}

export async function setTourHidden(hidden) {
  const cur = await loadTour();
  await save({ ...cur, hidden });
}

// Settings → Start the tour over: clears every chapter AND the Tour Guide
// medal, so it's earned again (and celebrated again) as you go.
const MEDAL_RECORD_KEY = 'pp.medals.v1'; // writingStore.js MEDALS_KEY
export async function restartTour() {
  const cur = await loadTour();
  await save({ ...cur, done: {}, ever: {}, finished: false, hidden: false });
  try {
    const rec = JSON.parse((await AsyncStorage.getItem(MEDAL_RECORD_KEY)) || 'null');
    if (rec && rec.tour) { delete rec.tour; await AsyncStorage.setItem(MEDAL_RECORD_KEY, JSON.stringify(rec)); }
  } catch {}
}

// Opening the tour from anywhere.
let opener = null;
export function setTourOpener(fn) { opener = fn; }
export function openTour(chapterId = null) { if (opener) opener(chapterId); }
