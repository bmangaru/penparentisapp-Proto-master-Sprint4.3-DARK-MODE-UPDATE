// components/MedalProgress.js — the medal summary, shared by Session saved and
// "Log offline writing" so both look and work the same.
//   • MedalBar: the filled part is the colour of the medal you hold now
//     (soft blue = not earned yet, then bronze, silver, gold, diamond); a
//     green piece after it is what you just added.
//   • MedalSummary: rows of medals with bars (rows from summaryRow() in
//     medals.js). Tap a row for a short note: what it tracks, what was added,
//     and how far is left. `pending` = not saved yet (the offline log):
//     "This log adds…" / "Unlocks Silver…"; otherwise "This session added…" /
//     "Silver earned".

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Medal from './Medal';
import { colors, themed } from '../theme';
import { ADDED_BAR, TIER_LABEL, formatAmount, tierBarColor } from '../medals';
import { formatDuration } from '../writingLogic';

// What each medal tracks, in a line (the start of its note).
export const TRACKS = {
  words: 'Counts every word you write.',
  time: 'Counts all the time you spend writing.',
  sessions: 'Counts every time you sit down to write.',
  streak: 'Your longest run of days in a row with writing.',
  goals: 'Counts the days you closed all three rings.',
  vowels: 'Counts the vowels in your writing.',
  consonants: 'Counts the consonants in your writing.',
  punctuation: 'Counts the punctuation marks in your writing.',
  longWords: 'Counts words longer than 10 letters.',
};

export function MedalBar({ now = 0, add = 0, tier, dark = false, height = 8 }) {
  const n = Math.max(0, Math.min(100, now));
  const a = Math.max(0, Math.min(100 - n, add));
  return (
    <View style={[s.track, { height, borderRadius: height / 2 }, dark && s.trackDark]}>
      {n > 0 ? <View style={[s.fill, { width: `${Math.max(n, 2)}%`, backgroundColor: tierBarColor(tier), borderRadius: height / 2 }]} /> : null}
      {a > 0 ? <View style={[s.fill, { left: `${n}%`, width: `${Math.max(a, 0.8)}%`, backgroundColor: ADDED_BAR }]} /> : null}
    </View>
  );
}

const unitOf = (m) => (m.isTime ? '' : ` ${m.unit}`);
// "+500" / "+30 min"
const plusText = (m, n) => (m.isTime ? `+${formatDuration(n)}` : `+${Math.round(n).toLocaleString()}`);
// "500 words", "30 min", "1 session", "9 vowels"
export function addedText(m, n) {
  if (m.isTime) return formatDuration(n);
  if (m.id === 'sessions') return `${n} ${n === 1 ? 'session' : 'sessions'}`;
  if (m.id === 'streak') return `${n} ${n === 1 ? 'day' : 'days'} in a row`;
  if (m.id === 'goals') return `${n} ${n === 1 ? 'goal' : 'goals'} met`;
  return `${Math.round(n).toLocaleString()} ${m.unit}`;
}

// rows: summaryRow()s. open / onToggle: optional, to share one open note with
// other badges on the page (the offline log's text medals).
export function MedalSummary({ rows, pending = false, open: openProp, onToggle, onOpen, resetKey }) {
  const [own, setOwn] = useState(null);
  useEffect(() => setOwn(null), [resetKey]);
  const open = openProp !== undefined ? openProp : own;
  // onOpen: told which medal's note was opened (the app tour listens).
  const toggle = onToggle || ((id) => { setOwn((o) => (o === id ? null : id)); if (onOpen) onOpen(id); });
  return (
    <View>
      {rows.map((row, i) => (
        <React.Fragment key={row.id}>
          {i > 0 ? <View style={s.divider} /> : null}
          <SummaryRow row={row} pending={pending} selected={open === row.id} onPress={() => toggle(row.id)} />
          {open === row.id ? <RowNote row={row} pending={pending} /> : null}
        </React.Fragment>
      ))}
    </View>
  );
}

