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
import { setTourChapterDone, setTourChapters, setTourEarned, setTourNavigator, stopTour } from '../tourRun';
import { markChapter, openTour } from '../tour';
import { syncMedals } from '../writingStore';

setTourChapters(CHAPTERS);

export default function TourOverlay({ navRef }) {
  useEffect(() => {
    setTourNavigator((go) => {
      const nav = navRef?.current;
      if (!nav || !nav.isReady?.()) return;
      if (go.tab === 'Brainstorm') nav.navigate('Brainstorm', { screen: 'BrainstormHome' });
      else if (go.tab) nav.navigate(go.tab);
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
    return () => { setTourNavigator(null); setTourChapterDone(null); };
  }, [navRef]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TourLayer host="root" />
    </View>
  );
}
