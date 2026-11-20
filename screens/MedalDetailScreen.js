// screens/MedalDetailScreen.js — one medal: big ring, what it counts, the
// progress to the next tier, and all four tiers with the date each was earned.

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/ui';
import Medal, { TIER_STYLE } from '../components/Medal';
import { colors, radius, space, themed } from '../theme';
import { TIER_LABEL, TIERS, formatAmount, tierBarColor } from '../medals';
import { syncMedals } from '../writingStore';
import MedalPopup, { emailPenParentis } from '../components/MedalPopup';

// A tier's celebration item (any earned tier, not only the current one).
const tierItem = (m, t) => ({ ...m, earnedTier: t, earnedTierIndex: TIERS.indexOf(t), threshold: m.tiers[TIERS.indexOf(t)] });

function shortDate(iso) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
}

export default function MedalDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState(null);
  const [again, setAgain] = useState(null); // a tier whose celebration is shown again

  useFocusEffect(
    useCallback(() => {
      syncMedals().then(({ medals, record }) => {
        const m = medals.find((x) => x.id === route.params?.id) || medals[0];
        setData({ m, dates: record?.[m.id]?.dates || [] });
      });
    }, [route.params?.id])
  );

  if (!data) return <Screen />;
  const { m, dates } = data;
  const st = TIER_STYLE[m.tier || 'locked'];
  const amount = (n) => `${formatAmount(m, n)}${m.isTime ? '' : ` ${m.unit}`}`;

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: space.lg }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={s.back}>
          <Text style={s.backText}>‹  Medals</Text>
        </Pressable>
      </View>

      <View style={s.hero}>
        <Medal medal={m} tier={m.tier} size={148} />
        <Text style={[s.tierChip, { color: st.label, backgroundColor: st.chip }]}>
          {m.tier ? TIER_LABEL[m.tier].toUpperCase() : 'NOT EARNED YET'}
        </Text>
        <Text style={s.name}>{m.name}</Text>
        <Text style={s.desc}>{m.desc}</Text>
        {m.tier ? (
          <Pressable style={s.again} onPress={() => setAgain(m.tier)} accessibilityRole="button" accessibilityHint="Shows this medal's celebration again, with Share">
            <Text style={s.againText}>✦  See the celebration again</Text>
          </Pressable>
        ) : null}
        {m.tier === 'diamond' && (
          // Diamond: the same "Email Pen Parentis" as the popup, for "Maybe later".
          <Pressable style={s.email} onPress={() => emailPenParentis(m, 'diamond', m.tiers[3])} accessibilityRole="button">
            <Text style={s.emailText}>✉️  Email Pen Parentis</Text>
          </Pressable>
        )}
      </View>

      <View style={s.pad}>
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>{m.maxed ? 'Every tier earned' : `Next: ${TIER_LABEL[m.nextTier]}`}</Text>
            {!m.maxed && <Text style={s.cardMeta}>{m.toGoText}</Text>}
          </View>
          <View style={s.trackBig}>
            <View style={[s.fillBig, { width: `${Math.max(2, m.pct)}%`, backgroundColor: tierBarColor(m.tier) }]} />
          </View>
          <Text style={s.cardMeta}>{m.maxed ? amount(m.value) : `${amount(m.value)} of ${amount(m.next)}`}</Text>
        </View>

        <Text style={s.h}>Tiers</Text>
        {TIERS.map((t, i) => {
          const earned = i <= m.tierIndex;
          const current = i === m.tierIndex;
          return (
            // An earned tier: tap it to replay that tier's celebration.
            <Pressable
              key={t}
              disabled={!earned}
              onPress={() => setAgain(t)}
              style={({ pressed }) => [s.tierRow, current && s.tierRowCurrent, !earned && s.tierRowLocked, pressed && { opacity: 0.8 }]}
              accessibilityRole={earned ? 'button' : undefined}
              accessibilityHint={earned ? `Replays the ${TIER_LABEL[t]} celebration` : undefined}
            >
              <Medal medal={m} tier={earned ? t : null} size={38} />
              <View style={{ flex: 1 }}>
                <Text style={s.tierTitle}>{TIER_LABEL[t]} · {amount(m.tiers[i])}</Text>
                <Text style={s.tierSub}>
                  {earned
                    ? `Earned ${shortDate(dates[i]) || 'before medals were added'}${current ? ' · current tier' : ''}`
                    : i === m.tierIndex + 1 ? `Not yet — ${m.pct}% there` : 'Not yet'}
                </Text>
              </View>
              {earned ? <Text style={s.replayTag}>↻ Replay</Text> : null}
              <Ionicons
                name={earned ? 'checkmark' : 'lock-closed-outline'}
                size={earned ? 22 : 18}
                color={earned ? colors.royal : colors.muted}
                accessibilityLabel={earned ? 'Earned' : 'Locked'}
              />
            </Pressable>
          );
        })}
      </View>
      {again ? <MedalPopup medals={[tierItem(m, again)]} replay onClose={() => setAgain(null)} /> : null}
    </Screen>
  );
}

const s = themed(() => ({
  replayTag: { fontSize: 12, fontWeight: '800', color: colors.royal, marginRight: 6 },
  again: { marginTop: 10, minHeight: 40, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5, borderColor: colors.royal, justifyContent: 'center' },
  againText: { color: colors.royal, fontSize: 14, fontWeight: '800' },
  back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  backText: { color: colors.royal, fontSize: 14, fontWeight: '700' },
  email: { backgroundColor: '#4B3FB8', borderRadius: radius.md, minHeight: 46, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  emailText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  hero: { alignItems: 'center', gap: 10, paddingHorizontal: space.lg, paddingVertical: space.md },
  tierChip: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 12, overflow: 'hidden', marginTop: 4 },
  name: { fontSize: 26, fontWeight: '700', color: colors.ink },
  desc: { fontSize: 13.5, lineHeight: 20, color: colors.body, textAlign: 'center' },
  pad: { paddingHorizontal: space.lg },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 8 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cardTitle: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
  cardMeta: { fontSize: 12.5, color: '#4F5878' },
  trackBig: { height: 10, borderRadius: radius.pill, backgroundColor: '#E8EBF2', overflow: 'hidden' },
  fillBig: { height: '100%', borderRadius: radius.pill },
  h: { fontSize: 15, fontWeight: '700', color: colors.ink, marginTop: space.lg, marginBottom: space.sm },
  tierRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10,
  },
  tierRowCurrent: { borderWidth: 2, borderColor: colors.karma },
  tierRowLocked: { backgroundColor: '#F6F7FA', borderStyle: 'dashed', borderColor: 'rgba(10,22,51,0.22)' },
  tierTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  tierSub: { fontSize: 12, color: '#4F5878', marginTop: 2 },
}));
