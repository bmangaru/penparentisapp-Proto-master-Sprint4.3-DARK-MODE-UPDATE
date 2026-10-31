// screens/CalendarScreen.js — your writing calendar.
//   • top card: the selected day (its three rings, and any Pen Parentis event
//     that day; "Open ›" shows it on the Eventbrite tab), taking turns with the
//     countdown to the next event every 6 s (swipe, or tap the dots)
//   • a scrollable rolling calendar that opens on this week, can show earlier
//     weeks, and runs across months. Each day shows its rings (minutes, words,
//     sessions); a big gold star marks event days.
// Tapping a past day you wrote on opens what you wrote that day.
//   • Previous salons: past salons on YouTube, the podcast on Spotify, and the
//     "New episode in the feed" switch right under the Spotify button.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Screen, Header, openLink } from '../components/ui';
import { BrandButton, DeniedNote, ToggleCard, SPOTIFY_GREEN, YT_RED } from '../components/LinkButtons';
import { LINKS } from '../links';
import { setNotify, useNotifySettings } from '../notify';
import Rings, { RING_COLORS } from '../components/Rings';
import RingStats from '../components/RingStats';
import { LinearGradient } from 'expo-linear-gradient';
import Cycler from '../components/Cycler';
import ShareCalendarSheet from '../components/ShareCalendarSheet';
import EventCountdown, { nextUpcoming } from '../components/EventCountdown';
import { colors, gradients, lift, radius, space, themed } from '../theme';
import { eventWhen, eventsByDay, loadEvents } from '../eventsService';
import {
  DEFAULT_GOALS, calendarDay, calendarWeeks, describeDailyGoal, parseDayKey,
} from '../writingLogic';
import { loadAll, useDataChange, useToday } from '../writingStore';

const ROW_H = 64;
const VISIBLE_WEEKS = 4;
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sunday first, like a regular calendar
const STAR = '#E0AE45';

