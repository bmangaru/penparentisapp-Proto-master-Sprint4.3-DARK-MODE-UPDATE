// components/TourContent.js — the app tour's chapters.
// Chapters with `steps` run ON the real app (components/TourLayer.js): each
// step points at a TourTarget, says what it is, and waits for the real app to
// report the task done (tourEvent in tourRun.js). Step fields:
//   target, title, text (or functions of the step's data), task, on(ev, v, data),
//   info (a "Got it ›" step), go ({ tab }), free (no dim: the writing page),
//   place ('bottom' / 'top'), dim, round (outline corners), wait (the spot
//   appears later, e.g. in a sheet), hold (ms before moving on), doneText.
//   tab (the step's spot is on that tab: ‹ Back goes there), look (the spot
//   can't be tapped, just looked at), lock (the sheet can't be closed),
//   skipIf() (skip the step when it doesn't apply), manual (wait for Next ›
//   once done, label nextLabel), rings ([ids] outlined one by one),
//   reveal (you scroll down to the spot yourself; done when it's on screen),
//   section ('Title': a new numbered section starts here), jump: false (a
//   section that can't be started on its own, e.g. inside a sheet: the
//   chapter list starts it from the section before), freshLine (writing
//   steps: start on a new line with the keyboard up).
// The last three chapters are still cards in a full-screen page
// (TourModal.js), until they're moved onto the app too: a picture (art)
// drawn with the app's own pieces, a title, a few plain sentences, and
// sometimes a "Try it" that opens the real thing.
//
// try: { label, go } where go is one of the destinations in TourModal.js:
//   'plan' (Brainstorm → today's goal), 'write', 'prompt', 'share' (Calendar →
//   Share your rings), 'offline' (Brainstorm → Log offline writing).

import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Rings from './Rings';
import { BrandButton } from './LinkButtons';
import { colors, gradients, radius, themed } from '../theme';
import { getTarget } from '../tourRun';

// ---------------------------------------------------------------------------
// Little pictures.
// ---------------------------------------------------------------------------

