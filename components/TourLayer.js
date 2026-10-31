// components/TourLayer.js — draws the running tour over the real app.
//   • Spotlight: everything is dimmed except the step's target, which gets a
//     gold outline. Only the outlined spot can be tapped (the dim takes the
//     other taps). `free` steps (the writing page) don't dim or block anything.
//   • The speech bubble: chapter, a few words, "Your turn: …" (green ✓ when
//     done), Skip › or Got it ›, and ✕ to leave the tour. It sits below or
//     above the spot, wherever there's room (above the keyboard if it's up).
//   • Centred cards: the welcome (the logo, and the pen writing
//     "parenting done, write.") and "Chapter done".
// One layer sits over the app (App.js, host 'root') and one inside each
// sheet (components/Sheet.js), because nothing can be drawn above a Modal.

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Image, Animated, Easing, Keyboard, Platform, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Caveat_600SemiBold } from '@expo-google-fonts/caveat';
import Svg, { Circle } from 'react-native-svg';
import { BlackPen, PEN, TIP } from './IntroSplash';
import { colors, isDark } from '../theme';
import Medal from './Medal';
import { MEDALS } from '../medals';
import {
  backIndex, getRun, getTarget, tourEvent, getTourChapters, minimizeTour, nextStep, sectionOf, prevStep, startChapter, stepOf, stopTour, topHost, useRun,
} from '../tourRun';
import { openTour, useTour } from '../tour';

const DIM = 'rgba(3,6,15,';
const GOLD = '#F2C14E';
const PAD = 6; // space between the spot and its outline

