// components/TourContent.js — the app tour's chapters and their pictures.
// Each chapter is a few cards. A card is either hands-on (Step: a working
// practice copy from TourSteps.js, plus the task to do) or a picture (art)
// drawn with the app's own pieces. Both have a title, a few plain sentences,
// and sometimes a "Try it" that opens the real thing. Edit the words here; TourModal.js does the rest.
//
// try: { label, go } where go is one of the destinations in TourModal.js:
//   'plan' (Brainstorm → today's goal), 'write', 'prompt', 'share' (Calendar →
//   Share your rings), 'offline' (Brainstorm → Log offline writing).

import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Rings from './Rings';
import Medal from './Medal';
import Face from './Face';
import { MedalBar } from './MedalProgress';
import { BrandButton } from './LinkButtons';
import { MEDALS } from '../medals';
import { FEELINGS } from '../feelings';
import { colors, gradients, radius, themed } from '../theme';
import * as T from './TourSteps';

const medal = (id) => MEDALS.find((m) => m.id === id);

// ---------------------------------------------------------------------------
// Little pictures.
// ---------------------------------------------------------------------------

function Frame({ children, pad = 12, style }) {
  return <View style={[s.frame, { padding: pad }, style]}>{children}</View>;
}




















function FinishArt() {
  return (
    <Frame style={{ gap: 8 }}>
      <Text style={s.cardTitle}>Session saved</Text>
      <Text style={s.small}>45 words · 9:12 min · in My Writing</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <Rings minutes={100} words={45} sessions={100} size={42} />
        <Text style={s.small}>Today: 55 words to go</Text>
      </View>
    </Frame>
  );
}

function FeelArt() {
  return (
    <Frame>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={s.cardTitle}>How do you feel?</Text><Text style={s.small}>Optional</Text></View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
        {FEELINGS.slice(0, 5).map((f, i) => (
          <View key={f.id} style={[s.face, i === 0 && s.faceOn]}><Face id={f.id} size={34} /><Text style={s.faceLabel}>{f.label}</Text></View>
        ))}
      </View>
    </Frame>
  );
}

function SendArt() {
  return (
    <Frame style={{ flexDirection: 'row', gap: 10 }}>
      <View style={[s.fakeBtn, { flex: 1, minHeight: 46 }]}><Text style={s.fakeBtnText}>Send to myself</Text></View>
      <View style={[s.fakeBtn, s.fakeBtnFill, { flex: 1, minHeight: 46 }]}><Text style={[s.fakeBtnText, { color: '#FFFFFF' }]}>Done</Text></View>
    </Frame>
  );
}

function DayArt() {
  return (
    <Frame style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={s.cardTitle}>Fri, Oct 30</Text><Text style={s.today}>TODAY</Text><Text style={[s.small, { marginLeft: 'auto' }]}>☺ Happy</Text></View>
      <Text style={s.small}>120 words · 5:34 min · 2 sessions</Text>
      <View style={s.track}><View style={{ width: '100%', height: '100%', borderRadius: 3, backgroundColor: colors.karma }} /></View>
      <Text style={[s.small, { fontStyle: 'italic' }]}>"The kids are finally asleep…"</Text>
      <Text style={s.link}>Tap to read ›</Text>
    </Frame>
  );
}

function MedalsArt() {
  const row = [['words', 'gold'], ['time', 'silver'], ['streak', 'bronze'], ['goals', 'diamond'], ['vowels', null]];
  return (
    <Frame style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16 }}>
      {row.map(([id, tier]) => (
        <View key={id} style={{ alignItems: 'center', width: 60 }}>
          <Medal medal={medal(id)} tier={tier} size={50} />
          <Text style={s.faceLabel} numberOfLines={1}>{medal(id).name}</Text>
        </View>
      ))}
    </Frame>
  );
}

