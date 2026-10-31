// components/SessionDoneSheet.js — the ONE sheet at the end of a writing
// session: it's saved, how today's goal is going, your next 3 medals, "How do you
// feel?" (optional), and Send to myself / Done. Replaces the old "How did it
// go?" rating sheet and the separate "Saved" sheet.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Sheet from './Sheet';
import TourTarget from './TourTarget';
import { tourEvent } from '../tourRun';
import Face from './Face';
import { MedalSummary } from './MedalProgress';
import { colors, radius, space, themed } from '../theme';
import { FEELINGS, feelingLabel } from '../feelings';
import Rings from './Rings';
import { isRestGoal, ringProgress, timeClock, timeText, toGoText } from '../writingLogic';

function goalLine(goal, totals, pct) {
  if (goal && goal.plan && !isRestGoal(goal)) {
    // Three rings: minutes, words, sessions.
    const r = ringProgress(goal, totals);
    const t = r.targets;
    return {
      title: `Today: ${totals.words.toLocaleString()} of ${t.words.toLocaleString()} words · ${timeClock(totals.seconds)} of ${t.minutes} min · ${totals.count} of ${t.sessions} session${t.sessions === 1 ? '' : 's'}`,
      right: r.closed ? 'All rings closed' : `${toGoText(goal, totals)} to go`,
      pct,
      rings: r,
    };
  }
  if (!goal || isRestGoal(goal) || pct == null) {
    return { title: `Today: ${totals.words.toLocaleString()} words · ${timeText(totals.seconds)}`, right: null, pct: null };
  }
  if (goal.type === 'time') {
    const left = goal.target * 60 - totals.seconds;
    return {
      title: `Today: ${timeClock(totals.seconds)} of ${goal.target} min`,
      right: pct >= 100 ? 'Goal met' : `${timeText(left)} to go`,
      pct,
    };
  }
  return {
    title: `Today: ${totals.words.toLocaleString()} of ${goal.target.toLocaleString()} words`,
    right: pct >= 100 ? 'Goal met' : `${(goal.target - totals.words).toLocaleString()} to go`,
    pct,
  };
}