function SummaryRow({ row, pending, selected, onPress }) {
  const { before, after, added, unlocked, why } = row;
  const flat = !!why;
  const right = before.maxed
    ? before.progressText
    : unlocked
      ? `${formatAmount(after, after.value)}${unitOf(after)}`
      : `${formatAmount(after, after.value)} / ${formatAmount(before, before.next)}${unitOf(before)}`;
  const sub = why
    || (unlocked
      ? (after.maxed ? 'Every tier earned' : `Next: ${TIER_LABEL[after.nextTier]} at ${formatAmount(after, after.next)}`)
      : before.maxed ? 'Every tier earned'
        : `${after.toGoText} for ${TIER_LABEL[before.nextTier]}`);
  return (
    <Pressable
      onPress={onPress}
      style={[s.row, selected && s.rowOn, flat && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityState={{ expanded: selected }}
      accessibilityLabel={`${before.name}: ${right}${added > 0 ? `, plus ${addedText(before, added)}` : ''}${unlocked ? `, ${pending ? 'unlocks' : 'earned'} ${TIER_LABEL[after.tier]}` : ''}`}
    >
      <Medal medal={before} tier={unlocked ? after.tier : before.tier} size={34} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={s.top}>
          <Text style={s.name} numberOfLines={1}>{before.name}</Text>
          <Text style={s.right} numberOfLines={1}>
            {right}{added > 0 ? <Text style={s.plus}>  {plusText(before, added)}</Text> : null}
          </Text>
        </View>
        <MedalBar now={row.bar.now} add={row.bar.add} tier={before.tier} height={7} />
        <Text style={s.sub} numberOfLines={1}>{sub}</Text>
        {unlocked ? (
          <Text style={s.unlock}>✦ {pending ? `Unlocks ${TIER_LABEL[after.tier]} ${before.name}` : `${TIER_LABEL[after.tier]} earned`}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function RowNote({ row, pending }) {
  const { after, added, why } = row;
  return (
    <View style={s.note}>
      <Text style={s.noteTitle}>{after.name}</Text>
      <Text style={s.noteText}>
        {TRACKS[row.id]}{' '}
        {added > 0 ? <Text style={s.noteGreen}>{pending ? 'This log adds' : 'This session added'} {addedText(after, added)}.</Text> : null}
        {why ? <Text>{why}.</Text> : null}
        {!added && !why ? <Text>{pending ? 'Add minutes or words to see what this log adds.' : 'This session didn’t change it.'}</Text> : null}
        {!after.maxed ? <Text> {after.toGoText} for {TIER_LABEL[after.nextTier]}.</Text> : null}
      </Text>
    </View>
  );
}

// A dark note for medals an offline log can't move (shared look).
export function NoteBox({ title, children }) {
  return (
    <View style={s.note}>
      <Text style={s.noteTitle}>{title}</Text>
      {children}
    </View>
  );
}

export const noteStyles = {
  text: { fontSize: 12.5, lineHeight: 18, color: '#FFFFFF' },
  red: { color: '#FFB4AB', fontWeight: '700' },
  small: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
};

const s = themed(() => ({
  track: { backgroundColor: '#ECEEF3', overflow: 'hidden', marginTop: 5 },
  trackDark: { backgroundColor: 'rgba(255,255,255,0.18)' },
  fill: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 6, marginHorizontal: -6, borderRadius: 10, borderWidth: 1.5, borderColor: 'transparent' },
  divider: { height: 1, backgroundColor: '#EEF0F5' },
  rowOn: { backgroundColor: '#F2F5FD', borderColor: colors.royal },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 },
  name: { fontSize: 13, fontWeight: '800', color: colors.ink, flexShrink: 1 },
  right: { fontSize: 11.5, fontWeight: '700', color: colors.muted, flexShrink: 0 },
  plus: { color: ADDED_BAR, fontWeight: '800' },
  sub: { fontSize: 11, color: colors.muted, marginTop: 3 },
  unlock: {
    alignSelf: 'flex-start', marginTop: 4, backgroundColor: '#FFF4D6', borderWidth: 1, borderColor: '#F0D48A', color: '#7A5208',
    fontSize: 10.5, fontWeight: '800', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden',
  },
  // Pale blue in light mode, deep blue in dark (themed() swaps it).
  note: { backgroundColor: '#EEF2FB', borderRadius: 12, padding: 12, marginTop: 4, marginBottom: 6 },
  noteTitle: { fontSize: 13.5, fontWeight: '800', color: colors.ink, marginBottom: 2 },
  noteText: { fontSize: 12.5, lineHeight: 18, color: colors.body },
  noteGreen: { color: '#1E7B3A', fontWeight: '700' },
}));
