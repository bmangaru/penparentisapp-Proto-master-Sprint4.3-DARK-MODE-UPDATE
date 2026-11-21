// components/WeekCarousel.js — Brainstorm's This week card: the week's rings
// and totals, and "View review" (top right, where the Calendar has Share),
// which opens this week's summary. Earlier weeks: the Calendar.

import React from 'react';
import { Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WeekRings from './WeekRings';
import { colors, themed } from '../theme';

export default function WeekCarousel({ week, onPressDay, onOpenThisWeek }) {
  const review = (
    <Pressable
      onPress={onOpenThisWeek} hitSlop={6}
      style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}
      accessibilityRole="button" accessibilityLabel="View this week’s review"
    >
      <Ionicons name="stats-chart" size={13} color="#FFFFFF" />
      <Text style={s.btnText}>View review</Text>
    </Pressable>
  );
  return <WeekRings week={week} onPressDay={onPressDay} title="This week" right={review} />;
}

// (The same button as the Calendar's Share.)
const s = themed(() => ({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.royal, borderRadius: 999, paddingHorizontal: 12, minHeight: 30 },
  btnText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },
}));
