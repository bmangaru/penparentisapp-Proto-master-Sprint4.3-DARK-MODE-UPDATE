// components/MedalPopup.js — the moment you earn a medal.
// Shown after "Finish & check in" when the session earned one or more medals,
// before the usual check-in sheet. Each medal pops up the first time it's
// earned (syncMedals only reports new ones), Diamond first, "1 of 2 · Next".
//   • Bronze / Silver / Gold: the medal, big, with a sparkle; See my medals ·
//     Keep going.
//   • Diamond: a violet glow and "Email Pen Parentis", which opens a
//     ready-to-send email to info@penparentis.org (nothing is sent until you
//     tap Send). The same button stays on that medal's page in Medals.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated, Easing, Linking, Alert } from 'react-native';
import Medal from './Medal';
import { colors, radius, themed } from '../theme';
import { TIERS, TIER_LABEL, formatAmount } from '../medals';

export const PEN_PARENTIS_EMAIL = 'info@penparentis.org';
const VIOLET = '#4B3FB8';

// "50,000 words written" / "200 hr written".
export function medalAmountText(medal, n) {
  const amount = formatAmount(medal, n);
  if (medal.isTime) return `${amount} of writing`;
  return `${amount} ${medal.unit}`;
}

// Opens the phone's Mail app with a note to Pen Parentis, ready to edit and send.
export function emailPenParentis(medal, tier = 'diamond', n) {
  const name = `${TIER_LABEL[tier]} ${medal.name}`;
  const subject = `I reached ${name}!`;
  const body = `Hi Pen Parentis,\n\nI just earned the ${name} medal in the Pen Parentis app: ${medalAmountText(medal, n ?? medal.tiers?.[TIERS.indexOf(tier)])}!\n\n`;
  const url = `mailto:${PEN_PARENTIS_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  Linking.openURL(url).catch(() => {
    Alert.alert('No email app found', `You can write to Pen Parentis at ${PEN_PARENTIS_EMAIL}.`);
  });
}

// Diamond first, then the rest in the order they were earned.
function ordered(list) {
  return [...list].sort((a, b) => (b.earnedTierIndex === 3) - (a.earnedTierIndex === 3));
}

export default function MedalPopup({ medals, onClose, onSeeMedals }) {
  const list = ordered(medals || []);
  const [i, setI] = useState(0);
  const pop = useRef(new Animated.Value(0)).current;
  const visible = list.length > 0;
  const m = list[Math.min(i, list.length - 1)];

  useEffect(() => { setI(0); }, [medals]);
  useEffect(() => {
    if (!visible) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
  }, [visible, i]);

  if (!visible || !m) return null;
  const diamond = m.earnedTier === 'diamond';
  const last = i >= list.length - 1;
  const next = () => (last ? onClose() : setI(i + 1));

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={s.dim}>
        <Animated.View style={[s.card, diamond && s.cardDiamond, {
          opacity: pop,
          transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
        }]}
        >
          <Text style={[s.kicker, diamond && { color: VIOLET }]}>{diamond ? '💎 DIAMOND MEDAL' : '✦ NEW MEDAL'}</Text>

          <View style={s.medalWrap}>
            <View style={[s.glow, diamond ? s.glowDiamond : s.glowGold]} />
            <Medal medal={m} tier={m.earnedTier} size={120} />
            <Sparkle style={{ top: 0, left: 18 }} color={diamond ? '#9D8CFF' : colors.karma} delay={0} />
            <Sparkle style={{ top: 26, right: 12 }} color={diamond ? '#9D8CFF' : colors.karma} delay={250} small />
            <Sparkle style={{ bottom: 6, left: 6 }} color={diamond ? '#9D8CFF' : colors.karma} delay={500} small />
          </View>

          <Text style={s.title}>{TIER_LABEL[m.earnedTier]} {m.name}</Text>
          <Text style={s.amount}>{medalAmountText(m, m.threshold)}</Text>
          <Text style={s.msg}>
            {diamond
              ? "You've reached the very top. Pen Parentis would love to hear about it. Send them a quick note!"
              : "That's a lot of writing squeezed in around family life. Well done."}
          </Text>

          {diamond ? (
            <>
              <Pressable style={[s.btn, { backgroundColor: VIOLET }]} onPress={() => emailPenParentis(m, m.earnedTier, m.threshold)} accessibilityRole="button">
                <Text style={s.btnText}>✉️  Email Pen Parentis</Text>
              </Pressable>
              <Pressable style={[s.btn, s.btnOut, { borderColor: VIOLET }]} onPress={onSeeMedals} accessibilityRole="button">
                <Text style={[s.btnText, { color: VIOLET }]}>See my medals</Text>
              </Pressable>
              <Pressable style={s.ghost} onPress={next} accessibilityRole="button">
                <Text style={s.ghostText}>{last ? 'Maybe later' : `Next  ·  ${i + 1} of ${list.length}`}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={s.btn} onPress={onSeeMedals} accessibilityRole="button">
                <Text style={s.btnText}>See my medals</Text>
              </Pressable>
              <Pressable style={s.ghost} onPress={next} accessibilityRole="button">
                <Text style={s.ghostText}>{last ? 'Keep going' : `Next  ·  ${i + 1} of ${list.length}`}</Text>
              </Pressable>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// A small twinkling star around the medal.
function Sparkle({ style, color, delay, small }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0.25, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.Text
      style={[s.sparkle, style, { color, fontSize: small ? 12 : 17, opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.1] }) }] }]}
    >
      ✦
    </Animated.Text>
  );
}

const s = themed(() => ({
  dim: { flex: 1, backgroundColor: 'rgba(10,22,51,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 380, backgroundColor: '#FFFFFF', borderRadius: 24, paddingTop: 24, paddingHorizontal: 20, paddingBottom: 14,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12,
  },
  cardDiamond: { backgroundColor: '#F7F5FF' },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: '#8A5E12' },
  medalWrap: { width: 170, height: 160, alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
  glow: { position: 'absolute', width: 140, height: 140, borderRadius: 70 },
  glowGold: { backgroundColor: 'rgba(224,174,69,0.18)' },
  glowDiamond: { backgroundColor: 'rgba(107,91,214,0.20)' },
  sparkle: { position: 'absolute' },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  amount: { fontSize: 13, color: colors.muted, marginTop: 2 },
  msg: { fontSize: 13.5, lineHeight: 20, color: colors.body, textAlign: 'center', marginTop: 8, marginBottom: 6 },
  btn: { alignSelf: 'stretch', backgroundColor: colors.royal, borderRadius: radius.md, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnOut: { backgroundColor: '#FFFFFF', borderWidth: 1.5 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14.5 },
  ghost: { minHeight: 44, justifyContent: 'center', marginTop: 4 },
  ghostText: { color: colors.muted, fontWeight: '700', fontSize: 13.5 },
}));
