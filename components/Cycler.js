// components/Cycler.js — cards that take turns in one spot, full width (the
// Calendar tab's top card: today's rings ↔ the next event's countdown; Home's
// blog posts).
//   • Switches every `every` ms (10 s); swipe either way; dots show which card.
//   • It goes round and round: swiping on from the last card brings back the
//     first, and back from the first shows the last (a copy of each sits at
//     the far ends; the moment a slide lands on one, it swaps to the real card).
//   • arrows: round ‹ › buttons either side of the dots, a little in from the edges.
//   • Touching it pauses the switching for a while, so it never moves under
//     your finger. `paused` stops it (e.g. while another day is selected).
//   • When `resetKey` changes it goes back to the first card (e.g. a day tapped).
// With one card there are no dots and nothing moves.

import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Pressable, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, themed } from '../theme';

const HOLD_AFTER_TOUCH = 12000;

export default function Cycler({ children, every = 10000, paused = false, resetKey, arrows = false, onIndex }) {
  const pages = React.Children.toArray(children).filter(Boolean);
  const n = pages.length;
  const [w, setW] = useState(0);
  const [i, setI] = useState(0);
  const iRef = useRef(0);
  const ref = useRef(null);
  const heldUntil = useRef(0);
  // Where the strip starts (the real first card). Set once: changing it on
  // every redraw made iOS jump mid-slide.
  const startOffset = useRef({ x: 0, y: 0 });
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {}); }, []);

  // Scroll positions: [copy of last] [card 0] … [card n-1] [copy of first]
  const xOf = (slot) => slot * w;
  const setIndex = (k) => { iRef.current = k; setI(k); if (onIndex) onIndex(k); };

  // Go to card k; k = n or -1 wraps round through the copy at that end.
  function show(k, animated = true) {
    if (!n || !w) { setIndex(((k % (n || 1)) + (n || 1)) % (n || 1)); return; }
    const anim = animated && !reduceMotion;
    const real = ((k % n) + n) % n;
    setIndex(real);
    if (k >= n || k < 0) {
      // Slide on to the copy at that end; onScroll swaps to the real card the
      // moment the slide arrives (no timer, so it never jumps mid-slide).
      const copySlot = k >= n ? n + 1 : 0;
      if (anim) ref.current?.scrollTo({ x: xOf(copySlot), animated: true });
      else ref.current?.scrollTo({ x: xOf(real + 1), animated: false });
    } else {
      ref.current?.scrollTo({ x: xOf(real + 1), animated: anim });
    }
  }

  // Start on the real first card once the width is known, and keep the
  // current card in place if the width changes.
  useEffect(() => { if (w && n > 1) ref.current?.scrollTo({ x: xOf(iRef.current + 1), animated: false }); }, [w, n]);
  // Back to the first card from outside.
  useEffect(() => { show(0, false); }, [resetKey]);
  // Fewer cards than before (e.g. the event ended): stay in range.
  useEffect(() => { if (iRef.current >= n) show(0, false); }, [n]);

  // The switching.
  useEffect(() => {
    if (n < 2 || paused || !w) return undefined;
    const id = setInterval(() => {
      if (Date.now() < heldUntil.current) return;
      show(iRef.current + 1);
    }, every);
    return () => clearInterval(id);
  }, [n, paused, w, every, reduceMotion]);

  const hold = () => { heldUntil.current = Date.now() + HOLD_AFTER_TOUCH; };

  // Arriving on a copy at either end (by swipe, arrow or timer): swap to the
  // real card it shows, which looks identical, so nothing visibly moves.
  function onScroll(e) {
    if (!w) return;
    const x = e.nativeEvent.contentOffset.x;
    if (x >= xOf(n + 1) - 0.5) ref.current?.scrollTo({ x: xOf(1), animated: false });
    else if (x <= 0.5) ref.current?.scrollTo({ x: xOf(n), animated: false });
  }

  // After a swipe: landing on a copy jumps to the real card it shows.
  function onSwipeEnd(e) {
    if (!w) return;
    const slot = Math.round(e.nativeEvent.contentOffset.x / w);
    if (slot <= 0) { setIndex(n - 1); ref.current?.scrollTo({ x: xOf(n), animated: false }); }
    else if (slot >= n + 1) { setIndex(0); ref.current?.scrollTo({ x: xOf(1), animated: false }); }
    else setIndex(slot - 1);
  }

  if (n < 2) return <View>{pages[0] || null}</View>;
  // Until the width is known, show the first card on its own, so nothing is
  // laid out unconstrained (text running off the card).
  if (!w) return <View onLayout={(e) => { const ww = Math.round(e.nativeEvent.layout.width); startOffset.current = { x: ww, y: 0 }; setW(ww); }}>{pages[0]}</View>;

  const slots = [pages[n - 1], ...pages, pages[0]];
  return (
    <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentOffset={startOffset.current}
        onTouchStart={hold}
        onScrollBeginDrag={hold}
        onScroll={onScroll}
        onMomentumScrollEnd={onSwipeEnd}
        scrollEventThrottle={16}
      >
        {slots.map((p, k) => (
          <View
            key={k}
            style={{ width: w, paddingHorizontal: 1 }}
            // The copies at the ends are only for the wrap-round slide.
            importantForAccessibility={k === 0 || k === n + 1 ? 'no-hide-descendants' : 'auto'}
            accessibilityElementsHidden={k === 0 || k === n + 1}
          >
            {p}
          </View>
        ))}
      </ScrollView>
      <View style={s.bar}>
        {arrows ? <Arrow dir={-1} onPress={() => { hold(); show(i - 1); }} /> : null}
        <View style={s.dots}>
          {pages.map((_, k) => (
            <Pressable
              key={k}
              onPress={() => { hold(); show(k); }}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Card ${k + 1} of ${n}`}
              accessibilityState={{ selected: k === i }}
            >
              <View style={[s.dot, k === i && s.dotOn]} />
            </Pressable>
          ))}
        </View>
        {arrows ? <Arrow dir={1} onPress={() => { hold(); show(i + 1); }} /> : null}
      </View>
    </View>
  );
}

function Arrow({ dir, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [s.arrow, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={dir < 0 ? 'Previous' : 'Next'}
    >
      <Ionicons name={dir < 0 ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.royal} />
    </Pressable>
  );
}

const s = themed(() => ({
  // Arrows a little in from the edges, dots in the middle.
  bar: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingHorizontal: 44 },
  arrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: colors.line },
  dots: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#C8CEDE' },
  dotOn: { width: 18, backgroundColor: colors.royal },
}));