function TiersArt() {
  return (
    <Frame style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {['bronze', 'silver', 'gold', 'diamond'].map((t) => <Medal key={t} medal={medal('words')} tier={t} size={46} />)}
      </View>
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={s.optTitle}>Wordsmith</Text><Text style={s.small}>800 / 1,000 words</Text></View>
        <MedalBar now={80} tier="bronze" />
        <Text style={s.small}>200 words to go for Silver</Text>
      </View>
    </Frame>
  );
}

function DiamondArt() {
  return (
    <Frame style={{ alignItems: 'center', paddingVertical: 16, gap: 6 }}>
      <Medal medal={medal('goals')} tier="diamond" size={84} />
      <Text style={s.cardTitle}>Diamond Goal Getter</Text>
      <View style={[s.fakeBtn, { backgroundColor: '#4B3FB8', borderColor: '#4B3FB8', paddingHorizontal: 16 }]}><Text style={[s.fakeBtnText, { color: '#FFFFFF' }]}>✉️  Email Pen Parentis</Text></View>
    </Frame>
  );
}

function CalendarArt({ star }) {
  const v = [1, 1, 0.6, 1, 1, 0, 0, 1, 1, 1, 0.4, 1, 1, 1];
  return (
    <Frame>
      <Text style={s.cardTitle}>Your writing calendar</Text>
      <View style={s.calGrid}>
        {v.map((x, i) => (
          <View key={i} style={s.calCell}>
            <Text style={s.calNum}>{i + 12}</Text>
            <Rings minutes={x * 100} words={x * 100} sessions={x ? 100 : 0} size={30} />
            {star && i === 9 ? <Ionicons name="star" size={14} color="#E0AE45" style={{ position: 'absolute', right: 2, top: 10 }} /> : null}
          </View>
        ))}
      </View>
    </Frame>
  );
}

function CountdownArt() {
  return (
    <LinearGradient colors={gradients.header} style={[s.frame, { padding: 14, borderWidth: 0 }]}>
      <Text style={s.cdKick}>★ NEXT EVENT · TUE, NOV 10 · 7:00 PM</Text>
      <Text style={s.cdName}>Meet The Author's Guild</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        {[['10', 'days'], ['22', 'hours'], ['49', 'min']].map(([n, l]) => <View key={l} style={s.cdBox}><Text style={s.cdN}>{n}</Text><Text style={s.cdL}>{l}</Text></View>)}
      </View>
    </LinearGradient>
  );
}

function ShareArt() {
  return (
    <LinearGradient colors={['#1B3FA0', '#0C2265']} style={[s.frame, { padding: 14, borderWidth: 0 }]}>
      <Text style={s.cdKick}>PEN PARENTIS · MY WRITING</Text>
      <Text style={[s.cdName, { fontSize: 19 }]}>Aug – Oct 2026</Text>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
        {[['71', 'days rings closed'], ['18,420', 'words'], ['23', 'day best streak']].map(([n, l]) => <View key={l} style={s.cdBox}><Text style={[s.cdN, { fontSize: 16 }]}>{n}</Text><Text style={s.cdL}>{l}</Text></View>)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 10 }}>
        {Array.from({ length: 28 }, (_, i) => <Rings key={i} minutes={i % 9 ? 100 : 40} words={i % 7 ? 100 : 30} sessions={100} size={20} variant="dark" />)}
      </View>
    </LinearGradient>
  );
}

function OfflineArt() {
  return (
    <Frame style={{ gap: 8 }}>
      <View style={s.offline}><View style={s.offIcon}><Ionicons name="download-outline" size={18} color={colors.royal} /></View><View style={{ flex: 1 }}><Text style={s.optTitle}>Log offline writing</Text><Text style={s.small}>Wrote in Word, a notebook or elsewhere?</Text></View></View>
      <View style={s.fieldRow}><Text style={s.optTitle}>Minutes</Text><Text style={s.round}>−</Text><Text style={s.val}>30</Text><Text style={s.round}>+</Text></View>
      <View style={s.fieldRow}><Text style={s.optTitle}>Words</Text><Text style={s.round}>−</Text><Text style={s.val}>500</Text><Text style={s.round}>+</Text></View>
    </Frame>
  );
}

