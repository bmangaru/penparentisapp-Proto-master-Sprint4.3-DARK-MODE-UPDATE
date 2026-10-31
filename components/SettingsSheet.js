// components/SettingsSheet.js — ⚙ Settings, opened from Home's banner.
// Appearance (System / Light / Dark, as three little pictures) and the app
// tour (open it, or start over).
// System follows the phone, so the app turns dark when the phone does.

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Sheet from './Sheet';
import { colors, radius, themed } from '../theme';
import { setAppearance, useAppearance } from '../appearance';
import { openTour, restartTour } from '../tour';
import { Ionicons } from '@expo/vector-icons';
import TourTarget from './TourTarget';
import { isTourTarget, tourEvent, useRun } from '../tourRun';

const OPTIONS = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

// The three picture tiles (also used in the app tour's first chapter).
// During the app tour nothing is highlighted until you tap one (the one you're
// on just gets a small "now" tag), so it's clear you're meant to pick.
export function AppearancePicker({ onPick }) {
  const choice = useAppearance() || 'system';
  const run = useRun();
  const neutral = isTourTarget('settings.appearance', run) && !run.taskDone;
  return (
    <View style={s.row} accessibilityRole="radiogroup">
      {OPTIONS.map((o) => {
        const on = o.id === choice && !neutral;
        const now = o.id === choice && neutral;
        return (
          <Pressable
            key={o.id}
            onPress={() => { if (onPick) onPick(o.id); tourEvent('appearance', o.id); if (o.id !== choice) setAppearance(o.id); }}
            style={[s.opt, on && s.optOn]}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${o.label} appearance`}
          >
            <Preview kind={o.id} />
            {now ? <Text style={s.now}>now</Text> : null}
            <Text style={[s.optText, on && { color: colors.royal }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SettingsSheet({ visible, onClose }) {
  // The tour opens over everything, so close Settings first.
  const go = (restart) => {
    onClose();
    setTimeout(async () => { if (restart) await restartTour(); openTour(); }, 350);
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Settings" subtitle="Make the app yours." tourId="settings">
      <TourTarget id="settings.appearance">
        <Text style={s.label}>APPEARANCE</Text>
        <AppearancePicker />
        <Text style={s.note}>System follows your phone's setting, so the app turns dark when your phone does.</Text>
      </TourTarget>

      <TourTarget id="settings.tour">
      <Text style={[s.label, { marginTop: 18 }]}>THE APP TOUR</Text>
      <Text style={s.note}>A short, step-by-step guide to everything in the app. Review any chapter, or start over from the beginning.</Text>
      <View style={[s.row, { marginTop: 10 }]}>
        <Pressable onPress={() => go(false)} style={[s.tourBtn, s.tourBtnFill]} accessibilityRole="button">
          <Ionicons name="compass-outline" size={17} color="#FFFFFF" />
          <Text style={[s.tourText, { color: '#FFFFFF' }]}>Open the tour</Text>
        </Pressable>
        <Pressable onPress={() => go(true)} style={s.tourBtn} accessibilityRole="button">
          <Ionicons name="refresh" size={16} color={colors.royal} />
          <Text style={s.tourText}>Start over</Text>
        </Pressable>
      </View>
      </TourTarget>
    </Sheet>
  );
}

// A tiny picture of the app: a blue banner over the page with two cards.
function Preview({ kind }) {
  if (kind === 'system') {
    return (
      <View style={[s.mini, { flexDirection: 'row' }]}>
        <View style={{ flex: 1 }}><Mini dark={false} /></View>
        <View style={{ flex: 1 }}><Mini dark /></View>
      </View>
    );
  }
  return <View style={s.mini}><Mini dark={kind === 'dark'} /></View>;
}
function Mini({ dark }) {
  return (
    <View style={{ flex: 1, backgroundColor: dark ? '#0D1324' : '#FFFDF8' }}>
      <View style={{ height: 18, backgroundColor: dark ? '#1A3489' : '#1B3FA0' }} />
      <View style={{ padding: 5, gap: 4 }}>
        {[0, 1].map((i) => (
          <View key={i} style={{ height: 11, borderRadius: 3, backgroundColor: dark ? '#18213A' : '#FFFFFF', borderWidth: dark ? 0 : 1, borderColor: '#E3E6EE' }} />
        ))}
      </View>
    </View>
  );
}

const s = themed(() => ({
  label: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.9, color: colors.muted, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  opt: { flex: 1, borderWidth: 2, borderColor: colors.line, borderRadius: radius.md, padding: 7, alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF' },
  optOn: { borderColor: colors.royal },
  optText: { fontSize: 13, fontWeight: '800', color: colors.ink },
  mini: { alignSelf: 'stretch', height: 70, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  tourBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 46, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.royal },
  tourBtnFill: { backgroundColor: colors.royal },
  tourText: { fontSize: 14, fontWeight: '700', color: colors.royal },
  now: { position: 'absolute', top: -9, alignSelf: 'center', fontSize: 10, fontWeight: '800', color: '#8A5E12', backgroundColor: '#FFF4D6', borderWidth: 1, borderColor: '#F0D48A', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1, overflow: 'hidden' },
  note: { fontSize: 12.5, lineHeight: 18, color: colors.muted, marginTop: 12, marginBottom: 6 },
}));