export default function CalendarScreen({ navigation, route }) {
  const today = useToday();
  const [data, setData] = useState({ goals: DEFAULT_GOALS, dailyGoals: {}, sessions: [] });
  const [events, setEvents] = useState([]); // the gold ★ on event days, and the countdown card
  const [podcast, setPodcast] = useState(null); // newest episode, for the new-episode switch
  const notify = useNotifySettings();
  const [notifyNote, setNotifyNote] = useState(null); // 'denied' | null
  async function toggleEpisodes(on) {
    setNotifyNote(null);
    const r = await setNotify('episodes', on, { podcast });
    if (r === 'denied') setNotifyNote('denied');
  }
  const [selected, setSelected] = useState(today);
  const [shareOpen, setShareOpen] = useState(false); // ⇪ Share your rings
  // From the app tour's "Try it": open Share your rings.
  useEffect(() => {
    if (route?.params?.tour !== 'share') return;
    const id = setTimeout(() => setShareOpen(true), 400);
    return () => clearTimeout(id);
  }, [route?.params?.at]);
  const scrollRef = useRef(null);
  const [earlier, setEarlier] = useState(0);

  const calRef = useRef(null);
  const calHeight = useRef(0);
  const calY = useRef(0);
  const earlierH = useRef(40);      // height of the "↑ Earlier weeks" row
  const pendingShift = useRef(0);   // + px to keep in place after adding weeks, − after removing
  const scrolledUp = useRef(false); // has the user scrolled up into the earlier weeks yet?

  const reloadData = useCallback(() => { loadAll().then(setData); }, []);
  // Reload on focus, and whenever goals / plans / sessions are saved anywhere,
  // so the calendar never draws with old goal settings.
  useFocusEffect(useCallback(() => {
    reloadData();
    // Leaving the tab folds earlier weeks away again.
    return () => { setEarlier(0); scrolledUp.current = false; };
  }, [today]));
  useDataChange(reloadData);
  useEffect(() => { setSelected(today); }, [today]);

  // Event days for the stars (the saved list; the Eventbrite tab refreshes it).
  useFocusEffect(useCallback(() => { loadEvents().then((r) => { setEvents(r.events); setPodcast(r.podcast); }); }, []));

  const byDay = useMemo(() => eventsByDay(events), [events]);
  const weeks = useMemo(() => calendarWeeks(parseDayKey(today), earlier, 11), [today, earlier]);
  const days = useMemo(() => {
    const map = {};
    for (const w of weeks) for (const k of w) map[k] = calendarDay(data.sessions, data.dailyGoals, data.goals, k, today);
    return map;
  }, [weeks, data, today]);

  const sel = days[selected] || calendarDay(data.sessions, data.dailyGoals, data.goals, selected, today);
  const selEvents = byDay[selected] || [];

  function openDay(key) {
    navigation.navigate('Brainstorm', { screen: 'BrainstormDay', params: { day: key }, initial: false });
  }

  function onPressDay(d) {
    setSelected(d.key);
    if (!d.future && !d.isToday && d.count > 0) openDay(d.key);
  }

  // Where this week's row starts inside the calendar scroll.
  const thisWeekY = () => earlierH.current + earlier * ROW_H;

  function showEarlier() {
    scrolledUp.current = false;
    pendingShift.current = 4 * ROW_H;
    setEarlier((n) => n + 4);
  }

  // Fold the earlier weeks away, keeping what's on screen in place.
  function foldEarlier() {
    if (!earlier) return;
    pendingShift.current = -earlier * ROW_H;
    scrolledUp.current = false;
    setEarlier(0);
  }

  function backToThisWeek() {
    calRef.current?.scrollTo({ y: thisWeekY(), animated: true });
    setTimeout(foldEarlier, 350);
  }

  function onCalSize(_, h) {
    const shift = pendingShift.current;
    if (shift && calHeight.current) {
      pendingShift.current = 0;
      const y = Math.max(0, calY.current + shift);
      calRef.current?.scrollTo({ y, animated: false });
      calY.current = y;
      // Just added weeks: glide up so they come into view.
      if (shift > 0) setTimeout(() => calRef.current?.scrollTo({ y: 0, animated: true }), 30);
    }
    calHeight.current = h;
  }

  // Scrolling back down to this week folds the earlier weeks away.
  function onCalScroll(e) {
    const y = e.nativeEvent.contentOffset.y;
    calY.current = y;
    if (!earlier) return;
    if (y < thisWeekY() - ROW_H) scrolledUp.current = true;
    else if (scrolledUp.current && y >= thisWeekY() - 4) foldEarlier();
  }

  // A starred day's event: open it on the Eventbrite tab.
  function showEvent(id) {
    navigation.navigate('Eventbrite', { openEventId: id, at: Date.now() });
  }

  return (
    <Screen scrollRef={scrollRef}>
      <Header title="Calendar" subtitle="Every day you showed up to write" />
      <View style={s.pad}>
        {/* ---------- Top card: the selected day ↔ the next event's countdown ----------
            Switches every 6 s while today is selected; tapping another day
            shows that day and holds still. */}
        <Cycler paused={selected !== today} resetKey={selected} arrows>
        <LinearGradient colors={gradients.header} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={s.dayCard}>
          <View style={s.dayHead}>
            <Text style={s.dayTitle} numberOfLines={1}>
              {sel.isToday ? 'Today · ' : ''}
              {parseDayKey(selected).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
            {sel.rings.closed ? <Text style={s.closedChip}>All rings closed ✓</Text> : null}
          </View>
          {/* The same rings + bars as Brainstorm's Today card. */}
          <RingStats summary={sel} rings={sel.rings} off={sel.off} size={92} noGoal={sel.off ? 'day off' : ''} />
          {selEvents.map((e) => (
            <Pressable key={e.id} onPress={() => showEvent(e.id)} style={s.dayEvent} accessibilityRole="button" accessibilityHint="Opens it on the Eventbrite tab">
              <Ionicons name="star" size={14} color={STAR} />
              <View style={{ flex: 1 }}>
                <Text style={s.dayEventText} numberOfLines={1}>{e.name}</Text>
                <Text style={s.dayEventWhen}>{eventWhen(e)}</Text>
              </View>
              <Text style={s.dayLink}>Open ›</Text>
            </Pressable>
          ))}
          {!sel.future && sel.count > 0 ? (
            <Pressable onPress={() => openDay(selected)} hitSlop={6}>
              <Text style={s.dayLink}>Read what you wrote  ›</Text>
            </Pressable>
          ) : (
            <Text style={s.dayNote}>
              {sel.future ? (sel.off ? 'Day off' : `Plan: ${describeDailyGoal(sel.goal)}`) : sel.off ? 'Day off' : 'No writing this day'}
            </Text>
          )}
        </LinearGradient>
        {nextUpcoming(events) ? <EventCountdown events={events} onDetails={(e) => showEvent(e.id)} style={{ flex: 1 }} /> : null}
        </Cycler>

        {/* ---------- Rolling calendar ---------- */}
        <View style={[s.card, lift, { paddingHorizontal: 10 }]}>
          <View style={s.titleRow}>
            <Text style={s.h}>Your writing calendar</Text>
            <Pressable onPress={() => setShareOpen(true)} style={s.shareBtn} hitSlop={6} accessibilityRole="button" accessibilityLabel="Share your rings">
              <Ionicons name="share-outline" size={14} color="#FFFFFF" />
              <Text style={s.shareText}>Share</Text>
            </Pressable>
          </View>
          <View style={s.legend}>
            <Legend color={RING_COLORS.light.minutes} label="Minutes" />
            <Legend color={RING_COLORS.light.words} label="Words" />
            <Legend color={RING_COLORS.light.sessions} label="Sessions" />
            <View style={s.legendItem}>
              <Ionicons name="star" size={12} color={STAR} />
              <Text style={s.legendText}>Event</Text>
            </View>
          </View>
          <View style={s.weekHead}>
            {WEEKDAYS.map((d, i) => <Text key={i} style={s.weekHeadText}>{d}</Text>)}
          </View>
          <View>
          <ScrollView
            ref={calRef}
            style={{ height: ROW_H * VISIBLE_WEEKS + 6 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            onContentSizeChange={onCalSize}
            onScroll={onCalScroll}
            scrollEventThrottle={32}
          >
            <Pressable
              onPress={showEarlier}
              onLayout={(e) => { earlierH.current = e.nativeEvent.layout.height; }}
              style={s.earlier}
              accessibilityRole="button"
            >
              <Text style={s.earlierText}>↑  Earlier weeks</Text>
            </Pressable>
            {weeks.map((w) => (
              <View key={w[0]} style={s.week}>
                {w.map((k) => (
                  <DayCell
                    key={k}
                    day={days[k]}
                    selected={k === selected}
                    hasEvent={!!byDay[k]}
                    onPress={() => onPressDay(days[k])}
                  />
                ))}
              </View>
            ))}
          </ScrollView>
          {earlier > 0 && (
            <Pressable onPress={backToThisWeek} style={s.backPill} accessibilityRole="button">
              <Text style={s.backPillText}>↓  Back to this week</Text>
            </Pressable>
          )}
          </View>
          <Text style={s.hint}>Tap a past day to read what you wrote.</Text>
        </View>

        {/* ---------- Previous salons ---------- */}
        <View style={{ gap: 8 }}>
          <Text style={[s.h, { marginTop: 4 }]}>Previous salons</Text>
          <Text style={s.body}>
            Missed one, or want to hear it again? Recordings of past salons are on YouTube,
            and the salon podcast is on Spotify.
          </Text>
          <BrandButton
            icon={<Ionicons name="logo-youtube" size={22} color={YT_RED} />}
            brand="youtube"
            label="Watch past salons on YouTube"
            onPress={() => openLink(LINKS.youtube)}
          />
          <BrandButton
            icon={<FontAwesome name="spotify" size={21} color={SPOTIFY_GREEN} />}
            brand="spotify"
            label="Listen on Spotify"
            onPress={() => openLink(LINKS.spotify)}
          />
          <ToggleCard
            title="New episode in the feed"
            sub="When the salon lands on Spotify."
            value={!!notify.episodes}
            onChange={toggleEpisodes}
          />
          {notifyNote === 'denied' && <DeniedNote />}
        </View>
      </View>

      <ShareCalendarSheet visible={shareOpen} onClose={() => setShareOpen(false)} sessions={data.sessions} dailyGoals={data.dailyGoals} goals={data.goals} />
    </Screen>
  );
}

function DayCell({ day, selected, hasEvent, onPress }) {
  const date = parseDayKey(day.key);
  const n = date.getDate();
  const monthTag = n === 1 ? date.toLocaleDateString(undefined, { month: 'short' }) : null;
  return (
    <Pressable
      onPress={onPress}
      style={[s.cell, selected && s.cellSelected, day.isToday && s.cellToday]}
      accessibilityRole="button"
      accessibilityLabel={`${date.toDateString()}${hasEvent ? ', event' : ''}${day.count ? `, ${day.words} words` : ''}`}
    >
      <Text style={[s.cellNum, day.isToday && s.cellNumToday, day.future && { color: colors.muted }]}>
        {monthTag ? <Text style={s.monthTag}>{monthTag} </Text> : null}{n}
      </Text>
      <View>
        <Rings
          minutes={day.rings.minutes} words={day.rings.words} sessions={day.rings.sessions}
          faded={day.future} size={34}
        />
        {hasEvent && (
          <View style={s.star} pointerEvents="none">
            <Ionicons name="star" size={22} color={STAR} style={s.starIcon} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

function Legend({ color, label }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.legendDot, { backgroundColor: color }]} />
      <Text style={s.legendText}>{label}</Text>
    </View>
  );
}

const s = themed(() => ({
  pad: { padding: space.lg, gap: space.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.royal, borderRadius: 999, paddingHorizontal: 12, minHeight: 30 },
  shareText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },
  h: { fontSize: 16, fontWeight: '700', color: colors.ink },
  body: { fontSize: 13, color: colors.body, lineHeight: 18 },
  card: { backgroundColor: '#FFFFFF', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 14 },




  link: { color: colors.royal, fontSize: 13, fontWeight: '700' },

  // flex: 1 so it's as tall as the countdown card it takes turns with; the
  // same blue as that card and Brainstorm's Today card.
  dayCard: { flex: 1, borderRadius: radius.lg, padding: 16, gap: 12, justifyContent: 'space-between', overflow: 'hidden' },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dayLink: { color: '#F2C14E', fontSize: 13, fontWeight: '800' },
  dayNote: { color: 'rgba(255,255,255,0.75)', fontSize: 12.5 },
  closedChip: { fontSize: 11, fontWeight: '800', color: '#2A1A00', backgroundColor: '#F2C14E', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  dayTitle: { flexShrink: 1, fontSize: 14.5, fontWeight: '700', color: '#FFFFFF' },
  dayEvent: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  dayEventText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  dayEventWhen: { fontSize: 11.5, color: 'rgba(255,255,255,0.75)' },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 11.5, color: colors.muted },
  weekHead: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 6 },
  weekHeadText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.muted },
  earlier: { alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  earlierText: { fontSize: 12.5, fontWeight: '700', color: colors.royal },
  week: { flexDirection: 'row', height: ROW_H },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent' },
  cellSelected: { backgroundColor: '#EEF2FB' },
  cellToday: { borderColor: colors.royal },
  cellNum: { fontSize: 11, fontWeight: '600', color: colors.ink },
  cellNumToday: { color: colors.royal, fontWeight: '800' },
  monthTag: { fontSize: 10, fontWeight: '800', color: '#8A5E12' },
  star: { position: 'absolute', top: -9, right: -11 },
  starIcon: { textShadowColor: 'rgba(138,94,18,0.45)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
  backPill: {
    position: 'absolute', alignSelf: 'center', bottom: 10, backgroundColor: colors.royal, borderRadius: 999,
    paddingHorizontal: 14, minHeight: 34, justifyContent: 'center',
    shadowColor: colors.royalDeep, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  backPillText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' },
  hint: { fontSize: 11.5, color: colors.muted, textAlign: 'center', marginTop: 8 },
}));