function EventArt() {
  return (
    <Frame style={{ gap: 8, borderColor: '#E0C27A', borderWidth: 2 }}>
      <Text style={[s.kicker, { color: '#8A5E12' }]}>★ NEXT EVENT</Text>
      <Text style={s.cardTitle}>Meet The Author's Guild</Text>
      <Text style={s.small}>Tue, Nov 10 · 7:00 PM · Online</Text>
      <View style={[s.fakeBtn, s.fakeBtnFill]}><Text style={[s.fakeBtnText, { color: '#FFFFFF' }]}>Register on Eventbrite</Text></View>
      <BrandButton brand="youtube" icon={<Ionicons name="logo-youtube" size={20} color="#FF0000" />} label="Watch on YouTube" sub="Nov 10, 7 PM" />
    </Frame>
  );
}

function PastArt() {
  return (
    <View style={{ gap: 8 }}>
      <BrandButton brand="youtube" icon={<Ionicons name="logo-youtube" size={20} color="#FF0000" />} label="Watch past salons on YouTube" />
      <BrandButton brand="spotify" icon={<Ionicons name="musical-notes" size={18} color="#1DB954" />} label="Listen on Spotify" />
    </View>
  );
}

function CommunityArt() {
  return (
    <View style={{ gap: 8 }}>
      <BrandButton brand="discord" icon={<Ionicons name="logo-discord" size={20} color="#5865F2" />} label="Join the Pen Parentis Discord" />
      <BrandButton brand="facebook" icon={<Ionicons name="logo-facebook" size={20} color="#1877F2" />} label="Join the Facebook group" />
      <Frame style={{ gap: 4 }}>
        <Text style={s.optTitle}>Accountability groups</Text>
        <Text style={s.small}><Text style={{ fontWeight: '800', color: '#8A5E12' }}>Requires sustaining membership at the All-Access level.</Text> Guided goal-setting in a small group…</Text>
      </Frame>
    </View>
  );
}

// ---------------------------------------------------------------------------
// The chapters.
// ---------------------------------------------------------------------------

