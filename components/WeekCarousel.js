// components/WeekCarousel.js — Brainstorm's week card, two pages you swipe
// between: Last week on the left (with "View last week’s review", the same
// page Sunday's notification opens) and This week on the right, where it
// starts (with "View this week’s review", the same page for this week). Dots underneath say which one. The cards are flat here (a shadow
// gets cut off at the edges of a swiping row).

import React, { useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WeekRings from './WeekRings';
import { colors, themed } from '../theme';
import { parseDayKey } from '../writingLogic';

const short = (k) => parseDayKey(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const PAGES = ['Last week', 'This week'];

export default function WeekCarousel({ week, last, onPressDay, onOpenReview, onOpenThisWeek }) {
  const [w, setW] = useState(0);
  const [i, setI] = useState(1); // This week
  const ref = useRef(null);
  // Where the strip starts (This week), set once: a new start position on
  // every redraw made iOS jump and stick mid-swipe (as Cycler found).
  const start = useRef(null);
  if (w && !start.current) start.current = { x: w, y: 0 };
  const show = (n) => { setI(n); ref.current?.scrollTo({ x: n * w, animated: true }); };
  return (
    <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
      {w ? (
        <ScrollView
          ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} nestedScrollEnabled
          contentOffset={start.current}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / w))}
        >
          <View style={{ width: w }}>
            <WeekRings
              flat style={{ flex: 1 }} week={last} onPressDay={onPressDay} title="Last week"
              meta={`${short(last.start)} – ${short(last.end)}`}
              footer={(
                <Pressable onPress={onOpenReview} style={({ pressed }) => [s.link, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                  <Text style={s.linkText}>View last week’s review</Text>
                </Pressable>
              )}
            />
          </View>
          <View style={{ width: w }}>
            {/* Both cards the same height (so swiping never leaves a gap):
                each fills its page, and each has a link at the bottom. */}
            <WeekRings
              flat style={{ flex: 1 }} week={week} onPressDay={onPressDay}
              footer={(
                <Pressable onPress={onOpenThisWeek} style={({ pressed }) => [s.link, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                  <Text style={s.linkText}>View this week’s review</Text>
                </Pressable>
              )}
            />
          </View>
        </ScrollView>
      ) : null}
      {/* The same bar as the Calendar's top cards and Home's blog: round ‹ ›
          either side, dots in the middle (with two cards, either arrow goes
          to the other one). */}
      <View style={s.bar}>
        <Arrow dir={-1} onPress={() => show(i ? 0 : 1)} />
        <View style={s.dots}>
          {PAGES.map((t, n) => (
            <Pressable key={t} onPress={() => show(n)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Show ${t.toLowerCase()}`} accessibilityState={{ selected: i === n }}>
              <View style={[s.dot, i === n && s.dotOn]} />
            </Pressable>
          ))}
        </View>
        <Arrow dir={1} onPress={() => show(i ? 0 : 1)} />
      </View>
    </View>
  );
}

function Arrow({ dir, onPress }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [s.arrow, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={dir < 0 ? 'Previous week' : 'Next week'}>
      <Ionicons name={dir < 0 ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.royal} />
    </Pressable>
  );
}

const s = themed(() => ({
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 36, marginTop: -2 },
  linkText: { fontSize: 14, fontWeight: '700', color: colors.royal },
  // (As Cycler: arrows a little in from the edges, dots in the middle.)
  bar: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingHorizontal: 44 },
  arrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: colors.line },
  dots: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#C8CEDE' },
  dotOn: { width: 18, backgroundColor: colors.royal },
}));
