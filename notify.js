// notify.js — every notification the app sends, all local (scheduled on the
// phone, so they work offline and with the app closed). Settings → Notifications
// shows them all; the two salon switches are also on the Eventbrite tab.
//
// Writing reminders, the Streak saver, medals, the month's medal and the
// Sunday week in review are planned by reminders.js and re-planned by planAll()
// whenever you write, take a rest day or change a setting.
//
// The salon ones:
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
import { Linking } from 'react-native';
import { useEffect, useState } from 'react';
import { loadAll, saveDailyGoal } from './writingStore';
import { planNotifications, restTakenText, withDefaults } from './reminders';
import { restLeft, sessionsOnDay, streakDays } from './writingLogic';

export const NOTIFY_KEY = 'pp.notify.v1';             // reminders.js DEFAULT_PREFS (+ live, episodes)
const ONCE_KEY = 'pp.notify.once.v1';                 // { sent: { 'words:gold': true }, pending: { key, at } }
const HANDLED_KEY = 'pp.notify.handled.v1';           // responses already acted on
const OWN = 'pp-';                                     // identifiers of the planned ones
const WRITING_CHANNEL = 'writing';
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
    settings = withDefaults(raw ? JSON.parse(raw) : {});
  } catch {
    settings = withDefaults({});
  }
  return settings;
}

async function writeSettings(next) {
  settings = next;
  listeners.forEach((fn) => fn(next));
  try { await AsyncStorage.setItem(NOTIFY_KEY, JSON.stringify(next)); } catch { /* keep going */ }
}

export function useNotifySettings() {
  const [value, setValue] = useState(settings || withDefaults({}));
  useEffect(() => {
    readSettings().then(setValue);
    listeners.add(setValue);
    return () => listeners.delete(setValue);
  }, []);
  return value;
}

// Change any setting (Settings → Notifications), then re-plan.
export async function updateNotify(patch) {
  const cur = await readSettings();
  const next = withDefaults({ ...cur, ...patch });
  await writeSettings(next);
  planAll();
  return next;
}

// ---------- permission ----------
// { granted, canAsk } — for the "Notifications are off" note in Settings.
export async function notifyPermission() {
  try {
    const now = await Notifications.getPermissionsAsync();
    const granted = !!now.granted || now.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    return { granted, canAsk: now.canAskAgain !== false };
  } catch {
    return { granted: false, canAsk: false };
  }
}
export const openPhoneSettings = () => Linking.openSettings().catch(() => {});

export async function askPermission() {
  const ok = await ensurePermission();
  if (ok) planAll();
  return ok;
}

async function ensurePermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Salons', importance: Notifications.AndroidImportance.HIGH,
    }).catch(() => {});
    await Notifications.setNotificationChannelAsync(WRITING_CHANNEL, {
      name: 'Writing reminders', importance: Notifications.AndroidImportance.DEFAULT,
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

// ---------- the planned ones (reminders.js) ----------
// The Streak saver's buttons (hold the notification to see them).
let categoriesReady = false;
async function setupCategories() {
  if (categoriesReady) return;
  categoriesReady = true;
  try {
    await Notifications.setNotificationCategoryAsync('streak', [
      { identifier: 'write', buttonTitle: 'Write now', options: { opensAppToForeground: true } },
      { identifier: 'rest', buttonTitle: '🌙 Take a rest day', options: { opensAppToForeground: false } },
    ]);
    await Notifications.setNotificationCategoryAsync('streak-write', [
      { identifier: 'write', buttonTitle: 'Write now', options: { opensAppToForeground: true } },
    ]);
  } catch { /* not supported here (e.g. web) */ }
}

async function readJSON(key, fallback) {
  try { const raw = await AsyncStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

// Cancel and re-plan everything ours. Safe to call often (it runs one at a time).
let planning = null;
let again = false;
export function planAll() {
  if (planning) { again = true; return planning; }
  planning = (async () => {
    try {
      const prefs = await readSettings();
      const perm = await notifyPermission();
      // "Almost there" goes once per tier: one that has gone off is sent.
      const once = await readJSON(ONCE_KEY, { sent: {}, pending: null });
      if (once.pending && new Date(once.pending.at) <= new Date()) {
        once.sent = { ...once.sent, [once.pending.key]: true };
        once.pending = null;
      }
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const n of scheduled) {
        if (String(n.identifier).startsWith(OWN)) await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
      if (perm.granted) {
        await setupCategories();
        const data = await loadAll();
        const plan = planNotifications(prefs, data, new Date(), once.sent);
        once.pending = null;
        for (const n of plan) {
          if (n.data?.once) once.pending = { key: n.data.once, at: n.at.toISOString() };
          await Notifications.scheduleNotificationAsync({
            identifier: n.id,
            content: { title: n.title, body: n.body, data: n.data, ...(n.category ? { categoryIdentifier: n.category } : {}) },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at, channelId: WRITING_CHANNEL },
          });
        }
      }
      await AsyncStorage.setItem(ONCE_KEY, JSON.stringify(once)).catch(() => {});
    } catch {
      // notifications unavailable — nothing to do
    }
  })().finally(() => {
    planning = null;
    if (again) { again = false; planAll(); }
  });
  return planning;
}

// 🌙 Rest day (from the Streak saver, or in the app). Returns
// 'ok' | 'wrote' (you already wrote that day) | 'already' | 'none' (none left this week).
export async function takeRestDay(day, { confirm = false } = {}) {
  const { sessions, dailyGoals } = await loadAll();
  if (sessionsOnDay(sessions, day).length) return 'wrote';
  if (dailyGoals?.[day]?.plan === 'rest') return 'already';
  const date = new Date(`${day}T12:00:00`);
  const left = restLeft(dailyGoals, sessions, date);
  if (left <= 0) return 'none';
  const after = await saveDailyGoal({ plan: 'rest' }, day);
  if (confirm) {
    try {
      const t = restTakenText(streakDays(sessions, date, after), left - 1);
      await Notifications.scheduleNotificationAsync({ content: { title: t.title, body: t.body, data: { kind: 'rest' } }, trigger: null });
    } catch { /* fine */ }
  }
  planAll();
  return 'ok';
}

// Tapping a notification (or one of its buttons). handler({ kind, eventId,
// url, day, action }). 🌙 Rest day is handled here and never opens anything.
// Each response is acted on once, even if the app asks for it again later.
export function onNotificationTap(handler) {
  const handle = async (r) => {
    if (!r) return;
    const req = r.notification.request;
    const id = `${req.identifier}|${r.actionIdentifier}|${r.notification.date}`;
    const done = await readJSON(HANDLED_KEY, []);
    if (done.includes(id)) return;
    await AsyncStorage.setItem(HANDLED_KEY, JSON.stringify([...done, id].slice(-30))).catch(() => {});
    const data = req.content.data || {};
    if (r.actionIdentifier === 'rest') { if (data.day) await takeRestDay(data.day, { confirm: true }); return; }
    handler({ ...data, action: r.actionIdentifier });
  };
  Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener((r) => { handle(r).catch(() => {}); });
  return () => sub.remove();
}
