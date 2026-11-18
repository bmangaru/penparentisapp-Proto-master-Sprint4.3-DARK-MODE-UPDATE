// components/TourOverlay.js — the running tour over the whole app (App.js
// puts it above the navigation, outside the part an Appearance switch
// redraws, so a switch doesn't stop the tour).
//   • Moves the app for a step (e.g. to the Home tab first).
//   • When a chapter finishes: ticks it; a new Tour Guide tier shows on the
//     chapter's card.
//     The first time every chapter is done, the thank-you & credits follow.

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import TourLayer from './TourLayer';
import { CHAPTERS, CHAPTER_IDS } from './TourContent';
import { CommonActions, StackActions } from '@react-navigation/native';
import { setTourChapterDone, setTourChapters, setTourEarned, setTourNavigator, setTourReveal, stopTour } from '../tourRun';
import { markChapter, openTour } from '../tour';
import { syncMedals } from '../writingStore';

setTourChapters(CHAPTERS);

// The way from the top of the navigation to a page: [{ state, i }], where
// state.routes[i] leads to it at each level. null if it isn't there.
function pathTo(state, key, out = []) {
  if (!state?.routes) return null;
  for (let i = 0; i < state.routes.length; i += 1) {
    const r = state.routes[i];
    const here = [...out, { state, i }];
    if (r.key === key) return here;
    const deeper = pathTo(r.state, key, here);
    if (deeper) return deeper;
  }
  return null;
}
// The first route anywhere in the navigation that matches.
function findRoute(state, match) {
  if (!state?.routes) return null;
  for (const route of state.routes) {
    if (match(route)) return { route, parent: state };
    const deeper = findRoute(route.state, match);
    if (deeper) return deeper;
  }
  return null;
}

export default function TourOverlay({ navRef }) {
  useEffect(() => {
    // A step on a tab: go to that tab, on its first page (not Medals, a
    // day or the writing page left open on top of Brainstorm).
    setTourNavigator((go) => {
      const nav = navRef?.current;
      if (!nav || !nav.isReady?.() || !go.tab) return;
      nav.navigate(go.tab);
      const tab = findRoute(nav.getRootState(), (r) => r.name === go.tab);
      const inner = tab?.route.state;
      if (inner?.type === 'stack' && inner.key && inner.index > 0) {
        nav.dispatch({ ...StackActions.popToTop(), target: inner.key });
      }
    });
    // A step's spot is on a page that's covered: show that page. Every
    // navigator on the way to it switches to it (the tab), and anything
    // opened on top of it is closed (a stack goes back to it). The writing
    // page saves itself when it's closed, so nothing is lost.
    setTourReveal((routeKey) => {
      const nav = navRef?.current;
      if (!nav || !nav.isReady?.()) return;
      const path = pathTo(nav.getRootState(), routeKey);
      if (!path) return;
      path.forEach(({ state, i }) => {
        if (!state.key) return;
        if (state.type === 'stack') {
          if (state.index > i) nav.dispatch({ ...StackActions.pop(state.index - i), target: state.key });
        } else if (state.index !== i) {
          nav.dispatch({ ...CommonActions.navigate({ name: state.routes[i].name }), target: state.key });
        }
      });
    });
    setTourChapterDone(async (idx) => {
      const first = await markChapter(CHAPTERS[idx].id, CHAPTER_IDS);
      const { newlyEarned } = await syncMedals();
      // A new Tour Guide tier shows on the chapter's card (not a pop-up,
      // which iOS can't show while a sheet is closing).
      const tiers = newlyEarned.filter((m) => m.id === 'tour');
      if (tiers.length) setTourEarned(tiers);
      if (first) { stopTour(); setTimeout(() => openTour('__end'), 300); }
    });
    return () => { setTourNavigator(null); setTourReveal(null); setTourChapterDone(null); };
  }, [navRef]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TourLayer host="root" />
    </View>
  );
}
