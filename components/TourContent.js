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
//   subsection ('Title': an extra part shown as e.g. 5.2a), noTyping (the
//   writing page can't be typed in during this step), marks ([ids] pulsing
//   "tap here" rings), noRing, inline (the tip sits inside the writing page).
// Every chapter now runs on the app. (TourModal.js can still show chapters
// made of `cards` — a picture, a title and a few sentences — if one is added.)

import { getTarget } from '../tourRun';

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
        text: 'Settings lives here on the Home page. Here you control how the app looks, and find this tour if you ever need a refresher.',
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
        text: 'The newest blog posts from penparentis.org. Tap a blog post to read it right in the app. (Normally the posts move on by themselves every 10 seconds; that’s paused for the tour.)',
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
      tapTab('Brainstorm', 'Brainstorm', 'On the tab bar, the pencil is Brainstorm: where you write and set your goals.', { section: 'Your three rings' }),
      {
        target: 'bs.today', tab: 'Brainstorm', info: true, look: true,
        text: 'Minutes writing, words written and sessions (each time you sat down to use the app and write). They fill as you write and close when you meet the day’s goal.',
      },
      {
        target: 'bs.today', tab: 'Brainstorm', editPulse: true, section: 'Change your goals',
        title: 'Edit goals', text: 'Your goals for every day, and today’s, are one tap away: the Edit goals button on the Today card.',
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
        title: 'Just write', text: 'A blank page, just for this. Anything on your mind: a line, a memory, an idea. Watch the rings above fill as you type. No need to stress over every detail: you can always come back and add more.',
        task: 'Write at least 5 words.', doneText: 'Keep writing as long as you like. Tap the button when you’re done (the rest of the tour is just looking).', manual: true, nextLabel: 'I’m done writing ›',
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
        target: 'writer.prompt', inline: true, section: 'Prompts', noTyping: true, marks: ['writer.prompt'], wait: true, skipIf: () => !!getTarget('writer.promptCard'),
        title: 'Stuck? Try a prompt', text: 'Prompts are short questions to get you going. They never count as your words, and they’re saved with what you write.',
        task: 'Tap ✦ Prompt.', on: (ev) => ev === 'prompt-show',
      },
      {
        target: 'writer.promptCard', inline: true, wait: true, marks: ['writer.level'], noTyping: true,
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
        target: 'writer.promptCard', inline: true, wait: true, marks: ['writer.refresh'], noTyping: true,
        title: 'Not this one?', text: '↻ Refresh gives you another prompt at the same level. Whatever you write next is saved with the prompt on screen.',
        task: 'Tap ↻ Refresh.', doneText: 'Refresh as many times as you like, then go on.', manual: true, nextLabel: 'Ready to go on ›',
        on: (ev) => ev === 'prompt-refresh',
      },
      {
        target: 'writer.page', inline: true, wait: true, info: true, section: 'More writing tools', noTyping: true,
        marks: ['writer.aa', 'writer.pause'],
        title: 'Aa and Pause',
        text: 'Aa makes the words bigger or smaller, and turns on Focus mode: just you and your words. Pause stops the clock when life calls; typing starts it again, and a quiet minute pauses it by itself. Try them, then tap Got it.',
        hold: 500, on: (ev) => ev === 'focus-on', // turning on Focus shows 5.2a
      },
      {
        // 5.2a, only if you turned Focus mode on.
        target: 'writer.exitFocus', inline: true, wait: true, subsection: 'Focus mode', noTyping: true,
        skipIf: () => !getTarget('writer.exitFocus'), marks: ['writer.exitFocus'],
        title: 'You’re in Focus mode', text: 'Everything but your words is hidden: no clock, prompts or rings on screen (the clock still runs). It’s for when you want nothing in the way.',
        task: 'Tap ⤡ Exit focus to bring everything back.', back: true, on: (ev) => ev === 'focus-off', // then back to 5.2
      },
    ],
  },
  {
    id: 'finish', title: 'Finish & check in', short: 'Finish', sub: 'Save it, and how you feel', prelude: [0, 1],
    steps: [
      ...toWriter('Finishing happens on the writing page.'),
      {
        target: 'writer.finish', inline: true, section: 'Finish', marks: ['writer.finish'], markRound: 14, wait: true, noTyping: true,
        text: 'When you’re done writing, Finish & check in saves your entry. (Nothing on this page yet? Type a line first.)',
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
        target: 'bs.start', tab: 'Brainstorm', info: true, look: true, round: 16, section: 'Keep writing',
        text: 'No worries if you have more to write. This button is always here: tap it (it says “Keep writing” or “Write a little more”) to pick up where you left off.',
      },
      {
        target: 'bs.offline', tab: 'Brainstorm', info: true, look: true, round: 16, section: 'Log offline writing',
        title: 'Wrote somewhere else?', text: 'Wrote in Word, a notebook or another app? Tap Log offline writing any time to add the minutes, words and sessions, on the honor system. It works just like setting your goals, and counts toward your rings and most medals.',
      },
      {
        target: 'bs.week', reveal: true, hold: 500, section: 'This week',
        text: 'Brainstorm keeps going below.', task: 'Swipe up to scroll down to This week.',
        on: (ev, v) => ev === 'revealed' && v === 'bs.week',
      },
      {
        target: 'bs.week', tab: 'Brainstorm', info: true, look: true,
        title: 'Your week at a glance', text: 'Seven sets of rings, Sunday to Saturday, with the week’s totals underneath. Tip: a day with all three rings closed is a day you met your goal.',
      },
      {
        target: 'bs.history', reveal: true, hold: 500, section: 'Everything you’ve written',
        text: 'Keep going.', task: 'Scroll down to Your writing.',
        on: (ev, v) => ev === 'revealed' && v === 'bs.history',
      },
      {
        target: 'bs.history', tab: 'Brainstorm', info: true, look: true, noRing: true, markRound: 16, marks: ['bs.folder'],
        text: 'It’s all saved on your phone, in a folder for the week. Closed, it shows your most recent day; tap the folder any time to see everything else you wrote this week.',
      },
      {
        target: 'bs.history', tab: 'Brainstorm', info: true, look: true, noRing: true, markRound: 16, marks: ['bs.seeAll'],
        text: '“See all my writing” has every day you’ve ever written, by week.',
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
    id: 'calendar', title: 'Calendar', short: 'Calendar', sub: 'Your rings over time, salons, sharing', prelude: [0],
    steps: [
      tapTab('Calendar', 'Calendar', 'Every day you showed up to write, as rings.', { section: 'Today & the next salon' }),
      {
        target: 'cal.top', tab: 'Calendar', marks: ['cal.prev', 'cal.next'],
        text: 'Today’s rings take turns with a countdown to the next salon. (They switch every few seconds; that’s paused for the tour.)',
        task: 'Tap the arrows to see the countdown.', doneText: 'Look as long as you like, then go on.', manual: true, nextLabel: 'Ready to go on ›',
        on: (ev, v) => ev === 'cal-index' && v > 0,
      },
      {
        target: 'cal.grid', tab: 'Calendar', info: true, look: true, section: 'Your writing calendar',
        text: 'Each day’s progress is shown as its own set of rings. The current week is at the top of the calendar; scroll up for earlier weeks. A gold ★ marks a salon day. Tap a past day to read what you wrote that day.',
      },
      {
        target: 'cal.share', tab: 'Calendar', info: true, look: true, round: 999, section: 'Share your rings',
        text: 'Show off all the days you showed up to write! Tap Share to turn your calendar into a picture for friends or family, showing 1, 3 or 6 months. Only your rings and totals are included; your writing always stays private.',
      },
      {
        target: 'cal.past', reveal: true, hold: 500, section: 'Previous salons',
        text: 'Further down the Calendar.', task: 'Scroll down to Previous salons.',
        on: (ev, v) => ev === 'revealed' && v === 'cal.past',
      },
      {
        target: 'cal.past', tab: 'Calendar', info: true,
        text: 'Missed a salon, or want to hear it again? Recordings are on YouTube and the salon podcast is on Spotify (they open after the tour). Try the switch: it tells you when a new episode lands. Tap Got it when you’re ready.',
      },
    ],
  },
  {
    id: 'community', title: 'Salons & community', short: 'Salons & community', sub: 'Events, reminders, people to write with',
    steps: [
      tapTab('Eventbrite', 'Eventbrite', 'Pen Parentis salons: monthly, free and online.', { section: 'Monthly salons' }),
      {
        target: 'ev.next', tab: 'Eventbrite', info: true, look: true, wait: true,
        text: 'The next salon. Register on Eventbrite, watch it live on YouTube, add it to your calendar, or share it with a friend.',
      },
      {
        target: 'ev.remind', tab: 'Eventbrite', info: true, round: 16,
        title: 'Never miss one', text: 'Turn this on and you’ll get one reminder half an hour before a salon goes live. Nothing else. Try it, keep it on if you’d like it, then tap Got it.',
      },
      tapTab('Community', 'Community', 'People to write with.', { section: 'Community' }),
      {
        target: 'com.links', tab: 'Community', info: true, look: true,
        text: 'The Pen Parentis Discord runs around the clock (there’s almost always someone up), and the Facebook group is there too. Both are free.',
      },
      {
        target: 'com.groupsInfo', tab: 'Community', info: true, look: true, section: 'Accountability groups',
        text: 'Small groups of writer-parents who meet to set goals and keep each other writing. Pick a group by when you’re free: each group’s meeting day and time are in the table just below. They’re for sustaining members at the All-Access level.',
      },
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
