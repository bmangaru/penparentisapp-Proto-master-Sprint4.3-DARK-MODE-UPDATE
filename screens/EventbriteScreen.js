// screens/EventbriteScreen.js — Pen Parentis events (from Eventbrite), with
// each event's YouTube livestream, and the "salon goes live" reminder switch.
// (Previous salons and the new-episode switch live on the Calendar tab.)
//   • Coming up: one event open at a time (gold border). Open: Register on
//     Eventbrite, Watch on YouTube, Add to calendar,
//     Share. Tap another to open it; leaving the app resets to the next event.
//   • The YouTube button follows the stream: "Watch on YouTube · Nov 10, 7 PM"
//     → "● Watch live now" → "Watch the recording" (youtubeFor in eventsService).
//     Without a YouTube key on the server, only the next event shows it.
//   • Switch: a reminder 30 minutes before each salon (notify.js).

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Animated, AppState, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, Header, openLink } from '../components/ui';
import { colors, lift, radius, space, themed } from '../theme';
import { LINKS } from '../links';
import { eventWhen, loadEvents, upcoming, youtubeFor } from '../eventsService';
import { addEventToCalendar, openPhoneSettings, shareEvent } from '../eventActions';
import { LEAD_MINUTES, setNotify, syncNotifications, useNotifySettings } from '../notify';
import { BrandButton, DeniedNote, ToggleCard, YT_RED } from '../components/LinkButtons';
import TourTarget from '../components/TourTarget';

const STAR = '#E0AE45';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const SWAP = {
  duration: 320,
  create: { type: 'easeInEaseOut', property: 'opacity' },
  update: { type: 'easeInEaseOut' },
  delete: { type: 'easeInEaseOut', property: 'opacity' },
};