export const CHAPTERS = [
  {
    id: 'welcome', title: 'Welcome & settings', sub: 'Light or dark, and finding your way',
    cards: [
      { Step: T.WelcomeStep, task: 'Tap the Pen Parentis logo.', title: 'Welcome to Pen Parentis', body: 'An app for writer-parents: set small daily goals, write in the minutes you have, and watch your progress add up. Your writing stays on your phone.' },
      { Step: T.AppearanceStep, task: 'Pick Light, Dark or System. Watch the whole app change.', title: 'Light or dark?', body: '"System" follows your phone, so the app turns dark when your phone does. You can change it any time with ⚙ Settings on Home.' },
      { Step: T.TourHereStep, task: 'Tap "Open the tour" in Settings.', title: 'This tour is always here', body: 'Want a refresher later? ⚙ Settings → The app tour lets you review any chapter or start over.' },
      { Step: T.TabsStep, fill: true, task: 'Swipe across, or tap each tab at the bottom, to peek inside.', title: 'Five tabs', body: 'The tab bar is always at the bottom of the app. The round pencil in the middle is where you write.' },
    ],
  },
  {
    id: 'home', title: 'Home', sub: 'The blog, the website and socials',
    cards: [
      { Step: T.BlogStep, task: 'Swipe, or tap the arrows, to see 3 posts.', title: 'From the blog', body: 'The newest posts from penparentis.org. In the app, tap a post to read it right there; "See all" opens the whole blog.' },
      { Step: T.SocialsStep, task: 'Tap two of the buttons.', title: 'The website and socials', body: 'Visit penparentis.org, or follow Pen Parentis on Facebook, Instagram, LinkedIn, X and Bluesky. Each button shows the account it opens.' },
      { Step: T.SupportersStep, task: 'Say thanks to our supporters.', title: 'Our supporters', body: 'The line scrolling along the bottom of Home thanks the organizations and people who keep Pen Parentis going.' },
    ],
  },
  {
    id: 'goals', title: 'Your goals & rings', sub: 'Minutes, words and sessions',
    cards: [
      { Step: T.RingsStep, task: 'Tap + until all three rings close.', title: 'Three rings', body: 'Every day has three rings: minutes writing, words written and sessions (times you sat down). Close all three and the gold "Goal met" card appears.' },
      { Step: T.PlanStep, task: 'Try two different kinds of day.', title: "Today's goal", body: 'Each day, pick how big today is: a lighter day (half your usual), your usual, a stretch day (1.5×), or rest. Watch the targets change.', try: { label: "Set today's goal", go: 'plan' } },
      { Step: T.PadStep, task: 'Tap a number and type a new goal.', title: 'Your usual goals', body: '"Edit goals" on Brainstorm sets your usual minutes, words and sessions. Use − and +, or tap a number to type it.' },
    ],
  },
  {
    id: 'write', title: 'Start writing', sub: 'The writing page',
    cards: [
      { Step: T.PencilStep, task: 'Tap the pencil in the tab bar.', title: 'Where you write', body: 'The pencil takes you to Brainstorm. Tap "Start writing" there to begin.' },
      { Step: T.WriteStep, task: 'Type 5 words. Watch the clock and rings.', title: 'Just write', body: 'The clock runs while you write and the rings fill as you go. Pasted text doesn’t count, so it’s all yours. Everything saves by itself.', try: { label: 'Start writing for real', go: 'write' } },
      { Step: T.ResumeStep, task: 'Add 2 more words to the earlier writing.', title: 'Pick up where you left off', body: 'Come back later the same day and your writing is waiting. Only the new words count toward the new session.' },
    ],
  },
  {
    id: 'tools', title: 'Prompts & tools', sub: 'Prompts, text size, focus, pause',
    cards: [
      { Step: T.PromptStep, task: 'Show a prompt, change its level, then refresh it.', title: 'Never stare at a blank page', body: 'Prompts are short questions to get you going: Simple, Thoughtful or Deep. Your answer is saved with the prompt.', try: { label: 'Write with a prompt', go: 'prompt' } },
      { Step: T.ToolsStep, task: 'Change the text size and turn on Focus.', title: 'Aa: text size and focus', body: 'Make the text bigger or smaller, or turn on Focus mode to hide everything except your words.' },
      { Step: T.PauseStep, task: 'Type a word, tap Pause, then type again.', title: 'Pause any time', body: 'Kid needs you? Tap Pause. Typing starts the clock again, and a quiet minute pauses it by itself.' },
      { Step: T.NudgeStep, task: 'Tap "+2 words" until Wordsmith turns Silver.', title: 'Almost there!', body: 'When a medal is within easy reach this session, a little note tells you how close you are.' },
    ],
  },
  {
    id: 'finish', title: 'Finish & check in', sub: 'How you feel, and sending it to yourself',
    cards: [
      { art: <FinishArt />, title: 'Finish & check in', body: 'Tap "Finish & check in" when you’re done. You’ll see what you wrote today and how your rings are doing.' },
      { art: <FeelArt />, title: 'How do you feel?', body: 'Pick a face if you like. It’s optional, and it shows on that day so you can look back on how writing felt.' },
      { art: <SendArt />, title: 'Send it to yourself', body: '"Send to myself" opens your phone’s share sheet: email it, save it to Notes, or message it. Then tap Done.' },
      { art: <DayArt />, title: 'Read it again later', body: 'Every day you write shows under "Your writing" on Brainstorm. Tap a day to read everything you wrote, with your prompts and how you felt.' },
    ],
  },
  {
    id: 'medals', title: 'Medals', sub: 'Bronze, Silver, Gold, Diamond',
    cards: [
      { art: <MedalsArt />, title: 'Medals for showing up', body: 'Earn medals for words, time, sessions, streaks and goals met, plus four for your words themselves (vowels, consonants, punctuation, big words).' },
      { art: <TiersArt />, title: 'Four tiers each', body: 'Every medal goes Bronze, Silver, Gold, Diamond. The bar is the colour of the medal you have, and shows how far it is to the next one.' },
      { art: <DiamondArt />, title: 'Diamond', body: 'Reach Diamond and you can email Pen Parentis to celebrate. Tap "See all" any time to see every medal.' },
    ],
  },
  {
    id: 'calendar', title: 'Calendar', sub: 'Your rings over time',
    cards: [
      { art: <CalendarArt />, title: 'Where all your rings live', body: 'The Calendar shows every day as its rings. Tap a past day to read what you wrote that day.' },
      { art: <CountdownArt />, title: 'Salons on your calendar', body: 'A ★ marks salon days. The card at the top takes turns between today’s rings and a countdown to the next event.' },
      { art: <ShareArt />, title: 'Show it off', body: 'Ever want to flex on your friends or family? Tap ⇪ Share to make a picture of your calendar decked out with rings. Only rings and totals, never your writing.', try: { label: 'Share your rings', go: 'share' } },
    ],
  },
  {
    id: 'offline', title: 'Writing elsewhere', sub: 'Log offline writing',
    cards: [
      { art: <OfflineArt />, title: 'Wrote in Word or a notebook?', body: 'On Brainstorm, "Log offline writing" lets you add minutes, words and sessions for any day, on the honor system. It counts toward your rings and most medals.', try: { label: 'Log offline writing', go: 'offline' } },
    ],
  },
  {
    id: 'community', title: 'Salons & community', sub: 'Events, recordings, people',
    cards: [
      { art: <EventArt />, title: 'Monthly salons', body: 'The Eventbrite tab lists upcoming Pen Parentis salons: register, watch live on YouTube, add it to your calendar, and get a reminder before it starts.' },
      { art: <PastArt />, title: 'Missed one?', body: 'On the Calendar tab, "Previous salons" has recordings on YouTube and the salon podcast on Spotify.' },
      { art: <CommunityArt />, title: 'People to write with', body: 'The Community tab has the Pen Parentis Discord, the Facebook group, and Accountability groups that meet to keep each other writing.' },
    ],
  },
];

