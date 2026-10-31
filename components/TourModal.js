// components/TourModal.js — the app tour's full-screen page: the chapter
// list, the chapters that are still cards, and the thank-you at the end.
// (Chapters with steps run on the real app instead: tourRun.js / TourLayer.js.)
//   • Chapters: the list, with ✓ on finished ones (tap any to do or redo it).
//   • A chapter: its cards one at a time (picture, title, words, Try it),
//     with dots, ‹ Back and Next ›. The last card's "Done ✓" ticks the chapter
//     and moves on to the next one.
//   • Each card's task sits in a dark bar ("Your turn: …", with progress);
//     it turns green ✓ when done and Next unlocks (or Skip ›).
//   • Finished chapters earn the Tour Guide medal: Bronze 3 · Silver 6 ·
//     Gold 9 · Diamond 10 (pops up over the tour).
//   • The end (after the last chapter, or once every chapter is ticked): then a thank-you with Get Karma,
//     the credits, and "Start writing".
// "Try it" closes the tour and opens the real thing; Home's card (or
// Settings) brings you back to the same chapter.
// App.js renders it once and passes the navigation ref; open it from anywhere
// with openTour() in tour.js.

import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MedalPopup from './MedalPopup';
import Medal from './Medal';
import { openLink } from './ui';
import { CHAPTERS, CHAPTER_IDS } from './TourContent';
import { Credits } from '../screens/CommunitiesScreen';
import { colors, gradients, lift, radius, space, themed } from '../theme';
import { LINKS } from '../links';
import { MEDALS } from '../medals';
import { markChapter, setTourOpener, useTour } from '../tour';
import { startChapter, stopTour } from '../tourRun';
import { syncMedals } from '../writingStore';
import { promptForDay } from '../prompts';
import { dayKey } from '../writingLogic';

const TOUR_MEDAL = MEDALS.find((m) => m.id === 'tour');

