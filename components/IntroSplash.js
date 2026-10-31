// components/IntroSplash.js — the short opening when the app starts (~2 s).
//   0.0s  the Pen Parentis logo fades in and settles with a slight bounce
//   0.55s a black pen writes "parenting done, write" in black ink, left to right
//         (the words are revealed just behind the pen's point; it wobbles a
//         little like a hand)
//   1.45s the full stop lands; the pen fades away
//   1.85s everything lifts away to Home
// Tap anywhere to skip. With Reduce Motion on, the logo just fades in and out.
// Shown once per app launch (App.js mounts it on start only).
// Dark mode: navy page, white handwriting and full stop, a light silver pen,
// and a soft glowing edge on the logo tile.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, AccessibilityInfo, Platform, Image } from 'react-native';
import Svg, { G, Rect, Polygon } from 'react-native-svg';
import { useFonts, Caveat_600SemiBold } from '@expo-google-fonts/caveat';
import { colors, themed, dk, isDark } from '../theme';

const TAGLINE = 'parenting done, write';
// Ink colour: black on the light page, white on the dark one.
const ink = () => (isDark() ? '#F4F6FB' : '#16171C');
export const PEN = 56;          // pen drawing size
export const TIP = { x: 11, y: 45 }; // where the point is inside the drawing (after the 45° tilt)
// Handwriting letters (the final "e") curl a little past the width the phone
// reports for the text, so the reveal runs this much further to show it all.
const OVERHANG = 16;
const DOT_GAP = 8;   // space between the end of "write" and the full stop

export default function IntroSplash({ onDone }) {
  const [fontsLoaded, fontError] = useFonts({ Caveat_600SemiBold });
  const fontReady = fontsLoaded || !!fontError;
  const [textW, setTextW] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(null);

  const logo = useRef(new Animated.Value(0)).current;   // 0 → 1 pop in
  const write = useRef(new Animated.Value(0)).current;  // 0 → 1 across the words
  const wobble = useRef(new Animated.Value(0)).current; // pen bob while writing
  const penOn = useRef(new Animated.Value(0)).current;  // pen visible
  const dot = useRef(new Animated.Value(0)).current;    // the full stop
  const out = useRef(new Animated.Value(0)).current;    // 0 → 1 lift away
  const finished = useRef(false);
  const running = useRef(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => setReduceMotion(false));
  }, []);

  function finish(fast) {
    if (finished.current) return;
    finished.current = true;
    running.current?.stop();
    Animated.timing(out, { toValue: 1, duration: fast ? 200 : 450, easing: Easing.in(Easing.quad), useNativeDriver: true })
      .start(() => onDone && onDone());
  }

  // Start once we know the motion setting, the font, and the line's width.
  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion) {
      running.current = Animated.sequence([
        Animated.timing(logo, { toValue: 1, duration: 500, useNativeDriver: false }),
        Animated.delay(700),
      ]);
      write.setValue(1); dot.setValue(1);
      running.current.start(({ finished: f }) => f && finish());
      return;
    }
    if (!fontReady || !textW) return;
    const bob = Animated.loop(Animated.sequence([
      Animated.timing(wobble, { toValue: 1, duration: 110, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.timing(wobble, { toValue: 0, duration: 110, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ]));
    running.current = Animated.sequence([
      Animated.timing(logo, { toValue: 1, duration: 550, easing: Easing.out(Easing.back(1.6)), useNativeDriver: false }),
      Animated.parallel([
        Animated.timing(penOn, { toValue: 1, duration: 180, useNativeDriver: false }),
        Animated.timing(write, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: false }),
      ]),
      Animated.parallel([
        Animated.spring(dot, { toValue: 1, friction: 4, tension: 160, useNativeDriver: false }),
        Animated.timing(penOn, { toValue: 0, duration: 250, delay: 50, useNativeDriver: false }),
      ]),
      Animated.delay(250),
    ]);
    // The bob runs only while writing.
    const t1 = setTimeout(() => bob.start(), 550);
    const t2 = setTimeout(() => { bob.stop(); wobble.setValue(0); }, 1450);
    running.current.start(({ finished: f }) => f && finish());
    return () => { clearTimeout(t1); clearTimeout(t2); bob.stop(); };
  }, [reduceMotion, fontReady, textW]);

  const font = fontsLoaded ? { fontFamily: 'Caveat_600SemiBold' } : { fontStyle: 'italic', fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }) };
  const revealW = write.interpolate({ inputRange: [0, 1], outputRange: [0, textW + OVERHANG] });
  const penX = write.interpolate({ inputRange: [0, 1], outputRange: [-TIP.x, textW - TIP.x] });
  const penY = wobble.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  const penTurn = wobble.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-4deg'] });

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, s.wrap, {
        opacity: out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        transform: [{ translateY: out.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }],
      }]}
      pointerEvents="box-none"
    >
      <Pressable style={s.center} onPress={() => finish(true)} accessibilityRole="button" accessibilityLabel="Pen Parentis. Tap to skip">
        <Animated.View
          style={{
            opacity: logo.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [
              { scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
              { translateY: logo.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
            ],
          }}
        >
          {isDark() ? <View pointerEvents="none" style={s.logoGlow} /> : null}
          <Image
            source={require('../assets/pen-parentis-logo.png')}
            resizeMode="contain"
            style={s.logo}
            accessibilityIgnoresInvertColors
          />
        </Animated.View>

        <View style={s.line}>
          {/* Measures the tagline's full width (never shown). */}
          <Text style={[s.tag, font, s.measure]} numberOfLines={1} onLayout={(e) => setTextW(Math.ceil(e.nativeEvent.layout.width))}>{TAGLINE}</Text>

          <View style={{ width: textW + OVERHANG + DOT_GAP + 8, height: 46 }}>
            <Animated.View style={{ width: revealW, height: 46, overflow: 'hidden' }}>
              {/* Room on the right so nothing is clipped, even at the end. */}
              <Text style={[s.tag, font, { paddingRight: OVERHANG }]} numberOfLines={1}>{TAGLINE}</Text>
            </Animated.View>
            <Animated.View style={[s.dot, { left: textW + DOT_GAP, transform: [{ scale: dot }] }]} />
            <Animated.View
              pointerEvents="none"
              style={[s.pen, { opacity: penOn, transform: [{ translateX: penX }, { translateY: penY }, { rotate: penTurn }] }]}
            >
              <BlackPen />
            </Animated.View>
          </View>
        </View>
      </Pressable>
      <Text style={s.skip}>tap to skip</Text>
    </Animated.View>
  );
}

