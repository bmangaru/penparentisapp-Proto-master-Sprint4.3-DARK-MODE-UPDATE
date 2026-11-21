// components/WeekCarousel.js — Brainstorm's week card: This week or Last
// week, picked with a switch (like the Calendar's Rings / Feelings / Medals),
// never by swiping: the card sits mid-page, where you scroll. "View review"
// opens that week's summary (the page Sunday's notification opens too).

import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WeekRings from './WeekRings';
import { colors, dk, themed } from '../theme';
import { parseDayKey } from '../writingLogic';

const short = (k) => parseDayKey(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const WEEKS = [['this', 'This week'], ['last', 'Last week']];

export default function WeekCarousel({ week, last, onPressDay, onOpenReview, onOpenThisWeek }) {
  const [which, setWhich] = useState('this');
  const isLast = which === 'last';
  const shown = isLast ? last : week;
  const full = `${shown.closedDays} day${shown.closedDays === 1 ? '' : 's'} with all rings closed`;
  const review = (
    <Pressable
      onPress={isLast ? onOpenReview : onOpenThisWeek} hitSlop={6}
      style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}
      accessibilityRole="button" accessibilityLabel={isLast ? 'View last week’s review' : 'View this week’s review'}
    >
      <Ionicons name="stats-chart" size={13} color="#FFFFFF" />
      <Text style={s.btnText}>View review</Text>
    </Pressable>
  );
  const seg = (
    <View style={s.seg} accessibilityRole="tablist">
      {WEEKS.map(([k, label]) => (
        <Pressable key={k} onPress={() => setWhich(k)} style={[s.segBtn, which === k && s.segOn]} accessibilityRole="tab" accessibilityState={{ selected: which === k }}>
          <Text style={[s.segText, which === k && s.segTextOn]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
  return (
    <WeekRings
      week={shown} onPressDay={onPressDay}
      title={isLast ? 'Last week' : 'This week'}
      meta={isLast ? `${short(last.start)} – ${short(last.end)} · ${full}` : full}
      right={review} below={seg}
    />
  );
}

// (The same switch and button as the Calendar's.)
const s = themed(() => ({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.royal, borderRadius: 999, paddingHorizontal: 12, minHeight: 30 },
  btnText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },
  seg: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: dk('#EEF0F5', 'rgba(255,255,255,0.08)'), borderRadius: 999, padding: 3 },
  segBtn: { paddingHorizontal: 14, minHeight: 30, justifyContent: 'center', borderRadius: 999 },
  segOn: { backgroundColor: dk('#FFFFFF', '#3352C4'), shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontSize: 12.5, fontWeight: '700', color: dk('#5A6484', '#A3AECB') },
  segTextOn: { color: dk('#1B3FA0', '#FFFFFF') },
}));