export const CHAPTER_IDS = CHAPTERS.map((c) => c.id);

const s = themed(() => ({
  frame: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md },
  banner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  bannerTitle: { fontSize: 19, fontWeight: '800', color: '#FFFFFF' },
  bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  pillGold: { fontSize: 12, fontWeight: '700', color: '#F2C14E', borderWidth: 1, borderColor: 'rgba(242,193,78,0.55)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, overflow: 'hidden' },
  caption: { fontSize: 12, color: colors.muted, marginTop: 12, marginBottom: 6 },
  hand: { fontSize: 22, fontStyle: 'italic', color: colors.ink, marginTop: 12 },
  kicker: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.9, color: colors.muted },
  fakeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.royal, paddingHorizontal: 12 },
  fakeBtnFill: { backgroundColor: colors.royal },
  fakeBtnText: { fontSize: 13.5, fontWeight: '700', color: colors.royal },
  circle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 10, color: colors.tabIdle, marginTop: 4 },
  date: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, color: '#8A5E12' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  small: { fontSize: 12, lineHeight: 17, color: colors.muted },
  arrows: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 8 },
  arrow: { fontSize: 16, fontWeight: '800', color: colors.royal, width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.line, textAlign: 'center', lineHeight: 22, overflow: 'hidden' },
  dots: { fontSize: 9, color: colors.royal, letterSpacing: 2 },
  web: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#B9C6E8', borderRadius: radius.md, padding: 10 },
  crawl: { backgroundColor: '#0A1633', borderRadius: 8, height: 30, justifyContent: 'center', paddingHorizontal: 8, marginTop: 8 },
  crawlText: { color: '#F0E6D2', fontSize: 11 },
  ringLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  ringVal: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(127,140,170,0.25)', marginTop: 3, overflow: 'hidden' },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.line, borderRadius: 12, padding: 9, backgroundColor: '#FFFFFF' },
  optOn: { borderColor: colors.royal },
  optTitle: { fontSize: 13, fontWeight: '700', color: colors.ink },
  tag: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6, color: colors.royal, backgroundColor: '#E6ECFA', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#D9DEEA', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  round: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, textAlign: 'center', lineHeight: 25, fontWeight: '800', color: colors.royal, overflow: 'hidden', marginLeft: 'auto' },
  val: { minWidth: 48, textAlign: 'center', fontSize: 16, fontWeight: '800', color: colors.ink },
  valOn: { minWidth: 48, textAlign: 'center', fontSize: 16, fontWeight: '800', color: colors.royal, backgroundColor: '#E6ECFA', borderWidth: 2, borderColor: colors.royal, borderRadius: 8, overflow: 'hidden', paddingVertical: 2 },
  keys: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6, backgroundColor: '#F1EDE3', borderRadius: 12, padding: 6 },
  key: { width: '32%', height: 34, borderRadius: 8, backgroundColor: '#FFFFFF', textAlign: 'center', lineHeight: 34, fontSize: 17, fontWeight: '600', color: colors.royal, overflow: 'hidden' },
  goldTitle: { fontSize: 16, fontWeight: '800', color: '#231702' },
  goldSub: { fontSize: 12, color: '#3D2A05', marginTop: 2 },
  liveBar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 8 },
  liveItem: { fontSize: 12, fontWeight: '800', color: colors.ink },
  note: { fontSize: 12, color: colors.body, backgroundColor: '#FFF8E6', borderRadius: 8, padding: 8, overflow: 'hidden' },
  writing: { fontSize: 15, lineHeight: 22, color: colors.ink },
  finish: { backgroundColor: colors.royal, borderRadius: 12, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  finishText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  pill: { fontSize: 12, fontWeight: '800', color: colors.royalDeep, backgroundColor: '#EEF1F7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, overflow: 'hidden' },
  pillOutlineGold: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#E0C27A', color: '#8A5E12' },
  pillOn: { backgroundColor: colors.royal, color: '#FFFFFF' },
  prompt: { borderLeftWidth: 3, borderRadius: 10, padding: 10 },
  promptKick: { fontSize: 10.5, fontWeight: '800' },
  promptText: { fontSize: 15, lineHeight: 21, color: colors.ink, marginTop: 4, fontStyle: 'italic' },
  menu: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12 },
  switch: { width: 40, height: 24, borderRadius: 12, backgroundColor: colors.royal },
  pauseNote: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EEF1F7', borderRadius: 12, padding: 10 },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#0A1633', borderRadius: 16, padding: 12 },
  nudgeTitle: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  nudgeSub: { fontSize: 12, color: '#C9D1E6' },
  face: { alignItems: 'center', padding: 4, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  faceOn: { borderColor: colors.royal, backgroundColor: '#EEF2FB' },
  faceLabel: { fontSize: 10, fontWeight: '700', color: colors.body, marginTop: 3 },
  today: { fontSize: 9.5, fontWeight: '800', color: '#FFFFFF', backgroundColor: colors.royal, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
  link: { fontSize: 12.5, fontWeight: '800', color: colors.royal },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  calCell: { width: '14.28%', alignItems: 'center', marginBottom: 4 },
  calNum: { fontSize: 10.5, fontWeight: '700', color: colors.body },
  cdKick: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, color: '#F2C14E' },
  cdName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginTop: 4 },
  cdBox: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  cdN: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  cdL: { fontSize: 9.5, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#B9C6E8', backgroundColor: '#F5F7FD', borderRadius: 12, padding: 10 },
  offIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#E3E9F8', alignItems: 'center', justifyContent: 'center' },
}));
