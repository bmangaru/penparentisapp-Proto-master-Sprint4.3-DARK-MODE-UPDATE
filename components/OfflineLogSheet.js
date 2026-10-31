// components/OfflineLogSheet.js — "Log offline writing": minutes, words and
// sessions written somewhere else (Word, a notebook…), on the honor system.
// When: Today, or 📅 Choose date (a small calendar; any day up to today, no
// limit back). − / + step through the same values as your goals.
// The calendar shows each day's rings. Under the date, a rings card shows the
// chosen day as it stands, and fills as you change the numbers ("+30").
// "Counts toward": a progress bar per medal (so far = your medal's colour, green = this log,
// "✦ Unlocks Silver …" when it passes a tier). Tap a row to see what it tracks.
// "Only from writing in Brainstorm": the four medals that read the words
// themselves, so an offline log never moves them; tap one to see why.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { PadValue, useNumberPad } from './NumberPad';
import { Ionicons } from '@expo/vector-icons';
import Sheet from './Sheet';
import Rings, { RING_LABEL } from './Rings';
import Medal from './Medal';
import { MedalBar, MedalSummary, TRACKS } from './MedalProgress';
import { colors, radius, space, themed } from '../theme';
import { ADDED_BAR, TIER_BAR, TIER_LABEL, medalStats, offlinePreview } from '../medals';
import { OFFLINE_LIMITS, calendarDay, canLogDay, clampOffline, dayKey, formatDuration, monthGrid, parseDayKey, stepOffline, timeClock } from '../writingLogic';

const FIELDS = [
  { id: 'minutes', label: 'Minutes' },
  { id: 'words', label: 'Words' },
  { id: 'sessions', label: 'Sessions' },
];

