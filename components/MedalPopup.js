// components/MedalPopup.js — the new-medal celebration: a page of its own,
// like the end of the tour. It plays after the writing summary (and after
// logging offline writing, and over the tour when a chapter earns one).
//
//   <MedalPopup medals={items} onClose onSeeMedals replay />
//     items: diffMedals' newlyEarned and/or monthTiersCrossed, any order —
//     celebrationOrder plays this month's medal first, then each medal's
//     tiers smallest first (a 5,000-word log: Bronze, Silver, then Gold).
//     One page per tier; nothing moves on until you tap.
//
// The celebration grows with the tier, in the medal's own colours:
//   Bronze  — a gentle pop and a soft glow. No confetti.
//   Silver  — pop, a shine across the medal, a light sprinkle.
//   Gold    — a bigger bounce, turning rays, a confetti burst.
//   Diamond — confetti that keeps falling, rays, a pulsing glow, a repeating
//             shine, and "Email Pen Parentis" (a ready-to-send email to
//             info@penparentis.org; nothing is sent until you tap Send).
// Light and dark mode; "Reduce motion" turns the movement off.
// replay: shown again from a medal's page in Medals (no "See my medals";
// every tier gets Share, to send it to someone later).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, Animated, Easing, Linking, Alert, Share, Dimensions, AccessibilityInfo } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Medal from './Medal';
import { colors, dk, themed } from '../theme';
import { TIERS, TIER_LABEL, formatAmount } from '../medals';
import { celebrationOrder } from '../monthMedals';

export const PEN_PARENTIS_EMAIL = 'info@penparentis.org';

// The item for a medal's current tier, to celebrate it again (replay).
export function replayItem(p) {
  return p && p.tier ? { ...p, earnedTier: p.tier, earnedTierIndex: p.tierIndex, threshold: p.tiers[p.tierIndex] } : null;
}


// "50,000 words written" / "200 hr written".
export function medalAmountText(medal, n) {
  const amount = formatAmount(medal, n);
  if (medal.isTime) return `${amount} of writing`;
  return `${amount} ${medal.unit}`;
}

function medalTitle(m, tier) {
  return m.monthly ? `${TIER_LABEL[tier]} · ${m.name}` : `${TIER_LABEL[tier]} ${m.name}`;
}

