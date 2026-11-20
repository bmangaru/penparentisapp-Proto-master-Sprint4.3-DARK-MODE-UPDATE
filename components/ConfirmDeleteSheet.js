// components/ConfirmDeleteSheet.js — "Are you sure?" before deleting a day or
// removing an offline log, with exactly what goes:
//   • the writing itself (words, time, sessions, feelings, any text)
//   • medals that drop a tier because of it (e.g. "Wordsmith: Gold → Silver",
//     "First Frost (November 2026): Diamond → Silver")
// Nothing is deleted until the red button is tapped. "Keep it" is the big,
// safe choice. For a whole day there's also "Send it to myself first".
//
//   <ConfirmDeleteSheet visible kind="day"|"entry" title impact={deletionImpact(…)}
//     onConfirm onClose onSendFirst />

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Sheet from './Sheet';
import { colors, dk, themed } from '../theme';
import { TIER_LABEL } from '../medals';
import { timeText } from '../writingLogic';

const red = () => dk('#C62828', '#FF8A80');
const tierName = (t) => (t ? TIER_LABEL[t] : 'none');

export default function ConfirmDeleteSheet({ visible, kind = 'day', title, impact, onConfirm, onClose, onSendFirst }) {
  if (!impact) return null;
  const day = kind === 'day';
  const lines = [
    `${impact.words.toLocaleString()} words`,
    timeText(impact.seconds),
    `${impact.count} session${impact.count === 1 ? '' : 's'}`,
  ];
  const footer = (
    <View style={{ gap: 10 }}>
      <Pressable onPress={onClose} style={({ pressed }) => [s.keep, pressed && { opacity: 0.85 }]} accessibilityRole="button">
        <Text style={s.keepText}>Keep it</Text>
      </Pressable>
      <Pressable onPress={onConfirm} style={({ pressed }) => [s.del, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityHint="Deletes for good">
        <Ionicons name={day ? 'trash-outline' : 'close-circle-outline'} size={18} color={red()} />
        <Text style={s.delText}>{day ? 'Delete this day' : 'Remove this entry'}</Text>
      </Pressable>
    </View>
  );
  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle="This can’t be undone." footer={footer}>
      <Text style={s.k}>{day ? 'WHAT GETS DELETED' : 'WHAT GETS REMOVED'}</Text>
      <View style={s.box}>
        <Row icon="create-outline" text={lines.join(' · ')} />
        {impact.texts ? <Row icon="document-text-outline" text={`Your writing from this day (${impact.texts} ${impact.texts === 1 ? 'piece' : 'pieces'}), for good`} /> : null}
        {impact.feelings ? <Row icon="happy-outline" text={`${impact.feelings} feeling${impact.feelings === 1 ? '' : 's'} you picked`} /> : null}
      </View>

      <Text style={s.k}>MEDALS</Text>
      <View style={s.box}>
        {impact.medals.length ? impact.medals.map((m) => (
          <Row key={m.id} icon="ribbon-outline" warn
            text={`${m.name}: ${tierName(m.from)} → ${m.to ? tierName(m.to) : 'not earned'}`} />
        )) : <Row icon="checkmark-circle-outline" text="No medal goes down a tier." />}
      </View>
      {impact.medals.length ? <Text style={s.note}>Earn them again later and they celebrate again.</Text> : null}

      {day && onSendFirst ? (
        <Pressable onPress={onSendFirst} hitSlop={6} style={s.send} accessibilityRole="button">
          <Ionicons name="share-outline" size={16} color={colors.royal} />
          <Text style={s.sendText}>Send this day’s writing to myself first</Text>
        </Pressable>
      ) : null}
    </Sheet>
  );
}

function Row({ icon, text, warn }) {
  return (
    <View style={s.row}>
      <Ionicons name={icon} size={17} color={warn ? red() : colors.muted} />
      <Text style={[s.rowText, warn && { color: dk('#8E1C1C', '#FF9A9A'), fontWeight: '700' }]}>{text}</Text>
    </View>
  );
}

const s = themed(() => ({
  k: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1, color: colors.muted, marginTop: 12, marginBottom: 6 },
  box: { borderRadius: 12, backgroundColor: dk('#F4F5F9', 'rgba(255,255,255,0.06)'), paddingHorizontal: 12, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 },
  rowText: { flex: 1, fontSize: 14, color: colors.ink },
  note: { fontSize: 12.5, color: colors.muted, marginTop: 6 },
  send: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, alignSelf: 'flex-start', minHeight: 36 },
  sendText: { fontSize: 14, fontWeight: '700', color: colors.royal },
  keep: { minHeight: 50, borderRadius: 999, backgroundColor: colors.royal, alignItems: 'center', justifyContent: 'center' },
  keepText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  del: { minHeight: 46, borderRadius: 999, borderWidth: 1.5, borderColor: red(), flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  delText: { color: red(), fontSize: 15, fontWeight: '800' },
}));
