// components/InkDrop.js — the pieces of the Medals (ink-drop) calendar.
//
//   <InkDrop words={620} />            a black drop, bigger for more words
//   <WordBadge words={620} />          the green "+620!" badge
//   <MedalPin tier="gold" height={18} />  a small medal on a ribbon, for the
//     day you reached a tier. Bronze is plain; each tier up is fancier:
//     Silver has a striped ribbon and a ringed disc, Gold is a star, Diamond
//     a star with a gem and a sparkle.

import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, ClipPath, G, Rect, Path, Circle, Polygon } from 'react-native-svg';
import { INK, inkSize, wordBadge } from '../monthMedals';

// edge: a thin light rim, so the drop stands out on the dark blue share picture.
export function InkDrop({ words, min = 12, max = 30, color = INK, edge = null, typical = null }) {
  const d = inkSize(words, min, max, typical);
  if (!d) return null;
  return <View style={[{ width: d, height: d, borderRadius: d / 2, backgroundColor: color }, edge && { borderWidth: 1, borderColor: edge }]} />;
}

// at: where to pin it (absolute). It gets its own wide box there, so the
// text is never squeezed by a small cell ("+150" not "+…").
export function WordBadge({ words, at, border = '#FFFFFF', size = 10, align = 'flex-end', typical = null }) {
  const b = wordBadge(words, typical);
  if (!b) return null;
  const pad = size < 8 ? 2.5 : 4;
  const badge = (
    <View style={{ backgroundColor: b.bg, borderRadius: 999, borderWidth: border ? 1.5 : 0, borderColor: border || 'transparent', paddingHorizontal: pad, paddingVertical: size < 8 ? 0.5 : 1.5, flexShrink: 0 }}>
      <Text style={{ color: b.fg, fontSize: size, lineHeight: Math.round(size * 1.2), fontWeight: '800', fontVariant: ['tabular-nums'] }}>{b.text}</Text>
    </View>
  );
  if (!at) return badge;
  return <View pointerEvents="none" style={[{ position: 'absolute', width: 80, alignItems: align }, at]}>{badge}</View>;
}

const PIN = {
  bronze: { rib: [['#2C3E9E', 1]], g: ['#E9B07A', '#A9682F'], edge: '#7A4A1E' },
  silver: { rib: [['#2C3E9E', 2], ['#FFFFFF', 1], ['#2C3E9E', 2]], g: ['#F4F6FA', '#A9B1C2'], edge: '#6E778A' },
  gold: { rib: [['#F2C14E', 1], ['#2C3E9E', 2], ['#FFFFFF', 1], ['#2C3E9E', 2], ['#F2C14E', 1]], g: ['#FFE58A', '#D49A1E'], edge: '#9A6B0C' },
  diamond: { rib: [['#7B5CF0', 1], ['#FFFFFF', 0.6], ['#F2C14E', 0.8], ['#2C3E9E', 1.4], ['#F2C14E', 0.8], ['#FFFFFF', 0.6], ['#7B5CF0', 1]], g: ['#EDE6FF', '#9B86F2'], edge: '#5B44C2' },
};

function star(cx, cy, R, r, p) {
  const pts = [];
  for (let i = 0; i < p * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / p;
    const rr = i % 2 ? r : R;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

export function MedalPin({ tier, height = 18 }) {
  const d = PIN[tier];
  if (!d) return null;
  const total = d.rib.reduce((a, x) => a + x[1], 0);
  let x = 5;
  const stripes = d.rib.map(([c, w], i) => {
    const ww = (14 * w) / total;
    const r = <Rect key={i} x={x} y={0} width={ww + 0.05} height={14} fill={c} />;
    x += ww;
    return r;
  });
  return (
    <Svg width={(height * 24) / 31} height={height} viewBox="0 0 24 31" accessibilityLabel={`${tier} medal`}>
      <Defs>
        <LinearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={d.g[0]} />
          <Stop offset="1" stopColor={d.g[1]} />
        </LinearGradient>
        <ClipPath id="rib"><Path d="M5 0H19V12L12 15L5 12Z" /></ClipPath>
      </Defs>
      <G clipPath="url(#rib)">{stripes}</G>
      <Rect x={4} y={12.2} width={16} height={2.4} rx={1} fill={d.edge} />
      {tier === 'bronze' ? (
        <Circle cx={12} cy={22} r={7} fill="url(#g)" stroke={d.edge} strokeWidth={1} />
      ) : tier === 'silver' ? (
        <>
          <Circle cx={12} cy={22} r={7.2} fill="url(#g)" stroke={d.edge} strokeWidth={1} />
          <Circle cx={12} cy={22} r={4.6} fill="none" stroke={d.edge} strokeWidth={0.8} opacity={0.7} />
        </>
      ) : tier === 'gold' ? (
        <>
          <Polygon points={star(12, 22, 8.4, 4, 6)} fill="url(#g)" stroke={d.edge} strokeWidth={0.9} strokeLinejoin="round" />
          <Circle cx={12} cy={22} r={2.6} fill="#FFF3C4" stroke={d.edge} strokeWidth={0.6} />
        </>
      ) : (
        <>
          <Polygon points={star(12, 22, 8.8, 4.2, 8)} fill="url(#g)" stroke={d.edge} strokeWidth={0.9} strokeLinejoin="round" />
          <Path d="M12 18.6L14.6 21.2L12 25.6L9.4 21.2Z" fill="#E8F7FF" stroke="#4A9BD6" strokeWidth={0.7} />
          <Path d="M9.4 21.2H14.6" stroke="#4A9BD6" strokeWidth={0.5} />
          <Path d="M20.5 15.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill="#F2C14E" />
        </>
      )}
    </Svg>
  );
}