export default function EventbriteScreen({ route }) {
  const [events, setEvents] = useState([]);
  const [podcast, setPodcast] = useState(null);
  const [eventsSource, setEventsSource] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const listFade = useRef(new Animated.Value(0)).current;
  const [openId, setOpenId] = useState(null);
  const [calNote, setCalNote] = useState(null);
  const scrollRef = useRef(null);
  const listY = useRef(0);
  const notify = useNotifySettings();
  const [notifyNote, setNotifyNote] = useState(null); // 'denied' | null
  // Re-check the YouTube button's state every minute while this tab is open.
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(useCallback(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []));

  const refreshEvents = useCallback(async (force = false) => {
    setLoadingEvents(true);
    setRefreshFailed(false);
    setOpenId(null);
    if (force) {
      await new Promise((done) => Animated.timing(listFade, { toValue: 0, duration: 200, useNativeDriver: true }).start(done));
      setEvents([]);
    }
    const [r] = await Promise.all([loadEvents({ force }), new Promise((done) => setTimeout(done, force ? 900 : 0))]);
    setEvents(r.events);
    setPodcast(r.podcast);
    setEventsSource(r.source);
    setUpdatedAt(r.updatedAt);
    setRefreshFailed(force && r.source !== 'live');
    setLoadingEvents(false);
    listFade.setValue(0);
    Animated.timing(listFade, { toValue: 1, duration: 450, useNativeDriver: true }).start();
    syncNotifications({ events: upcoming(r.events), podcast: r.podcast });
  }, []);
  useEffect(() => { refreshEvents(); }, []);

  // Opens the phone's New Event screen (you pick the calendar there). Only a
  // confirmed save or a problem shows a short note; cancelling shows nothing.
  async function onAddToCalendar(e) {
    const status = await addEventToCalendar(e);
    const text = {
      added: 'Added to your calendar.',
      error: "Couldn't open your calendar. Try again in a moment.",
    }[status];
    if (!text) return; // 'opened' (Android hands it to the app) or 'canceled'
    LayoutAnimation.configureNext(SWAP);
    setCalNote({ id: e.id, key: Date.now(), text, ok: status === 'added', settings: false, ms: 3000 });
  }
  function clearNote() {
    LayoutAnimation.configureNext(SWAP);
    setCalNote(null);
  }

  // From Home's countdown, the Calendar's ★ days, or a reminder notification.
  useEffect(() => {
    const id = route?.params?.openEventId;
    if (!id) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, listY.current - 8), animated: true });
    setOpenId(id);
  }, [route?.params?.at]);

  // Leaving the app (not just switching tabs) puts the next event back on top.
  useEffect(() => {
    let wasAway = false;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') wasAway = true;
      if (state === 'active' && wasAway) {
        wasAway = false;
        setOpenId(null);
        setNow(new Date());
      }
    });
    return () => sub.remove();
  }, []);

  const coming = useMemo(() => upcoming(events, now), [events, now]);
  const activeId = coming.some((e) => e.id === openId) ? openId : coming[0]?.id;

  function openEventCard(id) {
    if (id === activeId) return;
    LayoutAnimation.configureNext(SWAP);
    setOpenId(id);
  }

  async function toggleNotify(kind, on) {
    setNotifyNote(null);
    const r = await setNotify(kind, on, { events: coming, podcast });
    if (r === 'denied') setNotifyNote('denied');
  }

  return (
    <Screen scrollRef={scrollRef}>
      <Header title="Eventbrite" subtitle="Pen Parentis events · free to join" />
      <View style={s.pad}>
        {/* ---------- Coming up ---------- */}
        <View style={s.titleRow} onLayout={(e) => { listY.current = e.nativeEvent.layout.y; }}>
          <Text style={s.h}>Coming up</Text>
          <Pressable
            onPress={() => refreshEvents(true)}
            disabled={loadingEvents}
            style={[s.refresh, loadingEvents && { opacity: 0.45 }]}
            accessibilityRole="button"
            accessibilityLabel="Refresh events from Eventbrite"
          >
            <Ionicons name="refresh" size={15} color={colors.royal} />
            <Text style={s.refreshText}>{loadingEvents ? 'Refreshing' : 'Refresh'}</Text>
          </Pressable>
        </View>

        {loadingEvents && (
          <View style={[s.card, s.loadingCard]}>
            <ActivityIndicator size="small" color={colors.royal} />
            <Text style={s.body}>Getting the latest events from Eventbrite…</Text>
          </View>
        )}

        <Animated.View style={{ opacity: listFade, gap: space.md }}>
          {!loadingEvents && coming.length === 0 && (
            <View style={[s.card, lift]}>
              <Text style={s.body}>No events listed right now. New salons are posted on Eventbrite.</Text>
            </View>
          )}

          {coming.map((e, i) => (
            <TourTarget key={e.id} id={i === 0 ? 'ev.next' : null}>
            <EventCard
              event={e}
              now={now}
              open={e.id === activeId}
              isNext={i === 0}
              onOpen={() => openEventCard(e.id)}
              onAddToCalendar={() => onAddToCalendar(e)}
              onShare={() => shareEvent(e)}
              note={calNote?.id === e.id ? calNote : null}
              onNoteDone={clearNote}
            />
            </TourTarget>
          ))}

          {!loadingEvents && (
            <Text style={s.note}>
              {refreshFailed
                ? "Couldn't reach Eventbrite, so these are the last saved events."
                : eventsSource === 'built-in'
                  ? 'Showing saved salon dates. Live Eventbrite updates turn on once the events server is set up.'
                  : `Live from Eventbrite${updatedAt ? ` · updated ${new Date(updatedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : ''}`}
            </Text>
          )}
        </Animated.View>

        <Pressable onPress={() => openLink(LINKS.eventbrite)} style={s.allLink}>
          <Text style={s.link}>See all events on Eventbrite  ›</Text>
        </Pressable>

        {/* ---------- Notifications ---------- */}
        <TourTarget id="ev.remind" style={{ gap: 8, marginTop: 6 }}>
          <ToggleCard
            title="Tell me when a salon goes live"
            sub={`One notification, ${LEAD_MINUTES === 30 ? 'half an hour' : `${LEAD_MINUTES} minutes`} before. Nothing else.`}
            value={!!notify.live}
            onChange={(v) => toggleNotify('live', v)}
          />
          {notifyNote === 'denied' && <DeniedNote />}
        </TourTarget>
      </View>
    </Screen>
  );
}

function YouTubeButton({ event, now, isNext }) {
  const yt = youtubeFor(event, now, { isNext });
  if (!yt) return null; // later events get theirs once they're next
  if (yt.phase === 'live') {
    return (
      <BrandButton
        live
        icon={<View style={s.liveDot} />}
        label={yt.label}
        onPress={() => openLink(yt.url)}
      />
    );
  }
  return (
    <BrandButton
      brand="youtube"
      icon={<Ionicons name="logo-youtube" size={22} color={YT_RED} />}
      label={yt.label}
      sub={yt.sub}
      onPress={() => openLink(yt.url)}
    />
  );
}

function EventCard({ event: e, now, open, isNext, onOpen, onAddToCalendar, onShare, note, onNoteDone }) {
  const where = e.online ? 'Online' : e.venue;
  if (!open) {
    return (
      <Pressable onPress={onOpen} style={[s.row, lift]} accessibilityRole="button" accessibilityHint="Shows details, Register and YouTube">
        <DateBadge iso={e.start} />
        <View style={{ flex: 1 }}>
          <Text style={s.rowName} numberOfLines={2}>{e.name}</Text>
          <Text style={s.when}>{eventWhen(e)}{where ? ` · ${where}` : ''}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
    );
  }
  return (
    <View style={[s.next, lift]}>
      <View style={s.nextHead}>
        <Ionicons name="star" size={15} color={STAR} />
        <Text style={s.kicker}>{isNext ? 'NEXT EVENT' : 'COMING UP'}</Text>
      </View>
      <View style={s.eventRow}>
        <DateBadge iso={e.start} big />
        <View style={{ flex: 1 }}>
          <Text style={s.nextName}>{e.name}</Text>
          <Text style={s.when}>{eventWhen(e)}{where ? ` · ${where}` : ''}</Text>
        </View>
      </View>
      {e.summary ? <Text style={s.body}>{e.summary}</Text> : null}
      <Pressable onPress={() => openLink(e.url)} style={s.register} accessibilityRole="link">
        <Text style={s.registerText}>Register on Eventbrite</Text>
      </Pressable>
      <YouTubeButton event={e} now={now} isNext={isNext} />
      <View style={s.actions}>
        <Pressable onPress={onAddToCalendar} style={s.action} accessibilityRole="button" accessibilityLabel="Add to calendar">
          <Ionicons name="calendar-outline" size={16} color={colors.royal} />
          <Text style={s.actionText}>Add to calendar</Text>
        </Pressable>
        <Pressable onPress={onShare} style={s.action} accessibilityRole="button" accessibilityLabel="Share this event">
          <Ionicons name="share-outline" size={16} color={colors.royal} />
          <Text style={s.actionText}>Share</Text>
        </Pressable>
      </View>
      {note ? <CalNote key={note.key} note={note} onDone={onNoteDone} /> : null}
    </View>
  );
}

function CalNote({ note, onDone }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const bar = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const run = Animated.sequence([
      Animated.timing(bar, { toValue: 0, duration: note.ms, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: false }),
    ]);
    run.start(({ finished }) => finished && onDone());
    return () => run.stop();
  }, []);
  const tint = note.ok ? '#1E7B3A' : '#B3261E';
  return (
    <Animated.View style={{ opacity }}>
      <View style={[s.calNote, note.ok && s.calNoteOk]}>
        <Text style={[s.calNoteText, note.ok && { color: '#1E5E33' }]}>{note.text}</Text>
        {note.settings ? (
          <Pressable onPress={openPhoneSettings} hitSlop={6}>
            <Text style={s.calNoteLink}>Open Settings</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={s.noteTrack}>
        <Animated.View
          style={[s.noteBar, { backgroundColor: tint, width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
        />
      </View>
    </Animated.View>
  );
}

export function DateBadge({ iso, big }) {
  const d = new Date(iso);
  return (
    <View style={[s.badge, big && s.badgeBig]}>
      <Text style={s.badgeMonth}>{d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</Text>
      <Text style={[s.badgeDay, big && { fontSize: 24 }]}>{d.getDate()}</Text>
    </View>
  );
}

const s = themed(() => ({
  pad: { padding: space.lg, gap: space.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h: { fontSize: 16, fontWeight: '700', color: colors.ink },
  body: { fontSize: 13, color: colors.body, lineHeight: 18 },
  note: { fontSize: 11.5, color: colors.muted, textAlign: 'center' },
  refresh: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5, borderColor: colors.royal, backgroundColor: '#FFFFFF' },
  refreshText: { fontSize: 12.5, fontWeight: '700', color: colors.royal },
  loadingCard: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64 },
  card: { backgroundColor: '#FFFFFF', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 14 },

  next: { backgroundColor: '#FFFFFF', borderRadius: radius.lg, borderWidth: 2, borderColor: colors.karmaLight, padding: 14, gap: 12 },
  nextHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: '#8A5E12' },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextName: { fontSize: 16, fontWeight: '700', color: colors.ink },
  when: { fontSize: 12.5, color: colors.body, marginTop: 2 },
  register: { backgroundColor: colors.royal, borderRadius: radius.md, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  registerText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D32F2F' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 12, minHeight: 64 },
  rowName: { fontSize: 14.5, fontWeight: '700', color: colors.ink },

  badge: { width: 46, paddingVertical: 5, borderRadius: 10, backgroundColor: colors.cream, alignItems: 'center' },
  badgeBig: { width: 56, paddingVertical: 7 },
  badgeMonth: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: '#8A5E12' },
  badgeDay: { fontSize: 19, fontWeight: '800', color: colors.ink },

  allLink: { alignItems: 'center', minHeight: 40, justifyContent: 'center' },
  link: { color: colors.royal, fontSize: 13, fontWeight: '700' },


  actions: { flexDirection: 'row', gap: 8 },
  action: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.royal, backgroundColor: '#FFFFFF',
  },
  actionText: { fontSize: 13, fontWeight: '700', color: colors.royal },
  calNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: '#FDECEA', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  calNoteOk: { backgroundColor: '#EEF8F1' },
  noteTrack: { height: 3, borderRadius: 2, backgroundColor: 'rgba(10,22,51,0.08)', marginTop: 5, overflow: 'hidden' },
  noteBar: { height: '100%', borderRadius: 2 },
  going: { fontSize: 10.5, fontWeight: '800', color: '#1E7B3A', backgroundColor: '#EEF8F1', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 4, overflow: 'hidden' },
  attend: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  attendOn: { borderColor: 'rgba(30,123,58,0.35)', backgroundColor: '#EEF8F1' },
  attendTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  attendSub: { fontSize: 11.5, color: colors.muted, marginTop: 1 },
  calNoteText: { flex: 1, fontSize: 12.5, color: '#8C1D18' },
  calNoteLink: { fontSize: 12.5, fontWeight: '700', color: colors.royal },
}));
