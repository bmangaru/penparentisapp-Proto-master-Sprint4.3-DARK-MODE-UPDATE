// components/WeekCarousel.js — Brainstorm's week card, two pages you swipe
// between: This week, and Last week (with "See your week in review ›", the
// same page Sunday's notification opens). Dots underneath say which one.

import React, { useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WeekRings from './WeekRings';
import { colors, themed } from '../theme';
import { parseDayKey } from '../writingLogic';

const short = (k) => parseDayKey(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function WeekCarousel({ week, last, onPressDay, onOpenReview }) {
  const [w, setW] = useState(0);
  const [i, setI] = useState(0);
  const ref = useRef(null);
  const show = (n) => { setI(n); ref.current?.scrollTo({ x: n * w, animated: true }); };
  return (
    <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
      {w ? (
        <ScrollView
          ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} nestedScrollEnabled
          onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / w))}
          accessibilityRole="adjustable"
        >
          <View style={{ width: w }}>
            <WeekRings week={week} onPressDay={onPressDay} />
          </View>
          <View style={{ width: w }}>
            <WeekRings
              week={last} onPressDay={onPressDay} title="Last week"
              meta={`${short(last.start)} – ${short(last.end)}`}
              footer={(
                <Pressable onPress={onOpenReview} style={({ pressed }) => [s.link, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                  <Text style={s.linkText}>See your week in review</Text>
                  <Ionicons name="chevron-forward" size={15} color={colors.royal} />
                </Pressable>
              )}
            />
          </View>
        </ScrollView>
      ) : null}
      <View style={s.dots}>
        {['This week', 'Last week'].map((t, n) => (
          <Pressable key={t} onPress={() => show(n)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Show ${t.toLowerCase()}`} accessibilityState={{ selected: i === n }} style={s.dotHit}>
            <View style={[s.dot, i === n && s.dotOn]} />
          </Pressable>
        ))}
        <Pressable onPress={() => show(i ? 0 : 1)} hitSlop={8} accessibilityRole="button" style={{ marginLeft: 6 }}>
          <Text style={s.dotText}>{i ? '‹ This week' : 'Last week ›'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = themed(() => ({
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 36, marginTop: -2 },
  linkText: { fontSize: 14, fontWeight: '700', color: colors.royal },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: 8 },
  dotHit: { padding: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.line },
  dotOn: { width: 18, backgroundColor: colors.royal },
  dotText: { fontSize: 12.5, fontWeight: '700', color: colors.royal },
}));
