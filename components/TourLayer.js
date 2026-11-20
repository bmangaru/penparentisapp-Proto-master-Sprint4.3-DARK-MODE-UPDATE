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
  View, Text, Pressable, StyleSheet, Image, Animated, Easing, Keyboard, Platform, PanResponder, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Caveat_600SemiBold } from '@expo-google-fonts/caveat';
import Svg, { Circle } from 'react-native-svg';
import { BlackPen, PEN, TIP } from './IntroSplash';
import { colors, isDark } from '../theme';
import Medal from './Medal';
import TourTarget from './TourTarget';
import { MEDALS } from '../medals';
import {
  getRun, getTarget, targetOnScreen, tourEvent, getTourChapters, minimizeTour, nextStep, revealTarget, scrollForStep, sectionOf, startChapter, stepOf, stopTour, swipeTab, topHost, useRun,
} from '../tourRun';

const safeCall = (fn) => { try { return !!fn(); } catch { return true; } };
import { openTour, useTour } from '../tour';

const DIM = 'rgba(3,6,15,';
const TOUR_MEDAL = MEDALS.find((m) => m.id === 'tour');
const GOLD = '#F2C14E';
const PAD = 6; // space between the spot and its outline

export default function TourLayer({ host = 'root' }) {
  const run = useRun();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [rect, setRect] = useState(null);
  const [missing, setMissing] = useState(false);
  const [kb, setKb] = useState(0);
  // The bubble's measured height, tagged with the step it belongs to, so a
  // measurement can never be wiped out by the step-change reset (that left
  // the bubble invisible: an outline with nothing to read).
  const [bubble, setBubble] = useState({ key: null, h: 0 });
  const [ringRects, setRingRects] = useState(null); // step.rings: outline these spots one by one
  const [markRects, setMarkRects] = useState(null); // step.marks: pulsing gold rings ("tap here")
  // Tips inside the page: the part of the spot that isn't the tip (what the
  // tip is about), outlined in pulsing gold when there are no marks.
  const [boxRect, setBoxRect] = useState(null);
  // The step's page isn't the one showing (you tapped another tab): a card
  // saying where the tour is, with "Take me back".
  const [away, setAway] = useState(false);
  const awaySince = useRef(0);
  const pulse = useRef(new Animated.Value(1)).current;
  const scrolledFor = useRef(null);
  const hiddenSince = useRef(0); // when the spot's page got covered
  const barTop = useRef(0);      // where the tab bar starts (pages scroll behind it)
  // Is the spot (mostly) off screen, above or below what you can see?
  // A tip inside the page (inline: '<place>') sits at the top of its spot, so
  // the spot needs more of itself showing, and goes near the top.
  const inPage = () => typeof stepOf(getRun())?.inline === 'string';
  const outOfView = (y, h) => y < insets.top + 8 || y + Math.min(h, H * (inPage() ? 0.62 : 0.45)) > H - 96;
  // Scroll its page so the spot sits about a quarter of the way down.
  const scrollSpotIntoView = (t, y, h) => {
    const want = h > H * 0.45 || inPage() ? insets.top + 24 : H * 0.28;
    const max = t.scroll.max ? t.scroll.max() : Infinity;
    t.scroll.ref.current?.scrollTo({ y: Math.max(0, Math.min(max, t.scroll.y.current + y - want)), animated: true });
  };
  // "Show me": bring the step's spot back into view (its page, then scroll).
  const findSpot = () => {
    const st = stepOf(getRun());
    const t = st?.target ? getTarget(st.target) : null;
    if (!t) return;
    if (t.onScreen && !safeCall(t.onScreen)) { revealTarget(st.target); scrolledFor.current = null; return; }
    if (!t.scroll) return;
    t.ref.current?.measureInWindow?.((x, y, w, h) => { if (w || h) scrollSpotIntoView(t, y, h); });
  };
  const lastReveal = useRef(0);  // when we last brought it back

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
    setRingRects(null);
    setMarkRects(null);
    setBoxRect(null);
    setAway(false);
    awaySince.current = 0;
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
      // Its page is loaded but covered (Medals opened on top of Brainstorm,
      // another tab showing…): never outline whatever is on top. Bring the
      // page back instead, once it's clearly not just a page change in
      // progress (a finished task is about to move the tour on by itself),
      // and not while the tour is tucked away (you're using the app).
      if (t.onScreen && !safeCall(t.onScreen)) {
        setRect(null);
        // Nothing left outlined on whatever page is showing instead.
        setMarkRects((prev) => (prev ? null : prev));
        setBoxRect((prev) => (prev ? null : prev));
        scrolledFor.current = null; // back on its page → scroll to the spot again
        const r = getRun();
        // In-page steps leave you free to look around: no pulling you back,
        // just the "you're still in the tour" card after a moment.
        if (typeof step.inline === 'string') {
          if (!awaySince.current) awaySince.current = Date.now();
          else if (Date.now() - awaySince.current > 700) setAway(true);
          return;
        }
        if (host === 'root' && r && !r.min && !r.taskDone) {
          const now = Date.now();
          if (!hiddenSince.current) hiddenSince.current = now;
          else if (now - hiddenSince.current > 500 && now - lastReveal.current > 2000) {
            lastReveal.current = now;
            revealTarget(step.target);
          }
        } else hiddenSince.current = 0;
        setMissing(host === 'root' && Date.now() - since > (step.wait ? 8000 : 4000));
        return;
      }
      hiddenSince.current = 0;
      awaySince.current = 0;
      setAway(false);
      setMissing(false);
      if (host === 'root') getTarget('tabbar')?.ref.current?.measureInWindow?.((bx, by, bw, bh) => { if (bh) barTop.current = by; });
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
        // A tip inside the page: the spot minus the tip (it sits at the top of
        // the spot, or at the bottom, as on the calendar's top cards).
        if (typeof step.inline === 'string') {
          const box = (b) => setBoxRect((p) => (p && p.x === b.x && p.y === b.y && p.w === b.w && p.h === b.h ? p : b));
          const tip = getTarget(`inline:${step.inline}`)?.ref.current;
          const only = step.box ? getTarget(step.box)?.ref.current : null; // just this part
          if (only?.measureInWindow) only.measureInWindow((bx, by, bw, bh) => { if (bw || bh) box({ x: bx, y: by, w: bw, h: bh }); });
          else if (!tip?.measureInWindow) box({ x, y, w, h });
          else {
            tip.measureInWindow((tx, ty, tw, th) => {
              // (A tip outside the spot, e.g. Home's under the header: the whole spot.)
              if (!th || ty < y - 1 || ty > y + h) { box({ x, y, w, h }); return; }
              // A little gap either side, so the gold box never touches the tip.
              if (ty - y < h / 2) { const top = ty + th + 14; box({ x, y: top, w, h: Math.max(0, y + h - top) }); }
              else box({ x, y, w, h: Math.max(0, ty - y - 14) });
            });
          }
        }
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
        // Below the fold (or under the header)? Scroll the page to it: when
        // the step starts, when you come back to the tour (Tour pill), and
        // when its page is brought back. Not otherwise, so you can scroll
        // around freely; never while the tour is tucked away.
        // (Up to 3 tries, in case a flick still moving undid the first.)
        const sf = scrolledFor.current;
        const fresh = !sf || sf.key !== key;
        if (t.scroll && !getRun()?.min && (fresh || (sf.tries < 3 && Date.now() - sf.at > 700))) {
          if (outOfView(y, h)) {
            scrolledFor.current = { key, tries: fresh ? 1 : sf.tries + 1, at: Date.now() };
            scrollSpotIntoView(t, y, h);
          } else scrolledFor.current = { key, tries: 3, at: Date.now() };
        }
      });
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [key, host]);

  useEffect(() => { if (run?.phase === 'done') Keyboard.dismiss(); }, [run?.phase]);

  // Back from the Tour pill: scroll to the step's spot again.
  useEffect(() => { scrolledFor.current = null; }, [run?.resumed]);

  // The dim takes taps (only the bright spot can be tapped), but a drag on it
  // still scrolls the page (or sheet) underneath, so you can always look
  // around. On the tab-bar steps, a sideways swipe changes tab, like swiping
  // the app normally does.
  const drag = useRef(null);
  const pan = useRef(null);
  const bubblePan = useRef(null);
  if (!pan.current) {
    const clamp = (v, sc) => Math.max(0, Math.min(v, sc.max ? sc.max() : v));
    const grant = () => {
      const sc = scrollForStep(host);
      drag.current = { sc, from: sc ? sc.y.current : 0 };
    };
    const move = (_, g) => {
      const d = drag.current;
      if (!d?.sc || Math.abs(g.dy) < 4 || Math.abs(g.dx) > Math.abs(g.dy) * 1.5) return;
      d.sc.ref.current?.scrollTo({ y: clamp(d.from - g.dy, d.sc), animated: false });
    };
    const release = (_, g) => {
      const d = drag.current;
      drag.current = null;
      if (Math.abs(g.dx) > 70 && Math.abs(g.dx) > Math.abs(g.dy) * 2) {
        const st = stepOf(getRun());
        if (host === 'root' && /^tab(\.|bar$)/.test(st?.target || '')) swipeTab(g.dx < 0 ? 1 : -1);
        return;
      }
      // A flick keeps going a little, like a normal scroll.
      if (d?.sc && Math.abs(g.dy) > 4 && Math.abs(g.vy) > 0.3) {
        d.sc.ref.current?.scrollTo({ y: clamp(d.from - g.dy - g.vy * 220, d.sc), animated: true });
      }
    };
    const end = () => { drag.current = null; };
    // On the dim: takes every touch (taps do nothing, drags scroll).
    pan.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: grant,
      onPanResponderMove: move,
      onPanResponderRelease: release,
      onPanResponderTerminate: end,
    });
    // On the tips box: taps go to its buttons; a clear up/down drag scrolls
    // the page (a big spot can leave little dim to drag on).
    bubblePan.current = PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: grant,
      onPanResponderMove: move,
      onPanResponderRelease: release,
      onPanResponderTerminate: end,
    });
  }
  const dragProps = pan.current.panHandlers;
  const bubbleDragProps = bubblePan.current.panHandlers;

  // The edge arrow (spot off screen) bobs toward the spot.
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  // The marks breathe, so they read as "tap me".
  const marking = !!(markRects && markRects.length) || !!(boxRect && step?.inline && !step.noBox) || away;
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

  // Hidden for now (Exit → Hide for now): a small "Tour paused" card, so
  // it's clear the tour is off right now, with Continue (where you were),
  // Chapters (pick another) and End.
  if (run.min && run.phase === 'step') {
    if (topHost() !== host) return null;
    // On the writing page it's a slim strip inside the page (TourInline), so
    // it never covers ×, Prompt, Aa or Pause. A step you're still doing keeps
    // its pulsing "tap here" (e.g. Save & check in), as a reminder.
    if (step?.inline) {
      if (!step.task || run.taskDone || !markRects || !markRects.length || !targetOnScreen(step.target)) return null;
      const bottom = Math.min(barTop.current || H, kb ? H - kb : H);
      return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {markRects.filter((m) => { const cy = m.y + m.h / 2; return cy > insets.top && cy < bottom; }).map((m, i) => (
            <Animated.View key={`h${i}`} style={[c.abs, c.mark, { left: m.x - 5, top: m.y - 5, width: m.w + 10, height: m.h + 10, borderRadius: step.markRound ?? 999, opacity: pulse }]} />
          ))}
        </View>
      );
    }
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={[c.paused, { top: insets.top + 2 }]}>
          <PausedCard run={run} />
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

  // You went to another tab mid-step: say where the tour is.
  if (away && host === 'root') {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={[c.paused, { top: insets.top + 2 }]}>
          <AwayCard run={run} step={step} />
        </View>
      </View>
    );
  }

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
  // In the page itself (inline: 'bs.start' etc.) the spot gets a pulsing gold
  // box too, unless it has its own "tap here" marks. On "just look" steps the
  // spot can't be tapped (so it can't take you out of the tour), but a drag
  // on it still scrolls the page.
  if (step.inline) {
    const bottom = Math.min(barTop.current || H, kb ? H - kb : H);
    const marks = (markRects || []).filter((r) => { const cy = r.y + r.h / 2; return cy > insets.top && cy < bottom; });
    // The box, clipped to what's on screen.
    let vis = null;
    if (boxRect && boxRect.h > 4) {
      const top = Math.max(boxRect.y, insets.top);
      const bot = Math.min(boxRect.y + boxRect.h, bottom);
      if (bot - top > 12) vis = { x: boxRect.x, y: top, w: boxRect.w, h: bot - top };
    }
    const showBox = vis && !marks.length && !step.noBox;
    const block = vis && step.look;
    // Scrolled right away from it (tip and all): the arrow back, as on the
    // other steps. Only once it's completely gone, so a tall spot like the
    // calendar never gets an arrow over it.
    const off = step.noArrow ? null : rect.y + rect.h < insets.top + 4 ? 'up' : rect.y > bottom - 4 ? 'down' : null;
    if (!marks.length && !showBox && !block && !off) return null;
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {off ? (
          <Animated.View style={[c.abs, c.edgeWrap, { top: off === 'up' ? insets.top + 8 : bottom - 50 }, { transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, off === 'up' ? -6 : 6] }) }] }]}>
            <Pressable onPress={findSpot} style={c.edge} accessibilityRole="button" accessibilityLabel={off === 'up' ? 'The tour is above. Scroll back to it' : 'The tour is below. Scroll back to it'}>
              <Ionicons name={off === 'up' ? 'arrow-up' : 'arrow-down'} size={16} color="#0A1633" />
              <Text style={c.edgeText}>{`${sectionOf(run)?.num || 'The tour'} is ${off === 'up' ? 'up' : 'down'} here`}</Text>
            </Pressable>
          </Animated.View>
        ) : null}
        {block ? <View {...dragProps} style={[c.abs, { left: vis.x, top: vis.y, width: vis.w, height: vis.h }]} /> : null}
        {showBox ? (
          <Animated.View pointerEvents="none" style={[c.abs, c.mark, { left: vis.x - 5, top: vis.y - 5, width: vis.w + 10, height: vis.h + 10, borderRadius: step.boxRound ?? 24, opacity: pulse }]} />
        ) : null}
        {marks.map((r, i) => (
          <Animated.View key={`m${i}`} pointerEvents="none" style={[c.abs, c.mark, { left: r.x - 5, top: r.y - 5, width: r.w + 10, height: r.h + 10, borderRadius: step.markRound ?? 999, opacity: pulse }]} />
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

  // Where the bubble goes: below the spot, else above, else at the top.
  const bubbleH = bubble.key === key ? bubble.h : 0;
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
  // The spot scrolled off screen (you can scroll during the tour): an arrow
  // at that edge points to it, and the tips box stays on screen next to it.
  // Partly off counts too: its top is cut off above, or (if it would fit
  // on screen) its bottom is cut off below.
  // What you can actually see: below the status bar, and above the tab bar
  // (a page scrolls behind it) or the keyboard. A spot that IS in the tab
  // bar, or in a sheet, only stops at the bottom of the screen.
  const inBar = /^tab(\.|bar$)/.test(step.target || '');
  let visBottom = H;
  if (host === 'root' && !inBar && barTop.current) visBottom = barTop.current;
  if (kb) visBottom = Math.min(visBottom, H - kb);
  const fullUp = box.y + box.h < insets.top + 30;
  const fullDown = box.y > visBottom - 30;
  const partUp = !fullUp && box.y < insets.top - 4;
  const partDown = !fullDown && box.h < visBottom - insets.top - 20 && box.y + box.h > visBottom + 6;
  const gone = fullUp || fullDown; // nothing of it left to outline
  const off = fullUp || partUp ? 'up' : fullDown || partDown ? 'down' : null;
  const partly = partUp || partDown;
  if (fullUp) top = insets.top + 62;
  else if (fullDown) top = floor - 62 - bh;
  top = Math.max(insets.top + 6, Math.min(top, floor - bh));
  // The arrow sits at that edge, or just past the tips box if it's there.
  let arrowTop = off === 'up' ? insets.top + 8 : floor - 50;
  if (off === 'up' && top < insets.top + 56) arrowTop = top + bh + 10;
  if (off === 'down' && top + bh > floor - 56) arrowTop = top - 50;
  const ring = (!step.free || step.ring) && !step.noRing;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Spot scrolled right off the screen: no outline left stuck at the
          edge, just the dim (still draggable) and the arrow pointing to it. */}
      {gone && dim ? (
        <View style={[c.abs, { left: 0, top: 0, width: W, height: H + 60, backgroundColor: dim }]} {...dragProps} />
      ) : null}
      {dim && !gone ? (
        <>
          <View style={[c.abs, { left: 0, top: 0, width: W, height: hy, backgroundColor: dim }]} {...dragProps} />
          <View style={[c.abs, { left: 0, top: hy + hh, width: W, height: Math.max(0, H - hy - hh) + 60, backgroundColor: dim }]} {...dragProps} />
          <View style={[c.abs, { left: 0, top: hy, width: hx, height: hh, backgroundColor: dim }]} {...dragProps} />
          <View style={[c.abs, { left: hx + hw, top: hy, width: Math.max(0, W - hx - hw), height: hh, backgroundColor: dim }]} {...dragProps} />
        </>
      ) : null}
      {step.look && !gone ? (
        <View style={[c.abs, { left: hx, top: hy, width: hw, height: hh }]} {...dragProps} />
      ) : null}
      {gone ? null : ring && ringRects && ringRects.length ? ringRects.map((r, i) => (
        <View key={i} pointerEvents="none" style={[c.abs, c.ring, { left: r.x - 4, top: r.y - 4, width: r.w + 8, height: r.h + 8, borderRadius: 999 }]}>
          <View style={[StyleSheet.absoluteFill, c.ringGlow, { borderRadius: 999 }]} />
        </View>
      )) : ring ? (
        <View pointerEvents="none" style={[c.abs, c.ring, { left: hx, top: hy, width: hw, height: hh, borderRadius: step.round ?? 14 }]}>
          <View style={[StyleSheet.absoluteFill, c.ringGlow, { borderRadius: (step.round ?? 14) + 4 }]} />
        </View>
      ) : null}
      {marking ? markRects.filter((r) => r.y + r.h / 2 > insets.top && r.y + r.h / 2 < visBottom).map((r, i) => (
        <Animated.View key={`m${i}`} pointerEvents="none" style={[c.abs, c.mark, { left: r.x - 5, top: r.y - 5, width: r.w + 10, height: r.h + 10, borderRadius: step.markRound ?? 999, opacity: pulse }]} />
      )) : null}
      {off ? (
        <Animated.View style={[c.abs, c.edgeWrap, { top: arrowTop }, { transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, off === 'up' ? -6 : 6] }) }] }]}>
          <Pressable onPress={findSpot} style={c.edge} accessibilityRole="button" accessibilityLabel={off === 'up' ? 'The spot is above. Scroll back to it' : 'The spot is below. Scroll back to it'}>
            <Ionicons name={off === 'up' ? 'arrow-up' : 'arrow-down'} size={16} color="#0A1633" />
            <Text style={c.edgeText}>{partly ? (off === 'up' ? 'Scroll up to see it all' : 'Scroll down to see it all') : (off === 'up' ? 'It’s up here' : 'It’s down here')}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
      <View
        key={key} // a fresh bubble per step, so it's always measured (and shown)
        style={[c.abs, { left: 14, right: 14, top, opacity: bubbleH ? 1 : 0 }]}
        onLayout={(e) => { const h = Math.round(e.nativeEvent.layout.height); setBubble({ key, h }); }}
        {...bubbleDragProps}
      >
        <Bubble run={run} step={step} off={off} onFind={findSpot} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// The speech bubble.
