// components/RingStats.js — big rings + the minutes / words / sessions lines,
// each with a bar in its ring's colour running to the edge, on a dark blue
// card. Used by the Brainstorm Today card, the day page and the Calendar's
// top card, so they all look the same.
//
// Animation: whenever `playKey` changes (e.g. each time the screen comes into
// focus) the rings start empty and fill in order — minutes, words, sessions —
// at a steady speed (one lap every 1.4 s), so the time depends on the day:
// a small day is quick, crushing your goal takes a little longer. The numbers
// count up and the bars fill along with their ring. A ring past its goal runs into
// its second lap and a gold "2.4×" chip pops in. With the phone's Reduce
// Motion setting on, everything appears already filled.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, AccessibilityInfo } from 'react-native';
import Rings, { RING_COLORS } from './Rings';
import { overMultiple, timeClock } from '../writingLogic';
import { themed } from '../theme';

// The rings fill at a steady speed: one full lap (100%) every LAP_MS, so a
// bigger day simply takes longer instead of whizzing round. A ring past its
// goal keeps going into its second lap at the same speed (the drawing stops
// at two laps; the number keeps counting to the real total). Each ring starts
// GAP_MS after the one before. The bars fill with their ring.
export const LAP_MS = 1400;
const GAP_MS = 300;
const MAX_LAPS_PCT = 200; // the rings draw at most two laps

// When each ring starts and how long it takes, for these rings.
// { minutes: { start, ms, span }, words: …, sessions: …, total }
export function fillPlan(rings) {
  const plan = {};
  let total = 0;
  ['minutes', 'words', 'sessions'].forEach((k, i) => {
    const pct = rings[k];
    // A ring with no goal still counts its number up, over one lap's time.
    const span = pct == null ? 100 : Math.max(0, Math.min(pct, MAX_LAPS_PCT));
    const start = i * GAP_MS;
    const ms = (span / 100) * LAP_MS;
    plan[k] = { start, ms, span };
    total = Math.max(total, start + ms);
  });
  plan.total = total;
  return plan;
}

// 0 → 1 for one ring at time t, at a constant speed (no easing).
export function fillFrac(plan, k, t) {
  const p = plan[k];
  if (!p.ms) return t >= p.start ? 1 : 0;
  return Math.max(0, Math.min(1, (t - p.start) / p.ms));
}

// Elapsed ms of the current fill; Infinity = finished. Restarts when playKey
// changes, and runs for as long as this day's rings need.
function useFill(playKey, total) {
  const [t, setT] = useState(playKey == null ? Infinity : 0);
  useEffect(() => {
    if (playKey == null) { setT(Infinity); return undefined; }
    let cancelled = false;
    let raf;
    setT(0);
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) { setT(Infinity); return; }
        const start = Date.now();
        const tick = () => {
          if (cancelled) return;
          const e = Date.now() - start;
          if (e >= total) { setT(Infinity); return; }
          setT(e);
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      });
    return () => { cancelled = true; if (raf) cancelAnimationFrame(raf); };
  }, [playKey]);
  return t;
}

// Gold "2.4×" pill that pops in when it first appears.
function Chip({ text }) {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[s.chip, { transform: [{ scale }] }]}>
      <Text style={s.chipText}>{text}</Text>
    </Animated.View>
  );
}

// One ring's line: its name on the left, "5:34 of 5 min ✓  1.1×" on the
// right, and a bar in the ring's colour running to the card's edge.
function Line({ name, color, value, of, pct, bar, noGoal }) {
  const closed = pct != null && pct >= 100;
  const chip = overMultiple(pct);
  return (
    <View>
      <View style={s.lineTop}>
        <Text style={[s.name, { color }]}>{name}</Text>
        <View style={s.valueRow}>
          <Text style={s.value} numberOfLines={1}>
            {value}
            <Text style={s.of}>{of != null ? ` of ${of}` : noGoal ? `  ·  ${noGoal}` : ''}{closed ? '  ✓' : ''}</Text>
          </Text>
          {chip ? <Chip text={chip} /> : null}
        </View>
      </View>
      <View style={s.track}>
        {bar ? <View style={[s.fill, { width: `${Math.max(3, Math.min(100, bar))}%`, backgroundColor: color }]} /> : null}
      </View>
    </View>
  );
}

// summary: { seconds, words, count }   rings: ringProgress(...) result
// noGoal: text for a ring with no target (e.g. "no goal that day"), or ''.
export default function RingStats({ summary, rings, playKey, off = false, size = 104, noGoal = '' }) {
  const plan = fillPlan(rings);
  const t = useFill(playKey, plan.total);
  const fm = fillFrac(plan, 'minutes', t);
  const fw = fillFrac(plan, 'words', t);
  const fs = fillFrac(plan, 'sessions', t);
  const tg = rings.targets || {};
  // Numbers (and the "2.4×" chip) count up to the real total; the ring and
  // bar move at the steady speed, up to two laps.
  const grow = (v, f) => (v == null ? null : v * f);
  const drawn = (k, f) => (rings[k] == null ? null : plan[k].span * f);
  const c = RING_COLORS.dark;

  return (
    <View style={s.body}>
      <Rings
        minutes={drawn('minutes', fm)} words={drawn('words', fw)} sessions={drawn('sessions', fs)}
        off={off && !summary.count} size={size} variant="dark"
      />
      <View style={s.lines}>
        <Line
          name="MINUTES" color={c.minutes}
          value={timeClock(Math.round(summary.seconds * fm))}
          of={tg.minutes ? `${tg.minutes} min` : null} pct={grow(rings.minutes, fm)} bar={drawn('minutes', fm)} noGoal={noGoal}
        />
        <Line
          name="WORDS" color={c.words}
          value={Math.round(summary.words * fw).toLocaleString()}
          of={tg.words ? tg.words.toLocaleString() : null} pct={grow(rings.words, fw)} bar={drawn('words', fw)} noGoal={noGoal}
        />
        <Line
          name="SESSIONS" color={c.sessions}
          value={String(Math.round(summary.count * fs))}
          of={tg.sessions ? String(tg.sessions) : null} pct={grow(rings.sessions, fs)} bar={drawn('sessions', fs)} noGoal={noGoal}
        />
      </View>
    </View>
  );
}

const s = themed(() => ({
  body: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  lines: { flex: 1, minWidth: 0, gap: 11 },
  lineTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  name: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  value: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  track: { height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.14)', marginTop: 5, overflow: 'hidden' },
  fill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 4 },
  of: { fontWeight: '500', color: 'rgba(255,255,255,0.75)' },
  chip: { backgroundColor: '#F2C14E', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  chipText: { fontSize: 11, fontWeight: '800', color: '#2A1A00' },
}));