function Frame({ children, pad = 12, style }) {
  return <View style={[s.frame, { padding: pad }, style]}>{children}</View>;
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

// Shared steps.
// Each chapter starts at the tab bar, so you learn where everything is.
const tapTab = (name, title, text, extra = {}) => ({
  target: `tab.${name}`, dim: 0.5, round: 16, title, text, growTop: name === 'Brainstorm' ? 16 : 0,
  task: name === 'Brainstorm' ? 'Tap the pencil (Brainstorm) in the tab bar.' : `Tap ${name} in the tab bar.`,
  on: (ev, v) => ev === 'tab' && v === name,
  ...extra,
});
// Already on the writing page? Then these are skipped.
const onWriter = () => !!getTarget('writer.page');
const toWriter = (why) => [
  tapTab('Brainstorm', 'Back to Brainstorm', why, { skipIf: onWriter }),
  {
    target: 'bs.start', tab: 'Brainstorm', skipIf: onWriter,
    text: 'Open the writing page. It picks up where you left off today.',
    task: 'Tap the big blue button.', on: (ev) => ev === 'writer-open',
  },
];

export const CHAPTERS = [
  {
    id: 'welcome', title: 'Welcome & settings', short: 'Settings', sub: 'Light or dark, and finding your way',
    steps: [
      { kind: 'welcome', go: { tab: 'Home' }, section: 'Welcome' },
      {
        target: 'home.settings', tab: 'Home', round: 20, section: 'Settings',
        text: 'Settings lives here on Home: how the app looks, and this tour.',
        task: 'Tap ⚙ Settings.', on: (ev, v) => ev === 'sheet-open' && v === 'settings',
      },
      {
        target: 'settings.appearance', wait: true,
        text: 'Pick how the app looks. System follows your phone, so the app turns dark when your phone does. Try each one: the whole app changes as you tap.',
        task: 'Tap Light, Dark or System.', doneText: 'Try the others too, then tap Next with the one you like.', manual: true,
        on: (ev) => ev === 'appearance',
      },
      {
        target: 'settings.tour', wait: true, info: true, look: true,
        title: 'This tour lives here', text: 'Come back any time to go over a chapter again, or start the tour over.',
      },
      {
        target: 'settings.close', wait: true, round: 18,
        text: 'That’s Settings.', task: 'Close it with ×.', on: (ev, v) => ev === 'sheet-close' && v === 'settings',
      },
      {
        target: 'tabbar', dim: 0.3, round: 0, section: 'The five tabs',
        title: (d) => (d.last ? d.last : 'Five tabs'),
        text: (d) => (d.last ? TAB_INFO[d.last] : 'The tab bar is always at the bottom of the app. The round pencil in the middle is where you write.'),
        task: 'Tap each tab at the bottom to open it.', doneText: 'You’ve seen all five tabs.', manual: true,
        on: (ev, v, d) => {
          if (ev !== 'tab' || !TAB_INFO[v]) return null;
          const seen = { ...(d.seen || {}), [v]: true };
          const n = Object.keys(seen).length;
          return { data: { seen, last: v }, progress: `${n} of 5 tabs seen`, frac: n / 5, done: n >= 5 };
        },
      },
    ],
  },
  {
    id: 'home', title: 'Home', short: 'Home', sub: 'The blog, the website and socials', prelude: [0],
    steps: [
      tapTab('Home', 'Back to Home', 'Every chapter starts from the tab bar, so you get to know where everything is.', { section: 'From the blog' }),
      {
        target: 'home.blog', tab: 'Home',
        text: 'The newest posts from penparentis.org. Tap a post to read it right in the app. (Normally the posts move on by themselves every 10 seconds; that’s paused for the tour.)',
        task: 'Swipe, or tap the arrows, to see 3 posts.', marks: ['blog.prev', 'blog.next'],
        on: (ev, v, d) => {
          if (ev !== 'blog-index') return null;
          const seen = { ...(d.seen || { 0: true }), [v]: true };
          const n = Object.keys(seen).length;
          return { data: { seen }, progress: `${Math.min(n, 3)} of 3 posts`, frac: n / 3, done: n >= 3 };
        },
        doneText: 'Keep looking as long as you like, then go on.', manual: true, nextLabel: 'Ready to go on ›',
      },
      {
        target: 'home.socials', tab: 'Home', section: 'Website & socials',
        info: true, look: true,
        text: 'Visit penparentis.org, or follow Pen Parentis on Facebook, Instagram, LinkedIn, X and Bluesky. Each button shows the account it opens.',
      },
      {
        target: 'home.supporters', tab: 'Home', info: true, look: true, section: 'Our supporters',
        text: 'Get Karma keeps the salons free. The names scrolling here are the organizations and people who keep Pen Parentis going. Thank you!',
      },
    ],
  },
  {
    id: 'goals', title: 'Your goals & rings', short: 'Goals', sub: 'Minutes, words and sessions', prelude: [0],
    steps: [
      tapTab('Brainstorm', 'Brainstorm', 'The pencil is Brainstorm: your goals, your rings and all your writing.', { section: 'Your three rings' }),
      {
        target: 'bs.today', tab: 'Brainstorm', info: true, look: true,
        text: 'Minutes writing, words written and sessions (times you sat down). They fill as you write and close when you meet the day’s goal.',
      },
      {
        target: 'bs.today', tab: 'Brainstorm', marks: ['bs.editGoals'], markRound: 8, section: 'Change your goals',
        title: 'Edit goals', text: 'Your goals for every day, and today’s, are one tap away.',
        task: 'Tap Edit goals.', on: (ev, v) => ev === 'sheet-open' && v === 'plan',
      },
      {
        target: 'plan.edit', wait: true, round: 999,
        title: 'Change your goals here', text: 'This is where you edit your goals, any time. “My usual” is your goal on a normal day; a lighter day is half of it, a stretch day 1.5×.',
        task: 'Tap Edit on My usual.', on: (ev, v) => ev === 'sheet-open' && v === 'goals',
      },
      {
        target: 'goals.card', wait: true, lock: true, noRing: true, marks: ['goals.save'], markRound: 16,
        text: 'Change each ring’s goal with − and +, or tap a number and type it.',
        task: 'Set your goals, then tap Save.', doneText: 'Saved. Those are your goals.',
        on: (ev) => {
          if (ev === 'pad-key') return { progress: 'Then Done, and Save' };
          return ev === 'goals-saved';
        },
      },
      {
        target: 'plan.card', wait: true, lock: true, noRing: true, markRound: 16,
        marks: (d) => (d.picked ? ['plan.save'] : ['plan.light', 'plan.usual', 'plan.stretch']),
        text: 'Each day, pick how big today is: a lighter day, your usual, or a stretch day. (Rest days are here too, but today you’re writing!) It resets at midnight.',
        task: 'Pick one, then tap Save today’s goal.',
        on: (ev) => {
          if (ev === 'plan-pick') return { data: { picked: true }, progress: 'Now tap Save today’s goal' };
          return ev === 'plan-saved';
        },
      },
    ],
  },
  {
    id: 'write', title: 'Start writing', short: 'Start writing', sub: 'Your first entry, for real', prelude: [0, 1],
    steps: [
      tapTab('Brainstorm', 'Where you write', 'The pencil takes you to Brainstorm, where all your writing lives.', { skipIf: onWriter, section: 'Open the writing page' }),
      {
        target: 'bs.start', tab: 'Brainstorm', skipIf: onWriter,
        title: 'Your first entry', text: 'This is the real thing: what you write is saved on your phone and counts toward your rings and medals.',
        task: 'Tap the big blue button to start.', on: (ev) => ev === 'writer-open',
      },
      {
        target: 'writer.page', inline: true, wait: true, section: 'Your first words', freshLine: true,
        title: 'Just write', text: 'Anything on your mind: a line, a memory, an idea. Watch the rings above fill as you type.',
        task: 'Write at least 5 words.', doneText: 'Keep writing as long as you like. Tap the button when you’re done.', manual: true, nextLabel: 'I’m done writing ›',
        on: (ev, v, d) => {
          if (ev !== 'words') return null;
          const base = d.base ?? v - 1; // words already written today, before this step
          const n = v - base;
          return { data: { base }, progress: `${Math.min(n, 5)} of 5 words`, frac: n / 5, done: n >= 5 };
        },
      },
    ],
  },
  {
    id: 'tools', title: 'Prompts & tools', short: 'Prompts & tools', sub: 'Prompts, text size, focus, pause', prelude: [0, 1],
    steps: [
      ...toWriter('Prompts and tools live on the writing page.'),
      {
        target: 'writer.prompt', inline: true, section: 'Prompts', marks: ['writer.prompt'], wait: true, skipIf: () => !!getTarget('writer.promptCard'),
        title: 'Stuck? Try a prompt', text: 'Prompts are short questions to get you going. They never count as your words, and they’re saved with what you write.',
        task: 'Tap ✦ Prompt.', on: (ev) => ev === 'prompt-show',
      },
      {
        target: 'writer.promptCard', inline: true, wait: true, marks: ['writer.level'],
        title: 'How deep?', text: 'The button on the left is the prompt’s level. Each tap switches it: Simple, then Thoughtful, then Deep. Deeper prompts ask more of you.',
        task: 'Tap the level to try all three: Simple, Thoughtful and Deep.',
        doneText: 'You’ve tried all three. Pick the one you like, then go on.', manual: true, nextLabel: 'Ready to go on ›',
        on: (ev, v, d) => {
          if (ev !== 'prompt-level') return null;
          const seen = { ...(d.seen || {}), [v]: true };
          const n = Object.keys(seen).length;
          return { data: { seen }, progress: `${n} of 3 levels`, frac: n / 3, done: n >= 3 };
        },
      },
      {
        target: 'writer.promptCard', inline: true, wait: true, marks: ['writer.refresh'],
        title: 'Not this one?', text: '↻ Refresh gives you another prompt at the same level. Whatever you write next is saved with the prompt on screen.',
        task: 'Tap ↻ Refresh.', doneText: 'Refresh as many times as you like, then go on.', manual: true, nextLabel: 'Ready to go on ›',
        on: (ev) => ev === 'prompt-refresh',
      },
      {
        target: 'writer.page', inline: true, wait: true, info: true, section: 'More writing tools',
        marks: ['writer.aa', 'writer.pause'],
        title: 'Aa and Pause',
        text: 'Aa makes the words bigger or smaller, and turns on Focus mode: just you and your words. Pause stops the clock when life calls; typing starts it again, and a quiet minute pauses it by itself. Try them whenever you like.',
      },
    ],
  },
  {
    id: 'finish', title: 'Finish & check in', short: 'Finish', sub: 'Save it, and how you feel', prelude: [0, 1],
    steps: [
      ...toWriter('Finishing happens on the writing page.'),
      {
        target: 'writer.finish', inline: true, section: 'Finish', marks: ['writer.finish'], markRound: 14, wait: true,
        text: 'Write as much as you like. When you’re done, Finish & check in saves your entry.',
        task: 'Tap Finish & check in.', hold: 600, on: (ev) => ev === 'session-saved',
      },
      {
        target: 'done.summary', wait: true, lock: true, info: true, look: true, round: 16, section: 'Your summary', jump: false,
        title: 'Your end-of-writing summary', text: 'Every time you finish, you see what you wrote and how today’s rings are doing.',
      },
      {
        target: 'done.medals', wait: true, lock: true, round: 16,
        title: 'Medals you moved', text: 'Writing moves your medals along. These are the ones this session moved (green is what you just added).',
        task: 'Tap a medal to see what it counts.', doneText: 'Tap others too, then go on.', manual: true,
        on: (ev) => ev === 'medal-note',
      },
      {
        target: 'done.feel', wait: true, lock: true, round: 16, section: 'How you feel', jump: false,
        title: 'How do you feel?', text: 'Pick a face for how writing felt. It’s optional, and it shows on that day so you can look back.',
        task: 'Pick a face.', on: (ev) => ev === 'feeling',
      },
      {
        target: 'done.buttons', wait: true, lock: true, round: 16,
        text: '“Send to myself” opens your phone’s share sheet: email it or save it to Notes. Done closes this.',
        task: 'Tap Done.', hold: 500, on: (ev) => ev === 'session-done',
      },
    ],
  },
  {
    id: 'week', title: 'Your week', short: 'Your week', sub: 'Offline writing, this week, everything you wrote', prelude: [0],
    steps: [
      tapTab('Brainstorm', 'Brainstorm', 'There’s more on Brainstorm: writing you did elsewhere, your week, and everything you’ve written.'),
      {
        target: 'bs.offline', tab: 'Brainstorm', round: 16, section: 'Log offline writing',
        title: 'Wrote somewhere else?', text: 'Wrote in Word, a notebook or another app? You can add it here, on the honor system.',
        task: 'Tap Log offline writing.', on: (ev, v) => ev === 'sheet-open' && v === 'offline',
      },
      {
        target: 'offline.card', wait: true, info: true, lock: true, noRing: true, place: 'top',
        text: 'Pick the day, then add the minutes, words and sessions you wrote. It counts toward your rings and most medals. Try the numbers: nothing is added until you tap Add.',
      },
      {
        target: 'offline.close', wait: true, round: 18,
        text: 'Nothing is added unless you tap Save, so you can look around safely.', task: 'Close it with ×.',
        on: (ev, v) => ev === 'sheet-close' && v === 'offline',
      },
      {
        target: 'bs.week', reveal: true, hold: 500, section: 'This week',
        text: 'Brainstorm keeps going below.', task: 'Swipe up to scroll down to This week.',
        on: (ev, v) => ev === 'revealed' && v === 'bs.week',
      },
      {
        target: 'bs.week', tab: 'Brainstorm', info: true, look: true,
        title: 'Your week at a glance', text: 'Seven sets of rings, Sunday to Saturday, with the week’s totals underneath. Tip: a day with all three rings closed is a day you met your goal. Tap any day to read it.',
      },
      {
        target: 'bs.history', reveal: true, hold: 500, section: 'Everything you’ve written',
        text: 'Keep going.', task: 'Scroll down to Your writing.',
        on: (ev, v) => ev === 'revealed' && v === 'bs.history',
      },
      {
        target: 'bs.history', tab: 'Brainstorm', info: true, look: true,
        noRing: true, markRound: 16, marks: ['bs.day0', 'bs.day1', 'bs.day2', 'bs.day3', 'bs.day4', 'bs.day5', 'bs.day6', 'bs.seeAll'],
        text: 'It’s all saved on your phone. Each day you wrote this week has a card with how you felt; tap one to read it. “See all my writing” has every day, by week.',
      },
    ],
  },
  {
    id: 'medals', title: 'Medals', short: 'Medals', sub: 'Bronze, Silver, Gold, Diamond', prelude: [0],
    steps: [
      tapTab('Brainstorm', 'Brainstorm', 'Your medals are at the very bottom of Brainstorm.'),
      {
        target: 'bs.medals', reveal: true, hold: 500, section: 'Where medals live',
        text: 'All the way down.', task: 'Scroll down to Medals.',
        on: (ev, v) => ev === 'revealed' && v === 'bs.medals',
      },
      {
        target: 'bs.medals', tab: 'Brainstorm', info: true, look: true,
        title: 'Your medals', text: 'Medals live here, at the bottom of Brainstorm. You earn them for words, time, sessions, streaks and goals met, plus a few for your words themselves.',
      },
      {
        target: 'bs.medals', tab: 'Brainstorm', info: true, look: true, section: 'Four tiers',
        title: 'Bronze, Silver, Gold, Diamond', text: 'Every medal has four tiers. Its bar is the colour of the medal you have and shows how close the next one is. Tap this card any time to see them all.',
      },
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
    id: 'community', title: 'Salons & community', sub: 'Events, recordings, people',
    cards: [
      { art: <EventArt />, title: 'Monthly salons', body: 'The Eventbrite tab lists upcoming Pen Parentis salons: register, watch live on YouTube, add it to your calendar, and get a reminder before it starts.' },
      { art: <PastArt />, title: 'Missed one?', body: 'On the Calendar tab, "Previous salons" has recordings on YouTube and the salon podcast on Spotify.' },
      { art: <CommunityArt />, title: 'People to write with', body: 'The Community tab has the Pen Parentis Discord, the Facebook group, and Accountability groups that meet to keep each other writing.' },
    ],
  },
];

// What each tab is for (chapter 1's tab bar step).
const TAB_INFO = {
  Home: 'News from the blog, the website, our socials and Get Karma.',
  Calendar: 'Every day you wrote, as rings, and a countdown to the next salon.',
  Brainstorm: 'Where you write: today’s rings, Start writing, your week and everything you’ve written.',
  Eventbrite: 'Upcoming salons: register, watch live on YouTube and get a reminder.',
  Community: 'The Pen Parentis Discord, the Facebook group and accountability groups.',
};

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
