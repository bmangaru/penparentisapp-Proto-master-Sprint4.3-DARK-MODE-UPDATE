// screens/CalendarScreen.js — your writing calendar.
//   • top card: the selected day (its three rings, and any Pen Parentis event
//     that day; "Open ›" shows it on the Eventbrite tab), taking turns with the
//     countdown to the next event every 6 s (swipe, or tap the dots)
//   • a calendar of four weeks at a time (no scrolling): two weeks back, the
//     current week (third row) and next week. ‹ Earlier / Later › page
//     through it, and "Current week" comes back. Earlier goes back to the
//     week you first wrote; Later goes as far as the last upcoming event, and
//     a "★ Next event in N days" note shows when it's out of view. Each day shows its rings (minutes, words,
//     sessions); an event day's date is gold with a ★ (on every calendar).
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
import TourTarget from '../components/TourTarget';
import { isTourTarget, stepOf, tourEvent, tourRunning, useRun } from '../tourRun';
import ShareCalendarSheet from '../components/ShareCalendarSheet';
import EventCountdown, { nextUpcoming } from '../components/EventCountdown';
import { colors, gradients, lift, radius, space, themed } from '../theme';
import { eventWhen, eventsByDay, loadEvents } from '../eventsService';
import {
  DEFAULT_GOALS, calendarDay, calendarWeeks, dayFeelings, describeDailyGoal, monthFeelings, parseDayKey, startOfWeek,
} from '../writingLogic';
import Face from '../components/Face';
import { FeelingsCard, MonthMedalCardTop } from '../components/TopCards';

// The top cards, in order, and the calendar view each one goes with.
const PAGE = { rings: 0, feelings: 1, medals: 2 };
const VIEW_OF = ['rings', 'feelings', 'medals'];
import { TIER_LABEL } from '../medals';
import { InkDrop, WordBadge, MedalPin } from '../components/InkDrop';
import { monthDays, monthKey, monthKeyOf, monthProgress, splitMonth, typicalDay } from '../monthMedals';
import { FEELINGS, feelingById, feelingLabel } from '../feelings';
import { loadAll, useDataChange, useToday } from '../writingStore';

const ROW_H = 64;
const PAGE_WEEKS = 4; // weeks on screen at once
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sunday first, like a regular calendar
const STAR = '#E0AE45';