// Opens the phone's Mail app with a note to Pen Parentis, ready to edit and send.
export function emailPenParentis(medal, tier = 'diamond', n) {
  const name = medal.monthly ? `${TIER_LABEL[tier]} ${medal.when} (${medal.name})` : `${TIER_LABEL[tier]} ${medal.name}`;
  const subject = `I reached ${name}!`;
  const body = `Hi Pen Parentis,\n\nI just earned the ${name} medal in the Pen Parentis app: ${medalAmountText(medal, n ?? medal.tiers?.[TIERS.indexOf(tier)])}!\n\n`;
  const url = `mailto:${PEN_PARENTIS_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  Linking.openURL(url).catch(() => {
    Alert.alert('No email app found', `You can write to Pen Parentis at ${PEN_PARENTIS_EMAIL}.`);
  });
}

function shareMedal(m, tier, n) {
  const what = m.monthly ? `the ${TIER_LABEL[tier]} medal for ${m.when}, “${m.name}”` : `the ${TIER_LABEL[tier]} ${m.name} medal`;
  Share.share({ message: `I just earned ${what} in the Pen Parentis app: ${medalAmountText(m, n)}! ✍️` }).catch(() => {});
}

// What each tier says, and how big the party is.
const TIER_FX = {
  bronze: { kicker: 'NEW MEDAL', confetti: 0, rays: false, shine: false, colors: ['#EDBB8A', '#C9884F', '#F6E3D0'],
    msg: (m) => (m.monthly ? 'Your first medal this month. A good start!' : 'A good start. Every word counts.') },
  silver: { kicker: 'NEW MEDAL', confetti: 26, rays: false, shine: true, colors: ['#FFFFFF', '#D9DEE7', '#A3ACBD', '#8E98AB'],
    msg: () => 'That’s real writing, squeezed in around family life.' },
  gold: { kicker: 'GOLD!', confetti: 70, rays: true, shine: true, colors: ['#F6DD93', '#F2C14E', '#C8912B', '#FFF3C4'],
    msg: () => 'Gold. That takes showing up again and again.' },
  diamond: { kicker: '✦  DIAMOND  ✦', confetti: 90, rain: true, rays: true, shine: true, colors: ['#B89CFF', '#8FE3FF', '#F2C14E', '#E6FBFF', '#7C9BFF'],
    msg: () => 'The very top. Pen Parentis would love to hear about your accomplishment!' },
};
const GLOW = { bronze: 'rgba(237,187,138,0.45)', silver: 'rgba(217,222,231,0.6)', gold: 'rgba(242,193,78,0.5)', diamond: 'rgba(184,156,255,0.6)' };
const RAY = { gold: 'rgba(242,193,78,0.28)', diamond: 'rgba(184,156,255,0.3)' };

export default function MedalPopup({ medals, onClose, onSeeMedals, replay = false }) {
  const list = useMemo(() => celebrationOrder(medals || []), [medals]);
  const [i, setI] = useState(0);
  const [calm, setCalm] = useState(false);
  const [again, setAgain] = useState(0); // ↻ Replay: play this page from the start
  const insets = useSafeAreaInsets();
  useEffect(() => { setI(0); }, [medals]);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled?.().then((v) => setCalm(!!v)).catch(() => {}); }, []);

  const m = list[Math.min(i, list.length - 1)];
  if (!list.length || !m) return null;
  const tier = m.earnedTier;
  const fx = TIER_FX[tier] || TIER_FX.bronze;
  const last = i >= list.length - 1;
  const next = () => (last ? onClose() : setI(i + 1));
  const diamond = tier === 'diamond';

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <LinearGradient colors={dk(['#FFFFFF', '#EEF2FF'], ['#1B3FA0', '#0C2265'])} style={{ flex: 1 }}>
        <Page key={`${m.id}-${tier}-${i}-${again}`} m={m} tier={tier} fx={fx} calm={calm} insets={insets} onReplay={() => setAgain((n) => n + 1)}
          counter={list.length > 1 ? `${i + 1} of ${list.length}` : null}>
          {diamond ? (
            <>
              <Pressable onPress={() => emailPenParentis(m, tier, m.threshold)} style={({ pressed }) => [s.btn, s.btnDiamond, pressed && s.pressed]} accessibilityRole="button">
                <Text style={[s.btnText, { color: '#1A1240' }]}>✉️  Email Pen Parentis</Text>
              </Pressable>
              <Pressable onPress={() => shareMedal(m, tier, m.threshold)} style={({ pressed }) => [s.btn, s.btnOut, pressed && s.pressed]} accessibilityRole="button">
                <Text style={[s.btnText, s.btnOutText]}>Share</Text>
              </Pressable>
            </>
          ) : replay ? (
            <Pressable onPress={() => shareMedal(m, tier, m.threshold)} style={({ pressed }) => [s.btn, s.btnOut, pressed && s.pressed]} accessibilityRole="button">
              <Text style={[s.btnText, s.btnOutText]}>Share</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={next} style={({ pressed }) => [s.btn, diamond ? s.btnOut : s.btnMain, pressed && s.pressed]} accessibilityRole="button">
            <Text style={[s.btnText, diamond ? s.btnOutText : s.btnMainText]}>{last ? (replay ? 'Close' : 'Done') : 'Next medal  ›'}</Text>
          </Pressable>
          {/* Only on the last page: leaving early would skip the rest. */}
          {!replay && onSeeMedals && last ? (
            <Pressable onPress={onSeeMedals} hitSlop={8} style={s.link} accessibilityRole="button">
              <Text style={s.linkText}>See my medals</Text>
            </Pressable>
          ) : null}
        </Page>
      </LinearGradient>
    </Modal>
  );
}

// One medal's page. Remounts per medal, so each one plays from the start.
function Page({ m, tier, fx, calm, insets, counter, onReplay, children }) {
  const pop = useRef(new Animated.Value(calm ? 1 : 0)).current;
  const glow = useRef(new Animated.Value(calm ? 1 : 0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;
  const big = tier === 'gold' || tier === 'diamond';
  const SIZE = 156;

  useEffect(() => {
    if (calm) return undefined;
    const anims = [
      Animated.spring(pop, { toValue: 1, friction: big ? 4 : 6, tension: big ? 70 : 110, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 1, duration: 700, delay: 150, useNativeDriver: true }),
    ];
    Animated.parallel(anims).start();
    const loops = [];
    if (fx.rays) {
      const l = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 18000, easing: Easing.linear, useNativeDriver: true }));
      l.start(); loops.push(l);
    }
    if (fx.shine) {
      const sweep = Animated.timing(shine, { toValue: 1, duration: 1100, delay: 700, easing: Easing.out(Easing.quad), useNativeDriver: true });
      const l = tier === 'diamond'
        ? Animated.loop(Animated.sequence([sweep, Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }), Animated.delay(1200)]))
        : sweep;
      l.start(); loops.push(l);
    }
    if (tier === 'diamond') {
      const l = Animated.loop(Animated.sequence([
        Animated.timing(glow, { toValue: 1.35, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]));
      setTimeout(() => l.start(), 900); loops.push(l);
    }
    return () => loops.forEach((l) => l.stop && l.stop());
  }, []);

  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const rotate = big ? pop.interpolate({ inputRange: [0, 1], outputRange: ['-18deg', '0deg'] }) : '0deg';

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16, paddingHorizontal: 24 }}>
      {fx.confetti && !calm ? <Confetti colors={fx.colors} count={fx.confetti} rain={fx.rain} /> : null}
      <View style={s.topRow}>
        <Pressable onPress={onReplay} hitSlop={10} style={s.replay} accessibilityRole="button" accessibilityLabel="Replay the animation">
          <Text style={s.replayText}>↻  Replay</Text>
        </Pressable>
        <Text style={s.counter}>{counter || ''}</Text>
      </View>

      <View style={s.center}>
        <Text style={[s.kicker, tier === 'diamond' && { color: dk('#5B44C2', '#CFC2FF') }]}>{fx.kicker}</Text>
        <View style={{ width: 300, height: 260, alignItems: 'center', justifyContent: 'center' }}>
          {fx.rays ? (
            <Animated.View style={{ position: 'absolute', opacity: glow.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 1] }), transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
              <Rays color={RAY[tier]} />
            </Animated.View>
          ) : null}
          <Animated.View style={{ position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: GLOW[tier], opacity: glow.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 0.9, 0.9] }), transform: [{ scale: glow }] }} />
          <Animated.View style={{ transform: [{ scale }, { rotate }] }}>
            <Medal medal={m} tier={tier} size={SIZE} />
            {fx.shine ? (
              <View pointerEvents="none" style={{ position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden' }}>
                <Animated.View style={{ position: 'absolute', top: -20, width: 34, height: SIZE + 40, backgroundColor: 'rgba(255,255,255,0.55)', transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-60, SIZE + 30] }) }, { rotate: '20deg' }] }} />
              </View>
            ) : null}
          </Animated.View>
        </View>
        <Text style={[s.tier, { color: dk(TIER_INK[tier], TIER_ON_DARK[tier]) }]}>{TIER_LABEL[tier].toUpperCase()}</Text>
        <Text style={s.title}>{medalTitle(m, tier)}</Text>
        {m.monthly ? <Text style={s.when}>{m.when}’s medal</Text> : null}
        <Text style={s.amount}>{medalAmountText(m, m.threshold)}</Text>
        <Text style={s.msg}>{fx.msg(m)}</Text>
      </View>

      <View style={s.btns}>{children}</View>
    </View>
  );
}

const TIER_INK = { bronze: '#8A4F1E', silver: '#4A5366', gold: '#8A5E12', diamond: '#5B44C2' };
const TIER_ON_DARK = { bronze: '#EDBB8A', silver: '#E6E9F0', gold: '#F6DD93', diamond: '#CFC2FF' };

// Soft rays behind the medal (Gold and Diamond).
function Rays({ color, size = 420, n = 14 }) {
  const c = size / 2;
  const paths = [];
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2;
    const a1 = a0 + Math.PI / n / 1.6;
    paths.push(`M${c},${c} L${c + c * Math.cos(a0)},${c + c * Math.sin(a0)} L${c + c * Math.cos(a1)},${c + c * Math.sin(a1)} Z`);
  }
  return (
    <Svg width={size} height={size}>
      {paths.map((d, k) => <Path key={k} d={d} fill={color} />)}
    </Svg>
  );
}

// Confetti in the medal's colours: a burst from the medal, and for Diamond a
// steady fall from the top that keeps going.
function Confetti({ colors: palette, count, rain }) {
  const { width: W, height: H } = Dimensions.get('window');
  const burst = useMemo(() => Array.from({ length: count }, (_, k) => {
    const a = Math.random() * Math.PI * 2;
    const sp = 90 + Math.random() * 190;
    return {
      v: new Animated.Value(0), color: palette[k % palette.length],
      dx: Math.cos(a) * sp, up: Math.min(-40, Math.sin(a) * sp - 90), fall: H * 0.45 + Math.random() * H * 0.3,
      w: 6 + Math.random() * 5, h: 9 + Math.random() * 7, spin: (Math.random() - 0.5) * 900, dur: 1700 + Math.random() * 1100,
    };
  }), []);
  const drops = useMemo(() => (rain ? Array.from({ length: 34 }, (_, k) => ({
    v: new Animated.Value(0), color: palette[k % palette.length], x: Math.random() * W,
    drift: (Math.random() - 0.5) * 60, w: 6 + Math.random() * 4, h: 9 + Math.random() * 6,
    spin: (Math.random() - 0.5) * 720, dur: 3200 + Math.random() * 2600, delay: Math.random() * 3000,
  })) : []), []);

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel(burst.map((p) => Animated.timing(p.v, { toValue: 1, duration: p.dur, easing: Easing.out(Easing.quad), useNativeDriver: true }))).start();
    }, 280);
    const loops = drops.map((p) => Animated.loop(Animated.sequence([
      Animated.delay(p.delay),
      Animated.timing(p.v, { toValue: 1, duration: p.dur, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(p.v, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])));
    loops.forEach((l) => l.start());
    return () => { clearTimeout(t); loops.forEach((l) => l.stop()); };
  }, []);

  const ox = W / 2;
  const oy = H * 0.36;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: W, height: H }}>
      {burst.map((p, k) => (
        <Animated.View key={`b${k}`} style={{
          position: 'absolute', left: ox, top: oy, width: p.w, height: p.h, borderRadius: 2, backgroundColor: p.color,
          opacity: p.v.interpolate({ inputRange: [0, 0.05, 0.8, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
            { translateY: p.v.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, p.up, p.fall] }) },
            { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
          ],
        }} />
      ))}
      {drops.map((p, k) => (
        <Animated.View key={`r${k}`} style={{
          position: 'absolute', left: p.x, top: -20, width: p.w, height: p.h, borderRadius: 2, backgroundColor: p.color,
          transform: [
            { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, H + 40] }) },
            { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
            { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
          ],
        }} />
      ))}
    </View>
  );
}

const s = themed(() => ({
  topRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  replay: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, backgroundColor: dk('rgba(27,63,160,0.08)', 'rgba(255,255,255,0.12)') },
  replayText: { fontSize: 13, fontWeight: '800', color: dk('#1B3FA0', '#E6ECFF') },
  counter: { fontSize: 13, fontWeight: '800', color: dk('#5A6484', 'rgba(255,255,255,0.75)') },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 13, fontWeight: '800', letterSpacing: 1.6, color: dk('#8A5E12', '#F2C14E') },
  tier: { marginTop: 4, fontSize: 13, fontWeight: '800', letterSpacing: 1.4 },
  title: { marginTop: 4, fontSize: 26, fontWeight: '800', textAlign: 'center', color: dk('#141B3A', '#FFFFFF') },
  when: { marginTop: 2, fontSize: 14, fontWeight: '600', color: dk('#5A6484', 'rgba(255,255,255,0.8)') },
  amount: { marginTop: 8, fontSize: 15, fontWeight: '700', color: dk('#1B3FA0', '#BFD0FF') },
  msg: { marginTop: 8, fontSize: 15, lineHeight: 21, textAlign: 'center', maxWidth: 320, color: dk('#3A4466', 'rgba(255,255,255,0.88)') },
  btns: { gap: 10 },
  btn: { minHeight: 50, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  // (not plain #FFFFFF: dark mode would turn that into the dark card colour)
  btnMain: { backgroundColor: dk('#1B3FA0', '#F4F6FF') },
  btnMainText: { color: dk('#FFFFFF', '#1B3FA0') },
  btnDiamond: { backgroundColor: '#CFC2FF' },
  btnOut: { borderWidth: 1.5, borderColor: dk('rgba(27,63,160,0.35)', 'rgba(255,255,255,0.45)') },
  btnOutText: { color: dk('#1B3FA0', '#FFFFFF') },
  btnText: { fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.85 },
  link: { alignSelf: 'center', paddingVertical: 6 },
  linkText: { fontSize: 14, fontWeight: '700', color: dk('#1B3FA0', '#BFD0FF') },
}));