// A black ballpoint: black barrel, silver clip and bands, silver point.
// The pen: black barrel with silver bands on the light page; in dark mode a
// light silver barrel with grey bands, so it shows on the navy.
export function BlackPen() {
  const d = isDark();
  const barrel = d ? '#E9ECF3' : '#1D1E23';
  const band = d ? '#8E97AE' : '#C9CDD6';
  const shine = d ? '#FFFFFF' : '#3A3C44';
  const grip = d ? '#C9CEDB' : '#2A2B31';
  const point = d ? '#8E97AE' : '#B8BCC6';
  return (
    <Svg width={PEN} height={PEN} viewBox="0 0 56 56">
      <G rotation={45} origin="28, 28">
        <Rect x={23} y={1} width={10} height={7} rx={3} fill={barrel} />
        <Rect x={31.5} y={3} width={2.2} height={15} rx={1.1} fill={band} />
        <Rect x={22.5} y={8} width={11} height={2.5} fill={band} />
        <Rect x={22.5} y={10.5} width={11} height={25} rx={1.5} fill={barrel} />
        <Rect x={25} y={10.5} width={2} height={25} fill={shine} />
        <Rect x={22.5} y={35.5} width={11} height={2.5} fill={band} />
        <Polygon points="23.5,38 32.5,38 29.5,48 26.5,48" fill={grip} />
        <Polygon points="26.5,48 29.5,48 28,52" fill={point} />
      </G>
    </Svg>
  );
}

const s = themed(() => ({
  // The light page, or the app's navy in dark mode.
  wrap: { backgroundColor: dk('#FFFDF8', '#0D1324'), zIndex: 100, elevation: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: {
    width: 170, height: 147, borderRadius: 14,
  },
  // Dark mode: a thin soft edge and glow so the blue tile doesn't melt into the page.
  logoGlow: { position: 'absolute', width: 170, height: 147, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: '#2E4590', shadowColor: '#5A78DC', shadowOpacity: 0.55, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  line: { marginTop: 34, alignItems: 'center' },
  tag: { fontSize: 32, color: ink() },
  measure: { position: 'absolute', opacity: 0, left: -9999 },
  dot: { position: 'absolute', top: 29, width: 7, height: 7, borderRadius: 3.5, backgroundColor: ink() },
  pen: { position: 'absolute', left: 0, top: 30 - TIP.y + 4, width: PEN, height: PEN },
  skip: { position: 'absolute', bottom: 40, alignSelf: 'center', fontSize: 11, color: dk('#A0A7BC', '#6F7B9C') },
}));
