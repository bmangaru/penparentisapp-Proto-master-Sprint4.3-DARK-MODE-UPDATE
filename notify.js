// notify.js — the two switches on the Eventbrite tab, for real.
//
//   "Tell me when a salon goes live"  → one local notification 30 minutes before
//      each upcoming event. Scheduled on the phone, so it arrives even if the
//      app is closed. Re-planned whenever the event list loads.
//   "New episode in the feed"         → when the events server reports a newer
//      podcast episode than the last one seen, one notification right away.
//      Checked whenever the app loads events (app start, Refresh).
//
// Local notifications work in Expo Go (remote push does not on Android).
// Tapping a notification opens the Eventbrite tab (or Spotify for an episode).

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';

export const NOTIFY_KEY = 'pp.notify.v1';             // { live: bool, episodes: bool }
const LAST_EPISODE_KEY = 'pp.notify.lastEpisode.v1';  // ISO date of the newest episode seen
const PREFIX = 'salon-';                               // identifiers of our scheduled reminders
export const LEAD_MINUTES = 30;
const CHANNEL = 'salons';

// Show banners even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

// ---------- settings (shared by every screen that shows the switches) ----------
let settings = null;
const listeners = new Set();

async function readSettings() {
  if (settings) return settings;
  try {
    const raw = await AsyncStorage.getItem(NOTIFY_KEY);
    settings = { live: false, episodes: false, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    settings = { live: false, episodes: false };
  }
  return settings;
}

async function writeSettings(next) {
  settings = next;
  listeners.forEach((fn) => fn(next));
  try { await AsyncStorage.setItem(NOTIFY_KEY, JSON.stringify(next)); } catch { /* keep going */ }
}

export function useNotifySettings() {
  const [value, setValue] = useState(settings || { live: false, episodes: false });
  useEffect(() => {
    readSettings().then(setValue);
    listeners.add(setValue);
    return () => listeners.delete(setValue);
  }, []);
  return value;
}

// ---------- permission ----------
async function ensurePermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Salons', importance: Notifications.AndroidImportance.HIGH,
    }).catch(() => {});
  }
  const now = await Notifications.getPermissionsAsync();
  if (now.granted || now.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
  if (now.canAskAgain === false) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return !!asked.granted || asked.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

// Turning a switch on asks for permission first. Returns 'on' | 'off' | 'denied'.
export async function setNotify(kind, on, { events = [], podcast = null } = {}) {
  const cur = await readSettings();
  if (on) {
    const ok = await ensurePermission();
    if (!ok) { await writeSettings({ ...cur, [kind]: false }); return 'denied'; }
  }
  const next = { ...cur, [kind]: on };
  await writeSettings(next);
  if (kind === 'live') await planSalonReminders(events);
  if (kind === 'episodes' && on && podcast?.published) {
    // Start from the newest episode now, so turning it on doesn't ping for an old one.
    await AsyncStorage.setItem(LAST_EPISODE_KEY, podcast.published).catch(() => {});
  }
  return on ? 'on' : 'off';
}

// ---------- "Tell me when a salon goes live" ----------
// Which reminders to keep: one per event starting more than LEAD_MINUTES from now.
export function reminderPlan(events, now = new Date(), lead = LEAD_MINUTES) {
  return (events || [])
    .map((e) => ({ e, at: new Date(new Date(e.start).getTime() - lead * 60 * 1000) }))
    .filter(({ at }) => !isNaN(at) && at.getTime() > now.getTime())
    .map(({ e, at }) => ({ id: `${PREFIX}${e.id}`, at, eventId: e.id, title: `Salon starts in ${lead} minutes`, body: e.name }));
}

export async function planSalonReminders(events) {
  try {
    const { live } = await readSettings();
    // Start clean each time (there are only a few), so a moved or cancelled
    // event never leaves a stale reminder behind.
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (String(n.identifier).startsWith(PREFIX)) await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    if (!live) return;
    for (const w of reminderPlan(events)) {
      await Notifications.scheduleNotificationAsync({
        identifier: w.id,
        content: { title: w.title, body: w.body, data: { kind: 'salon', eventId: w.eventId } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: w.at, channelId: CHANNEL },
      });
    }
  } catch {
    // notifications unavailable (e.g. permission turned off in Settings) — nothing to do
  }
}

// ---------- "New episode in the feed" ----------
export function isNewEpisode(podcast, lastSeen) {
  if (!podcast?.published) return false;
  if (!lastSeen) return false; // first look just records the newest
  return new Date(podcast.published) > new Date(lastSeen);
}

export async function checkNewEpisode(podcast) {
  try {
    const { episodes } = await readSettings();
    if (!episodes || !podcast?.published) return;
    const lastSeen = await AsyncStorage.getItem(LAST_EPISODE_KEY);
    if (isNewEpisode(podcast, lastSeen)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'New salon episode on Spotify',
          body: podcast.title || 'A new Pen Parentis salon just landed in the feed.',
          data: { kind: 'episode', url: podcast.url || null },
        },
        trigger: null, // right away
      });
    }
    if (!lastSeen || isNewEpisode(podcast, lastSeen)) await AsyncStorage.setItem(LAST_EPISODE_KEY, podcast.published);
  } catch {
    // ignore
  }
}

// After events load anywhere: keep reminders and the episode check up to date.
export async function syncNotifications({ events, podcast }) {
  await planSalonReminders(events);
  await checkNewEpisode(podcast);
}

// Tapping a notification. handler({ kind, eventId, url }).
export function onNotificationTap(handler) {
  Notifications.getLastNotificationResponseAsync()
    .then((r) => { if (r) handler(r.notification.request.content.data || {}); })
    .catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener((r) => handler(r.notification.request.content.data || {}));
  return () => sub.remove();
}