// ---------------------------------------------------------------------------
export function Bubble({ run, step, lost, inline, off, onFind }) {
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
  const [confirm, setConfirm] = useState(false); // "Exit the tour?" showing
  useEffect(() => { setConfirm(false); }, [run.ch, run.step]);
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
        {/* Exit: red and labelled, so it can't be mistaken for a sheet's ×.
            On the writing page (inline tips) it's Hide instead: tuck the tour
            away for more room to write (the "Tour paused" card can end it). */}
        {inline ? (
          <Pressable onPress={() => minimizeTour(true)} hitSlop={8} style={({ pressed }) => [c.hide, d && c.hideDark, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel="Hide the tour for now" accessibilityHint="Gives you more room to write; the tour keeps your place">
            <Ionicons name="chevron-up" size={13} color={d ? '#C9D1E6' : '#1B3FA0'} />
            <Text style={[c.hideText, d && { color: '#C9D1E6' }]}>Hide</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => setConfirm(true)} hitSlop={8} style={({ pressed }) => [c.hideGold, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel="Hide the tour" accessibilityHint="Asks whether to hide the tour for now or exit it">
            <Text style={c.hideGoldText}>Hide</Text>
          </Pressable>
        )}
      </View>
      {confirm ? <ExitConfirm dark={d} onCancel={() => setConfirm(false)} /> : null}
      {confirm ? null : <>
      {showTitle ? <Text style={[c.title, d && { color: '#EEF1F8' }, inline && { fontSize: 14.5, marginTop: 3 }]}>{title}</Text> : null}
      {lost
        ? <Text style={[c.text, d && { color: '#C9D1E6' }]}>This part of the app isn't on screen right now, so this step can't be shown. You can skip it.</Text>
        : text ? <Text style={[c.text, d && { color: '#C9D1E6' }]}>{text}</Text> : null}
      {step.offNote && !lost ? (
        <View style={[c.offNote, d && c.offNoteDark]}>
          <Ionicons name="lock-closed" size={12} color={d ? '#E7B85A' : '#8A5E12'} style={{ marginTop: 2 }} />
          <Text style={[c.offNoteText, d && { color: '#E9DDBE' }]}>{step.offNote}</Text>
        </View>
      ) : null}
      {step.task && !lost ? (
        <View style={[c.task, d ? c.taskDark : c.taskLight, done && c.taskDone]}>
          <View style={{ flex: 1 }}>
            <Text style={[c.taskText, !d && !done && { color: '#0A1633' }]}>
              {done ? <Text style={{ fontWeight: '800' }}>Nice! </Text> : <Text style={[c.your, !d && { color: '#8A5E12' }]}>Your turn: </Text>}
              {done ? (step.doneText || (step.manual ? 'Tap Next when you’re ready.' : 'On to the next bit…')) : step.task}
            </Text>
            {!done && run.progress ? <Text style={[c.prog, !d && { color: '#1E7B3A' }]}>{run.progress}</Text> : null}
          </View>
          {!done && run.frac != null ? <ProgressRing frac={run.frac} light={!d} /> : (
            <View style={[c.check, !d && !done && { borderColor: 'rgba(10,22,51,0.3)' }, done && c.checkOn]}>{done ? <Ionicons name="checkmark" size={14} color="#1E7B3A" /> : null}</View>
          )}
        </View>
      ) : null}
      <View style={c.foot}>
        {/* The spot scrolled away? "Show me" scrolls back to it. */}
        {off && onFind && !lost ? (
          <Pressable onPress={onFind} hitSlop={8} style={({ pressed }) => [c.find, d && c.findDark, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel="Show me: scroll back to the spot">
            <Ionicons name={off === 'up' ? 'arrow-up' : 'arrow-down'} size={13} color={d ? '#C9D1E6' : '#1B3FA0'} />
            <Text style={[c.findText, d && { color: '#C9D1E6' }]}>Show me</Text>
          </Pressable>
        ) : null}
        {/* No ‹ Back or Skip ›: every chapter is done start to finish (Redo is
            on the chapter's last card). Only a step whose spot can't be
            found offers a way past it, so the tour can never get stuck. */}
        {done && step.manual && !lost ? (
          <Pressable onPress={() => armed && nextStep()} style={({ pressed }) => [c.got, !armed && { opacity: 0.45 }, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityState={{ disabled: !armed }}>
            <Text style={c.gotText}>{step.nextLabel || 'Next ›'}</Text>
          </Pressable>
        ) : step.info && !lost ? (
          <Pressable onPress={nextStep} style={({ pressed }) => [c.got, pressed && { opacity: 0.85 }]} accessibilityRole="button">
            <Text style={c.gotText}>Got it ›</Text>
          </Pressable>
        ) : !done && lost ? (
          <Pressable onPress={nextStep} hitSlop={10} accessibilityRole="button" accessibilityHint="Skips this step">
            <Text style={[c.skip, d && { color: '#A7B2CF' }]}>{lost ? 'Skip this step ›' : 'Skip ›'}</Text>
          </Pressable>
        ) : null}
      </View>
      </>}
    </View>
  );
}

// The "Tour paused" card (the tour is hidden while you use the app).
// You tapped another tab during a step: where the tour is, and the way back.
const TAB_NAMES = { Home: 'Home', Calendar: 'Calendar', Brainstorm: 'Brainstorm', Eventbrite: 'Eventbrite', Community: 'Community' };
function AwayCard({ run, step }) {
  const sec = sectionOf(run);
  const where = sec ? `${sec.num} · ${sec.title}` : 'This part of the tour';
  const page = TAB_NAMES[step.tab] || 'its page';
  return (
    <View style={{ gap: 8 }} accessibilityLiveRegion="polite">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="compass" size={20} color="#0A1633" />
        <View style={{ flex: 1 }}>
          <Text style={c.pausedTitle}>You’re still in the tour</Text>
          <Text style={c.pausedSub} numberOfLines={2}>{where} is on {page}.</Text>
        </View>
      </View>
      <View style={c.pausedRow}>
        <Pressable onPress={() => revealTarget(step.target)} style={({ pressed }) => [c.pausedBtn, c.pausedGo, pressed && { opacity: 0.85 }]} accessibilityRole="button">
          <Ionicons name="arrow-back" size={14} color="#FFFFFF" />
          <Text style={[c.pausedBtnText, { color: '#FFFFFF' }]}>Back to {page}</Text>
        </Pressable>
        <Pressable onPress={() => minimizeTour()} style={({ pressed }) => [c.pausedBtn, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel="Hide the tour for now">
          <Ionicons name="eye-off-outline" size={15} color="#0A1633" />
          <Text style={c.pausedBtnText}>Hide tour</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PausedCard({ run, slim }) {
  const [ending, setEnding] = useState(false);
  const sec = sectionOf(run);
  const where = sec ? `${sec.num} · ${sec.title}` : `Chapter ${run.ch + 1}`;
  const btn = (extra) => ({ pressed }) => [c.pausedBtn, extra, slim && c.pausedSlimBtn, pressed && { opacity: 0.85 }];
  const cont = (label = 'Continue', onPress = () => minimizeTour(false)) => (
    <Pressable onPress={onPress} style={btn(c.pausedGo)} accessibilityRole="button" accessibilityLabel={label === 'Continue' ? `Continue the tour at ${where}` : label}>
      <Ionicons name="play" size={13} color="#FFFFFF" />
      <Text style={[c.pausedBtnText, { color: '#FFFFFF' }]}>{label}</Text>
    </Pressable>
  );
  const exit = (
    <Pressable onPress={() => setEnding(true)} style={btn(c.pausedEnd)} accessibilityRole="button" accessibilityLabel="Exit the tour">
      <Ionicons name="stop" size={12} color="#FFFFFF" />
      <Text style={[c.pausedBtnText, { color: '#FFFFFF' }]}>Exit</Text>
    </Pressable>
  );
  if (ending) {
    return (
      <View style={{ gap: 8 }}>
        <Text style={c.pausedTitle}>Exit the tour?</Text>
        <Text style={c.pausedSub}>Chapters you’ve finished stay done. Start it again any time from ⚙ Settings on Home.</Text>
        <View style={c.pausedRow}>
          {cont('Continue', () => setEnding(false))}
          <Pressable onPress={stopTour} style={btn(c.pausedEnd)} accessibilityRole="button">
            <Ionicons name="stop" size={12} color="#FFFFFF" />
            <Text style={[c.pausedBtnText, { color: '#FFFFFF' }]}>Exit tour</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  // Slim (the writing page): one row, so your words keep the room.
  // When the step's task got done while hidden, it shows a ✓ instead.
  // With a goal (step.goal), it shows it with a box that ticks when done:
  // "TOUR HIDDEN / ☐ Goal: 3 of 5 words".
  if (slim) {
    const ok = !!run.taskDone;
    const st = stepOf(run);
    let goal = st?.goal;
    try { goal = typeof goal === 'function' ? goal(run) : goal; } catch { goal = null; }
    if (goal) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name={ok ? 'checkbox' : 'square-outline'} size={20} color={ok ? '#2E7D4F' : '#0A1633'} />
          <View style={{ flex: 1 }}>
            <Text style={[c.pausedSub, { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8 }]} numberOfLines={1}>{ok ? 'GOAL REACHED ✓' : 'TOUR HIDDEN · GOAL'}</Text>
            <Text style={[c.pausedTitle, { fontSize: 13.5 }, ok && { color: '#2E7D4F' }]} numberOfLines={1}>{goal}</Text>
          </View>
          {cont()}
          {exit}
        </View>
      );
    }
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={ok ? 'checkmark-circle' : 'pause-circle'} size={17} color={ok ? '#2E7D4F' : '#0A1633'} />
        <Text style={[c.pausedTitle, { flex: 1, fontSize: 13.5 }, ok && { color: '#2E7D4F' }]} numberOfLines={1}>{ok ? 'Goal reached!' : 'Tour hidden'}</Text>
        {cont()}
        {exit}
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="pause-circle" size={18} color="#0A1633" />
        <View style={{ flex: 1 }}>
          <Text style={c.pausedTitle}>Tour paused</Text>
          <Text style={c.pausedSub} numberOfLines={1}>You were on {where}</Text>
        </View>
      </View>
      <View style={c.pausedRow}>
        {cont()}
        {exit}
        <Pressable onPress={() => openTour('__list')} style={btn(null)} accessibilityRole="button" accessibilityLabel="Pick another chapter">
          <Ionicons name="list" size={15} color="#0A1633" />
          <Text style={c.pausedBtnText}>Chapters</Text>
        </Pressable>
      </View>
    </View>
  );
}

// "Hide the tour?" — shown in the tips box when you tap Hide. Hide keeps
// your place (a "Tour paused" card stays on screen); Exit tour ends it.
function ExitConfirm({ dark, onCancel }) {
  return (
    <View style={{ marginTop: 6, gap: 6 }}>
      <Text style={[c.title, dark && { color: '#EEF1F8' }]}>Hide the tour?</Text>
      <Text style={[c.text, dark && { color: '#C9D1E6' }]}>Hide it to use the app for a bit: the tour keeps your place, and you can carry on any time. Or exit the tour: chapters you’ve finished stay done, and you can come back to it from ⚙ Settings on the Home screen.</Text>
      <View style={c.confirmRow}>
        <Pressable onPress={onCancel} style={({ pressed }) => [c.goBig, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel="Continue the tour">
          <Ionicons name="play" size={12} color="#FFFFFF" />
          <Text style={c.gotText}>Continue</Text>
        </Pressable>
        <Pressable onPress={() => minimizeTour(true)} style={({ pressed }) => [c.hideBig, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityHint="Hides the tour but keeps your place">
          <Ionicons name="pause" size={13} color="#0A1633" />
          <Text style={c.hideGoldText}>Hide</Text>
        </Pressable>
        <Pressable onPress={stopTour} style={({ pressed }) => [c.exitBig, pressed && { opacity: 0.85 }]} accessibilityRole="button">
          <Ionicons name="stop" size={12} color="#FFFFFF" />
          <Text style={c.gotText}>Exit tour</Text>
        </Pressable>
      </View>
    </View>
  );
}

// How far along the task is (5 words, 3 levels…), as a small filling ring.
function ProgressRing({ frac, light }) {
  const r = 10;
  const len = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, frac));
  return (
    <Svg width={26} height={26} viewBox="0 0 26 26">
      <Circle cx={13} cy={13} r={r} stroke={light ? 'rgba(10,22,51,0.15)' : 'rgba(255,255,255,0.25)'} strokeWidth={3.5} fill="none" />
      <Circle cx={13} cy={13} r={r} stroke={light ? '#1E9E50' : '#6FD49A'} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeDasharray={`${len * f} ${len}`} rotation={-90} origin="13, 13" />
    </Svg>
  );
}

// The tip inside the page, for steps marked inline, so it never covers what
// it's about. On the writing page (<TourInline />, inline: true) it sits
// under the rings and the prompt. Elsewhere a page places one per spot
// (<TourInline at="cal.grid" />) and a step picks it with inline: 'cal.grid'.
// flush: no side inset (for a spot already inside the page's padding):
// the Calendar shows its tips right under the top cards, or at the top of
// the calendar card, like a part of the page.
export function TourInline({ at = null, flush = false, top = 0 }) {
  const run = useRun();
  const step = stepOf(run);
  if (!run || !step || !step.inline) return null;
  if (at ? step.inline !== at : step.inline !== true) return null;
  if (run.min) {
    return (
      <View style={[c.pausedStrip, { marginHorizontal: flush ? 0 : 14, marginBottom: 8, marginTop: top }]}>
        <PausedCard run={run} slim />
      </View>
    );
  }
  // Registered as a spot of its own, so the tour can outline what's below it.
  return (
    <TourTarget id={typeof step.inline === 'string' ? `inline:${step.inline}` : null} style={{ marginHorizontal: flush ? 0 : 14, marginBottom: 8, marginTop: top }}>
      <Bubble run={run} step={step} inline />
    </TourTarget>
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
        Thank you for downloading our app! This is an interactive tutorial: you tap the real buttons as you go. Upon completion, you’ll have earned the following medals:
      </Text>
      <View style={[c.medalList, { borderColor: colors.line }]}>
        <Text style={[c.medalHead, { color: colors.muted }]}>THE TOUR GUIDE MEDAL</Text>
        {[
          ['bronze', 'Bronze', 'when you set today’s goal'],
          ['silver', 'Silver', 'when you save your first entry'],
          ['gold', 'Gold', 'when you’ve explored the Calendar'],
          ['diamond', 'Diamond', 'upon completion of this tour'],
        ].map(([tier, name, when]) => (
          <View key={tier} style={c.medalRow}>
            <Medal medal={TOUR_MEDAL} tier={tier} size={26} />
            <Text style={[c.medalText, { color: colors.body }]}><Text style={{ fontWeight: '800', color: colors.ink }}>{name}</Text> {when}</Text>
          </View>
        ))}
      </View>
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
// Each medal's name in its own colour.
const TIER_TINT = { Bronze: '#C98A52', Silver: '#AEB6C7', Gold: '#E0AE45', Diamond: '#9D8CFF' };

const TIER_NAME = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', diamond: 'Diamond' };
// What each Tour Guide tier celebrates (Bronze 3 · Silver 6 · Gold 9 · Diamond 10 chapters).
const TIER_CHEER = {
  bronze: 'Congratulations, you set your first goals! Cheers to many more to come.',
  silver: 'Congrats on your first Brainstorm entry! Many more on the way.',
  gold: 'You’ve seen your calendar and everything you’ve built. Nearly there!',
  diamond: 'You finished the whole tour. Welcome to Pen Parentis!',
};

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
          <Text style={[c.cardText, { color: colors.body, marginTop: 2 }]}>{TIER_CHEER[won.earnedTier] || `Chapter ${ch + 1} done.`}</Text>
        </>
      ) : (
        <>
          <View style={c.bigCheck}><Ionicons name="checkmark" size={32} color="#FFFFFF" /></View>
          <Text style={[c.cardTitle, { color: colors.ink }]}>Chapter {ch + 1} done</Text>
        </>
      )}
      <Text style={[c.cardText, { color: colors.body }]}>
        {n} of {ids.length} chapters
        {nextTier ? <Text> · {nextTier[0] - n} more for the <Text style={{ fontWeight: '800', color: TIER_TINT[nextTier[1]] }}>{nextTier[1]} Tour Guide</Text> medal</Text> : null}
      </Text>
      <View style={[c.track, { backgroundColor: colors.line }]}><View style={[c.fill, { width: `${Math.max(4, (n / ids.length) * 100)}%`, backgroundColor: colors.royal }]} /></View>
      <View style={c.cardRow}>
        <Pressable onPress={() => startChapter(ch)} style={[c.cardBtn, { borderColor: colors.royal, borderWidth: 1.5 }]} accessibilityRole="button" accessibilityLabel={`Redo chapter ${ch + 1}`}>
          <Text style={[c.cardBtnText, { color: colors.royal }]}>↺ Redo chapter</Text>
        </Pressable>
        <Pressable onPress={goNext} style={[c.cardBtn, c.cardBtnFill]} accessibilityRole="button">
          {next ? <Text style={c.nextKick}>NEXT</Text> : null}
          <Text style={[c.cardBtnText, { color: '#FFFFFF' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{next ? `${next.short || next.title} ›` : 'All chapters ›'}</Text>
        </Pressable>
      </View>
      <View style={c.cardLinks}>
        <Pressable onPress={stopTour} hitSlop={8} accessibilityRole="button">
          <Text style={[c.cardNote, { color: colors.royal, fontWeight: '800', marginTop: 0 }]}>Take a break</Text>
        </Pressable>
        <Pressable onPress={() => openTour('__list')} hitSlop={8} accessibilityRole="button">
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
  paused: { position: 'absolute', left: 14, right: 14, backgroundColor: GOLD, borderRadius: 16, padding: 12, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 8 },
  pausedStrip: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 10 },
  pausedTitle: { fontSize: 14.5, fontWeight: '800', color: '#0A1633' },
  pausedSub: { fontSize: 12.5, color: '#3A2C08' },
  pausedRow: { flexDirection: 'row', gap: 8 },
  pausedBtn: { flex: 1, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.55)' },
  pausedGo: { backgroundColor: '#1E7B3A' }, // green, like every "go on" button
  pausedSlimBtn: { flex: 0, paddingHorizontal: 11, paddingVertical: 6 },
  pausedEnd: { backgroundColor: '#C62F2F' },
  pausedEndOutline: { backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1.5, borderColor: '#B42626' },
  pausedBtnText: { fontSize: 13, fontWeight: '800', color: '#0A1633' },
  pill: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: GOLD, borderRadius: 999, paddingLeft: 12, paddingRight: 4, paddingVertical: 4, gap: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 8 },
  pillMain: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pillText: { fontSize: 13, fontWeight: '800', color: '#0A1633' },
  pillEnd: { backgroundColor: 'rgba(10,22,51,0.15)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  pillEndText: { fontSize: 11.5, fontWeight: '800', color: '#0A1633' },
  mark: { borderWidth: 3, borderColor: GOLD, backgroundColor: 'rgba(242,193,78,0.10)' },
  ringGlow: { margin: -6, borderWidth: 4, borderColor: 'rgba(242,193,78,0.28)' },
  centerWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', paddingHorizontal: 18 },
  bubbleDark: { backgroundColor: '#1C2541', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  // Light mode: a pale blue box with dark text, to match the light bubble.
  taskLight: { backgroundColor: '#EEF2FB', borderWidth: 1, borderColor: '#C9D3EE' },
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
  exit: { backgroundColor: '#C62F2F', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4 },
  exitText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  hide: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1.5, borderColor: '#1B3FA0' },
  hideDark: { borderColor: 'rgba(201,209,230,0.6)' },
  hideText: { color: '#1B3FA0', fontWeight: '800', fontSize: 12 },
  exitBig: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#C62F2F', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12 },
  hideGold: { backgroundColor: GOLD, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4 },
  hideGoldText: { color: '#0A1633', fontWeight: '800', fontSize: 12.5 },
  hideBig: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: GOLD, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12 },
  confirmRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  goBig: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1E7B3A', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12 },
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
  got: { backgroundColor: '#1E7B3A', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 14 }, // green: on to the next bit
  find: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1.5, borderColor: '#1B3FA0' },
  findDark: { borderColor: 'rgba(201,209,230,0.6)' },
  findText: { color: '#1B3FA0', fontWeight: '800', fontSize: 13 },
  offNote: { flexDirection: 'row', gap: 7, marginTop: 8, padding: 9, borderRadius: 10, backgroundColor: 'rgba(242,193,78,0.16)' },
  offNoteDark: { backgroundColor: 'rgba(242,193,78,0.12)' },
  offNoteText: { flex: 1, fontSize: 12.5, lineHeight: 17, color: '#5C4210' },
  edgeWrap: { left: 0, right: 0, alignItems: 'center' },
  edge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GOLD, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  edgeText: { color: '#0A1633', fontWeight: '800', fontSize: 13 },
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
  medalList: { borderWidth: 1, borderRadius: 14, padding: 10, marginTop: 14, gap: 6 },
  medalHead: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  medalRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  medalText: { flex: 1, fontSize: 13.5 },
  wonKick: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: '#C8912B', textAlign: 'center' },
  nextKick: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1, color: 'rgba(255,255,255,0.75)' },
  cardLinks: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 14 },
  bigCheck: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#1E7B3A', alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  track: { height: 8, borderRadius: 4, marginTop: 14, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
