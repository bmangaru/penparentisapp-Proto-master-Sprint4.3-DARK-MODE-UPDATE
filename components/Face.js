// components/Face.js — one feeling face, drawn with react-native-svg.
//
//   <Face id="happy" size={44} />              still
//   <Face id="happy" size={44} animate />      plays its little move now and then
//   <Face id="happy" animate offset={3} />     staggered, so a row doesn't move at once
//   <Face id="happy" animate playKey={n} />    plays straight away when playKey changes (a tap)
//
// Each feeling has one small move (feelings.js): Happy bobs, Confused tilts
// and a "?" pops up, Hurt sheds one tear… It plays once, then rests a few
// seconds, so a screen of faces never feels busy. Phones set to Reduce Motion
// get still faces. Everything runs on the native driver.

import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { feelingById } from '../feelings';

const INK = '#0A1633';
const TINT = '#5FA0D0';
const MOVE_MS = 1100;  // the move itself
const REST_MS = 3200;  // the pause after it

// Reduce Motion, checked once and kept up to date.
let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { reduceMotion = !!v; }).catch(() => {});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => { reduceMotion = !!v; });

export default function Face({ id, size = 44, animate = false, offset = 0, playKey }) {
  const f = feelingById(id);
  const t = useRef(new Animated.Value(0)).current; // 0 → 1 over one move
  const [still] = useState(() => reduceMotion);
  const live = animate && !still && !!f;

  useEffect(() => {
    if (!live) return undefined;
    const once = Animated.timing(t, { toValue: 1, duration: MOVE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
      once,
      Animated.delay(REST_MS),
    ]));
    const start = setTimeout(() => loop.start(), (offset * 370) % 3400);
    return () => { clearTimeout(start); loop.stop(); };
  }, [live, offset]);

  // A tap: play it now.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!live) return;
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: MOVE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [playKey]);

  if (!f) return null;
  const u = size / 48; // one grid unit, in points
  const stroke = size < 28 ? 3 : 2.2;
  const kf = (vals) => t.interpolate({ inputRange: vals.map((_, i) => i / (vals.length - 1)), outputRange: vals });
  const deg = (vals) => t.interpolate({ inputRange: vals.map((_, i) => i / (vals.length - 1)), outputRange: vals.map((v) => `${v}deg`) });

  // The whole face's move.
  let faceMove = [];
  if (live) {
    switch (f.move) {
      case 'bob': faceMove = [{ translateY: kf([0, -3 * u, 0, -1.5 * u, 0]) }]; break;
      case 'hop': faceMove = [{ translateY: kf([0, -5 * u, 0, 0]) }, { scale: kf([1, 1.06, 0.97, 1]) }]; break;
      case 'shrug': faceMove = [{ rotate: deg([0, 5, -5, 0]) }]; break;
      case 'doze': faceMove = [{ translateY: kf([0, 1.5 * u, 1.5 * u, 0]) }]; break;
      case 'tilt': faceMove = [{ rotate: deg([0, -9, -9, 0]) }]; break;
      case 'jitter': faceMove = [{ translateX: kf([0, 0.8 * u, -0.8 * u, 0.8 * u, -0.6 * u, 0]) }]; break;
      case 'shake': faceMove = [{ translateX: kf([0, -2 * u, 2 * u, -2 * u, 2 * u, 0]) }]; break;
      case 'grit': faceMove = [{ rotate: deg([0, -3, 3, -3, 0]) }]; break;
      case 'huff': faceMove = [{ scale: kf([1, 1.07, 1]) }]; break;
      case 'sink': faceMove = [{ translateY: kf([0, 2 * u, 2 * u, 0]) }, { rotate: deg([0, 4, 4, 0]) }]; break;
      default: break;
    }
  }

  // Parts that move on their own: Betrayed's eyes, a tear or sweat drop.
  const eyesApart = live && f.move === 'glance';
  const tintApart = live && !!f.tint;
  const svgBox = { position: 'absolute', left: 0, top: 0, width: size, height: size };

  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no">
      <Animated.View style={{ width: size, height: size, transform: faceMove }}>
        <Svg width={size} height={size} viewBox="0 0 48 48">
          <Circle cx="24" cy="24" r="20" fill={f.color || '#FFFFFF'} stroke={INK} strokeWidth={size < 28 ? 2.6 : 2} />
          <Path d={f.line} fill="none" stroke={INK} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
          {f.fill && !eyesApart ? <Path d={f.fill} fill={INK} /> : null}
          {f.tint && !tintApart ? <Path d={f.tint} fill={TINT} /> : null}
        </Svg>
        {eyesApart ? (
          <Animated.View style={[svgBox, { transform: [{ translateX: kf([0, -3 * u, -3 * u, 0]) }] }]}>
            <Svg width={size} height={size} viewBox="0 0 48 48"><Path d={f.fill} fill={INK} /></Svg>
          </Animated.View>
        ) : null}
        {tintApart ? (
          <Animated.View style={[svgBox, {
            opacity: f.move === 'tear' ? kf([0, 1, 1, 0]) : kf([1, 1, 0.2, 0, 1]),
            transform: [{ translateY: f.move === 'tear' ? kf([-3 * u, 0, 5 * u, 9 * u]) : kf([0, 0, 4 * u, 6 * u, 0]) }],
          }]}>
            <Svg width={size} height={size} viewBox="0 0 48 48"><Path d={f.tint} fill={TINT} /></Svg>
          </Animated.View>
        ) : null}
      </Animated.View>

      {/* Little extras beside the face, there only while it moves. */}
      {live && f.extra ? (
        <Animated.View pointerEvents="none" style={[svgBox, {
          opacity: kf([0, 1, 1, 0]),
          transform: f.extra === 'sparkle' ? [{ scale: kf([0.4, 1, 1.1, 1.2]) }] : [{ translateY: kf([2 * u, 0, -2 * u, -5 * u]) }],
        }]}>
          <Svg width={size} height={size} viewBox="0 0 48 48" style={{ overflow: 'visible' }}>
            {f.extra === 'sparkle' ? (
              <>
                <Path d="M41 8 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2z" fill="#E0A53A" />
                <Path d="M6 12 l.8 2 2 .8 -2 .8 -.8 2 -.8 -2 -2 -.8 2 -.8z" fill="#E0A53A" />
              </>
            ) : null}
            {f.extra === 'question' ? <SvgText x="38" y="11" fontSize="11" fontWeight="800" fill="#5B3FA8">?</SvgText> : null}
            {f.extra === 'z' ? <SvgText x="37" y="12" fontSize="9" fontWeight="800" fill="#5B4FA8">z</SvgText> : null}
            {f.extra === 'steam' ? (
              <>
                <Path d="M9 8 q-2 -2 0 -4" fill="none" stroke="#B4412F" strokeWidth={1.6} strokeLinecap="round" />
                <Path d="M39 8 q2 -2 0 -4" fill="none" stroke="#B4412F" strokeWidth={1.6} strokeLinecap="round" />
              </>
            ) : null}
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}
