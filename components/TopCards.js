// components/TopCards.js — the Calendar tab's Feelings and Medals cards.
// They're laid out exactly like the Today card (RingStats): a title line,
// a round picture on the left, labelled lines with bars on the right, and a
// link at the bottom. White text on the blue card, colours only for the
// labels and bars.
//
//   <FeelingsCard mix={monthFeelings(...)} monthName="November" />
//     a ring of this month's feelings with the top face in the middle;
//     the top three feelings as lines (how many times each)
//   <MonthMedalCardTop progress={monthProgress(...)} onSeeAll />
//     this month's medal; a line for each tier (Bronze 500 … Diamond 10,000)

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Face from './Face';
import Medal from './Medal';
import { Line } from './RingStats';
import { feelingById, feelingLabel } from '../feelings';
import { TIER_LABEL, TIERS } from '../medals';
import { MONTH_TIERS } from '../monthMedals';
import { themed } from '../theme';

// Tier colours for labels and bars on the blue card.
export const TIER_ON_BLUE = { bronze: '#E6A877', silver: '#D3D9E4', gold: '#F2C14E', diamond: '#B9A8FF' };

const SIZE = 92;

// ---------- Feelings ----------

// A ring split into this month's feelings, in their colours.
function FeelingRing({ list, total, size = SIZE }) {
  const sw = size * 0.13;
  const r = (size - sw) / 2;
  const C = 2 * Math.PI * r;
  const gap = list.length > 1 ? 3 : 0;
  let at = 0;
  return (
    <Svg width={size} height={size} style={{ position: 'absolute' }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.14)" strokeWidth={sw} fill="none" />
      {list.map((m) => {
        const len = (m.n / total) * C;
        const seg = (
          <Circle
            key={m.id} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={feelingById(m.id)?.color || '#DDD'} strokeWidth={sw}
            strokeDasharray={`${Math.max(0.1, len - gap)} ${C}`} strokeDashoffset={-at}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
        at += len;
        return seg;
      })}
    </Svg>
  );
}

export function FeelingsCard({ mix, monthName }) {
  const top = mix.list.slice(0, 3);
  const more = mix.list.length - top.length;
  return (
    <View style={s.card}>
      <View style={s.head}>
        <Text style={s.title} numberOfLines={1}>How you felt · {monthName}</Text>
        {mix.total ? <Text style={s.chip}>{mix.total} picked</Text> : null}
      </View>
      <View style={s.body}>
        <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
          <FeelingRing list={mix.list} total={mix.total || 1} />
          {mix.top ? <Face id={mix.top} size={46} animate /> : null}
        </View>
        <View style={s.lines}>
          {top.length ? top.map((m) => (
            <Line
              key={m.id}
              name={feelingLabel(m.id).toUpperCase()}
              color={feelingById(m.id)?.color || '#FFF'}
              value={`${m.n} ${m.n === 1 ? 'time' : 'times'}`}
              of={null}
              bar={(m.n / mix.total) * 100}
            />
          )) : <Text style={s.empty}>No feelings picked yet this month.</Text>}
        </View>
      </View>
      <Text style={s.note}>{more > 0 ? `+${more} more · ` : ''}Use the calendar below to see what you wrote and how you felt each day.</Text>
    </View>
  );
}

// ---------- This month's medal ----------

export function MonthMedalCardTop({ progress: p, onSeeAll }) {
  return (
    <View style={s.card}>
      <View style={s.head}>
        <Text style={s.title} numberOfLines={1}>This month · {p.name}</Text>
        {p.tier ? <Text style={s.chip}>{TIER_LABEL[p.tier]} ✓</Text> : null}
      </View>
      <View style={s.body}>
        <Medal medal={p} tier={p.tier} size={SIZE} />
        <View style={[s.lines, { gap: 7 }]}>
          {MONTH_TIERS.map((t, i) => {
            const tier = TIERS[i];
            const pct = Math.min(100, (p.value / t) * 100);
            return (
              <Line
                key={tier}
                name={TIER_LABEL[tier].toUpperCase()}
                color={TIER_ON_BLUE[tier]}
                value={Math.min(p.value, t).toLocaleString()}
                of={t.toLocaleString()}
                pct={pct}
                bar={pct}
              />
            );
          })}
        </View>
      </View>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} hitSlop={6} accessibilityRole="button">
          <Text style={s.link}>Tap to view all your monthly medals  ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Matches the Calendar's Today card (s.dayCard's content).
const s = themed(() => ({
  card: { flex: 1, gap: 12, justifyContent: 'space-between' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flexShrink: 1, fontSize: 14.5, fontWeight: '700', color: '#FFFFFF' },
  chip: { fontSize: 11, fontWeight: '800', color: '#2A1A00', backgroundColor: '#F2C14E', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  body: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  lines: { flex: 1, minWidth: 0, gap: 11 },
  empty: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  note: { color: 'rgba(255,255,255,0.75)', fontSize: 12.5 },
  link: { color: '#F2C14E', fontSize: 13, fontWeight: '800' },
}));