export default function SessionDoneSheet({
  visible, words, seconds, dailyGoal, todayTotals, pct, nextRows = [], allRows = [],
  feeling, onPickFeeling, onShare, onDone, onMedalPress,
}) {
  const g = goalLine(dailyGoal, todayTotals, pct);
  const met = g.pct != null && g.pct >= 100;
  // "See all" opens every medal right here, so How do you feel? and Done
  // are never skipped. It starts folded each time.
  const [all, setAll] = useState(false);
  useEffect(() => { if (visible) setAll(false); }, [visible]);
  const rows = all ? allRows : nextRows;

  return (
    <Sheet
      visible={visible}
      onClose={onDone}
      tourId="done"
      title="Session saved"
      subtitle={`${words.toLocaleString()} word${words === 1 ? '' : 's'} · ${timeText(seconds)} · in My Writing`}
    >
      <TourTarget id="done.summary" style={s.goal}>
        <View style={s.goalHead}>
          <Text style={s.goalTitle}>{g.title}</Text>
          {g.right && !g.rings ? <Text style={[s.goalRight, met && s.goalMet]}>{g.right}</Text> : null}
        </View>
        {g.rings ? (
          <View style={s.ringsRow}>
            <Rings minutes={g.rings.minutes} words={g.rings.words} sessions={g.rings.sessions} size={44} />
            <Text style={[s.goalRight, { flex: 1 }, met && s.goalMet]}>{g.right}</Text>
          </View>
        ) : g.pct != null && (
          <View style={s.track}>
            <View style={[s.fill, { width: `${Math.min(100, Math.max(2, g.pct))}%` }, met && { backgroundColor: colors.karma }]} />
          </View>
        )}
      </TourTarget>

      {/* Up to 3 medals this session moved, closest first (any just earned lead), or all 9.
          Bars are in your medal's colour; green is what this session added. */}
      {rows.length ? (
        <View style={{ marginTop: 14 }}>
          <View style={s.medHead}>
            <Text style={s.medKicker}>✦  {all ? 'ALL MEDALS' : 'NEXT MEDALS'}</Text>
            {allRows.length > nextRows.length ? (
              <TourTarget id="done.seeAll">
                <Pressable onPress={() => { if (!all) tourEvent('medals-all'); setAll((a) => !a); }} hitSlop={8} accessibilityRole="button" accessibilityState={{ expanded: all }}>
                  <Text style={s.medToggle}>{all ? 'Show less  ⌃' : `See all ${allRows.length}  ⌄`}</Text>
                </Pressable>
              </TourTarget>
            ) : null}
          </View>
          <TourTarget id="done.medals" style={s.medPanel}>
            <MedalSummary rows={rows} resetKey={all} onOpen={(id) => tourEvent('medal-note', id)} />
          </TourTarget>
        </View>
      ) : null}

      <TourTarget id="done.feel">
      <View style={s.feelHead}>
        <Text style={s.feelTitle}>How do you feel?</Text>
        <Text style={s.feelPicked}>{feeling ? feelingLabel(feeling) : 'Optional'}</Text>
      </View>
      <View style={s.faces}>
        {FEELINGS.map((f) => {
          const on = feeling === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => onPickFeeling(on ? null : f.id)}
              style={[s.face, on && s.faceOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={f.label}
            >
              <Face id={f.id} size={42} />
              <Text style={[s.faceLabel, on && s.faceLabelOn]} numberOfLines={1}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>
      </TourTarget>

      <TourTarget id="done.buttons">
      <View style={s.actions}>
        <Pressable style={[s.btn, s.btnOutline]} onPress={onShare}>
          <Text style={[s.btnText, { color: colors.royal }]}>Send to myself</Text>
        </Pressable>
        <Pressable style={[s.btn, s.btnPrimary]} onPress={onDone}>
          <Text style={[s.btnText, { color: '#FFFFFF' }]}>Done</Text>
        </Pressable>
      </View>
      </TourTarget>
    </Sheet>
  );
}

const s = themed(() => ({
  medHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  medKicker: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.9, color: colors.muted },
  medToggle: { fontSize: 13, fontWeight: '800', color: colors.royal },
  medPanel: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 2 },
  goal: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12, gap: 8 },
  goalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  goalTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.ink },
  goalRight: { fontSize: 12, color: '#4F5878' },
  goalMet: { color: '#8A5E12', fontWeight: '700' },
  ringsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.cream, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.royal },
  medal: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12,
    backgroundColor: '#FFF8E6', borderWidth: 1.5, borderColor: colors.creamDeep, borderRadius: radius.md, padding: 10,
  },
  medalKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: '#8A5E12' },
  medalName: { fontSize: 14.5, fontWeight: '700', color: colors.ink, marginTop: 2 },
  medalSub: { fontSize: 12, color: '#5C4A2A', marginTop: 1 },
  feelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: space.md, marginBottom: 8 },
  feelTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  feelPicked: { fontSize: 12, color: '#4F5878' },
  faces: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  face: {
    width: '20%', alignItems: 'center', gap: 3, paddingVertical: 6,
    borderRadius: 14, borderWidth: 2, borderColor: 'transparent',
  },
  faceOn: { borderColor: colors.royal, backgroundColor: '#DCE4F7' },
  faceLabel: { fontSize: 10.5, fontWeight: '600', color: colors.ink },
  faceLabelOn: { fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10, marginTop: space.md },
  btn: { flex: 1, minHeight: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  btnOutline: { borderWidth: 1.5, borderColor: colors.royal, backgroundColor: '#FFFFFF' },
  btnPrimary: { backgroundColor: colors.royal },
  btnText: { fontSize: 14, fontWeight: '700' },
}));