export default function TourLayer({ host = 'root' }) {
  const run = useRun();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [rect, setRect] = useState(null);
  const [missing, setMissing] = useState(false);
  const [kb, setKb] = useState(0);
  const [bubbleH, setBubbleH] = useState(0);
  const [ringRects, setRingRects] = useState(null); // step.rings: outline these spots one by one
  const [markRects, setMarkRects] = useState(null); // step.marks: pulsing gold rings ("tap here")
  const pulse = useRef(new Animated.Value(1)).current;
  const scrolledFor = useRef(null);

  const step = stepOf(run);
  const key = run ? `${run.ch}.${run.step}.${run.phase}` : 'off';

  // The keyboard's height, so the bubble can sit above it.
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKb(e.endCoordinates?.height || 0));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Find the step's spot and keep measuring it (it can scroll, animate, or
  // reappear after a redraw).
  useEffect(() => {
    setRect(null);
    setMissing(false);
    setBubbleH(0);
    setRingRects(null);
    setMarkRects(null);
    if (!step?.target) return undefined;
    const since = Date.now();
    const tick = () => {
      const t = getTarget(step.target);
      if (!t || t.host !== host) {
        setRect(null);
        // Not on screen for a while: the app layer offers to skip the step.
        // (Steps that wait for a sheet or page get longer, but never wait forever.)
        setMissing(host === 'root' && !t && Date.now() - since > (step.wait ? 6000 : 1800));
        return;
      }
      setMissing(false);
      const node = t.ref.current;
      if (!node || !node.measureInWindow) return;
      node.measureInWindow((x, y, w, h) => {
        if (!w && !h) return;
        // On another tab (the pages sit side by side): not on screen.
        if (x >= W - 1 || x + w <= 1) {
          setRect(null);
          setMissing(host === 'root' && Date.now() - since > (step.wait ? 6000 : 1800));
          return;
        }
        setRect((r) => (r && r.x === x && r.y === y && r.w === w && r.h === h ? r : { x, y, w, h }));
        // "Scroll down to …" steps: done once the spot's top part is on screen
        // (you scroll yourself; the tour doesn't).
        if (step.reveal) {
          if (y >= insets.top && y + Math.min(h, 140) <= H - 96) tourEvent('revealed', step.target);
          return;
        }
        // Several small spots outlined one by one (e.g. the prompt's level and
        // ↻ Refresh); the bright area is the box around all of them.
        if (step.rings) {
          const out = [];
          let left = step.rings.length;
          step.rings.forEach((id, i) => {
            const n = getTarget(id)?.ref.current;
            if (!n?.measureInWindow) { left -= 1; return; }
            n.measureInWindow((rx, ry, rw, rh) => {
              out[i] = { x: rx, y: ry, w: rw, h: rh };
              left -= 1;
              if (left === 0) {
                const list = out.filter(Boolean);
                setRingRects((prev) => (prev && JSON.stringify(prev) === JSON.stringify(list) ? prev : list));
              }
            });
          });
        }
        // "Tap here" marks: pulsing rings on small spots inside the bright area
        // (they can change as you go, e.g. the day options, then Save).
        const markIds = typeof step.marks === 'function' ? step.marks(getRun()?.data || {}) : step.marks;
        if (markIds && markIds.length) {
          const out = [];
          let left = markIds.length;
          const done = () => {
            left -= 1;
            if (left === 0) {
              const list = out.filter(Boolean);
              setMarkRects((prev) => (prev && JSON.stringify(prev) === JSON.stringify(list) ? prev : list));
            }
          };
          markIds.forEach((id, i) => {
            const n = getTarget(id)?.ref.current;
            if (!n?.measureInWindow) { done(); return; }
            n.measureInWindow((mx, my, mw, mh) => { if (mw || mh) out[i] = { x: mx, y: my, w: mw, h: mh }; done(); });
          });
        } else setMarkRects((prev) => (prev ? null : prev));
        // Below the fold (or under the header)? Scroll the page to it, once.
        if (t.scroll && scrolledFor.current !== key) {
          scrolledFor.current = key;
          const top = insets.top + 8;
          const bottom = H - 96;
          if (y < top || y + h > bottom) {
            const want = h > H * 0.45 ? insets.top + 24 : H * 0.28;
            t.scroll.ref.current?.scrollTo({ y: Math.max(0, t.scroll.y.current + y - want), animated: true });
          }
        }
      });
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [key, host]);

  useEffect(() => { if (run?.phase === 'done') Keyboard.dismiss(); }, [run?.phase]);

  // The marks breathe, so they read as "tap me".
  const marking = !!(markRects && markRects.length);
  useEffect(() => {
    if (!marking) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.2, duration: 600, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [marking]);

  if (!run) return null;
  const chapters = getTourChapters();
  const chapter = chapters[run.ch];
  if (!chapter) return null;

  // Tucked away (✕): just a small pill to bring it back, or end the tour.
  if (run.min && run.phase === 'step') {
    if (topHost() !== host) return null;
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={[c.pill, { top: insets.top + 2 }]}>
          <Pressable onPress={() => minimizeTour(false)} hitSlop={8} style={c.pillMain} accessibilityRole="button" accessibilityLabel="Show the tour again">
            <Ionicons name="compass-outline" size={15} color="#0A1633" />
            <Text style={c.pillText}>Tour</Text>
          </Pressable>
          <Pressable onPress={stopTour} hitSlop={8} style={c.pillEnd} accessibilityRole="button" accessibilityLabel="End the tour">
            <Text style={c.pillEndText}>End</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Centred cards: drawn in the newest open sheet (or over the app).
  const centred = run.phase === 'done' || (step && !step.target);
  if (centred) {
    if (topHost() !== host) return null;
    return (
      <View style={StyleSheet.absoluteFill}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `${DIM}0.66)` }]} onStartShouldSetResponder={() => true} />
        <View style={[c.centerWrap, { paddingTop: insets.top, paddingBottom: insets.bottom }]} pointerEvents="box-none">
          {run.phase === 'done' ? <DoneCard ch={run.ch} earned={run.earned} /> : step.kind === 'welcome' ? <WelcomeCard /> : <Bubble run={run} step={step} />}
        </View>
      </View>
    );
  }

  if (!step) return null;

  // "Scroll down to …": no dimming, so you can scroll; the bubble waits at the top.
  if (step.reveal) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View key={key} style={[c.abs, { left: 14, right: 14, top: insets.top + 6 }]}>
          <Bubble run={run} step={step} />
        </View>
      </View>
    );
  }

  // The spot isn't on screen: say so, and offer Skip.
  if (!rect) {
    if (!missing) return null;
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={[c.centerWrap, { paddingTop: insets.top }]} pointerEvents="box-none">
          <Bubble run={run} step={step} lost />
        </View>
      </View>
    );
  }

  // Tips shown inside the page (the writing page: TourInline): no dimming
  // and no floating bubble, just the pulsing "tap here" marks.
  if (step.inline) {
    if (!markRects || !markRects.length) return null;
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {markRects.map((r, i) => (
          <Animated.View key={`m${i}`} style={[c.abs, c.mark, { left: r.x - 5, top: r.y - 5, width: r.w + 10, height: r.h + 10, borderRadius: step.markRound ?? 999, opacity: pulse }]} />
        ))}
      </View>
    );
  }

  // The spotlight (around every ring spot, when there are several).
  let box = rect;
  if (ringRects && ringRects.length) {
    const x1 = Math.min(...ringRects.map((r) => r.x));
    const y1 = Math.min(...ringRects.map((r) => r.y));
    const x2 = Math.max(...ringRects.map((r) => r.x + r.w));
    const y2 = Math.max(...ringRects.map((r) => r.y + r.h));
    box = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }
  const growTop = step.growTop || 0;
  const hx = Math.max(0, box.x - PAD);
  const hy = Math.max(0, box.y - PAD - growTop);
  const hw = Math.min(W - hx, box.w + PAD * 2);
  const hh = box.h + PAD * 2 + growTop;
  const dim = step.free ? null : `${DIM}${step.dim ?? 0.62})`;
  const block = () => true;

  // Where the bubble goes: below the spot, else above, else at the top.
  const bh = bubbleH || 170;
  const floor = H - (kb || insets.bottom) - 8;
  const below = floor - (hy + hh);
  const above = hy - insets.top - 6;
  let top;
  if (step.place === 'bottom') top = floor - bh;
  else if (step.place === 'top') top = insets.top + 6;
  else if (step.place !== 'above' && below >= bh + 14) top = hy + hh + 12;
  else if (above >= bh + 14) top = hy - 12 - bh;
  else if (below >= above) top = Math.max(insets.top + 6, floor - bh);
  else top = insets.top + 6;
  const ring = (!step.free || step.ring) && !step.noRing;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {dim ? (
        <>
          <View style={[c.abs, { left: 0, top: 0, width: W, height: hy, backgroundColor: dim }]} onStartShouldSetResponder={block} />
          <View style={[c.abs, { left: 0, top: hy + hh, width: W, height: Math.max(0, H - hy - hh) + 60, backgroundColor: dim }]} onStartShouldSetResponder={block} />
          <View style={[c.abs, { left: 0, top: hy, width: hx, height: hh, backgroundColor: dim }]} onStartShouldSetResponder={block} />
          <View style={[c.abs, { left: hx + hw, top: hy, width: Math.max(0, W - hx - hw), height: hh, backgroundColor: dim }]} onStartShouldSetResponder={block} />
        </>
      ) : null}
      {step.look ? (
        <View style={[c.abs, { left: hx, top: hy, width: hw, height: hh }]} onStartShouldSetResponder={block} />
      ) : null}
      {ring && ringRects && ringRects.length ? ringRects.map((r, i) => (
        <View key={i} pointerEvents="none" style={[c.abs, c.ring, { left: r.x - 4, top: r.y - 4, width: r.w + 8, height: r.h + 8, borderRadius: 999 }]}>
          <View style={[StyleSheet.absoluteFill, c.ringGlow, { borderRadius: 999 }]} />
        </View>
      )) : ring ? (
        <View pointerEvents="none" style={[c.abs, c.ring, { left: hx, top: hy, width: hw, height: hh, borderRadius: step.round ?? 14 }]}>
          <View style={[StyleSheet.absoluteFill, c.ringGlow, { borderRadius: (step.round ?? 14) + 4 }]} />
        </View>
      ) : null}
      {marking ? markRects.map((r, i) => (
        <Animated.View key={`m${i}`} pointerEvents="none" style={[c.abs, c.mark, { left: r.x - 5, top: r.y - 5, width: r.w + 10, height: r.h + 10, borderRadius: step.markRound ?? 999, opacity: pulse }]} />
      )) : null}
      <View
        key={key} // a fresh bubble per step, so it's always measured (and shown)
        style={[c.abs, { left: 14, right: 14, top, opacity: bubbleH ? 1 : 0 }]}
        onLayout={(e) => setBubbleH(Math.round(e.nativeEvent.layout.height))}
      >
        <Bubble run={run} step={step} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// The speech bubble.
