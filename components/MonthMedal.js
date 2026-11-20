// components/MonthMedal.js — this month's medal, for the Calendar's top card
// (Medals view) and the top of the Medals page.
//
//   <MilestoneBar words={1840} dark />   four parts: to Bronze, Silver, Gold,
//                                         Diamond — each filled in its own
//                                         tier's colour as you pass through it
//   <MonthMedalCard progress={p} dark />  medal + "November 2026 · First Frost"
//                                         + where you are + the milestone bar

import React from 'react';
import { View, Text } from 'react-native';
import Medal from './Medal';
import { TIER_BAR, TIER_LABEL } from '../medals';
import { MONTH_TIERS, milestoneParts } from '../monthMedals';
import { colors, themed } from '../theme';

const short = (n) => (n >= 1000 ? `${n / 1000}k` : String(n));

export function MilestoneBar({ words, dark = false, height = 9 }) {
  const parts = milestoneParts(words);
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={`${words.toLocaleString()} words this month`}>
      <View style={s.parts}>
        {parts.map((p, i) => (
          <View key={p.tier} style={[s.part, { height, borderRadius: height / 2 }, dark ? s.partDark : s.partLight]}>
            {p.fill > 0 ? (
              <View style={{ width: `${Math.max(p.fill * 100, 4)}%`, height: '100%', borderRadius: height / 2, backgroundColor: TIER_BAR[p.tier] }} />
            ) : null}
          </View>
        ))}
      </View>
      <View style={s.labels}>
        {MONTH_TIERS.map((t, i) => (
          <Text key={t} style={[s.label, dark && s.labelDark, { textAlign: 'right' }]}>
            {TIER_LABEL[parts[i].tier]} {short(t)}
          </Text>
        ))}
      </View>
    </View>
  );
}

// progress: monthProgress(); dark: on the blue top card.
export function MonthMedalCard({ progress: p, dark = false }) {
  const status = p.maxed
    ? 'Diamond! Every tier earned this month'
    : p.tier
      ? `${TIER_LABEL[p.tier]} now · ${p.toGo.toLocaleString()} words to ${TIER_LABEL[p.nextTier]}`
      : `${p.toGo.toLocaleString()} words to Bronze`;
  return (
    <View style={{ gap: 10 }}>
      <View style={s.row}>
        <Medal medal={p} tier={p.tier} size={64} />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text style={[s.when, dark && s.whenDark]}>{p.when}</Text>
          <Text style={[s.name, dark && s.nameDark]} numberOfLines={1}>{p.name}</Text>
          <Text style={[s.status, dark && s.statusDark]}>
            <Text style={{ fontWeight: '800' }}>{p.value.toLocaleString()}</Text> words · {status}
          </Text>
        </View>
      </View>
      <MilestoneBar words={p.value} dark={dark} />
    </View>
  );
}

const s = themed(() => ({
  parts: { flexDirection: 'row', gap: 4 },
  part: { flex: 1, overflow: 'hidden' },
  partLight: { backgroundColor: '#ECEEF3' },
  partDark: { backgroundColor: 'rgba(255,255,255,0.18)' },
  labels: { flexDirection: 'row', gap: 4, marginTop: 4 },
  label: { flex: 1, fontSize: 10, fontWeight: '700', color: colors.muted },
  labelDark: { color: 'rgba(255,255,255,0.75)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  when: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.6, color: colors.muted, textTransform: 'uppercase' },
  whenDark: { color: 'rgba(255,255,255,0.75)' },
  name: { fontSize: 18, fontWeight: '800', color: colors.ink },
  nameDark: { color: '#FFFFFF' },
  status: { fontSize: 12.5, color: colors.body },
  statusDark: { color: 'rgba(255,255,255,0.88)' },
}));
