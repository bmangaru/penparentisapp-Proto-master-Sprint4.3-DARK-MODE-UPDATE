// eventsService.js — Pen Parentis events for the Eventbrite tab (and the
// Calendar's gold stars).
//
// Order of preference:
//   1. live list from EVENTS_API_URL (our server function that talks to Eventbrite)
//   2. the last live list saved on this phone (works offline)
//   3. the built-in list below
// Every event has the same shape:
//   { id, name, start (ISO), end (ISO), day ('YYYY-MM-DD' local), online, venue, url, summary,
//     stream? }   ← its YouTube livestream, when the server found one
// The server can also send `streams` (YouTube) and `podcast` (latest episode).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { EVENTS_API_URL, LINKS } from './links';
import { dayKey } from './writingLogic';

export const EVENTS_KEY = 'pp.events.v1';
const MAX_AGE_MS = 6 * 60 * 60 * 1000; // refresh at most every 6 hours

// Used until the server function is live. Update by hand if dates change.
export const FALLBACK_EVENTS = [
  {
    id: '1997639471434',
    name: "BUILDING WRITER-PARENT COMMUNITY: Meet The Author's Guild",
    start: '2026-11-11T00:00:00Z',
    end: '2026-11-11T01:15:00Z',
    online: true,
    venue: 'Online',
    url: 'https://www.eventbrite.com/e/building-writer-parent-community-meet-the-authors-guild-registration-1997639471434',
    summary: 'How do you succeed if you have kids? Pen Parentis has real life answers - readings and lived experiences of authors - in community!',
  },
  {
    id: '1997641492479',
    name: 'BUILDING WRITER-PARENT COMMUNITY: Meet RAWI',
    start: '2026-12-09T00:00:00Z',
    end: '2026-12-09T01:15:00Z',
    online: true,
    venue: 'Online',
    url: 'https://www.eventbrite.com/e/building-writer-parent-community-meet-rawi-registration-1997641492479',
    summary: 'How do you succeed if you have kids? Pen Parentis has real life answers - readings and lived experiences of authors - in community!',
  },
];

// Fill in `day` (the phone's local date) and drop anything malformed.
export function normalizeEvents(list) {
  return (Array.isArray(list) ? list : [])
    .filter((e) => e && e.name && e.start && !isNaN(new Date(e.start)))
    .map((e) => ({ ...e, id: String(e.id || e.start), day: dayKey(new Date(e.start)), url: e.url || LINKS.eventbrite }))
    .sort((a, b) => new Date(a.start) - new Date(b.start));
}

// Each event's YouTube livestream: the channel stream scheduled closest to the
// event's start, within 12 hours (Nov 10 ↔ "meet The Author's Guild").
export function matchStreams(events, streams) {
  const list = Array.isArray(streams) ? streams.filter((x) => x && x.url && (x.scheduledStart || x.actualStart)) : [];
  if (!list.length) return events;
  const used = new Set();
  return events.map((e) => {
    const t = new Date(e.start).getTime();
    let best = null;
    let bestGap = 12 * 60 * 60 * 1000;
    for (const x of list) {
      if (used.has(x.id)) continue;
      const gap = Math.abs(new Date(x.scheduledStart || x.actualStart).getTime() - t);
      if (gap <= bestGap) { best = x; bestGap = gap; }
    }
    if (!best) return e;
    used.add(best.id);
    return { ...e, stream: best };
  });
}

// What the event's YouTube button says and opens, right now.
//   before → "Watch on YouTube · Nov 10, 7 PM"
//   during → "● Watch live now"
//   after  → "Watch the recording"
// Without stream data (no YouTube key on the server) only the NEXT event gets
// a button: youtube.com/…/live opens the channel's next scheduled stream,
// which is that event's. Later events get theirs once they're next.
// Returns null when the event shouldn't show a button.
export function youtubeFor(e, now = new Date(), { isNext = true } = {}) {
  const x = e.stream || null;
  if (!x && !isNext) return null;
  const start = new Date(e.start).getTime();
  const end = new Date(e.end || e.start).getTime() + 30 * 60 * 1000; // streams often run a little long
  const t = now.getTime();
  let phase;
  if (x && x.status === 'live') phase = 'live';
  else if (x && x.status === 'ended') phase = 'ended';
  else if (x && x.status === 'upcoming') phase = t >= start ? 'live' : 'soon';
  else phase = t < start - 10 * 60 * 1000 ? 'soon' : t <= end ? 'live' : 'ended';
  const when = new Date(e.start);
  const sub = `${when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  if (phase === 'live') return { phase, label: 'Watch live now', sub: null, url: x ? x.url : LINKS.youtubeLive };
  if (phase === 'ended') return { phase, label: 'Watch the recording', sub: null, url: x ? x.url : LINKS.youtubeStreams };
  return { phase, label: 'Watch on YouTube', sub, url: x ? x.url : LINKS.youtubeLive };
}

// Events that haven't ended yet.
export function upcoming(events, now = new Date()) {
  return events.filter((e) => new Date(e.end || e.start) >= now);
}

// { 'YYYY-MM-DD': [event, ...] } for the calendar's gold stars.
export function eventsByDay(events) {
  const map = {};
  for (const e of events) (map[e.day] = map[e.day] || []).push(e);
  return map;
}

// "Tue, Nov 10 · 7:00 PM"
export function eventWhen(e) {
  const d = new Date(e.start);
  const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

async function readCache() {
  try {
    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function withStreams(body) {
  return matchStreams(normalizeEvents(body.events), body.streams);
}

// Returns { events, podcast, source: 'live' | 'saved' | 'built-in', updatedAt (ms or null) }.
export async function loadEvents({ force = false } = {}) {
  const cached = await readCache();
  const fresh = cached && Date.now() - cached.savedAt < MAX_AGE_MS;
  if (cached && fresh && !force) return { events: withStreams(cached), podcast: cached.podcast || null, source: 'saved', updatedAt: cached.savedAt };

  if (EVENTS_API_URL) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      // A refresh skips every cache (phone and server) so it's truly live.
      const url = force ? `${EVENTS_API_URL}${EVENTS_API_URL.includes('?') ? '&' : '?'}t=${Date.now()}` : EVENTS_API_URL;
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store', headers: force ? { 'Cache-Control': 'no-cache' } : {} });
      clearTimeout(timer);
      if (res.ok) {
        const raw = await res.json();
        const body = Array.isArray(raw) ? { events: raw } : raw;
        const saved = { savedAt: Date.now(), events: body.events || [], streams: body.streams || [], podcast: body.podcast || null };
        await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(saved));
        return { events: withStreams(saved), podcast: saved.podcast, source: 'live', updatedAt: saved.savedAt };
      }
    } catch {
      // offline or server down — fall through
    }
  }
  if (cached) return { events: withStreams(cached), podcast: cached.podcast || null, source: 'saved', updatedAt: cached.savedAt };
  return { events: normalizeEvents(FALLBACK_EVENTS), podcast: null, source: 'built-in', updatedAt: null };
}