export default function TourModal({ navRef }) {
  const insets = useSafeAreaInsets();
  const tour = useTour();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'chapter' | 'end'
  const [ch, setCh] = useState(0);
  const [card, setCard] = useState(0);
  const [medals, setMedals] = useState([]);
  // The current card's task: done yet, and the progress line ("3 of 5 tabs seen").
  const [taskDone, setTaskDone] = useState(false);
  const [progress, setProgress] = useState('');
  useEffect(() => { setTaskDone(false); setProgress(''); }, [ch, card, view]);
  const scroll = useRef(null);

  // openTour(chapterId?) from Home, Settings… Without an id: the next
  // unfinished chapter (or the list once they're all done).
  // Chapters that run on the real app (components/TourLayer.js) start there;
  // this page closes first.
  function begin(idx) {
    if (CHAPTERS[idx]?.steps) {
      setOpen(false);
      setTimeout(() => startChapter(idx), open ? 400 : 0);
      return;
    }
    stopTour();
    setCh(idx); setCard(0); setView('chapter'); setOpen(true);
  }

  // openTour(chapterId?) from Home, Settings… Without an id: the next
  // unfinished chapter (or the list once they're all done). '__list' and
  // '__end' open the chapter list and the thank-you.
  useEffect(() => {
    setTourOpener((id) => {
      if (id === '__list' || id === '__end') { stopTour(); setView(id === '__end' ? 'end' : 'list'); setOpen(true); return; }
      const done = tour?.done || {};
      const idx = id ? CHAPTER_IDS.indexOf(id) : CHAPTER_IDS.findIndex((c) => !done[c]);
      if (idx >= 0) begin(idx);
      else { stopTour(); setView('list'); setOpen(true); }
    });
    return () => setTourOpener(null);
  }, [tour, open]);

  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [view, ch, card]);

  const chapter = CHAPTERS[ch];
  const done = tour?.done || {};
  const doneCount = CHAPTER_IDS.filter((id) => done[id]).length;

  async function finishChapter() {
    const first = await markChapter(chapter.id, CHAPTER_IDS);
    const nowDone = { ...done, [chapter.id]: true };
    // Chapters count toward the Tour Guide medal: Bronze 3 · Silver 6 · Gold 9 ·
    // Diamond 10. A new tier pops up over the tour.
    const { newlyEarned } = await syncMedals();
    const tourTiers = newlyEarned.filter((m) => m.id === 'tour');
    if (tourTiers.length) setMedals(tourTiers);
    if (first) { setView('end'); return; }
    // Otherwise: on to the next chapter; after the last one, the end (or the
    // list, if some chapters were skipped).
    if (ch + 1 < CHAPTERS.length) { begin(ch + 1); return; }
    setView(CHAPTER_IDS.every((id) => nowDone[id]) ? 'end' : 'list');
  }

  // "Try it": close the tour and open the real thing.
  function tryIt(go) {
    setOpen(false);
    const nav = navRef?.current;
    if (!nav) return;
    const at = Date.now();
    setTimeout(() => {
      if (go === 'plan') nav.navigate('Brainstorm', { screen: 'BrainstormHome', params: { tour: 'plan', at } });
      if (go === 'offline') nav.navigate('Brainstorm', { screen: 'BrainstormHome', params: { tour: 'offline', at } });
      if (go === 'write') nav.navigate('Brainstorm', { screen: 'BrainstormWriter', initial: false });
      if (go === 'prompt') nav.navigate('Brainstorm', { screen: 'BrainstormWriter', params: { prompt: promptForDay(dayKey(), 'simple') }, initial: false });
      if (go === 'share') nav.navigate('Calendar', { tour: 'share', at });
    }, 300);
  }

  function startWriting() {
    setOpen(false);
    setTimeout(() => navRef?.current?.navigate('Brainstorm', { screen: 'BrainstormHome' }), 300);
  }

  const header = (left, title, right) => (
    <View style={[s.top, { paddingTop: insets.top + 10 }]}>
      <View style={s.topSide}>{left}</View>
      <Text style={s.topTitle} numberOfLines={1}>{title}</Text>
      <View style={[s.topSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
  const close = (
    <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close the tour">
      <Ionicons name="close" size={24} color={colors.royal} />
    </Pressable>
  );

  let body = null;
  if (view === 'list') {
    body = (
      <>
        {header(null, `The tour · ${doneCount} of ${CHAPTERS.length}`, close)}
        <ScrollView ref={scroll} contentContainerStyle={[s.pad, { paddingBottom: insets.bottom + 30 }]}>
          <Text style={s.lead}>Short chapters, about 5 minutes in all. Do them in order or jump to any one; tap a finished chapter to go over it again.</Text>
          {CHAPTERS.map((c, i) => {
            const isDone = !!done[c.id];
            return (
              <Pressable key={c.id} onPress={() => begin(i)} style={({ pressed }) => [s.ch, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel={`${c.title}${isDone ? ', done' : ''}`}>
                <View style={[s.num, isDone ? s.numDone : s.numTodo]}>
                  {isDone ? <Ionicons name="checkmark" size={17} color="#FFFFFF" /> : <Text style={s.numText}>{i + 1}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.chTitle}>{c.title}</Text>
                  <Text style={s.chSub}>{c.sub}</Text>
                </View>
                <Text style={s.chGo}>{isDone ? 'Redo' : 'Start ›'}</Text>
              </Pressable>
            );
          })}
          {doneCount === CHAPTERS.length ? (
            <Pressable onPress={() => setView('end')} style={s.endLink} accessibilityRole="button">
              <Text style={s.endLinkText}>Thank-you & credits ›</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </>
    );
  } else if (view === 'chapter' && chapter.cards) {
    const c = chapter.cards[card];
    const last = card === chapter.cards.length - 1;
    const locked = !!c.task && !taskDone;
    const Step = c.Step;
    const words = (
      <>
        <Text style={[s.title, c.fill && { marginTop: 4, fontSize: 18 }]}>{c.title}</Text>
        <Text style={[s.body, c.fill && { fontSize: 14, lineHeight: 20 }]}>{c.body}</Text>
      </>
    );
    const tryBox = c.try ? (
      <Pressable onPress={() => tryIt(c.try.go)} style={({ pressed }) => [s.try, pressed && { opacity: 0.85 }]} accessibilityRole="button">
        <Text style={s.tryText}>Ready for the real thing? {c.try.label}.</Text>
        <Text style={s.tryBtn}>Open ›</Text>
      </Pressable>
    ) : null;
    body = (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {header(
          <Pressable onPress={() => setView('list')} hitSlop={10} accessibilityRole="button"><Text style={s.topLink}>‹ Chapters</Text></Pressable>,
          `${ch + 1} · ${chapter.title}`,
          close,
        )}
        <View style={s.steps}>
          {chapter.cards.map((_, i) => <View key={i} style={[s.step, i < card && s.stepDone, i === card && s.stepOn]} />)}
        </View>
        {c.task ? (
          <View style={[s.task, taskDone && s.taskDone]} accessibilityLiveRegion="polite">
            <View style={{ flex: 1 }}>
              <Text style={s.taskText}>
                {taskDone ? <Text style={{ fontWeight: '800' }}>Nice! </Text> : <Text style={s.taskYour}>Your turn: </Text>}
                {taskDone ? 'Tap Next when you’re ready.' : c.task}
              </Text>
              {!taskDone && progress ? <Text style={s.taskProg}>{progress}</Text> : null}
            </View>
            <View style={[s.check, taskDone && s.checkOn]}>{taskDone ? <Ionicons name="checkmark" size={16} color="#1E7B3A" /> : null}</View>
          </View>
        ) : null}
        {c.fill ? (
          <View style={[s.pad, { flex: 1, paddingBottom: 8 }]}>
            {words}
            <View style={{ flex: 1, marginTop: 10 }}>
              <Step key={`${ch}-${card}`} onDone={() => setTaskDone(true)} onProgress={setProgress} />
            </View>
          </View>
        ) : (
          <ScrollView ref={scroll} contentContainerStyle={[s.pad, { paddingBottom: 30 }]} keyboardShouldPersistTaps="handled">
            <View style={Step ? null : s.art}>
              {Step ? <Step key={`${ch}-${card}`} onDone={() => setTaskDone(true)} onProgress={setProgress} /> : c.art}
            </View>
            {words}
            {tryBox}
          </ScrollView>
        )}
        <View style={[s.nav, { paddingBottom: insets.bottom + 14 }]}>
          <Pressable onPress={() => (card ? setCard(card - 1) : setView('list'))} style={[s.navBtn, s.navOut]} accessibilityRole="button">
            <Text style={[s.navText, { color: colors.royal }]}>‹ Back</Text>
          </Pressable>
          <Pressable
            onPress={() => (last ? finishChapter() : setCard(card + 1))}
            style={[s.navBtn, locked ? s.navLocked : s.navFill]}
            accessibilityRole="button"
            accessibilityHint={locked ? 'Do the task first, or skip it' : undefined}
          >
            <Text style={[s.navText, { color: '#FFFFFF' }]}>{locked ? 'Skip ›' : last ? 'Done ✓' : 'Next ›'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  } else if (view === 'end') {
    body = (
      <>
        {header(
          <Pressable onPress={() => setView('list')} hitSlop={10} accessibilityRole="button"><Text style={s.topLink}>‹ Chapters</Text></Pressable>,
          'Tour complete',
          close,
        )}
        <ScrollView ref={scroll} contentContainerStyle={[s.pad, { paddingBottom: insets.bottom + 30 }]}>
          <View style={s.medalRow}>
            <Medal medal={TOUR_MEDAL} tier="diamond" size={76} />
            <View style={{ flex: 1 }}>
              <Text style={s.kick}>💎 DIAMOND TOUR GUIDE</Text>
              <Text style={s.small}>Every chapter done. You've seen everything Pen Parentis can do. Welcome in!</Text>
            </View>
          </View>

          <Text style={[s.kick, { textAlign: 'center', marginTop: space.lg }]}>THANK YOU FOR TAKING THE TOUR</Text>
          <Text style={[s.title, { textAlign: 'center' }]}>Keep the salons free</Text>
          <Text style={[s.body, { textAlign: 'center' }]}>Pen Parentis is a nonprofit. If the app helps you write, consider a gift through Get Karma.</Text>
          <Pressable onPress={() => openLink(LINKS.donate)}>
            <LinearGradient colors={gradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.karma, lift]}>
              <View style={{ flex: 1 }}>
                <Text style={s.karmaTitle}>Get Karma</Text>
                <Text style={s.karmaSub}>Keep the salons free for the next parent</Text>
              </View>
              <View style={s.give}><Text style={s.giveText}>Give</Text></View>
            </LinearGradient>
          </Pressable>

          <Credits />

          <Pressable onPress={startWriting} style={[s.navBtn, s.navFill, { flex: 0 }]} accessibilityRole="button">
            <Text style={[s.navText, { color: '#FFFFFF' }]}>Start writing</Text>
          </Pressable>
        </ScrollView>
      </>
    );
  }

  return (
    <Modal visible={open} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setOpen(false)}>
      <View style={s.screen}>{body}</View>
      {medals.length ? (
        <MedalPopup
          medals={medals}
          onClose={() => setMedals([])}
          onSeeMedals={() => { setMedals([]); setOpen(false); setTimeout(() => navRef?.current?.navigate('Brainstorm', { screen: 'Medals', initial: false }), 300); }}
        />
      ) : null}
    </Modal>
  );
}

const s = themed(() => ({
  screen: { flex: 1, backgroundColor: colors.paper },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingBottom: 8 },
  topSide: { width: 92 },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 13.5, fontWeight: '700', color: colors.muted },
  topLink: { fontSize: 14, fontWeight: '800', color: colors.royal },
  pad: { padding: space.lg, paddingTop: 6 },
  lead: { fontSize: 13.5, lineHeight: 20, color: colors.body, marginBottom: 12 },
  ch: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12, marginBottom: 8 },
  num: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  numDone: { backgroundColor: '#1E7B3A' },
  numTodo: { backgroundColor: '#EEF1F7' },
  numText: { fontSize: 13, fontWeight: '800', color: colors.muted },
  chTitle: { fontSize: 14.5, fontWeight: '700', color: colors.ink },
  chSub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  chGo: { fontSize: 12.5, fontWeight: '800', color: colors.royal },
  endLink: { alignItems: 'center', marginTop: 8, padding: 10 },
  endLinkText: { fontSize: 14, fontWeight: '800', color: colors.royal },
  steps: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 6 },
  step: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#C8CEDE' },
  stepDone: { backgroundColor: '#1E7B3A' },
  stepOn: { width: 22, backgroundColor: colors.royal },
  art: { backgroundColor: '#EEF2FB', borderRadius: 18, padding: 14 },
  title: { fontSize: 21, fontWeight: '800', color: colors.ink, marginTop: 16 },
  body: { fontSize: 15, lineHeight: 22, color: colors.body, marginTop: 6 },
  try: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF4D6', borderWidth: 1, borderColor: '#F0D48A', borderRadius: 12, padding: 12, marginTop: 14 },
  tryText: { flex: 1, fontSize: 13, color: '#5C4A2A' },
  tryBtn: { fontSize: 12.5, fontWeight: '800', color: '#FFFFFF', backgroundColor: '#C8912B', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, overflow: 'hidden' },
  tryNote: { fontSize: 11.5, color: colors.muted, marginTop: 6 },
  nav: { flexDirection: 'row', gap: 10, paddingHorizontal: space.lg, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.paper },
  navBtn: { flex: 1, minHeight: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  navOut: { borderWidth: 2, borderColor: colors.royal },
  navFill: { backgroundColor: colors.royal },
  navLocked: { backgroundColor: '#9AA3BA' },
  task: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: space.lg, marginBottom: 6, backgroundColor: '#0A1633', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 },
  taskDone: { backgroundColor: '#1E7B3A' },
  taskText: { fontSize: 13.5, lineHeight: 19, color: '#FFFFFF' },
  taskYour: { fontWeight: '800', color: '#F2C14E' },
  taskProg: { fontSize: 11.5, fontWeight: '800', color: '#9BE3B0', marginTop: 2 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  navText: { fontSize: 15, fontWeight: '700' },
  medalRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#F7F5FF', borderRadius: 18, padding: 14 },
  kick: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: '#4B3FB8' },
  small: { fontSize: 13, lineHeight: 19, color: colors.body, marginTop: 2 },
  karma: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, padding: 16, marginTop: 14 },
  karmaTitle: { fontSize: 17, fontWeight: '700', color: '#231702' },
  karmaSub: { fontSize: 11.5, color: 'rgba(35,23,2,0.82)' },
  give: { backgroundColor: '#0A1633', borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 15 },
  giveText: { color: '#F6EADA', fontWeight: '700', fontSize: 13 },
}));
