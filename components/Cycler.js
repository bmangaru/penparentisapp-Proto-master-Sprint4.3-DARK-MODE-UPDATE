// components/Cycler.js — cards that take turns in one spot (the Calendar tab's
// top card: today's rings ↔ the next event's countdown).
//   • Switches every `every` ms (6 s); swipe either way; dots show which card.
//   • Touching it pauses the switching for a while, so it never moves under
//     your finger. `paused` stops it (e.g. while another day is selected).
//   • When `resetKey` changes it goes back to the first card (e.g. a day tapped).
// With one card there are no dots and nothing moves.

import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, AccessibilityInfo } from 'react-native';
import { colors, themed } from '../theme';

const HOLD_AFTER_TOUCH = 12000;

export default function Cycler({ children, every = 6000, paused = false, resetKey }) {
  const pages = React.Children.toArray(children).filter(Boolean);
  const [w, setW] = useState(0);
  const [i, setI] = useState(0);
  const ref = useRef(null);
  const heldUntil = useRef(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {}); }, []);

  function show(n, animated = true) {
    if (!pages.length) return;
    const k = ((n % pages.length) + pages.length) % pages.length;
    setI(k);
    if (w) ref.current?.scrollTo({ x: k * w, animated: animated && !reduceMotion });
  }

  // Back to the first card from outside.
  useEffect(() => { show(0); }, [resetKey]);
  // Fewer cards than before (e.g. the event ended): stay in range.
  useEffect(() => { if (i >= pages.length) show(0, false); }, [pages.length]);

  // The switching.
  useEffect(() => {
    if (pages.length < 2 || paused || !w) return undefined;
    const id = setInterval(() => {
      if (Date.now() < heldUntil.current) return;
      setI((cur) => {
        const k = (cur + 1) % pages.length;
        ref.current?.scrollTo({ x: k * w, animated: !reduceMotion });
        return k;
      });
    }, every);
    return () => clearInterval(id);
  }, [pages.length, paused, w, every, reduceMotion]);

  const hold = () => { heldUntil.current = Date.now() + HOLD_AFTER_TOUCH; };

  if (pages.length < 2) return <View>{pages[0] || null}</View>;
  // Until the width is known, show the first card on its own, so nothing is
  // laid out unconstrained (text running off the card).
  if (!w) return <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>{pages[0]}</View>;

  return (
    <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onTouchStart={hold}
        onScrollBeginDrag={hold}
        onMomentumScrollEnd={(e) => { if (w) setI(Math.round(e.nativeEvent.contentOffset.x / w)); }}
        scrollEventThrottle={16}
      >
        {pages.map((p, k) => (
          <View key={k} style={{ width: w || undefined, paddingHorizontal: 1 }}>{p}</View>
        ))}
      </ScrollView>
      <View style={s.dots}>
        {pages.map((_, k) => (
          <Pressable
            key={k}
            onPress={() => { hold(); show(k); }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Card ${k + 1} of ${pages.length}`}
            accessibilityState={{ selected: k === i }}
          >
            <View style={[s.dot, k === i && s.dotOn]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = themed(() => ({
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#C8CEDE' },
  dotOn: { width: 18, backgroundColor: colors.royal },
}));
