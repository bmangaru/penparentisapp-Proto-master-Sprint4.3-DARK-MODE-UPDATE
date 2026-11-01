// components/TourCard.js — Home's welcome card for the app tour, above
// "From the blog". Shows how far you are and continues where you left off.
// "Hide the tour" tucks it away (Settings brings it back); it's gone for good once every chapter is
// done. ⚙ Settings → The app tour brings the tour back any time.

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Medal from './Medal';
import { CHAPTER_IDS } from './TourContent';
import { colors, radius, themed } from '../theme';
import { MEDALS } from '../medals';
import { openTour, setTourHidden, useTour } from '../tour';

const TOUR_MEDAL = MEDALS.find((m) => m.id === 'tour');

export default function TourCard() {
  const tour = useTour();
  if (!tour || tour.finished || tour.hidden) return null;
  const n = CHAPTER_IDS.filter((id) => tour.done[id]).length;
  const started = n > 0;
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Medal medal={TOUR_MEDAL} tier={n >= 9 ? 'gold' : n >= 6 ? 'silver' : n >= 3 ? 'bronze' : null} size={46} />
        <View style={{ flex: 1 }}>
          <Text style={s.kick}>{started ? 'YOUR TOUR' : 'NEW HERE? START WITH THE TOUR'}</Text>
          <Text style={s.title}>Welcome to Pen Parentis</Text>
        </View>
      </View>
      <Text style={s.body}>A short walk through everything: settings, your goals and rings, writing, medals, the calendar, salons and community.</Text>
      <View style={s.track}><View style={[s.fill, { width: `${Math.max(3, (n / CHAPTER_IDS.length) * 100)}%` }]} /></View>
      <Text style={s.count}>{n} of {CHAPTER_IDS.length} chapters · ✦ earn the Tour Guide medal as you go</Text>
      <Pressable onPress={() => openTour()} style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]} accessibilityRole="button">
        <Text style={s.btnText}>{started ? 'Continue the tour  ›' : 'Start the tour  ›'}</Text>
      </Pressable>
      <Pressable onPress={() => setTourHidden(true)} style={({ pressed }) => [s.hideBtn, pressed && { opacity: 0.8 }]} accessibilityRole="button">
        <Text style={s.hideText}>Hide the tour</Text>
      </Pressable>
      <Text style={s.hide}>You can always find it again in ⚙ Settings.</Text>
    </View>
  );
}

const s = themed(() => ({
  card: { borderRadius: 18, padding: 16, backgroundColor: '#FFF8E6', borderWidth: 2, borderColor: '#E0C27A', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kick: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1, color: '#8A5E12' },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: 2 },
  body: { fontSize: 13.5, lineHeight: 20, color: colors.body, marginTop: 8 },
  track: { height: 8, borderRadius: 4, backgroundColor: '#EFE4CC', marginTop: 12, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.karma },
  count: { fontSize: 12, fontWeight: '700', color: '#8A5E12', marginTop: 6 },
  btn: { backgroundColor: colors.royal, borderRadius: radius.md, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14.5 },
  hideBtn: { borderWidth: 1.5, borderColor: colors.royal, borderRadius: radius.md, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  hideText: { color: colors.royal, fontWeight: '700', fontSize: 14 },
  hide: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 6 },
}));
