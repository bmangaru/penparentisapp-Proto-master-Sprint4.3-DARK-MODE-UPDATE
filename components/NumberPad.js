// components/NumberPad.js — the app's own number pad (cream panel, white keys,
// blue numbers), shaped like the iPhone one. Used by Edit goals and Log
// offline writing instead of the phone's keyboard, so it matches the app and
// the sheet can move up to keep the row you're typing in on screen.
//
//   const pad = useNumberPad({ fields, values, onChange });
//     fields:   [{ k, label: 'MINUTES', min, max }]   (in order, for Next ›)
//     values:   { minutes: 15, … }   onChange(k, n)
//   pad.open(k)          start typing in a field
//   pad.active           the field being typed in (or null)
//   pad.footer           the pad, for <Sheet footer={…}>
//   <PadValue pad={pad} k="minutes" value={15} />   the tappable number
//
// Typing: the first key replaces the number, then keys add digits. You can't
// go past the field's max (it stops there and the header turns red). Done or
// Next › keeps it at least the min. ⌫ removes the last digit.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, themed, dk } from '../theme';
import { tourEvent } from '../tourRun';

const CREAM = '#F1EDE3';

export function useNumberPad({ fields, values, onChange }) {
  const [active, setActive] = useState(null);
  const [fresh, setFresh] = useState(true); // next digit replaces the number
  const [warn, setWarn] = useState(false);
  const field = fields.find((f) => f.k === active) || null;

  function open(k) {
    setActive(k);
    setFresh(true);
    setWarn(false);
  }
  function commit(k = active) {
    const f = fields.find((x) => x.k === k);
    if (!f) return;
    const v = Number(values[k]) || 0;
    if (v < f.min) onChange(k, f.min);
  }
  function close() {
    commit();
    setActive(null);
    setWarn(false);
  }
  function next() {
    commit();
    const i = fields.findIndex((f) => f.k === active);
    if (i < 0 || i === fields.length - 1) close();
    else open(fields[i + 1].k);
  }
  function digit(d) {
    if (!field) return;
    tourEvent('pad-key', d);
    const cur = fresh ? '' : String(values[active] ?? '');
    let n = Number(`${cur}${d}`.replace(/^0+(?=\d)/, ''));
    if (n > field.max) { n = field.max; setWarn(true); } else setWarn(false);
    onChange(active, n);
    setFresh(false);
  }
  function backspace() {
    if (!field) return;
    const s = fresh ? '' : String(values[active] ?? '').slice(0, -1);
    onChange(active, Number(s) || 0);
    setFresh(false);
    setWarn(false);
  }

  const footer = field ? (
    <NumberPad
      label={field.label}
      range={field.range || `${field.min.toLocaleString()} to ${field.max.toLocaleString()}`}
      warn={warn ? `Up to ${field.max.toLocaleString()}` : null}
      last={fields[fields.length - 1].k === active}
      onDigit={digit}
      onBackspace={backspace}
      onNext={next}
      onDone={close}
    />
  ) : null;

  return { active, open, close, footer };
}

export function NumberPad({ label, range, warn, last, onDigit, onBackspace, onNext, onDone }) {
  return (
    <View style={s.pad}>
      <View style={s.head}>
        <Text style={s.label} numberOfLines={1}>
          {label}  ·  <Text style={warn ? s.warn : s.range}>{warn || range}</Text>
        </Text>
        <Pressable onPress={onDone} style={s.done} hitSlop={8} accessibilityRole="button">
          <Text style={s.doneText}>Done</Text>
        </Pressable>
      </View>
      <View style={s.keys}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <Key key={n} label={String(n)} onPress={() => onDigit(n)} />)}
        <Pressable onPress={onNext} style={[s.key, s.keyFlat]} accessibilityRole="button" accessibilityLabel={last ? 'Done' : 'Next'}>
          {({ pressed }) => <Text style={[s.flatText, pressed && { opacity: 0.6 }]}>{last ? 'Done' : 'Next ›'}</Text>}
        </Pressable>
        <Key label="0" onPress={() => onDigit(0)} />
        <Pressable onPress={onBackspace} style={({ pressed }) => [s.key, s.keyBack, pressed && s.keyPressed]} accessibilityRole="button" accessibilityLabel="Delete">
          <Ionicons name="backspace-outline" size={24} color={dk(colors.royal, '#EEF1F8')} />
        </Pressable>
      </View>
    </View>
  );
}

function Key({ label, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.key, pressed && s.keyPressed]} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={s.keyText}>{label}</Text>
    </Pressable>
  );
}

// The tappable number. While it's the one being typed in: blue outline and a
// blinking cursor.
export function PadValue({ pad, k, value, label, style }) {
  const on = pad.active === k;
  return (
    <Pressable
      onPress={() => (on ? pad.close() : pad.open(k))}
      style={[s.value, on && s.valueOn, style]}
      accessibilityRole="button"
      accessibilityLabel={`${label || k}: ${value}. Tap to type`}
    >
      <Text style={[s.valueText, on && { color: colors.royal }]}>{Number(value || 0).toLocaleString()}</Text>
      {on ? <Caret /> : null}
    </Pressable>
  );
}

function Caret() {
  const o = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let loop;
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then((reduce) => {
      if (reduce) return;
      loop = Animated.loop(Animated.sequence([
        Animated.timing(o, { toValue: 0, duration: 450, delay: 300, useNativeDriver: true }),
        Animated.timing(o, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]));
      loop.start();
    });
    return () => loop?.stop();
  }, []);
  return <Animated.View style={[s.caret, { opacity: o }]} />;
}

const s = themed(() => ({
  pad: { backgroundColor: CREAM, borderTopWidth: 1, borderTopColor: '#E2DCCB', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingBottom: 10, gap: 8 },
  label: { flex: 1, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: colors.ink },
  range: { color: colors.muted },
  warn: { color: '#B3261E' },
  done: { backgroundColor: colors.royal, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7 },
  doneText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 },
  keys: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 7 },
  key: {
    width: '32.4%', height: 50, borderRadius: 12, backgroundColor: dk('#FFFFFF', '#2C3961'), alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0A1633', shadowOpacity: 0.12, shadowRadius: 0, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  keyPressed: { backgroundColor: dk('#DCE4F7', '#40528A') },
  // Dark: white numbers on lighter-navy keys, on a darker panel.
  keyText: { fontSize: 24, fontWeight: '600', color: dk(colors.royal, '#EEF1F8') },
  keyFlat: { backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  flatText: { fontSize: 14.5, fontWeight: '800', color: colors.royal },
  keyBack: { backgroundColor: dk('#E6ECFA', '#3A4A7A') },
  value: { minWidth: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 5, paddingHorizontal: 6, borderRadius: 10, borderWidth: 2, borderColor: 'transparent' },
  valueOn: { backgroundColor: '#E6ECFA', borderColor: colors.royal },
  valueText: { fontSize: 17, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
  caret: { width: 2, height: 19, backgroundColor: colors.royal, marginLeft: 1 },
}));
