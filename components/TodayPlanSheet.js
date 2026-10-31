// components/TodayPlanSheet.js — the one goals sheet.
//   • Today: A lighter day (easy, ½ your usual) / My usual (normal) /
//     A stretch day (hard, 1.5× your usual) / Rest today (resets at midnight)
//   • "Edit" only on My usual; the lighter and stretch days follow it.
// Opened by "Edit goals" on the Today card (mode 'edit', title "Your goals"),
// and once a day as "What's your goal today?" (mode 'daily').

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Sheet from './Sheet';
import Rings from './Rings';
import TourTarget from './TourTarget';
import { isTourTarget, tourEvent, useRun } from '../tourRun';
import { colors, radius, space, themed } from '../theme';
import { describeDailyGoal, planFor } from '../writingLogic';

const OPTIONS = [
  { id: 'light', title: 'A lighter day', cta: 'Start a lighter day', level: 'EASY', note: 'Half of your usual', ring: 0.82 },
  { id: 'usual', title: 'My usual', cta: 'Start with my usual', level: 'NORMAL', ring: 1 },
  { id: 'stretch', title: 'A stretch day', cta: 'Start a stretch day', level: 'HARD', note: '1.5× your usual', ring: 1.1 },
  { id: 'rest', title: 'Rest today', cta: 'Take the day off' },
];
const LEVEL = {
  EASY: { bg: '#E6F6EA', fg: '#1E7B3A' },
  NORMAL: { bg: '#E6ECFA', fg: '#0C2265' },
  HARD: { bg: '#FFE6C8', fg: '#9A4A0A' },
};

export default function TodayPlanSheet({ visible, goals, current, onPick, onEdit, onClose, mode = 'daily', openKey }) {
  const [picked, setPicked] = useState('usual');
  useEffect(() => {
    // Only when opened fresh, so coming back from an Edit keeps your pick.
    setPicked(current?.plan || 'usual');
  }, [openKey]);

  // In the app tour today is for writing: Rest is switched off.
  const run = useRun();
  const noRest = isTourTarget('plan.card', run);
  const weekday = new Date().toLocaleDateString(undefined, { weekday: 'long' });
  const subtitle = `Pick a goal for ${weekday}. Resets at midnight.`;
  const edit = mode === 'edit';
  const cta = edit ? "Save today's goal" : OPTIONS.find((o) => o.id === picked).cta;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={edit ? 'Your goals' : 'What’s your goal today?'}
      subtitle={edit ? 'Today resets at midnight.' : subtitle}
      tourId="plan"
    >
      {edit ? <Text style={s.section}>TODAY · {weekday.toUpperCase()}</Text> : null}
      <View style={{ gap: 10 }}>
        {OPTIONS.map((o) => {
          const plan = planFor(o.id, goals);
          const rest = o.id === 'rest';
          const on = picked === o.id;
          return (
            <TourTarget key={o.id} id={`plan.${o.id}`}>
            <Pressable
              onPress={() => { if (rest && noRest) return; setPicked(o.id); tourEvent('plan-pick', o.id); }}
              disabled={rest && noRest}
              style={[s.option, on && s.optionOn, rest && noRest && { opacity: 0.35 }]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <View style={s.ringBox}>
                <Rings minutes={100} words={100} sessions={100} off={rest} size={Math.round(48 * (o.ring || 1))} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.titleRow}>
                  <Text style={s.title}>{o.title}</Text>
                  {o.level ? (
                    <Text style={[s.level, { backgroundColor: LEVEL[o.level].bg, color: LEVEL[o.level].fg }]}>{o.level}</Text>
                  ) : null}
                </View>
                <Text style={s.sub}>{rest ? (noRest ? 'Not during the tour: today you’re writing!' : 'Counts as a day off. Your week stays on track.') : describeDailyGoal(plan)}</Text>
                {o.note ? <Text style={s.note}>{o.note}</Text> : null}
              </View>
              {o.id === 'usual' ? (
                <TourTarget id="plan.edit">
                <Pressable
                  onPress={() => onEdit(o.id)}
                  hitSlop={6}
                  style={s.edit}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${o.title}`}
                >
                  <Text style={s.editText}>Edit</Text>
                </Pressable>
                </TourTarget>
              ) : null}
            </Pressable>
            </TourTarget>
          );
        })}
      </View>
      <View style={s.tip}>
        <Text style={s.tipText}>✏️  To change your goals, tap <Text style={{ fontWeight: '700' }}>Edit</Text> on My usual. The others follow it.</Text>
      </View>
      <TourTarget id="plan.save">
        <Pressable style={s.cta} onPress={() => { tourEvent('plan-saved', picked); onPick(planFor(picked, goals)); }}>
          <Text style={s.ctaText}>{cta}</Text>
        </Pressable>
      </TourTarget>
    </Sheet>
  );
}

const s = themed(() => ({
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: radius.md, borderWidth: 2, borderColor: colors.line, backgroundColor: '#FFFFFF' },
  optionOn: { borderColor: colors.royal, backgroundColor: '#EEF2FB' },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  level: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
  note: { fontSize: 11.5, color: colors.muted, marginTop: 1 },
  ringBox: { width: 52, alignItems: 'center' },
  tip: { backgroundColor: '#F3F5FA', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, marginTop: 12 },
  tipText: { fontSize: 12.5, color: colors.body, lineHeight: 18 },
  sub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: colors.muted, marginBottom: 8 },
  edit: { borderWidth: 1.5, borderColor: colors.royal, borderRadius: 999, paddingHorizontal: 12, minHeight: 34, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  editText: { color: colors.royal, fontWeight: '700', fontSize: 13 },
  cta: { backgroundColor: colors.royal, borderRadius: radius.md, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: space.md },
  ctaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14.5 },
}));
