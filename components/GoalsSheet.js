// components/GoalsSheet.js — set a daily target for each ring (minutes,
// words, sessions). Your usual goal applies every day; there are no set
// writing days and no weekly goal.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { PadValue, useNumberPad } from './NumberPad';
import Sheet from './Sheet';
import TourTarget from './TourTarget';
import { isTourTarget, tourEvent, useRun } from '../tourRun';
import Rings, { RING_COLORS } from './Rings';
import { colors, radius, space, themed } from '../theme';
import { GOAL_LIMITS, lightTargets, normalizeGoals, stepGoal } from '../writingLogic';

const ROWS = [
  // The row names say the unit, so the numbers stand alone and line up.
  { k: 'minutes', name: 'Minutes', sub: 'Time writing each day' },
  { k: 'words', name: 'Words', sub: 'Words typed each day' },
  { k: 'sessions', name: 'Sessions', sub: 'Times you sit down to write' },
];

// kind 'usual': the three rings (first run, and Edit on "My usual").
// kind 'light': just the three rings for "A lighter day" (never above your usual),
//   with "Use half of my usual". Saves goals.light, or removes it to go back to half.
// onBack: show "‹ Your goals" (when opened from the goals sheet).
export default function GoalsSheet({ visible, goals, firstTime, kind = 'usual', onSave, onClose, onBack }) {
  const light = kind === 'light';
  const start = () => {
    const base = normalizeGoals(goals);
    return light ? { ...base, ...lightTargets(base) } : base;
  };
  const [g, setG] = useState(start);
  const [custom, setCustom] = useState(false); // lighter day: edited (vs. half of usual)
  const usual = normalizeGoals(goals);
  useEffect(() => {
    if (visible) { setG(start()); setCustom(!!usual.light); pad.close(); }
  }, [visible, kind]);

  const max = (k) => (light ? usual[k] : GOAL_LIMITS[k].max);
  const step = (k, dir) => {
    setTouched(true);
    setG((cur) => ({ ...cur, [k]: Math.min(max(k), stepGoal(k, cur[k], dir)) }));
    if (light) setCustom(true);
  };
  // Tap a number to type it on the app's number pad (Next › goes to the next row).
  const clamp = (k, v) => Math.min(max(k), Math.max(GOAL_LIMITS[k].min, Math.round(Number(v) || 0)));
  const pad = useNumberPad({
    fields: ROWS.map((r) => ({ k: r.k, label: r.name.toUpperCase(), min: GOAL_LIMITS[r.k].min, max: max(r.k) })),
    values: g,
    onChange: (k, n) => { setG((cur) => ({ ...cur, [k]: n })); if (light) setCustom(true); },
  });
  // The app tour: a pulsing gold ring shows what to tap, taking turns
  // between − / + and the number (tap it to type), until you try one.
  const run = useRun();
  const inTour = isTourTarget('goals.card', run);
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (visible) setTouched(false); }, [visible]);
  useEffect(() => { if (pad.active) setTouched(true); }, [pad.active]);
  const showHint = inTour && !run.taskDone && !touched;
  const [hint, setHint] = useState(0); // 0: − and +   1: the number
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!showHint) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.25, duration: 550, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
    ]));
    loop.start();
    const id = setInterval(() => setHint((h) => (h + 1) % 2), 2200);
    return () => { loop.stop(); clearInterval(id); };
  }, [showHint]);
  const ring = (on) => (on ? <Animated.View pointerEvents="none" style={[s.hintRing, { opacity: pulse }]} /> : null);

  const half = lightTargets({ ...usual, light: undefined });
  function useHalf() {
    setG((cur) => ({ ...cur, ...half }));
    setCustom(false);
  }

  function save() {
    tourEvent('goals-saved');
    // Anything still being typed counts, kept in range.
    const v = { words: clamp('words', g.words), minutes: clamp('minutes', g.minutes), sessions: clamp('sessions', g.sessions) };
    if (light) {
      onSave({ ...usual, light: custom ? v : undefined });
    } else {
      // Keep a custom lighter day, but never above the new usual (normalizeGoals caps it).
      onSave({ ...g, ...v, light: usual.light });
    }
  }


  const title = light ? 'A lighter day' : firstTime ? 'Your writing goals' : 'My usual';
  const subtitle = light
    ? 'For busy days. Pick it any day from “Your goals”.'
    : firstTime ? 'One goal per ring, every day. On busy days pick a lighter day or rest.' : 'Your goal on a normal day.';

  return (
    <Sheet visible={visible} onClose={firstTime ? () => {} : onClose} title={title} subtitle={subtitle} footer={pad.footer} tourId="goals">
      {onBack && !inTour ? (
        <Pressable onPress={onBack} hitSlop={8} style={s.back} accessibilityRole="button">
          <Text style={s.backText}>‹ Your goals</Text>
        </Pressable>
      ) : null}
      {firstTime ? (
        <View style={s.ringsRow}>
          <Rings minutes={75} words={75} sessions={100} size={60} />
        </View>
      ) : null}

      <View style={s.card}>
        {ROWS.map((r, i) => {
          const atMin = g[r.k] <= GOAL_LIMITS[r.k].min;
          const atMax = g[r.k] >= max(r.k);
          return (
            <View key={r.k} style={[s.row, i < ROWS.length - 1 && s.rowRule]}>
              <View style={[s.dot, { backgroundColor: RING_COLORS.light[r.k] }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.rowName}>{r.name}</Text>
                <Text style={s.rowSub}>{r.sub}</Text>
              </View>
              <View>
              <Pressable
                onPress={() => step(r.k, -1)}
                disabled={atMin}
                style={[s.stepBtn, atMin && s.stepOff]}
                accessibilityRole="button"
                accessibilityLabel={`Less ${r.name.toLowerCase()}`}
              >
                <Text style={s.stepText}>−</Text>
              </Pressable>
              {ring(showHint && hint === 0)}
              </View>
              <View>
                <PadValue pad={pad} k={r.k} value={g[r.k]} label={`${r.name} goal`} />
                {ring(showHint && hint === 1)}
              </View>
              <View>
              <Pressable
                onPress={() => step(r.k, 1)}
                disabled={atMax}
                style={[s.stepBtn, atMax && s.stepOff]}
                accessibilityRole="button"
                accessibilityLabel={`More ${r.name.toLowerCase()}`}
              >
                <Text style={s.stepText}>+</Text>
              </Pressable>
              {ring(showHint && hint === 0)}
              </View>
            </View>
          );
        })}
      </View>

      {showHint ? (
        <Text style={s.hintText}>{hint === 0 ? '👆  Tap − or + to change any goal' : '👆  Or tap any number to type it'}</Text>
      ) : null}

      {light ? (
        <>
          <Text style={s.lightNote}>
            {custom ? 'Your own lighter day. It stays like this when you change your usual.' : 'Half of your usual. It follows your usual if you change it.'}
          </Text>
          {custom ? (
            <Pressable onPress={useHalf} style={s.reset} accessibilityRole="button">
              <Text style={s.resetText}>
                ↺ Use half of my usual ({half.words} words · {half.minutes} min · {half.sessions} session{half.sessions === 1 ? '' : 's'})
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      {/* Hidden while the number pad is open; Done brings it back. */}
      {!pad.active ? (
        <TourTarget id="goals.save" style={{ marginTop: space.md }}>
          <Pressable style={s.save} onPress={save}>
            <Text style={s.saveText}>{firstTime ? 'Save goals' : 'Save'}</Text>
          </Pressable>
        </TourTarget>
      ) : null}
    </Sheet>
  );
}

const s = themed(() => ({
  back: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center', marginTop: -6, marginBottom: 6 },
  backText: { color: colors.royal, fontWeight: '700', fontSize: 13.5 },
  lightNote: { fontSize: 12.5, color: colors.muted, marginTop: space.sm, lineHeight: 18 },
  reset: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  resetText: { color: colors.royal, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  ringsRow: { alignItems: 'center', marginBottom: space.sm },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  rowRule: { borderBottomWidth: 1, borderBottomColor: colors.line },
  dot: { width: 12, height: 12, borderRadius: 6 },
  rowName: { fontSize: 14.5, fontWeight: '700', color: colors.ink },
  rowSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  hintRing: { position: 'absolute', top: -6, left: -6, right: -6, bottom: -6, borderRadius: 999, borderWidth: 3, borderColor: '#F2C14E' },
  hintText: { fontSize: 13, fontWeight: '800', color: '#B07A1C', textAlign: 'center', marginTop: 10 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(10,22,51,0.2)', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  stepOff: { opacity: 0.3 },
  stepText: { fontSize: 20, color: colors.ink, lineHeight: 22 },
  value: { minWidth: 58, textAlign: 'center', fontSize: 16, fontWeight: '800', color: colors.ink, paddingVertical: 4 },
  save: { backgroundColor: colors.royal, borderRadius: radius.md, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14.5 },
}));