// "Wed, Oct 28"
function shortDay(key) {
  return parseDayKey(key).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function OfflineLogSheet({ visible, onClose, onSave, sessions = [], dailyGoals = {}, goals = null }) {
  const today = dayKey();
  const [day, setDay] = useState(today);
  const [calOpen, setCalOpen] = useState(false);
  const [vals, setVals] = useState({ minutes: 0, words: 0, sessions: 1 });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (visible) { setDay(dayKey()); setCalOpen(false); setVals({ minutes: 0, words: 0, sessions: 1 }); setSaving(false); }
  }, [visible]);

  // Worked out once each time the sheet opens, not on every tap.
  const stats = useMemo(() => (visible ? medalStats(sessions, dailyGoals, goals) : null), [visible, sessions, dailyGoals, goals]);
  const preview = useMemo(
    () => (stats ? offlinePreview(sessions, dailyGoals, goals, stats, day, vals) : null),
    [stats, sessions, dailyGoals, goals, day, vals],
  );

  // The app's number pad: tap a number to type it; Next › goes to the next one.
  const pad = useNumberPad({
    fields: [
      { k: 'minutes', label: 'MINUTES', min: 0, max: OFFLINE_LIMITS.minutes, range: `up to ${OFFLINE_LIMITS.minutes}` },
      { k: 'words', label: 'WORDS', min: 0, max: OFFLINE_LIMITS.words, range: `up to ${OFFLINE_LIMITS.words.toLocaleString()}` },
      { k: 'sessions', label: 'SESSIONS', min: 1, max: OFFLINE_LIMITS.sessions, range: `1 to ${OFFLINE_LIMITS.sessions}` },
    ],
    values: vals,
    onChange: (k, n) => set(k, n),
  });
  // With the pad open, scroll so the rings card and the numbers sit above it.
  const scrollRef = useRef(null);
  const ringsY = useRef(0);
  useEffect(() => {
    if (pad.active) scrollRef.current?.scrollTo({ y: Math.max(0, ringsY.current - 4), animated: true });
  }, [pad.active]);
  useEffect(() => { if (!visible) pad.close(); }, [visible]);

  const set = (k, v) => setVals((x) => ({ ...x, [k]: clampOffline({ ...x, [k]: v })[k] }));
  const empty = vals.minutes === 0 && vals.words === 0;
  const isToday = day === today;

  async function save() {
    if (empty || saving || !canLogDay(day, today)) return;
    setSaving(true);
    await onSave(day, clampOffline(vals));
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Log offline writing" subtitle="On the honor system: no need to paste your text." footer={pad.footer} scrollRef={scrollRef}>
      <Text style={s.k}>WHEN</Text>
      <View style={s.chips}>
        <Pressable onPress={() => { setDay(today); setCalOpen(false); }} style={[s.chip, isToday && !calOpen && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: isToday && !calOpen }}>
          <Text style={[s.chipText, isToday && !calOpen && { color: '#FFFFFF' }]}>Today</Text>
        </Pressable>
        <Pressable onPress={() => setCalOpen((o) => !o)} style={[s.chip, (!isToday || calOpen) && s.chipOn]} accessibilityRole="button" accessibilityLabel={isToday ? 'Choose date' : `Date: ${shortDay(day)}. Change`}>
          <Ionicons name="calendar-outline" size={15} color={!isToday || calOpen ? '#FFFFFF' : colors.muted} />
          <Text style={[s.chipText, (!isToday || calOpen) && { color: '#FFFFFF' }]}>{isToday ? 'Choose date' : `${shortDay(day)}  ▾`}</Text>
        </Pressable>
      </View>

      {calOpen ? (
        <DatePicker
          value={day}
          today={today}
          sessions={sessions}
          dailyGoals={dailyGoals}
          goals={goals}
          onPick={(k) => { setDay(k); setCalOpen(false); }}
        />
      ) : null}

      <View onLayout={(e) => { ringsY.current = e.nativeEvent.layout.y; }}>
        {preview ? <DayRingsCard preview={preview} day={day} isToday={isToday} /> : null}
      </View>

      <Text style={[s.k, { marginTop: 14 }]}>WHAT YOU DID</Text>
      <View style={{ gap: 8 }}>
        {FIELDS.map((f) => (
          <View key={f.id} style={s.field}>
            <Text style={s.fieldLabel}>{f.label}</Text>
            <View style={s.stepper}>
              <Pressable onPress={() => set(f.id, stepOffline(f.id, vals[f.id], -1))} style={s.round} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Less ${f.label.toLowerCase()}`}>
                <Text style={s.roundText}>−</Text>
              </Pressable>
              <PadValue pad={pad} k={f.id} value={vals[f.id]} label={f.label} />
              <Pressable onPress={() => set(f.id, stepOffline(f.id, vals[f.id], 1))} style={s.round} hitSlop={6} accessibilityRole="button" accessibilityLabel={`More ${f.label.toLowerCase()}`}>
                <Text style={s.roundText}>+</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      <MedalPreview preview={preview} day={day} isToday={isToday} />

      <Pressable onPress={save} disabled={empty || saving} style={[s.cta, (empty || saving) && { opacity: 0.45 }]} accessibilityRole="button">
        <Text style={s.ctaText}>{isToday ? 'Add to today' : `Add to ${shortDay(day)}`}</Text>
      </Pressable>
      {empty ? <Text style={s.hint}>Enter the minutes or words you wrote.</Text> : null}
    </Sheet>
  );
}

// A small month calendar, Sunday first, with each day's rings (like the
// Calendar tab). Future days can't be picked. ‹ goes back as far as you like.
function DatePicker({ value, today, sessions, dailyGoals, goals, onPick }) {
  const start = parseDayKey(value);
  const [ym, setYm] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const now = parseDayKey(today);
  const atCurrent = ym.y === now.getFullYear() && ym.m === now.getMonth();
  const grid = useMemo(() => monthGrid(ym.y, ym.m).map((row) => row.map((k) => (k ? calendarDay(sessions, dailyGoals, goals, k, today) : null))), [ym, sessions, dailyGoals, goals, today]);
  const title = new Date(ym.y, ym.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const move = (d) => setYm(({ y, m }) => {
    const t = new Date(y, m + d, 1);
    return { y: t.getFullYear(), m: t.getMonth() };
  });
  return (
    <View style={s.cal}>
      <View style={s.calHead}>
        <Pressable onPress={() => move(-1)} hitSlop={10} style={s.calArrow} accessibilityRole="button" accessibilityLabel="Previous month">
          <Ionicons name="chevron-back" size={18} color={colors.royal} />
        </Pressable>
        <Text style={s.calTitle}>{title}</Text>
        <Pressable onPress={() => !atCurrent && move(1)} disabled={atCurrent} hitSlop={10} style={s.calArrow} accessibilityRole="button" accessibilityLabel="Next month">
          <Ionicons name="chevron-forward" size={18} color={atCurrent ? '#C3C8D6' : colors.royal} />
        </Pressable>
      </View>
      <View style={s.calRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Text key={i} style={s.calWd}>{d}</Text>)}
      </View>
      {grid.map((row, r) => (
        <View key={r} style={s.calRow}>
          {row.map((d, i) => {
            if (!d) return <View key={i} style={s.calCell} />;
            const k = d.key;
            const future = !canLogDay(k, today);
            const sel = k === value;
            return (
              <Pressable
                key={k}
                onPress={() => !future && onPick(k)}
                disabled={future}
                style={[s.calCell, sel && s.calSel, k === today && !sel && s.calToday]}
                accessibilityRole="button"
                accessibilityState={{ selected: sel, disabled: future }}
                accessibilityLabel={parseDayKey(k).toDateString()}
              >
                <Text style={[s.calNum, future && { color: '#C3C8D6' }, (sel || k === today) && { color: colors.royal, fontWeight: '800' }]}>
                  {parseDayKey(k).getDate()}
                </Text>
                <Rings minutes={d.rings.minutes} words={d.rings.words} sessions={d.rings.sessions} off={d.off && !future} faded={future} size={24} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// The chosen day's rings with this log added, and what each ring gains.
function DayRingsCard({ preview, day, isToday }) {
  const { after, added } = preview;
  const t = after.rings.targets;
  const rows = [
    { k: 'minutes', label: 'MIN', value: timeClock(after.seconds), target: t?.minutes, unit: ' min', plus: added.seconds ? `+${Math.round(added.seconds / 60)}` : null },
    { k: 'words', label: 'WORDS', value: after.words.toLocaleString(), target: t?.words, unit: '', plus: added.words ? `+${added.words.toLocaleString()}` : null },
    { k: 'sessions', label: 'SESSIONS', value: String(after.count), target: t?.sessions, unit: '', plus: added.sessions ? `+${added.sessions}` : null },
  ];
  return (
    <>
      <Text style={[s.k, { marginTop: 6 }]}>{(isToday ? 'TODAY' : shortDay(day).toUpperCase())} · WITH THIS LOG</Text>
      <View style={s.live} accessibilityLiveRegion="polite">
        <Rings minutes={after.rings.minutes} words={after.rings.words} sessions={after.rings.sessions} off={after.off} size={64} />
        <View style={{ flex: 1, gap: 2 }}>
          {after.off ? <Text style={s.liveRest}>Rest day: no rings to close.</Text> : null}
          {rows.map((r) => {
            const done = r.target ? after.rings[r.k] >= 100 : false;
            return (
              <Text key={r.k} style={s.liveLine}>
                <Text style={{ color: RING_LABEL[r.k], fontWeight: '800' }}>{r.label} </Text>
                <Text style={s.liveVal}>{r.value}</Text>
                {r.target ? <Text> of {r.target.toLocaleString()}{r.unit}</Text> : null}
                {done ? <Text style={s.ok}>  ✓</Text> : null}
                {r.plus ? <Text style={s.plus}>  {r.plus}</Text> : null}
              </Text>
            );
          })}
        </View>
      </View>
    </>
  );
}

// "Counts toward" (bars that grow with this log) and "Only from writing in
// Brainstorm" (badges). Tapping a row or badge opens a short note under it.
function MedalPreview({ preview, day, isToday }) {
  const [open, setOpen] = useState(null);
  useEffect(() => setOpen(null), [day]);
  if (!preview) return null;
  const toggle = (id) => setOpen((o) => (o === id ? null : id));
  const textOpen = preview.text.find((m) => m.id === open);
  return (
    <View style={s.counts}>
      <Text style={s.countsHead}>✓  COUNTS TOWARD · tap one to learn more</Text>
      <View style={s.legend}>
        {/* "So far" is drawn in the colour of the medal you hold: bronze, silver, gold. */}
        <View style={[s.legendSwatch, { flexDirection: 'row', overflow: 'hidden' }]}>
          {['bronze', 'silver', 'gold'].map((t) => <View key={t} style={{ flex: 1, backgroundColor: TIER_BAR[t] }} />)}
        </View>
        <Text style={s.legendText}>So far, in your medal's colour</Text>
        <View style={[s.legendSwatch, { backgroundColor: ADDED_BAR, marginLeft: 12 }]} /><Text style={s.legendText}>This log</Text>
      </View>
      <MedalSummary rows={preview.medals} pending open={open} onToggle={toggle} />

      <View style={s.sep} />
      <Text style={s.countsHead}>✕  ONLY FROM WRITING IN BRAINSTORM</Text>
      <View style={s.row}>
        {preview.text.map((m) => (
          <Pressable key={m.id} onPress={() => toggle(m.id)} style={s.badge} accessibilityRole="button" accessibilityLabel={`${m.name}: only counts writing done in Brainstorm`} accessibilityState={{ expanded: open === m.id }}>
            <View style={[s.badgeRing, open === m.id && s.badgeRingOn]}>
              <Medal medal={m} tier={null} size={36} />
              <View style={[s.mark, { backgroundColor: '#B3261E' }]}>
                <Ionicons name="close" size={9} color="#FFFFFF" />
              </View>
            </View>
            <Text style={s.badgeText} numberOfLines={2}>{m.name}</Text>
          </Pressable>
        ))}
      </View>
      {textOpen ? (
        <View style={s.note}>
          <Text style={s.noteTitle}>{textOpen.name}</Text>
          <Text style={s.noteText}>
            {TRACKS[textOpen.id]} <Text style={s.noteRed}>Only counts writing done in Brainstorm</Text>, because it reads the words themselves.
          </Text>
          <View style={{ marginTop: 3 }}><MedalBar now={textOpen.pct} tier={textOpen.tier} dark /></View>
          <Text style={s.noteSmall}>{textOpen.progressText}{textOpen.nextTier ? ` · ${TIER_LABEL[textOpen.nextTier]} next` : ''}</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = themed(() => ({
  k: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: colors.muted, marginBottom: 8 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#FFFFFF' },
  chipOn: { backgroundColor: colors.royal, borderColor: colors.royal },
  chipText: { fontSize: 13, fontWeight: '800', color: colors.muted },
  field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#D9DEEA', borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 12 },
  fieldLabel: { fontSize: 13.5, fontWeight: '700', color: colors.muted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  round: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  roundText: { fontSize: 18, fontWeight: '800', color: colors.royal },
  unit: { fontSize: 13, fontWeight: '700', color: colors.muted, marginLeft: -6, marginRight: 2 },
  cal: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: colors.royal, borderRadius: radius.md, padding: 10, marginBottom: 4 },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  calArrow: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  calTitle: { fontSize: 14.5, fontWeight: '800', color: colors.ink },
  calRow: { flexDirection: 'row' },
  calWd: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '800', color: colors.muted, paddingVertical: 4 },
  calCell: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center', gap: 1, borderRadius: 10, margin: 1 },
  calSel: { backgroundColor: '#E6ECFA', borderWidth: 1.5, borderColor: colors.royal },
  calToday: { borderWidth: 1.5, borderColor: colors.royal },
  calNum: { fontSize: 11.5, fontWeight: '700', color: colors.ink },
  num: { minWidth: 64, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.ink, paddingVertical: 4 },
  counts: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12, marginTop: space.md },
  countsHead: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, color: colors.muted, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  badge: { width: '25%', alignItems: 'center' },
  badgeRing: { borderRadius: 22, padding: 2, borderWidth: 2, borderColor: 'transparent' },
  badgeRingOn: { borderColor: colors.royal },
  live: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12 },
  liveLine: { fontSize: 12.5, color: colors.body, lineHeight: 19 },
  liveVal: { fontWeight: '800', color: colors.ink },
  liveRest: { fontSize: 12.5, color: colors.muted, fontStyle: 'italic' },
  ok: { color: '#1E7B3A', fontWeight: '800' },
  plus: { color: ADDED_BAR, fontWeight: '800' },
  legend: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  legendSwatch: { width: 14, height: 7, borderRadius: 3, marginRight: 5 },
  legendText: { fontSize: 11, color: colors.muted },
  mr: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 6, marginHorizontal: -6, borderRadius: 10, borderWidth: 1.5, borderColor: 'transparent' },
  mrOn: { backgroundColor: '#F2F5FD', borderColor: colors.royal },
  mrTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 },
  mrName: { fontSize: 13, fontWeight: '800', color: colors.ink, flexShrink: 1 },
  mrRight: { fontSize: 11.5, fontWeight: '700', color: colors.muted, flexShrink: 0 },
  mrSub: { fontSize: 11, color: colors.muted, marginTop: 3 },
  unlock: { alignSelf: 'flex-start', marginTop: 4, backgroundColor: '#FFF4D6', borderWidth: 1, borderColor: '#F0D48A', color: '#7A5208', fontSize: 10.5, fontWeight: '800', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  note: { backgroundColor: colors.ink, borderRadius: 12, padding: 12, marginTop: 6, marginBottom: 4 },
  noteTitle: { fontSize: 13.5, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  noteText: { fontSize: 12.5, lineHeight: 18, color: '#FFFFFF' },
  noteGreen: { color: '#9BE3B0', fontWeight: '700' },
  noteRed: { color: '#FFB4AB', fontWeight: '700' },
  noteSmall: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  badgeText: { fontSize: 9.5, fontWeight: '700', color: colors.body, textAlign: 'center', marginTop: 3 },
  mark: { position: 'absolute', right: -3, bottom: -2, width: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFFFFF' },
  sep: { height: 1, backgroundColor: colors.line, marginVertical: 10 },
  cta: { backgroundColor: colors.royal, borderRadius: radius.md, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: space.md },
  ctaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14.5 },
  hint: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 8 },
}));