// ---------------------------------------------------------------------------
export function Bubble({ run, step, lost, inline }) {
  const chapters = getTourChapters();
  const chapter = chapters[run.ch];
  const steps = chapter.steps.filter((x) => x.kind !== 'welcome');
  const at = steps.indexOf(step);
  const text = typeof step.text === 'function' ? step.text(run.data || {}) : step.text;
  const title = typeof step.title === 'function' ? step.title(run.data || {}) : step.title;
  const done = run.taskDone;
  const sec = sectionOf(run); // "7.2 · THIS WEEK"
  // In dark mode the bubble is dark too.
  const d = isDark();
  // No bold title when it just repeats the section's name.
  const plain = (x) => String(x || '').toLowerCase().replace(/^the /, '').replace(/[^a-z]/g, '');
  const showTitle = title && !(sec && plain(title) === plain(sec.title));
  // A manual "Next ›" only works a moment after it appears, so a tap meant for
  // the keyboard or the page can't end the step by accident.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    setArmed(false);
    if (!done || !step.manual) return undefined;
    const id = setTimeout(() => setArmed(true), 1200);
    return () => clearTimeout(id);
  }, [done]);
  return (
    <View style={[c.bubble, d && c.bubbleDark, inline && c.bubbleInline]} accessibilityLiveRegion="polite">
      <View style={c.head}>
        <Text style={[c.kick, d && { color: '#E7B85A' }]} numberOfLines={1}>{sec ? `${sec.num} · ${sec.title.toUpperCase()}` : `CHAPTER ${run.ch + 1} · ${chapter.title.toUpperCase()}`}</Text>
        <View style={c.dots}>
          {steps.map((_, i) => <View key={i} style={[c.dot, d && { backgroundColor: 'rgba(255,255,255,0.22)' }, i < at && c.dotDone, i === at && c.dotOn, i === at && d && { backgroundColor: '#9DB4FF' }]} />)}
        </View>
        <Pressable onPress={() => minimizeTour(true)} hitSlop={10} style={[c.x, d && { backgroundColor: 'rgba(255,255,255,0.1)' }]} accessibilityRole="button" accessibilityLabel="Hide the tour for now">
          <Ionicons name="close" size={15} color={d ? '#C9D1E6' : '#5A6484'} />
        </Pressable>
      </View>
      {showTitle ? <Text style={[c.title, d && { color: '#EEF1F8' }, inline && { fontSize: 14.5, marginTop: 3 }]}>{title}</Text> : null}
      {lost
        ? <Text style={[c.text, d && { color: '#C9D1E6' }]}>This part of the app isn't on screen right now, so this step can't be shown. You can skip it.</Text>
        : text ? <Text style={[c.text, d && { color: '#C9D1E6' }]}>{text}</Text> : null}
      {step.task && !lost ? (
        <View style={[c.task, d && c.taskDark, done && c.taskDone]}>
          <View style={{ flex: 1 }}>
            <Text style={c.taskText}>
              {done ? <Text style={{ fontWeight: '800' }}>Nice! </Text> : <Text style={c.your}>Your turn: </Text>}
              {done ? (step.doneText || (step.manual ? 'Tap Next when you’re ready.' : 'On to the next bit…')) : step.task}
            </Text>
            {!done && run.progress ? <Text style={c.prog}>{run.progress}</Text> : null}
          </View>
          {!done && run.frac != null ? <ProgressRing frac={run.frac} /> : (
            <View style={[c.check, done && c.checkOn]}>{done ? <Ionicons name="checkmark" size={14} color="#1E7B3A" /> : null}</View>
          )}
        </View>
      ) : null}
      <View style={c.foot}>
        {backIndex(run) >= 0 ? (
          <Pressable onPress={prevStep} hitSlop={10} accessibilityRole="button" accessibilityHint="Goes back a step to try it again" style={{ marginRight: 'auto' }}>
            <Text style={[c.skip, d && { color: '#A7B2CF' }]}>‹ Back</Text>
          </Pressable>
        ) : null}
        {done && step.manual && !lost ? (
          <Pressable onPress={() => armed && nextStep()} style={({ pressed }) => [c.got, !armed && { opacity: 0.45 }, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityState={{ disabled: !armed }}>
            <Text style={c.gotText}>{step.nextLabel || 'Next ›'}</Text>
          </Pressable>
        ) : step.info && !lost ? (
          <Pressable onPress={nextStep} style={({ pressed }) => [c.got, pressed && { opacity: 0.85 }]} accessibilityRole="button">
            <Text style={c.gotText}>Got it ›</Text>
          </Pressable>
        ) : !done ? (
          <Pressable onPress={nextStep} hitSlop={10} accessibilityRole="button" accessibilityHint="Skips this step">
            <Text style={[c.skip, d && { color: '#A7B2CF' }]}>{lost ? 'Skip this step ›' : 'Skip ›'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// How far along the task is (5 words, 3 levels…), as a small filling ring.
function ProgressRing({ frac }) {
  const r = 10;
  const len = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, frac));
  return (
    <Svg width={26} height={26} viewBox="0 0 26 26">
      <Circle cx={13} cy={13} r={r} stroke="rgba(255,255,255,0.25)" strokeWidth={3.5} fill="none" />
      <Circle cx={13} cy={13} r={r} stroke="#6FD49A" strokeWidth={3.5} fill="none" strokeLinecap="round" strokeDasharray={`${len * f} ${len}`} rotation={-90} origin="13, 13" />
    </Svg>
  );
}

// The tip inside the writing page (under the rings and the prompt), for
// steps marked inline, so it never covers your words, rings or "Paused".
export function TourInline() {
  const run = useRun();
  const step = stepOf(run);
  if (!run || run.min || !step || !step.inline) return null;
  return (
    <View style={{ marginHorizontal: 14, marginBottom: 8 }}>
      <Bubble run={run} step={step} inline />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Welcome: the logo, and the pen writing the tagline (as in the opening).
// ---------------------------------------------------------------------------
const TAGLINE = 'parenting done, write';
const OVERHANG = 16;
const DOT_GAP = 8;

function WrittenTagline({ play }) {
  const [fontsLoaded, fontError] = useFonts({ Caveat_600SemiBold });
  const fontReady = fontsLoaded || !!fontError;
  const [textW, setTextW] = useState(0);
  const write = useRef(new Animated.Value(0)).current;
  const penOn = useRef(new Animated.Value(0)).current;
  const wobble = useRef(new Animated.Value(0)).current;
  const dot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!fontReady || !textW) return undefined;
    write.setValue(0); dot.setValue(0); penOn.setValue(0);
    const bob = Animated.loop(Animated.sequence([
      Animated.timing(wobble, { toValue: 1, duration: 110, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.timing(wobble, { toValue: 0, duration: 110, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ]));
    bob.start();
    const anim = Animated.sequence([
      Animated.delay(250),
      Animated.parallel([
        Animated.timing(penOn, { toValue: 1, duration: 180, useNativeDriver: false }),
        Animated.timing(write, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: false }),
      ]),
      Animated.parallel([
        Animated.spring(dot, { toValue: 1, friction: 4, tension: 160, useNativeDriver: false }),
        Animated.timing(penOn, { toValue: 0, duration: 300, delay: 80, useNativeDriver: false }),
      ]),
    ]);
    anim.start(() => { bob.stop(); wobble.setValue(0); });
    return () => { anim.stop(); bob.stop(); };
  }, [fontReady, textW, play]);

  const ink = isDark() ? '#F4F6FB' : '#16171C';
  const font = fontsLoaded ? { fontFamily: 'Caveat_600SemiBold' } : { fontStyle: 'italic', fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }) };
  const revealW = write.interpolate({ inputRange: [0, 1], outputRange: [0, textW + OVERHANG] });
  // The pen writes the words, then carries on past the full stop.
  const penX = write.interpolate({ inputRange: [0, 1], outputRange: [-TIP.x, textW + DOT_GAP + 14 - TIP.x] });
  const penY = wobble.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  const penTurn = wobble.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-4deg'] });
  return (
    <View style={{ alignItems: 'center', marginTop: 22 }}>
      <Text style={[c.tag, font, { color: ink }, c.measure]} numberOfLines={1} onLayout={(e) => setTextW(Math.ceil(e.nativeEvent.layout.width))}>{TAGLINE}</Text>
      <View style={{ width: textW + OVERHANG + DOT_GAP + 8, height: 46 }}>
        <Animated.View style={{ width: revealW, height: 46, overflow: 'hidden' }}>
          <Text style={[c.tag, font, { color: ink, paddingRight: OVERHANG }]} numberOfLines={1}>{TAGLINE}</Text>
        </Animated.View>
        <Animated.View style={[c.tagDot, { backgroundColor: ink, left: textW + DOT_GAP, transform: [{ scale: dot }] }]} />
        <Animated.View pointerEvents="none" style={[c.pen, { opacity: penOn, transform: [{ translateX: penX }, { translateY: penY }, { rotate: penTurn }] }]}>
          <BlackPen />
        </Animated.View>
      </View>
    </View>
  );
}

function WelcomeCard() {
  const [play, setPlay] = useState(0);
  return (
    <View style={[c.card, { backgroundColor: colors.card, borderColor: colors.line }]}>
      <Pressable onPress={() => setPlay((n) => n + 1)} accessibilityRole="button" accessibilityLabel="Pen Parentis logo. Tap to write the tagline again" style={{ alignSelf: 'center' }}>
        <Image source={require('../assets/pen-parentis-logo.png')} style={c.logo} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Pressable>
      <WrittenTagline play={play} />
      <Text style={[c.cardTitle, { color: colors.ink }]}>Welcome to Pen Parentis</Text>
      <Text style={[c.cardText, { color: colors.body }]}>
        A hands-on tour of the real app. You'll tap the real buttons, and in chapter 4 you'll write your first entry.
      </Text>
      <View style={c.cardRow}>
        <Pressable onPress={stopTour} style={[c.cardBtn, { borderColor: colors.royal, borderWidth: 1.5 }]} accessibilityRole="button">
          <Text style={[c.cardBtnText, { color: colors.royal }]}>Not now</Text>
        </Pressable>
        <Pressable onPress={nextStep} style={[c.cardBtn, c.cardBtnFill]} accessibilityRole="button">
          <Text style={[c.cardBtnText, { color: '#FFFFFF' }]}>Start the tour ›</Text>
        </Pressable>
      </View>
      <Text style={[c.cardNote, { color: colors.muted }]}>{getTourChapters().length} short chapters · ✕ tucks the tour away any time</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Chapter done.
// ---------------------------------------------------------------------------
const TIERS = [[3, 'Bronze'], [6, 'Silver'], [9, 'Gold'], [10, 'Diamond']];

const TOUR_MEDAL = MEDALS.find((m) => m.id === 'tour');
const TIER_NAME = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', diamond: 'Diamond' };

function DoneCard({ ch, earned }) {
  const tour = useTour();
  // A new Tour Guide tier from this chapter: the medal takes the stage.
  const won = earned && earned.length ? earned[earned.length - 1] : null;
  const pop = useRef(new Animated.Value(won ? 0.4 : 1)).current;
  useEffect(() => {
    if (!won) return;
    pop.setValue(0.4);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();
  }, [won?.earnedTier]);
  const chapters = getTourChapters();
  const ids = chapters.map((x) => x.id);
  const done = { ...(tour?.done || {}), [chapters[ch].id]: true };
  const n = ids.filter((id) => done[id]).length;
  const nextTier = TIERS.find(([k]) => n < k);
  const next = chapters[ch + 1];
  function goNext() {
    if (!next) { stopTour(); openTour('__list'); return; }
    if (next.steps) startChapter(ch + 1);
    else { stopTour(); openTour(next.id); }
  }
  return (
    <View style={[c.card, { backgroundColor: colors.card, borderColor: colors.line }]}>
      {won ? (
        <>
          <Text style={c.wonKick}>✦ MEDAL EARNED ✦</Text>
          <Animated.View style={{ alignSelf: 'center', marginTop: 8, transform: [{ scale: pop }] }}>
            <Medal medal={TOUR_MEDAL} tier={won.earnedTier} size={104} />
          </Animated.View>
          <Text style={[c.cardTitle, { color: colors.ink }]}>{TIER_NAME[won.earnedTier] || ''} Tour Guide</Text>
          <Text style={[c.cardText, { color: colors.body, marginTop: 2 }]}>Chapter {ch + 1} done. You've finished {won.threshold} chapters of the tour!</Text>
        </>
      ) : (
        <>
          <View style={c.bigCheck}><Ionicons name="checkmark" size={32} color="#FFFFFF" /></View>
          <Text style={[c.cardTitle, { color: colors.ink }]}>Chapter {ch + 1} done</Text>
        </>
      )}
      <Text style={[c.cardText, { color: colors.body }]}>
        {n} of {ids.length} chapters
        {nextTier ? <Text> · {nextTier[0] - n} more for the <Text style={{ fontWeight: '800', color: '#C8912B' }}>{nextTier[1]} Tour Guide</Text> medal</Text> : null}
      </Text>
      <View style={[c.track, { backgroundColor: colors.line }]}><View style={[c.fill, { width: `${Math.max(4, (n / ids.length) * 100)}%`, backgroundColor: colors.royal }]} /></View>
      <View style={c.cardRow}>
        <Pressable onPress={stopTour} style={[c.cardBtn, { borderColor: colors.royal, borderWidth: 1.5 }]} accessibilityRole="button">
          <Text style={[c.cardBtnText, { color: colors.royal }]}>Take a break</Text>
        </Pressable>
        <Pressable onPress={goNext} style={[c.cardBtn, c.cardBtnFill]} accessibilityRole="button">
          {next ? <Text style={c.nextKick}>NEXT</Text> : null}
          <Text style={[c.cardBtnText, { color: '#FFFFFF' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{next ? `${next.short || next.title} ›` : 'All chapters ›'}</Text>
        </Pressable>
      </View>
      <View style={c.cardLinks}>
        <Pressable onPress={() => startChapter(ch)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Redo chapter ${ch + 1}`}>
          <Text style={[c.cardNote, { color: colors.royal, fontWeight: '800', marginTop: 0 }]}>↺ Redo chapter {ch + 1}</Text>
        </Pressable>
        <Pressable onPress={() => { stopTour(); openTour('__list'); }} hitSlop={8} accessibilityRole="button">
          <Text style={[c.cardNote, { color: colors.royal, fontWeight: '800', marginTop: 0 }]}>See all chapters</Text>
        </Pressable>
      </View>
    </View>
  );
}

// The bubble keeps the same light look in both schemes, so it stands out on
// the dimmed app either way.
const c = StyleSheet.create({
  abs: { position: 'absolute' },
  ring: { borderWidth: 2.5, borderColor: GOLD },
  // The tucked-away tour: a small gold pill, top centre.
  pill: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: GOLD, borderRadius: 999, paddingLeft: 12, paddingRight: 4, paddingVertical: 4, gap: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 8 },
  pillMain: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pillText: { fontSize: 13, fontWeight: '800', color: '#0A1633' },
  pillEnd: { backgroundColor: 'rgba(10,22,51,0.15)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  pillEndText: { fontSize: 11.5, fontWeight: '800', color: '#0A1633' },
  mark: { borderWidth: 3, borderColor: GOLD, backgroundColor: 'rgba(242,193,78,0.10)' },
  ringGlow: { margin: -6, borderWidth: 4, borderColor: 'rgba(242,193,78,0.28)' },
  centerWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', paddingHorizontal: 18 },
  bubbleDark: { backgroundColor: '#1C2541', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  taskDark: { backgroundColor: '#0D1324', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  bubbleInline: { paddingTop: 9, paddingBottom: 6, shadowOpacity: 0.18, shadowRadius: 8, elevation: 3, borderWidth: 1.5, borderColor: GOLD },
  bubble: {
    backgroundColor: '#FFFDF8', borderRadius: 18, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kick: { flex: 1, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: '#8A5E12' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C8CEDE' },
  dotDone: { backgroundColor: '#1E7B3A' },
  dotOn: { width: 14, backgroundColor: '#1B3FA0' },
  x: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF1F7' },
  title: { fontSize: 16, fontWeight: '800', color: '#0A1633', marginTop: 5 },
  text: { fontSize: 13.5, lineHeight: 19, color: '#2A3352', marginTop: 3 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0A1633', borderRadius: 11, paddingVertical: 8, paddingHorizontal: 10, marginTop: 9 },
  taskDone: { backgroundColor: '#1E7B3A' },
  taskText: { fontSize: 13, lineHeight: 18, color: '#FFFFFF' },
  your: { fontWeight: '800', color: GOLD },
  prog: { fontSize: 11.5, fontWeight: '800', color: '#9BE3B0', marginTop: 1 },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  foot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, alignItems: 'center', marginTop: 7, minHeight: 20 },
  skip: { fontSize: 12.5, fontWeight: '700', color: '#5A6484' },
  got: { backgroundColor: '#1B3FA0', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 14 },
  gotText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  card: {
    borderRadius: 22, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 20,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 14,
  },
  logo: { width: 132, height: 114, borderRadius: 12 },
  tag: { fontSize: 32 },
  measure: { position: 'absolute', opacity: 0, left: -9999 },
  tagDot: { position: 'absolute', top: 29, width: 7, height: 7, borderRadius: 3.5 },
  pen: { position: 'absolute', left: 0, top: 30 - TIP.y + 4, width: PEN, height: PEN },
  cardTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: 14 },
  cardText: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 6 },
  cardRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cardBtn: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  cardBtnFill: { backgroundColor: '#3352C4' },
  cardBtnText: { fontSize: 14.5, fontWeight: '800' },
  cardNote: { fontSize: 12, textAlign: 'center', marginTop: 12 },
  wonKick: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: '#C8912B', textAlign: 'center' },
  nextKick: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1, color: 'rgba(255,255,255,0.75)' },
  cardLinks: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 14 },
  bigCheck: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#1E7B3A', alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  track: { height: 8, borderRadius: 4, marginTop: 14, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