export default function CalendarScreen({ navigation, route }) {
  // The app tour: the top card holds still while it's running.
  const tourRun = useRun();
  const today = useToday();
  const [data, setData] = useState({ goals: DEFAULT_GOALS, dailyGoals: {}, sessions: [] });
  const [events, setEvents] = useState([]); // the gold ★ on event days, and the countdown card
  // One switch for the whole tab: the calendar shows 'rings', 'feelings' or
  // 'medals', the top card follows it, and Share shares that view.
  const [view, setViewState] = useState('rings');
  const setView = (v) => { setViewState(v); tourEvent('cal-view', v); };
  // The app tour can put the calendar on the view a step talks about.
  // (Set again at every step, in case you swiped the cards to another view.)
  const tourStepNow = tourRun && !tourRun.min ? stepOf(tourRun) : null;
  const tourCalView = tourStepNow?.calView || null;
  const tourStepKey = tourRun ? `${tourRun.ch}.${tourRun.step}` : '';
  useEffect(() => { if (tourCalView) setViewState(tourCalView); }, [tourCalView, tourStepKey]);
  const [podcast, setPodcast] = useState(null); // newest episode, for the new-episode switch
  const notify = useNotifySettings();
  const [notifyNote, setNotifyNote] = useState(null); // 'denied' | null
  async function toggleEpisodes(on) {
    setNotifyNote(null);
    const r = await setNotify('episodes', on, { podcast });
    if (r === 'denied') setNotifyNote('denied');
  }
  const [selected, setSelected] = useState(today);
  // Using the calendar (a touch anywhere on it) pauses the top cards for a
  // while, so they never change under you while you read the days.
  const [calBusy, setCalBusy] = useState(false);
  const busyTimer = useRef(null);
  const touchCalendar = () => {
    setCalBusy(true);
    clearTimeout(busyTimer.current);
    busyTimer.current = setTimeout(() => setCalBusy(false), 30000);
  };
  useEffect(() => () => clearTimeout(busyTimer.current), []);
  const [shareOpen, setShareOpen] = useState(false); // ⇪ Share your rings
  // From the app tour's "Try it": open Share your rings.
  useEffect(() => {
    if (route?.params?.tour !== 'share') return;
    const id = setTimeout(() => setShareOpen(true), 400);
    return () => clearTimeout(id);
  }, [route?.params?.at]);
  const scrollRef = useRef(null);
  // Which four weeks show: 0 = two weeks back, the current week and next
  // week; -1 = the four weeks before that; +1 = the four after, and so on.
  const [page, setPage] = useState(0);

  const reloadData = useCallback(() => { loadAll().then(setData); }, []);
  // Reload on focus, and whenever goals / plans / sessions are saved anywhere,
  // so the calendar never draws with old goal settings.
  useFocusEffect(useCallback(() => {
    reloadData();
    // Leaving the tab comes back to this week.
    return () => setPage(0);
  }, [today]));
  useDataChange(reloadData);
  useEffect(() => { setSelected(today); }, [today]);

  // Event days for the stars (the saved list; the Eventbrite tab refreshes it).
  useFocusEffect(useCallback(() => { loadEvents().then((r) => { setEvents(r.events); setPodcast(r.podcast); }); }, []));

  const byDay = useMemo(() => eventsByDay(events), [events]);
  const weeks = useMemo(() => {
    const d = parseDayKey(today);
    d.setDate(d.getDate() + (page * PAGE_WEEKS - 2) * 7);
    return calendarWeeks(d, 0, PAGE_WEEKS - 1);
  }, [today, page]);
  // The page a day falls on.
  const pageOf = (k) => {
    const wk = Math.round((startOfWeek(parseDayKey(k)) - startOfWeek(parseDayKey(today))) / (7 * 864e5));
    return Math.floor((wk + 2) / PAGE_WEEKS);
  };
  // How far back you can go: to the week you first wrote (never past today).
  const firstDay = useMemo(() => data.sessions.reduce((a, x) => (x.day && x.day < a ? x.day : a), today), [data, today]);
  const canEarlier = weeks[0][0] > firstDay;
  // Upcoming events: Later goes as far as the last one, and when the next
  // one isn't on screen a note says how far away it is.
  const upcoming = useMemo(() => Object.keys(byDay).filter((k) => k > today).sort(), [byDay, today]);
  const maxPage = upcoming.length ? Math.max(0, pageOf(upcoming[upcoming.length - 1])) : 0;
  const canLater = page < maxPage;
  const nextEvent = upcoming[0] || null;
  const nextOnScreen = !!nextEvent && nextEvent >= weeks[0][0] && nextEvent <= weeks[weeks.length - 1][6];
  const nextIn = nextEvent ? Math.round((parseDayKey(nextEvent) - parseDayKey(today)) / 864e5) : 0;
  function showNextEvent() {
    if (!nextEvent) return;
    setPage(pageOf(nextEvent));
  }
  const rangeLabel = useMemo(() => {
    const f = (k) => parseDayKey(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${f(weeks[0][0])} – ${f(weeks[weeks.length - 1][6])}`;
  }, [weeks]);
  const days = useMemo(() => {
    const map = {};
    for (const w of weeks) for (const k of w) map[k] = calendarDay(data.sessions, data.dailyGoals, data.goals, k, today);
    return map;
  }, [weeks, data, today]);

  // Feelings view: every feeling picked on each day shown (oldest first), and
  // this month's mix for the summary under the calendar.
  const feelingsByDay = useMemo(() => {
    const map = {};
    if (view === 'feelings') for (const w of weeks) for (const k of w) map[k] = dayFeelings(data.sessions, k);
    return map;
  }, [view, weeks, data]);
  const month = today.slice(0, 7);
  const mix = useMemo(() => monthFeelings(data.sessions, month), [data, month]);
  // Medals view: words each day, and the day each of a month's tiers was reached.
  const medalDays = useMemo(() => {
    const map = {};
    if (view !== 'medals') return map;
    const months = new Set();
    for (const w of weeks) for (const k of w) months.add(monthKeyOf(k));
    for (const mk of months) {
      const { days: words, reached } = monthDays(data.sessions, mk);
      // Drops and greens are sized against your typical day that month.
      const { year, m } = splitMonth(mk);
      const prev = monthKey(m === 0 ? year - 1 : year, (m + 11) % 12);
      const typ = typicalDay(words, monthDays(data.sessions, prev).days);
      for (const [k, n] of Object.entries(words)) map[k] = { words: n, tier: null, typ };
      for (const [tier, k] of Object.entries(reached)) map[k] = { ...(map[k] || { words: 0, typ }), tier };
    }
    return map;
  }, [view, weeks, data]);
  const monthMedalNow = useMemo(() => monthProgress(data.sessions, month), [data, month]);
  const hasCountdown = !!nextUpcoming(events);

  const sel = days[selected] || calendarDay(data.sessions, data.dailyGoals, data.goals, selected, today);
  const selEvents = byDay[selected] || [];

  function openDay(key) {
    navigation.navigate('Brainstorm', { screen: 'BrainstormDay', params: { day: key }, initial: false });
  }

  function onPressDay(d) {
    setSelected(d.key);
    if (!d.future && d.count > 0) openDay(d.key);
  }

  // A starred day's event: open it on the Eventbrite tab.
  function showEvent(id) {
    navigation.navigate('Eventbrite', { openEventId: id, at: Date.now() });
  }

  return (
    <Screen scrollRef={scrollRef}>
      <Header title="Calendar" subtitle="Every day you showed up to write" />
      <View style={s.pad}>
        {/* ---------- Top cards: Today's rings · Feelings · Medals · Countdown ----------
            Each has its own page. The calendar switch below jumps to its
            card, and swiping (or the arrows / dots) to Rings, Feelings or
            Medals switches the calendar too. The timer goes round all four
            every 15 s but never changes the calendar, and it stops while
            you're using the calendar or looking at another day. */}
        <TourTarget id="cal.top">
        <Cycler
          paused={selected !== today || !!tourRun || calBusy}
          goTo={{ index: PAGE[view], key: `${selected}-${view}-${isTourTarget('cal.top', tourRun) ? 'tour' : ''}` }}
          arrows
          tourId="cal"
          onIndex={(k, how) => {
            tourEvent('cal-index', { k, n: hasCountdown ? 4 : 3 });
            if (how === 'user' && VIEW_OF[k] && VIEW_OF[k] !== view) setView(VIEW_OF[k]);
          }}
        >
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
              <Text style={s.dayLink}>{sel.isToday ? 'Tap to see what you wrote today' : 'Tap to see what you wrote that day'}  ›</Text>
            </Pressable>
          ) : (
            <Text style={s.dayNote}>
              {sel.future ? (sel.off ? 'Day off' : `Plan: ${describeDailyGoal(sel.goal)}`) : sel.off ? 'Day off' : 'No writing this day'}
            </Text>
          )}
        </LinearGradient>
        <LinearGradient colors={gradients.header} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={s.dayCard}>
          <FeelingsCard mix={mix} monthName={parseDayKey(`${month}-01`).toLocaleDateString(undefined, { month: 'long' })} />
        </LinearGradient>
        <LinearGradient colors={gradients.header} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={s.dayCard}>
          <MonthMedalCardTop progress={monthMedalNow} onSeeAll={() => navigation.navigate('Brainstorm', { screen: 'Medals', initial: false })} />
        </LinearGradient>
        {hasCountdown ? <EventCountdown events={events} onDetails={(e) => showEvent(e.id)} style={{ flex: 1 }} /> : null}
        </Cycler>
        </TourTarget>

        {/* ---------- Rolling calendar ---------- */}
        <TourTarget id="cal.grid" style={[s.card, lift, { paddingHorizontal: 10 }]} onTouchStart={touchCalendar}>
          <View style={s.titleRow}>
            <Text style={s.h}>{view === 'feelings' ? 'Feelings calendar' : view === 'medals' ? 'Ink calendar' : 'Rings calendar'}</Text>
            <TourTarget id="cal.share">
              <Pressable onPress={() => setShareOpen(true)} style={s.shareBtn} hitSlop={6} accessibilityRole="button" accessibilityLabel={view === 'rings' ? 'Share your rings' : view === 'feelings' ? 'Share your feelings' : 'Share your medals'}>
                <Ionicons name="share-outline" size={14} color="#FFFFFF" />
                <Text style={s.shareText}>Share</Text>
              </Pressable>
            </TourTarget>
          </View>
          {/* Rings (progress) or Feelings (the faces you picked) */}
          <View style={s.seg} accessibilityRole="tablist">
            {[['rings', 'Rings'], ['feelings', 'Feelings'], ['medals', 'Medals']].map(([v, label]) => (
              <TourTarget key={v} id={`cal.view.${v}`}>
                <Pressable onPress={() => setView(v)} style={[s.segBtn, view === v && s.segOn]} accessibilityRole="tab" accessibilityState={{ selected: view === v }}>
                  <Text style={[s.segText, view === v && s.segTextOn]}>{label}</Text>
                </Pressable>
              </TourTarget>
            ))}
          </View>
          {view === 'rings' ? (
            // Key as a small table: each ring (drawn at its place, outer → inner) and the event star.
            <View style={s.medalLegend}>
              <View style={s.medalTable}>
                {[
                  ['minutes', 'Minutes', 'Outer ring · time writing', 18],
                  ['words', 'Words', 'Middle ring · words written', 13],
                  ['sessions', 'Sessions', 'Inner ring · times you wrote', 8],
                ].map(([k, name, what, d], i) => (
                  <View key={k} style={[s.medalRow, i > 0 && s.medalRowLine]}>
                    <View style={s.keyIcon}><View style={{ width: d, height: d, borderRadius: d / 2, borderWidth: 3, borderColor: RING_COLORS.light[k] }} /></View>
                    <Text style={s.medalRowName}>{name}</Text>
                    <Text style={s.medalRowWords}>{what}</Text>
                  </View>
                ))}
                <View style={[s.medalRow, s.medalRowLine]}>
                  <View style={[s.dateRow, s.dateEvent]}><Ionicons name="star" size={9} color="#2A1A00" /><Text style={[s.cellNum, s.cellNumEvent]}>8</Text></View>
                  <Text style={s.medalRowName}>Event</Text>
                  <Text style={s.medalRowWords}>A salon or event that day</Text>
                </View>
              </View>
              <Text style={s.legendText}>A ring closes when you reach that day’s goal. Close all three for a full day.</Text>
            </View>
          ) : view === 'feelings' ? (
            // Key: all twelve faces, six to a row, as in the feelings picker.
            <View style={s.medalLegend}>
              <View style={[s.medalTable, s.faceKey]}>
                {FEELINGS.map((f) => (
                  <View key={f.id} style={s.faceKeyItem}>
                    <Face id={f.id} size={26} />
                    <Text style={s.faceKeyLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{f.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.legendText}>Your latest feeling is in front. Tap a day to see them all. A gold date with a ★ is an event.</Text>
            </View>
          ) : (
            // Key: the ink drops, then the four medals with the words each needs.
            <View style={s.medalLegend}>
              <View style={s.legendItem}>
                <View style={s.dropsKey}><InkDrop words={5} min={5} max={14} /><InkDrop words={150} min={5} max={14} /><InkDrop words={1000} min={5} max={14} /></View>
                <Text style={s.legendText}>Bigger drop = more words that day</Text>
              </View>
              {/* A small table: each medal and the words it takes this month. */}
              <View style={s.medalTable}>
                {[['bronze', '500'], ['silver', '1,000'], ['gold', '5,000'], ['diamond', '10,000']].map(([t, n], i) => (
                  <View key={t} style={[s.medalRow, i > 0 && s.medalRowLine]}>
                    <MedalPin tier={t} height={17} />
                    <Text style={s.medalRowName}>{TIER_LABEL[t]}</Text>
                    <Text style={s.medalRowWords}>{n} words</Text>
                  </View>
                ))}
              </View>
              <Text style={s.legendText}>Drops and greens are compared with your typical day this month, so a big day for you stands out. Every word counts toward the month’s medal; a medal marks the day you reached it, and a gold date with a ★ is an event.</Text>
            </View>
          )}
          <View style={s.weekHead}>
            {WEEKDAYS.map((d, i) => <Text key={i} style={s.weekHeadText}>{d}</Text>)}
          </View>
          {/* Weeks, four at a time: no scrolling, the buttons page through them. */}
          <View>
            {weeks.map((w) => (
              <View key={w[0]} style={s.week}>
                {w.map((k) => (
                  <DayCell
                    key={k}
                    day={days[k]}
                    feelings={view === 'feelings' ? feelingsByDay[k] || [] : null}
                    medal={view === 'medals' ? medalDays[k] || { words: 0, tier: null } : null}
                    selected={k === selected}
                    hasEvent={!!byDay[k]}
                    onPress={() => onPressDay(days[k])}
                  />
                ))}
              </View>
            ))}
          </View>
          <View style={s.pager}>
            <Pressable onPress={() => setPage((p) => p - 1)} disabled={!canEarlier} hitSlop={6} style={({ pressed }) => [s.pageBtn, !canEarlier && s.pageOff, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel="Earlier weeks" accessibilityState={{ disabled: !canEarlier }}>
              <Ionicons name="chevron-back" size={15} color={colors.royal} />
              <Text style={s.pageText}>Earlier</Text>
            </Pressable>
            {page === 0 ? (
              <Text style={s.pageLabel} numberOfLines={1}>{rangeLabel}</Text>
            ) : (
              <Pressable onPress={() => setPage(0)} hitSlop={6} style={({ pressed }) => [s.thisWeek, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityHint={`Showing ${rangeLabel}`}>
                <Text style={s.thisWeekText}>Current week</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setPage((p) => p + 1)} disabled={!canLater} hitSlop={6} style={({ pressed }) => [s.pageBtn, !canLater && s.pageOff, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel="Later weeks" accessibilityState={{ disabled: !canLater }}>
              <Text style={s.pageText}>Later</Text>
              <Ionicons name="chevron-forward" size={15} color={colors.royal} />
            </Pressable>
          </View>
          {page !== 0 ? <Text style={[s.hint, { marginTop: 4 }]}>{rangeLabel}</Text> : null}
          {/* Heads-up when the next event is off screen (or on another calendar). */}
          {nextEvent && !nextOnScreen ? (
            <Pressable onPress={showNextEvent} hitSlop={4} style={({ pressed }) => [s.nextEvent, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityHint="Moves the calendar to that week">
              <Ionicons name="star" size={14} color={STAR} />
              <Text style={s.nextEventText}>
                Next event {nextIn === 1 ? 'tomorrow' : `in ${nextIn} days`} · {parseDayKey(nextEvent).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </Text>
              <Text style={s.nextEventLink}>Show ›</Text>
            </Pressable>
          ) : null}
          <Text style={s.hint}>Tap a past day to read what you wrote.</Text>
        </TourTarget>

        {/* ---------- Previous salons ---------- */}
        <TourTarget id="cal.past" style={{ gap: 8 }}>
          <Text style={[s.h, { marginTop: 4 }]}>Previous salons</Text>
          <Text style={s.body}>
            Missed one, or want to hear it again? Recordings of past salons are on YouTube,
            and the salon podcast is on Spotify.
          </Text>
          <BrandButton
            icon={<Ionicons name="logo-youtube" size={22} color={YT_RED} />}
            brand="youtube"
            label="Watch past salons on YouTube"
            onPress={() => { if (!tourRunning()) openLink(LINKS.youtube); }}
          />
          <BrandButton
            icon={<FontAwesome name="spotify" size={21} color={SPOTIFY_GREEN} />}
            brand="spotify"
            label="Listen on Spotify"
            onPress={() => { if (!tourRunning()) openLink(LINKS.spotify); }}
          />
          <ToggleCard
            title="New episode in the feed"
            sub="When the salon lands on Spotify."
            value={!!notify.episodes}
            onChange={toggleEpisodes}
          />
          {notifyNote === 'denied' && <DeniedNote />}
        </TourTarget>
      </View>

      <ShareCalendarSheet visible={shareOpen} mode={view} onClose={() => setShareOpen(false)} sessions={data.sessions} dailyGoals={data.dailyGoals} goals={data.goals} />
    </Screen>
  );
}

// The faces for one day: the latest in front, the one before peeking out
// behind it, and "+1"… for any more.
function DayFaces({ feelings, wrote, animate }) {
  if (!feelings.length) return wrote ? <View style={s.noFeel} /> : <View style={{ width: 30, height: 30 }} />;
  const last = feelings[feelings.length - 1].feeling;
  if (feelings.length === 1) return <View style={s.faceOne}><Face id={last} size={30} animate={animate} /></View>;
  const prev = feelings[feelings.length - 2].feeling;
  const more = feelings.length - 2;
  return (
    <View style={s.faceStack}>
      <View style={s.faceBack}><Face id={prev} size={22} /></View>
      <View style={s.faceFront}><Face id={last} size={28} animate={animate} /></View>
      {more > 0 ? <View style={s.moreBadge}><Text style={s.moreText}>+{more}</Text></View> : null}
    </View>
  );
}

function DayCell({ day, selected, hasEvent, onPress, feelings, medal }) {
  const date = parseDayKey(day.key);
  const n = date.getDate();
  const monthTag = n === 1 ? date.toLocaleDateString(undefined, { month: 'short' }) : null;
  return (
    <Pressable
      onPress={onPress}
      style={[s.cell, selected && s.cellSelected, day.isToday && s.cellToday]}
      accessibilityRole="button"
      accessibilityLabel={`${date.toDateString()}${hasEvent ? ', event' : ''}${day.count ? `, ${day.words} words` : ''}${medal?.tier ? `, reached ${TIER_LABEL[medal.tier]}` : ''}${feelings && feelings.length ? `, felt ${feelings.map((f) => feelingLabel(f.feeling)).join(' then ')}` : ''}`}
    >
      {/* An event day: the date turns gold with a star (on every calendar). */}
      <View style={[s.dateRow, hasEvent && s.dateEvent]}>
        {hasEvent ? <Ionicons name="star" size={9} color="#2A1A00" /> : null}
        <Text style={[s.cellNum, day.isToday && s.cellNumToday, day.future && { color: colors.muted }, hasEvent && s.cellNumEvent]}>
          {monthTag ? <Text style={[s.monthTag, hasEvent && s.cellNumEvent]}>{monthTag} </Text> : null}{n}
        </Text>
      </View>
      <View>
        {feelings ? (
          <DayFaces feelings={feelings} wrote={day.count > 0} animate={day.isToday} />
        ) : medal ? (
          // An ink drop (bigger for more words) with the green "+words" badge.
          <View style={s.medalCell}>
            <InkDrop words={medal.words} typical={medal.typ} />
            {medal.words > 0 ? <WordBadge words={medal.words} typical={medal.typ} at={s.wordBadge} /> : null}
          </View>
        ) : (
          <Rings
            minutes={day.rings.minutes} words={day.rings.words} sessions={day.rings.sessions}
            faded={day.future} size={34}
          />
        )}
        {medal?.tier ? <View style={s.pin} pointerEvents="none"><MedalPin tier={medal.tier} height={18} /></View> : null}
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
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 34, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#FFFFFF' },
  pageOff: { opacity: 0.35 },
  pageText: { fontSize: 12.5, fontWeight: '800', color: colors.royal },
  pageLabel: { flex: 1, textAlign: 'center', fontSize: 12.5, fontWeight: '700', color: colors.muted },
  nextEvent: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 12, minHeight: 36, borderRadius: 12, backgroundColor: '#FFF6DE', borderWidth: 1, borderColor: '#F1DFA6' },
  nextEventText: { flex: 1, fontSize: 12.5, fontWeight: '700', color: '#5A3E00' },
  nextEventLink: { fontSize: 12.5, fontWeight: '800', color: colors.royal },
  thisWeek: { backgroundColor: colors.royal, borderRadius: 999, paddingHorizontal: 14, minHeight: 34, justifyContent: 'center' },
  thisWeekText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },
  week: { flexDirection: 'row', height: ROW_H },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent' },
  cellSelected: { backgroundColor: '#EEF2FB' },
  cellToday: { borderColor: colors.royal },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, minHeight: 17, borderRadius: 999 },
  dateEvent: { backgroundColor: STAR },
  cellNumEvent: { color: '#2A1A00', fontWeight: '800' },
  cellNum: { fontSize: 11, fontWeight: '600', color: colors.ink },
  cellNumToday: { color: colors.royal, fontWeight: '800' },
  monthTag: { fontSize: 10, fontWeight: '800', color: '#8A5E12' },
  star: { position: 'absolute', top: -9, right: -11 },
  starIcon: { textShadowColor: 'rgba(138,94,18,0.45)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
  hint: { fontSize: 11.5, color: colors.muted, textAlign: 'center', marginTop: 8 },

  // Rings / Feelings switch
  seg: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: '#EEF0F5', borderRadius: 999, padding: 3, marginTop: 10 },
  segBtn: { paddingHorizontal: 14, minHeight: 30, justifyContent: 'center', borderRadius: 999 },
  segOn: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontSize: 12.5, fontWeight: '700', color: '#5A6484' },
  segTextOn: { color: '#1B3FA0' },

  // Faces in a day cell
  noFeel: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#D6D3C8', margin: 3 },
  faceOne: { width: 34, height: 30, alignItems: 'center', justifyContent: 'center' },
  faceStack: { width: 38, height: 30 },
  faceBack: { position: 'absolute', left: 0, top: 4 },
  faceFront: { position: 'absolute', left: 11, top: 0 },
  moreBadge: { position: 'absolute', right: -4, bottom: -2, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, backgroundColor: '#1B3FA0', borderWidth: 1.5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  moreText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '800' },

  // This month's feelings (top card, on blue)
  mixBar: { flexDirection: 'row', height: 12, borderRadius: 999, overflow: 'hidden' },
  mixRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mixItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  mixText: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  insight: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 10 },
  insightText: { fontSize: 12.5, lineHeight: 18, color: 'rgba(255,255,255,0.9)' },
  bold: { fontWeight: '800', color: '#FFFFFF' },
  topKick: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: 'rgba(255,255,255,0.75)' },

  // Medals view day cells: an ink drop and "+words"; a medal on the day a tier was reached
  medalCell: { width: 34, height: 32, alignItems: 'center', justifyContent: 'center' },
  wordBadge: { right: -14, bottom: -5 },
  pin: { position: 'absolute', top: -20, right: -12 },
  keyIcon: { width: 18, alignItems: 'center', justifyContent: 'center' },
  faceKey: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 8, rowGap: 8 },
  faceKeyItem: { width: '16.66%', alignItems: 'center', gap: 2 },
  faceKeyLabel: { fontSize: 9.5, fontWeight: '600', color: colors.body, maxWidth: '100%' },
  medalLegend: { gap: 8, marginTop: 6, marginBottom: 10 },
  medalTable: { borderRadius: 10, backgroundColor: '#F4F5F9', paddingHorizontal: 10, paddingVertical: 2 },
  medalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 26 },
  medalRowLine: { borderTopWidth: 1, borderTopColor: colors.line },
  medalRowName: { flex: 1, fontSize: 12.5, fontWeight: '700', color: colors.ink },
  medalRowWords: { fontSize: 12.5, color: colors.body, fontVariant: ['tabular-nums'] },
  dropsKey: { flexDirection: 'row', alignItems: 'center', gap: 2 },
}));
