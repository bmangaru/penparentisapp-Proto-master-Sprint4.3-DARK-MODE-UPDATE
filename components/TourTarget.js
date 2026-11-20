// components/TourTarget.js — marks a spot the app tour can point at.
//   <TourTarget id="home.settings"><Pressable …/></TourTarget>
// It's a plain View (style passes through); with no id it's just a View.
//
// It also remembers which page it's on, so the tour can tell when that page
// is covered (e.g. Medals opened on top of Brainstorm, or another tab is
// showing) and bring the page back instead of outlining whatever is on top.
//
// It draws the tour's pulsing gold outline itself, as part of the page, so
// the outline moves with the button when you scroll or swipe (drawn on top
// of the app, it trailed a little behind):
//   • a step's "tap here" marks (step.marks includes this id), and while the
//     tour is hidden, on a step you're still doing;
//   • the in-page step's box: the spot minus its tip (measured by the tour
//     layer, relative to the spot), or just this spot (step.box).

import React, { useContext, useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { NavigationContext, NavigationRouteContext } from '@react-navigation/native';
import { TourHostContext, TourScrollContext, marksOf, registerTarget, stepOf, usePulseBox, useRun } from '../tourRun';

export default function TourTarget({ id, style, children, ringIn = false, ...rest }) {
  const ref = useRef(null);
  const host = useContext(TourHostContext);
  const scroll = useContext(TourScrollContext);
  // The page this spot is on (none for the tab bar: it's always showing).
  const nav = useContext(NavigationContext);
  const route = useContext(NavigationRouteContext);
  const navNow = useRef(nav);
  navNow.current = nav;
  const routeKey = route?.key || null;
  useEffect(() => (id
    ? registerTarget(id, {
      ref, host, scroll, routeKey,
      // Is its page the one showing right now?
      onScreen: () => {
        const n = navNow.current;
        return !n || typeof n.isFocused !== 'function' || n.isFocused();
      },
    })
    : undefined), [id, host, scroll, routeKey]);
  const run = useRun();
  const st = id && run && run.phase === 'step' ? stepOf(run) : null;
  const box = usePulseBox(id);
  const marks = marksOf(st, run); // (step.marks can be worked out from what you did)
  const isMark = !!(st && marks.includes(id) && (!run.min || (st.inline && st.task && !run.taskDone)));
  const showBox = !!(box && st && !run.min && typeof st.inline === 'string' && !marks.length && !st.noBox);
  let ring = null;
  if (isMark) {
    // ringIn: on the spot's own edge, for full-width buttons in a sheet (an
    // outline outside them gets cut off at the sheet's sides).
    const p = ringIn ? 0 : 5;
    ring = { top: -p, left: -p, right: -p, bottom: -p, borderRadius: st.markRound ?? 999 };
  } else if (showBox) {
    const p = st.boxPad ?? (st.box ? 8 : 5);
    const r = st.boxRound ?? 24;
    ring = box.full
      ? { top: -p, left: -p, right: -p, bottom: -p, borderRadius: r }
      : { top: box.top - p, left: box.left - p, width: box.width + p * 2, height: box.height + p * 2, borderRadius: r };
  }
  return (
    <View ref={ref} collapsable={false} style={style} {...rest}>
      {children}
      {ring ? <Pulse style={ring} /> : null}
    </View>
  );
}

// The breathing gold outline.
function Pulse({ style }) {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 0.2, duration: 600, useNativeDriver: true }),
      Animated.timing(v, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View pointerEvents="none" style={[styles.ring, style, { opacity: v }]} />;
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', borderWidth: 3, borderColor: '#F2C14E', backgroundColor: 'rgba(242,193,78,0.10)' },
});
