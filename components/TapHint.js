// components/TapHint.js — the app tour's "what to tap" hint on number rows:
// a pulsing gold ring that takes turns between the − / + buttons and the
// numbers (tap a number to type it), with a line saying so underneath.
//   const tip = useTapHint(active);
//   {tip.ring(tip.on && tip.hint === 0)}   inside a View around − (and +)
//   {tip.ring(tip.on && tip.hint === 1)}   inside a View around the number
//   {tip.on ? <Text style={TIP_TEXT}>{tip.line}</Text> : null}

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

export function useTapHint(active) {
  const [hint, setHint] = useState(0); // 0: − and +   1: the numbers
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) return undefined;
    setHint(0);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.25, duration: 550, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
    ]));
    loop.start();
    const id = setInterval(() => setHint((h) => (h + 1) % 2), 2200);
    return () => { loop.stop(); clearInterval(id); };
  }, [active]);
  const ring = (on) => (on ? <Animated.View pointerEvents="none" style={[s.ring, { opacity: pulse }]} /> : null);
  const line = hint === 0 ? '👆  Tap − or + to change any number' : '👆  Or tap any number to type it';
  return { on: !!active, hint, ring, line };
}

const s = StyleSheet.create({
  ring: { position: 'absolute', top: -6, left: -6, right: -6, bottom: -6, borderRadius: 999, borderWidth: 3, borderColor: '#F2C14E' },
});
export const TIP_TEXT = { fontSize: 13, fontWeight: '800', color: '#B07A1C', textAlign: 'center', marginTop: 10 };
