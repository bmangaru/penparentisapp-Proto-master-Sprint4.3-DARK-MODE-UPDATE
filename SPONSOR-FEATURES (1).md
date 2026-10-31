# Sponsor feature round — what changed and where

| Sponsor ask | Where it lives | How it works |
|---|---|---|
| Remove "Something came up", combine with None | `writingLogic.js` → `OUTCOMES` | Four outcomes. "None of it" carries the subtitle "Something came up — that still counts as showing up". |
| 3 professional writers, 9 times a year | `screens/SalonsScreen.js`, `HomeScreen.js` | Copy updated. |
| Update salons: Eventbrite | `SalonsScreen.js`, `links.js` → `salonsEventbrite` | Gold "Register on Eventbrite" button at the top. **Swap in the real salon event URL** in `links.js`. |
| "What's your goal today" + resets at 12am | `BrainstormHomeScreen.js`, `writingStore.js` → `useToday()` | Asked the first time Brainstorm opens each day. Goals are stored per date, so a new day means a new question. `useToday()` re-renders at midnight and when the app returns to the foreground. Options: words or minutes, presets, "your usual" suggestion, custom, or "No goal today". |
| Weekly goal, 7 days | `BrainstormHomeScreen.js` | Weekly goal runs Mon–Sun. Types: words, time, both, or **sessions** (previously "coming soon"). |
| Sessions logged and saved | `BrainstormWriterScreen.js`, `writingStore.js` → `saveSession` | Every visit to the typer is one session, saved with its text, words, minutes, start time, goal, % and rating. Saved on "Finish", on ×, and on Android back (`beforeRemove`). |
| Keep track of goals and writing / access saved writing | `screens/MyWritingScreen.js` | All sessions grouped by day, with that day's goal and %. Tap to read in full. |
| Writing can be sent to themselves | `writingStore.js` → `shareWriting` | Opens the phone's share sheet (Mail, Messages, Notes, Drive…). No account or email server needed. Available after every session, per session, and "this week's writing". |
| Chart: did it exceed? | `components/WeekChart.js` | Seven bars, each day vs. that day's goal, with a dashed 100% line. Gold = exceeded (≥110%), blue = met, light blue = some, grey = none. Weekly card says "Exceeded — X% over" or "X% of the way there". |
| ≥50% → rate yourself, otherwise the app rates | `writingLogic.js` → `canSelfRate`, `appRatingFor` | At ≥50% of today's goal the writer picks their own rating (the app's suggestion is tagged "App's read"). Below 50% the app records its rating. Both are saved; the writer's wins when present. |
| Disable copy/paste | `BrainstormWriterScreen.js` | `contextMenuHidden` removes the Copy/Paste menu. Any single change that adds >30 characters (`PASTE_CHAR_LIMIT`) is treated as a paste, reverted, and never counted. |
| After 10 / 100 sessions, a smarter Home screen | `writingLogic.js` → `buildInsights`, `HomeScreen.js` | **<10:** welcome + "N more sessions until this screen learns your rhythm". **10+:** streak, usual writing time and words per session, plus a message that depends on *when you open the app* (on time / later than usual / early / already wrote today). **100+:** adds lifetime words, strongest weekday, week-over-week trend and longest streak. |

## Notes for the team

- `writingLogic.js` has no React Native imports, so it can be unit-tested with plain Node or Jest.
- Old storage keys (`pp.progress.v2`, `pp.time.v1`, `pp.checkins.v1`) are no longer read. Stats now come from `pp.sessions.v1`, so test devices start fresh.
- `screens/BrainstormScreen.js` was removed. Nothing imported it, and it was an older copy of the Brainstorm screens.
- The paste check also catches iOS dictation when it drops in a long sentence at once. Raise `PASTE_CHAR_LIMIT` if that's a problem.
- Everything is stored on the phone (AsyncStorage). If the sponsor later wants writing to survive a lost phone, sessions can be synced to the same Supabase project described in `BACKEND-NOTES.md`.

## Round 2 — Brainstorm page: daily bubbles

| Change | Where | How it works |
|---|---|---|
| A white bubble per day | `components/DayBubble.js`, `BrainstormHomeScreen.js` | "This week" lists Mon→today, newest first. A day gets a bubble once something is written: date, TODAY tag, words / minutes / check-ins, progress bar, rating, and a 2-line preview. Past days with nothing written show as a dashed "No writing — that's okay" row. |
| Tap a bubble to read it | `screens/DayScreen.js` (route `BrainstormDay`) | Full date, goal, stats, the whole day's writing, "Send this day's writing to myself" (share sheet), "Keep writing today" (today only), and Delete. |
| Start writing button changes with the day | `writingLogic.js` → `startButtonState` | `setGoal` → "Set today's goal & start" (asks the daily question, then opens the page) · `start` → "Start writing" · `continue` → "Keep writing · N words to go" · `met` → gold "Goal met — write a little more?" |
| Keep writing picks up where you left off | `BrainstormWriterScreen.js`, `writingLogic.js` → `dayPieces`, `textToContinue` | The page opens with today's latest writing already in the box. Only words typed after it count toward the session. The session is saved with `continues: true` and the full text, so each day reads as one growing piece. |
| My Writing | `screens/MyWritingScreen.js` | The same day bubbles, grouped by week, for every day ever written. |

## Round 3 — time display, more goal presets, medals

**Fixes**
- Times now pick the right unit (`writingLogic.js` → `formatDuration`, `durationTile`, `clock`): `5 sec`, `2 min 30 sec`, `12 min`, `1 hr 15 min`. The typer's timer shows `1:05:00` past an hour.
- Daily goal presets: words 50 · 100 · 150 · 250 · 500 · 750 · 1,000 · 2,000; minutes 5 · 10 · 15 · 20 · 30 · 45 · 60 · 90 (plus "your usual" and a custom number).

**Medals** (`medals.js`, `components/Medal.js`, `components/MedalsCard.js`, `components/NewMedalSheet.js`, `screens/MedalsScreen.js`, `screens/MedalDetailScreen.js`)

| Medal | Counts | Bronze / Silver / Gold / Platinum |
|---|---|---|
| Wordsmith | words typed | 100 / 1,000 / 10,000 / 50,000 |
| Timekeeper | time writing | 1 hr / 10 hr / 50 hr / 200 hr |
| Regular | sessions | 5 / 25 / 100 / 365 |
| On a Roll | best streak (days in a row) | 3 / 7 / 30 / 100 |
| Goal Getter | days the daily goal was met | 1 / 10 / 50 / 200 |
| Vowel Voyager | vowels in kept writing | 500 / 5,000 / 50,000 / 250,000 |
| Consonant Collector | consonants in kept writing | 1,000 / 10,000 / 100,000 / 500,000 |
| Punctuation Pro | punctuation marks | 25 / 250 / 2,500 / 10,000 |
| Big Words | words longer than 10 letters | 10 / 100 / 500 / 2,000 |

- Progress is always recomputed from saved sessions, so writing from before medals existed counts. `pp.medals.v1` only stores the date each tier was first reached.
- The first time medals load, tiers already earned are recorded quietly (no pop-up for old writing). After that, a new tier triggers the "New medal!" sheet once: in the typer after check-in, or on the Brainstorm page if the session ended with ×.
- Letter, punctuation and long-word counts use each day's final kept text, so deleted letters don't count and "Keep writing" isn't counted twice.
- The Brainstorm page shows the Medals card after this week's bubbles (option C) with the latest medals, "Almost there" and "See all medals".
- Thresholds live in `MEDALS` in `medals.js`. Change the `tiers` arrays to tune them.

## Round 4 — one end-of-session sheet, feelings instead of ratings

- **One sheet** (`components/SessionDoneSheet.js`) replaces both "How did it go?" and "Saved". It shows: session saved (words · time), today's goal progress, a "New medal" banner if one was earned, **How do you feel?**, and Send to myself / Done.
- **Feelings** (`feelings.js`, `components/Face.js`): happy, ecstatic, confused, panicked, anxious, angry, betrayed, frustrated, hurt, guilty, from Pen Parentis' "How do you feel?" page. The faces are simple original line drawings (`react-native-svg`). Picking one is optional and saves immediately to the session as `feeling`.
- **No more self/app rating.** The goal status (`appRating`: exceeded / met / some / none) is still stored, but only colours the weekly chart and the day bubble's progress bar.
- **Where feelings show:** the day bubble shows the day's latest feeling. The day page lists each session's feeling with its time. "Send to myself" text says "felt happy".
- **Empty sessions aren't logged:** opening the typer and finishing with no new words in under a minute just closes it.
- **New dependency:** `react-native-svg` (included in Expo Go). Run `npx expo install react-native-svg` after pulling.

## Round 5 (Sprint 3) — three rings, one goals setup, Events calendar

### Goals, streamlined
- **One place to set goals** (`components/GoalsSheet.js`): a daily target for each ring (**minutes**, **words**, **sessions**, which defaults to 1) plus your **writing days**. The weekly total is worked out from these, so there's no separate weekly goal any more. It opens once on first run, then from "Edit goals".
- **"What's your goal today?" is one tap** (`components/TodayPlanSheet.js`): **My usual**, **A lighter day** (half of each ring, rounded to the step), or **Rest today**. It's asked once a day and resets at midnight. If you skip it on a writing day, your usual goal applies.
- **Brainstorm page:** the dark **Today** card shows the three rings and minutes/words/sessions, then the smart Start button, then **This week** (seven ring sets, days off dotted, "X of Y writing days closed", totals against plan). The day bubbles and Medals card follow.
- **Closing the day = all three rings closed.** The single "today %" is now the lowest ring. The Goal Getter medal counts days with all three rings closed.
- Storage: `pp.goals.v2` = `{ words, minutes, sessions, days[7] }` (Monday first). Daily plans in `pp.dailyGoals.v1` are `{ plan: 'usual'|'light'|'rest', words, minutes, sessions }`. Old `{type,target}` / `{skipped}` entries still display correctly.
- The old weekly chart (`WeekChart.js`) and weekly goal are removed.

### Events tab
- **Coming up:** Pen Parentis Eventbrite events listed top to bottom. The next one gets a gold card with a Register button, and later ones are compact rows. Tapping one opens details with "Register on Eventbrite". "See all events on Eventbrite" links to the organizer page.
- **Selected day card:** that day's rings, words/time/sessions (or the plan, for future days), any event, and "Read what you wrote".
- **Rolling calendar:** scrolls inside its own box (about 4 weeks visible) and **opens on this week**. It runs 12 weeks ahead across months (a month tag marks each 1st), and "↑ Earlier weeks" adds 4 more weeks above. Each day shows its three rings; days off are dotted, future days faded, and today is outlined. Event days get a **big gold star**.
- **Tapping a past day you wrote on** opens that day's writing (the Brainstorm day page).

### Eventbrite — what's needed to go live
- Eventbrite's API needs a **private token**, which must never ship inside the app. `supabase/functions/eventbrite-events/index.ts` is a small server function that holds the token, calls Eventbrite for organizer `4508348063`, and returns trimmed JSON.
- To deploy: `supabase secrets set EVENTBRITE_TOKEN=...`, then `supabase functions deploy eventbrite-events --no-verify-jwt`, then paste the function URL into `EVENTS_API_URL` in `links.js`.
- Until then, the app shows the built-in salon dates in `eventsService.js` (`FALLBACK_EVENTS`) with a small note. The live list is saved on the phone (`pp.events.v1`, refreshed at most every 6 hours, or with the refresh icon), so it works offline.

## Round 6 — lighter goals, smaller steps, page name, tab bar

- **A lighter day** is half of your usual goals, rounded down to a step (for example, 50 words · 5 min · 2 sessions → 25 words · 2 min · 1 session). It never goes below the smallest step.
- **Goal steps** (`GOAL_STEPS` in `writingLogic.js`):
  - minutes: 1, 2, 3, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180
  - words: 25, 50, 75, 100, 150, 200 … 5,000
  - sessions: 1–5

  − and + fade at the smallest and largest values. Older saved goals that aren't on a step still move to the nearest step.
- **Events page** title is now **Events & Calendar** — "What's coming up, and every day you showed up to write". The bottom tab stays **Events**.
- **Tab bar:** labels stay on one line ("Communities" no longer breaks in two) and shrink slightly on very narrow phones.
- **Events refresh:** the Refresh button clears the list, shows "Getting the latest events from Eventbrite…", then fades the live events back in with "Live from Eventbrite · updated <time>".
- **Events server is live** at `https://roxegmihuoezgfhrkesr.supabase.co/functions/v1/eventbrite-events`. The Eventbrite token is stored as a Supabase secret.

## Round 7 — ring animation and going past 100%

- **Rings fill when you open Brainstorm.** Each time the Brainstorm tab comes into view (swipe or tap), the Today rings start empty and fill in order: minutes, then words, then sessions, in about 1.3 s, with the numbers counting up. This lives in `components/RingStats.js`. With Reduce Motion on, the rings appear already filled.
- **Day page:** the old words / minutes / check-ins boxes are replaced by that day's rings, which fill the same way each time a day is opened. A ring that had no target that day says "no goal that day". Days from before the rings only had a words goal, so they show only the words target.
- **Beating a goal:** a ring past 100% keeps going for a second lap in a slightly deeper shade, with a small shadow at the tip so the overlap shows. It's drawn up to just under two full laps. A gold chip shows how far over the goal you went (for example "2.4×"); it appears from 1.1× and pops in during the animation.
- **Performance:** only the Today card and the day page animate. The calendar and This-week strip draw the same second laps without movement.

## Round 8 — events open in place, slower rings

- **One event open at a time.** The open card has a gold border, "★ NEXT EVENT" for the soonest event or "★ COMING UP" for a later one, its description and **Register on Eventbrite**. Tapping a closed event opens it in place while the other folds down to a slim row (`LayoutAnimation`, about 0.3 s). The bottom pop-up sheet is gone.
- **When it resets:** leaving the app and coming back (and Refresh) puts the next upcoming event back on top. Switching tabs keeps whichever event you opened.
- **From the calendar:** select an event day, then tap the ★ event line on the day card. The page scrolls up and opens that event in the list.
- **Ring fill** now takes 2.5 s: minutes 0–1.25 s, words 0.45–1.9 s, sessions 0.9–2.5 s (`STAGGER` in `components/RingStats.js`).

## Round 9 — calendar fixes

- **Sunday first.** Weeks run Sunday → Saturday everywhere: the Events calendar, the This-week strip, weekly totals, and the day picker in Your writing goals. Saved writing days keep the same storage order (`goals.days`, Monday first); only the display order changed.
- **Days off fix.** The calendar could draw with the default goals (Mon–Fri) instead of your saved ones, so the 31st and the 1st showed as days off even with all 7 days selected. The store now notifies screens whenever goals, daily plans or sessions are saved (`onDataChange` / `useDataChange` in `writingStore.js`, the Observer pattern), and the Events screen reloads straight away.
- **Days off look like any other empty day.** The dotted rings are gone from the calendar and the week strip (they read as broken). Only the "Rest today" option keeps the dotted picture.
- **Earlier weeks fold back up.** After "↑ Earlier weeks", the new weeks glide into view and a "↓ Back to this week" button appears. Tapping it, scrolling back down to this week, or leaving the Events tab folds the earlier weeks away, back to the 4-week view.

## Round 10 — writing prompts, Add to calendar, Share event

- **Writing prompts** (`prompts.js`, 30 original prompts for writer-parents):
  - Brainstorm shows **Today's prompt** under the start button. It stays the same all day and changes at midnight. **Write with this** opens the writing page with the prompt; **Another** swaps it.
  - On an empty writing page, **✦ Stuck? Try a prompt** shows one. The prompt sits above the page, is never part of the text and never counts toward words. **Another** swaps it and **Hide** puts it away.
  - The prompt is saved with the session (`prompt`), and the day page shows "✦ Prompt: …" above that piece.
- **Add to calendar** (`eventActions.js`): uses `expo-calendar/legacy`, which is the version included in Expo Go for SDK 58. The newer class-based API needs a development build.
  - It asks for calendar permission the first time, then adds the event to the phone's calendar (default calendar on iOS, primary writable calendar on Android) with the Eventbrite link and a reminder 1 hour before.
  - Added events are remembered in `pp.calendarAdded.v1`, so the button shows "✓ In your calendar" and won't add a second copy (unless the user deleted it from their calendar).
  - If access is off, the card says so with an **Open Settings** link.
- **Share**: the phone's share sheet with "Join me at a Pen Parentis event for writer-parents: “…”, Tue, Dec 8 at 7:00 PM ET (online). Free to register: <link>". The time is always given in New York time, marked ET.
- **Setup:** run `npx expo install expo-calendar`. `app.json` gains the `expo-calendar` plugin with the iOS permission message (used by real builds; Expo Go uses its own).

## Round 11 — prompts while writing, "Are you attending?", fuller Home

- **Prompts while writing:** a gold ✦ button in the writing page's top bar shows a prompt any time; tapping it again gives another. After 45 seconds without typing (`STUCK_AFTER`), a "Stuck? Try a prompt" card appears above Finish. It hides as you type, and its × turns nudges off for that session. The empty-page chip is still there.
- **Calendar bug fixed:** "✓ In your calendar" is gone. The app used to remember "added" on its own, so deleting the event in Calendar left it stuck. **Add to calendar** is now always available: each time, it asks the phone's calendar whether an event with the same title starts at the same time, then either adds it or says "This event is already in your calendar".
- **The calendar note goes away by itself:** it shows for 3 s (6 s when it has an Open Settings link) with a thin bar running down, fades out, and the card closes the gap.
- **Are you attending?** A switch on the open event card, saved on the phone (`pp.attending.v1`, `useAttending()` keeps Home and Events in sync). Events you're going to show a **GOING** badge.
- **Home page:**
  - **Countdown** (`components/EventCountdown.js`) to the soonest event you're attending: days / hours / minutes; "TONIGHT" (or "TODAY") with hours / minutes on the day; "HAPPENING NOW" with **Join on Eventbrite** while it's on; then it moves on to the next event you're going to. It updates every 30 s and handles daylight-saving changes.
  - If you're not going to anything, Home shows the next event with a one-tap **I'm going** and **Details**, which opens that event on the Events tab.
  - **Today's prompt** (`components/PromptCard.js`), the same card and prompt as Brainstorm.
  - This replaces the old fixed "Next salon, 7pm ET" card.

## Round 12 — a calmer Brainstorm page

- **Prompt in the header** (`components/PromptHeader.js`): "Small goals, kept quietly" is gone. Under "Brainstorm" is today's prompt (✦, at most two lines) with **✎ Write** beside it. **↻** (another prompt) and **✕** (hide) sit in the title row.
  - Hiding is remembered on the phone (`pp.promptHidden.v1`), even after closing the app. "✦ Show prompt" brings it back.
  - The header is about 30% shorter than a header with a separate prompt section (113 vs 159 px in the mockup).
  - The prompt card that sat under the start button is gone from Brainstorm; Home still has it.
- **One goals link:** "Change today" is gone. The Today card has a single **Edit goals** link in its top corner. It opens one sheet ("Your goals"): today's choice (My usual / A lighter day / Rest today) and **Your usual goals** with an **Edit** button for the full goals screen.
  - The once-a-day "What's your goal today?" pop-up is the same sheet (`TodayPlanSheet`, `mode` 'daily' or 'edit').
- `Header` in `components/ui.js` now takes an optional `right` element for buttons in the title row.

- **Info (i) button removed** from the top-right corner, along with its "About this app" sheet. The donor list and credits are still in `donors.js` (the Home page's donor ticker uses them), ready for a better About page later.

## Round 13 — an Edit button on each goal

- The **Your goals** sheet no longer has a "Your usual goals" section. **My usual** and **A lighter day** each have an **Edit** button on their row; **Rest today** has nothing to edit. Tapping a row still picks it for today.
- **Edit on My usual:** the goals screen titled "My usual", with the three rings, writing days and weekly totals.
- **Edit on A lighter day:** just the three rings.
  - By default a lighter day is half of the usual (rounded down to a step) and follows the usual when it changes.
  - Once edited it's saved as `goals.light` and stays as set. **↺ Use half of my usual** removes it again.
  - It can never be above the usual: the + buttons stop there, and `normalizeGoals` caps it too.
- Save and **‹ Your goals** return to the sheet with your pick kept; ✕ closes both.
- First run still shows "Your writing goals" (usual + writing days).

## Round 14 — the top of the writing page

- **Live rings** (`components/LiveRings.js`) replace "0 words · 00:20 · 57% of today", which mixed this session with today. A small card shows today's three rings with each number spelled out: **MIN 1:08 / 2 min · WORDS 36 / 50 · SESSIONS 2 / 2 ✓**.
  - The numbers include earlier writing today, so they match Brainstorm's Today card, and they update live (minutes every second, words with each new word).
  - A closed ring's number turns green with a ✓.
  - This session's own words and time are still on the Finish screen.
- **✦ Prompt** is now a labelled button (gold, and filled while a prompt is showing). Tapping it again gives another prompt.
- **"Picking up where you left off"** fades out after 4 seconds, or straight away with its ✕, and the page moves up into its space. It doesn't come back during that session.

## Round 15 — no writing days, no weekly goal

- **Writing days are gone.** Your usual goal applies every day; on days you can't write, pick **A lighter day** or **Rest today**. Old saved `days` settings are ignored (`normalizeGoals` drops them).
- **My usual** (and first-time setup) is just the three rings. "Your week, worked out for you" is removed.
- **This week** shows each day's rings against that day's own goal, "N days with all rings closed", and plain totals of what you wrote (**words · writing time · sessions**), with no "of 600" targets. Days you picked Rest are labelled "rest".
- **What's your goal today?** now says "Pick a goal for Tuesday. Resets at midnight." and defaults to My usual every day.
- Medals, streaks and saved writing are unchanged.

## Round 16 — one way to show time

- All time you've written uses one clock style (helpers in `writingLogic.js`):
  - `timeClock` → "8:25", "0:45", "1:08:25"
  - `timeText` → "8:25 min" / "1:08:25 h"
  - `timeLabel` → "min:sec" / "h:min:sec"
- **Where:**
  - This week totals: **8:25** over "writing (min:sec)".
  - Day cards: "107 words · **3:15 min** · 6 sessions" ("check-ins" is now "sessions").
  - Today card and day page: "MINUTES **3:15** of 2 min".
  - The Finish screen, Home's Today line, the Events day card, and "Send to myself" text use the same style.
  - The writing page's live rings already did.
- Medal targets keep their wording ("1 hr", "45 min"), since they're goals rather than time written.

## Round 17 — clearer medals and prompt levels

- **Medal tiers are easy to tell apart** (`components/Medal.js`):
  - **Not yet:** a pale dashed outline, faded icon and a small lock, so it reads as locked rather than grey metal.
  - **Silver:** a real metallic ring with a bright highlight, darker edge and darker icon.
  - **Diamond** (was Platinum): an icy blue-violet ring with a soft glow and a small gem on top.
  - The Medals header chips use matching colours.
  - Saved medal progress is stored by tier number, so the rename keeps everyone's medals.
- **Prompt levels** (`prompts.js`):
  - **Simple:** 15 new everyday prompts ("How was your day, in three sentences?", "What's the weather like where you are right now?", "What are your plans for the weekend?").
  - **Thoughtful:** 20 prompts, mostly a memory or a small scene.
  - **Deep:** 10 harder, more personal prompts.
  - The level is chosen with a chip in the Brainstorm header and on Home's prompt card (green / gold / violet; tap to cycle), or with the level chip on the writing page.
  - The choice is remembered (`pp.promptLevel.v1`) and shared across screens (`components/usePromptLevel.js`). ↻ / Refresh only shows prompts at that level, and each level shows every prompt before repeating. The default is Simple.

## Round 18 — a calmer writing page

- **✦ Prompt toggles:** tap to show today's prompt, tap again to hide it. While a prompt is showing, the button is filled in that level's colour.
- **The prompt card follows its level** (`screens/BrainstormWriterScreen.js`, colours in `components/usePromptLevel.js`):
  - It's tinted green (Simple), gold (Thoughtful) or violet (Deep), with a coloured edge on the left.
  - Everything sits on one small row: **✦ Simple ▾** (tap to change level), **↻ Refresh** and **✕**.
  - The three big level buttons are gone.
- **"Another" is now "Refresh"** everywhere: the writing page, Home's prompt card and the Brainstorm header.
- **Autosave:**
  - A draft is saved about 2 seconds after you stop typing, and straight away if you leave the app.
  - A small cloud next to ✕ says **Saving…** while you type, then turns green: **✓ Saved**.
  - It's the same session throughout, so Finish just completes it; nothing is counted twice. If the phone dies mid-sentence, the writing is still there.
- **One "Aa" button** opens a small menu:
  - **Text size:** A− / A+ in five steps. It's remembered on the phone (`pp.writerTextSize.v1`).
  - **Focus mode:** a switch.
- **Focus mode** hides the rings, prompt, notes and top buttons. Only your words, the save indicator, a faint **⤡ Exit focus** and Finish remain. The timer keeps running.
- Kept for the sponsor meeting: night mode, medal celebration, Sunday recap, search, export, reminders, quick sprint.

## Round 19 — a quieter Brainstorm header

- **Before:** four controls crowded the title (Simple ▾, ↻, ✕ and a "✎ Write" pill), and the prompt wrapped tightly beside Write.
- **Now** (`components/PromptHeader.js`):
  - "Brainstorm" stands alone.
  - One small text row above the prompt: **● SIMPLE ▾  ↻  ✕**, in the level's colour (green / gold / violet, from `LEVEL_STYLE.onDark` and `.dot`). Each item still has a finger-sized tap area.
  - **✎ Write is now a round white pencil** beside the prompt, so the prompt gets the full width (up to three lines).
- Same behaviour as before: the level cycles Simple → Thoughtful → Deep, ↻ refreshes, ✕ hides (remembered, with "✦ Show prompt" to bring it back), and the pencil opens the writing page with the prompt.
- **Prompt hidden:** the header shows the quiet subtitle *Small goals, kept quietly.*, in the same style as the other tab headers ("Events & Calendar" and its line). No numbers, because the rings card is right below.
- Explored and set aside after talking with the team: continuing pieces across days and switching between pieces. Brainstorm stays a simple one-entry-a-day journal.
- Held for later: On this day, journal lock (Face ID), mood through the week, titles and tags.

## Round 20 — an honest clock on the writing page

- **Auto-pause:** after **1 minute with no typing or scrolling**, the clock stops, so leaving the page open no longer adds minutes.
  - The quiet minute itself still counts, because pausing to think is part of writing.
  - A calm note explains: "Paused, you've been quiet a minute. Start typing and the clock picks up."
- **Typing always resumes.** Whether the clock was auto-paused or paused with the button, the first key starts it again. A short "▶ Back on the clock" appears for a moment. (Before, typing while paused didn't restart the clock.)
- **Scrolling** to reread, and **using the prompt** (show it, ↻ Refresh, change level), keep a running clock alive, but only **within 3 minutes of your last typing** (or of opening or resuming the page). Picking a prompt counts as writing time, but tapping Refresh over and over can't keep the clock running with no words. Neither one restarts a paused clock.
- **Clock status in the rings card** (`components/LiveRings.js`): a small green dot next to MIN while it runs; grey time with a **PAUSED** tag when stopped.
- The **Resume** button is filled blue while paused. The pause note shows even in Focus mode.
- Unchanged: leaving the app pauses the clock. Coming back gives you a fresh minute before any auto-pause.

## Round 21 — fair word counting

Found while testing: rewording a sentence didn't add words. First, the count only rose once the page passed its old highest total. Then, briefly, words you had deleted (like "I", "just" or "the") couldn't count again.

**The rules now** (`createWordCounter` in `writingLogic.js`):
1. **A word counts when it's finished**, meaning a space or punctuation follows it. Half-typed words and letters left over after deleting never count, so the number doesn't flicker as you type or delete.
2. **Deleting never takes words away.**
3. **New writing always counts**, even when it reuses words from what you deleted. Deleting a sentence and starting "I just…" counts +2.
4. **Retyping exactly what you just deleted, in the same order, is an undo.** Those words aren't counted twice, which stops delete-and-retype padding.
5. **Fixing a word is still one word.** Backspacing into "noodels" and correcting it to "noodles" counts +1. Autocorrect swaps count the same way.

Also: writing you're picking up from earlier today never counts twice. If you tap Finish halfway through your last word, that word counts. Pasting is still blocked.

**Tested:** every row of the situations table (`test17`), plus inserting a word mid-sentence, select-all-and-delete, and 300 random typing and deleting sessions (`test18`). The count never goes down and never exceeds the words actually typed.

## Round 22 — each prompt above its answer

- **Before:** a session saved only the *last* prompt shown, and the day page put it at the top, as if all the writing answered it.
- **Now:**
  - **While writing:** the prompt card says "✓ Saved with what you write next". Once you type, it changes to "✓ Saved with your answer". The prompt is pinned where you started answering it, even mid-paragraph.
  - **Day page:** writing done without a prompt stays plain. Each prompt sits right above its answer, in its level colour (green Simple, gold Thoughtful, violet Deep).
  - **Brainstorm:** day cards show "✦ 4 prompts answered", with one coloured dot per prompt.
  - **"Send to myself":** the shared text includes each prompt above its answer.
- **Rules:**
  - Only prompts you actually wrote under are saved. Ones skipped with ↻ Refresh, or shown with nothing written, are dropped.
  - Editing earlier text keeps each prompt with its answer.
  - If you delete an answer and the prompt is no longer showing, the prompt goes too, so new writing doesn't land under it.
  - Keep writing later the same day: earlier answers come back and stay pinned.
- **Older entries** (saved before this change) keep their single prompt at the top.
- **Data:** each session saves `answers: [{ prompt, level, at }]`, where `at` is the position in the text where the answer starts. This is handled by `anchorAt`, `shiftAnswers`, `pruneAnswers`, `cleanAnswers` and `pieceSegments` in `writingLogic.js`. Tested in `test19`, which replays tonight's entry.

## Round 23 — Eventbrite tab, Calendar tab (sponsor request)

- **Tabs:** Home · **Calendar** · Brainstorm · **Eventbrite** · Communities.
  - Salons → **Eventbrite** (ticket icon).
  - Events → **Calendar**.
- **Eventbrite tab** (`screens/EventbriteScreen.js`):
  - **Events:** upcoming events from Eventbrite. One is open at a time, Refresh works as before, and leaving the app resets to the next event.
  - **Each open event:** Are you attending?, Register on Eventbrite, a new **YouTube button**, Add to calendar and Share.
  - **The YouTube button changes with the stream:**
    - "Watch on YouTube · Nov 10, 7 PM" before it starts
    - "● Watch live now" in red while it's on, from 10 minutes before
    - "Watch the recording" afterwards
  - **Without a YouTube key**, only the **next** event shows the button. It opens the channel's Live page, which YouTube sends to the next scheduled stream, so it's always the right one. Later events get the button once they're next. **With a key** on the server, every event shows a button linking to its exact stream, matched by date.
  - **Previous salons:** "Watch past salons on YouTube" (red YouTube logo) and "Listen on Spotify" (green Spotify logo), as white buttons in the same style.
  - **Notification switches, now working** (`notify.js`, `expo-notifications`, local notifications that work in Expo Go):
    - *Tell me when a salon goes live:* one reminder 30 minutes before each upcoming salon. It's scheduled on the phone, so it arrives even when the app is closed, and is re-planned whenever events load (including at app start). Tapping it opens that event.
    - *New episode in the feed:* when the server reports a newer podcast episode than the last one seen, you get one notification. Tapping it opens Spotify. This is checked when the app loads events. Turning it on doesn't ping for an episode that's already out.
    - The first switch-on asks for permission. If notifications are blocked, an "Open Settings" link appears.
- **Calendar tab** (`screens/CalendarScreen.js`):
  - The ring calendar and the selected day's rings.
  - Event days keep the gold ★. Tapping one shows the event with "Open ›", which opens it on the Eventbrite tab.
  - Home's countdown and reminder taps also open events on the Eventbrite tab.
- **Server function** (`supabase/functions/eventbrite-events`) now also returns:
  - `streams`: YouTube upcoming and live streams, if `YOUTUBE_API_KEY` is set
  - `podcast`: the newest episode, if `PODCAST_RSS_URL` is set
  - Both are optional. If either fails, the events still load.
- **Tests:** `test20` covers matching streams to events, every YouTube button state with and without stream data, the reminder times, switching reminders on and off without duplicates, and the new-episode check (no ping for an old episode, and only one per new episode).

## Round 24 — Words ring is mint green everywhere

- **Before:** the Words ring was dark blue on white cards (This week, Calendar, the writing page) and **white** on the dark blue cards (Today, the day page), so it looked like two different rings.
- **Now:** Words is **mint green** everywhere, so each ring has its own colour on every background:
  - **Minutes:** gold
  - **Words:** green, `#2E9E6A` on white and `#6EE0A8` on dark blue
  - **Sessions:** sky blue
- **Where it changed:** set once in `components/Rings.js` (`RING_COLORS`, plus `RING_LABEL` for the text labels), so it covers:
  - the rings on every screen
  - the WORDS labels, including on the writing page
  - the Calendar legend
  - the goal sheets' colour dots

## Round 25 — Add to calendar: you choose the calendar

- **Before:** the app put the event straight into one calendar it picked (the phone's default). It asked for calendar access first, and checked for duplicates.
- **Now:** **Add to calendar** opens the phone's own **New Event** screen, already filled in with the title, start and end time, "Online", the description with the Eventbrite link, and a reminder 1 hour before (`createEventInCalendarAsync` in `eventActions.js`).
  - **iPhone:** the **Calendar** row lets you pick any calendar on the phone, including iCloud, Google and Outlook accounts added in Settings. Tap Add, or Cancel.
  - **Android:** the event opens in your calendar app. If you have more than one (Google Calendar, Samsung, Outlook…), Android asks which one to use.
  - No calendar-access prompt any more.
- **After:**
  - Saving on iPhone shows a short "Added to your calendar." note.
  - Cancelling shows nothing.
  - Android doesn't report back, so no note appears there.
- **Trade-off:** the app no longer checks for a duplicate, because the phone's screen is in charge now and the app can't see your calendars without permission. You'll see the event in the calendar before saving it again.

## Round 26 — Community tab refresh

- **Join the Pen Parentis Discord** is now a white button with Discord's logo, in the same style as the YouTube and Spotify buttons on the Eventbrite tab.
- **Cycle of Support:** the sponsor's Airtable appears **live inside the page**, exactly as Airtable shows it (a shared-view embed in a `react-native-webview`).
  - It's always up to date and needs no token or server.
  - "Open ↗" opens the full view in the browser.
  - A spinner shows while it loads. If it can't load, the space shows "Open it in Airtable ↗" and "Try again".
  - It replaces the old "Find a weekly accountability group" button, which linked to the same table.
- **On the Discord:** #residencies and #3am-club now open Discord when tapped. The made-up "41 members writing right now" is replaced with a plain description.
- **To change which table shows:** update `cycleOfSupport` in `links.js`. Any shared-view link works.

- **Revised:**
  - The Airtable section is now called **Accountability groups**, with a short description: *"Groups where writer-parents keep each other writing. Each one has a host, a short description and its meeting time. Tap Open to see every group in full."* It describes only what the table actually shows.
  - The placeholder #residencies and #3am-club cards are removed.

## Round 27 — a better bottom bar

- **Communities → Community.**
- **The Brainstorm circle shows in full.** It sits above the bar's top edge with a cream ring and a soft shadow. Before, the bar cut off its top.
- **"You are here" shows on every tab.** The current tab gets a short dark bar *under its label*, Brainstorm included. Before, the marker sat at the top of the bar and was hidden behind the Brainstorm circle.
- **How it works:** the bar is drawn by `components/BottomBar.js`, which replaces the tab library's built-in bar (the built-in one clipped the circle). Swiping between tabs still works, and taps on the circle register on its raised part too.
- **Revised: the circle now sits inside the bar.** The raised circle covered the donor ticker on Home and the last lines of long pages. The bar is now a little taller and the circle (46px) sits fully inside it, slightly higher than the other icons, so nothing on any page is covered. The "you are here" marker under each label is unchanged.

## Round 28 — opening animation

- **When the app starts (about 2 seconds, once per launch)** (`components/IntroSplash.js`):
  1. The Pen Parentis logo fades in and settles with a slight bounce.
  2. A **black pen** writes **"parenting done, write"** in **black ink**, left to right. The words appear just behind its point, and it wobbles a little like a hand.
  3. The full stop lands and the pen fades away.
  4. Everything lifts away to Home.
- **Tap anywhere to skip.** With **Reduce Motion** on, the logo just fades in and out.
- **What it uses:**
  - The sponsor's own logo image (`assets/pen-parentis-logo.png`).
  - The handwriting font **Caveat** from Google Fonts, which is free to use (`@expo-google-fonts/caveat`). If the font isn't ready, it falls back to an italic serif.

## Round 29 — Previous salons moves to the Calendar tab (sponsor request)

- **Calendar tab, under the writing calendar:** **Previous salons**, with a short description: *"Missed one, or want to hear it again? Recordings of past salons are on YouTube, and the salon podcast is on Spotify."*
  - Then "Watch past salons on YouTube" and "Listen on Spotify".
  - Then the **New episode in the feed** switch, next to the Spotify button it relates to.
- **Eventbrite tab:** upcoming events, "See all events on Eventbrite", and the **Tell me when a salon goes live** switch, next to the events it's about.
- Both switches work as before (`notify.js`).
- The shared buttons and switch cards now live in `components/LinkButtons.js`, so both tabs look identical.

## Round 30 — medal popup, and Diamond emails Pen Parentis (sponsor request)

- **A popup for every new medal** (`components/MedalPopup.js`). After "Finish & check in", if the session earned a medal, it appears big in the middle:
  - it pops in with twinkling sparkles
  - it shows the medal's name ("Gold Wordsmith") and what it took ("10,000 words")
  - "See my medals" opens Medals, and "Keep going" continues to the usual check-in sheet
- **Diamond, the top tier,** gets a violet, gem-like glow and its own message.
  - The main button, **Email Pen Parentis**, opens the phone's Mail app with a ready-to-edit note to **info@penparentis.org**. For example, the subject "I reached Diamond Wordsmith!" with "I just earned the Diamond Wordsmith medal in the Pen Parentis app: 50,000 words!". Nothing is sent until the writer taps Send.
  - Also: "See my medals" and "Maybe later".
  - If no email app is set up, a message shows the address instead.
- **Several medals in one session:** "Next · 1 of 2", with Diamond first.
- **Each medal pops up only the first time it's earned.**
- **"Maybe later" isn't lost:** a Diamond medal's own page in Medals keeps the **Email Pen Parentis** button.
- **Tested:** the email address, subject and message (`test21`).

## Round 31 — brand buttons that stand out, Facebook group, credits (sponsor request)

- **Brand-tinted buttons** (`components/LinkButtons.js`): each link button gets a soft wash of its service's colour and a matching edge. The text and logos are unchanged.
  - YouTube: pale red. Used for the event card's "Watch on YouTube" on Eventbrite, and "Watch past salons on YouTube" on Calendar.
  - Spotify: pale green ("Listen on Spotify").
  - Discord: pale purple-blue ("Join the Pen Parentis Discord").
  - Facebook: pale blue.
  - The red "● Watch live now" during a salon is unchanged.
- **New: Join the Facebook group**, under the Discord button on Community. It opens facebook.com/groups/penparentis (`LINKS.facebookGroup`), in the Facebook app if it's installed.
- **Credits at the bottom of Community,** centred like the end of a film:
  - **CREDITS:** Pace University and the Seidenberg School of Computer Science and Information Systems. Text only: the logo was removed because we don't have the rights to use it.
  - **LED BY:** Dr. Li-Chiou Chen, Professor, Interim Dean.
  - **FACILITATED BY:** Dr. Tom Schmidt, Clinical Assistant Professor.
  - **DEVELOPERS OF THE APP:** Brian Mangaru, Rony Castillo, Rafael Mendoza, Nala Hamer.
  - Then "Built for Pen Parentis with care."
  - Names and titles are in one list (`CREDITS`) at the top of the credits code, so they're easy to update.

## Round 32 — stretch day and offline writing (sponsor request)

- **Goals** (`components/TodayPlanSheet.js`): **A lighter day** (EASY) · **My usual** (NORMAL) · **A stretch day** (HARD) · **Rest today**.
  - **A lighter day** is always half of your usual, rounded down to a goal step (100 words · 5 min · 2 sessions → 50 · 2 · 1). A small grey "Half of your usual" line sits under it.
  - **A stretch day** is 1.5× your usual, rounded up (→ 150 · 8 · 3), with "1.5× your usual" underneath.
  - Only **My usual** has **Edit**. A tip says: "To change your goals, tap Edit on My usual. The others follow it."
  - Any custom lighter day saved by older versions is ignored.
- **Log offline writing** (`components/OfflineLogSheet.js`): a button on Brainstorm under Keep writing, with an import icon and "Wrote in Word, a notebook or elsewhere?".
  - Pick **Today** or **📅 Choose date**, then enter minutes, words and sessions using − / + or by typing.
  - It works on the **honor system**: nothing is pasted.
  - A small picture shows what it counts toward. The **rings**, Wordsmith, Timekeeper, Regular, On a Roll and Goal Getter get a green ✓. Vowel Voyager, Consonant Collector, Punctuation Pro and Big Words are greyed out with a red ✕, because they need the actual text.
  - **Limits per entry:** 12 hours, 20,000 words, 10 sessions.
  - Any medal it earns pops up in the medal popup, which Brainstorm now uses too, Diamond email included.
- **On the day page:** each log shows as **✍️ Written elsewhere · HONOR SYSTEM** with its numbers and a **Remove** link. On Brainstorm's day card, a day with only offline writing reads "✍️ Written elsewhere".
- **"Keep writing"** still continues the writing you did in the app; offline entries never merge into it.
- **Data:** each log is one saved session `{ offline: true, sessionCount, words, seconds, text: '' }` (`makeOfflineSession`). `summarize` counts it as `sessionCount` sessions.
- **Tested:** `test22` covers the goal maths, the logging, the rings, the medals, and the limits.

- **Revised (choose any date, matching steps):**
  - **When:** **Today** or **📅 Choose date**, which opens a small calendar in the sheet. Any day up to today can be picked, with no limit back: it's truly an honor system. Future days are greyed out, and a green dot marks days you already wrote. The chip and the button show the chosen day ("Add to Wed, Oct 28").
  - **− / + steps** match My usual, starting from 0: minutes 0, 1, 2, 3, 5, 10…720; words 0, 25, 50, 75, 100…20,000; sessions 1–10. You can still type any number.
  - Helpers: `stepOffline`, `canLogDay` and `monthGrid` in `writingLogic.js`. Tested in `test22`.

## Round 33 — offline log: rings, live preview, medal progress (sponsor request)

- **Calendar shows rings:** in **📅 Choose date**, each day shows its own three small rings (like the Calendar tab) instead of a green dot. The chosen day is outlined in blue; future days are faded.
- **Live rings card:** under the date, "THU, OCT 22 · WITH THIS LOG" shows that day's rings as they stand now. Every − / + or typed number redraws it, with "+30", "+500", "+1" next to what this log adds and ✓ on rings it closes.
- **Medal progress (Counts toward):** Wordsmith, Timekeeper, Regular, On a Roll and Goal Getter are now rows with a progress bar towards the next tier.
  - **Gold** = so far, **green** = this log, and it grows as you change the numbers.
  - If the log passes a tier: "✦ Unlocks Silver Wordsmith" (the medal popup still appears after saving).
  - A medal the log doesn't move is greyed with the reason, e.g. On a Roll: "That day already had writing, so no change"; Goal Getter: "Needs all of that day's rings closed".
  - **Tap a row** for a note: what it tracks, what this log adds, and how far is left ("1 hr 50 min to go for Silver").
- **Only from writing in Brainstorm** (was "Needs your actual text"): the four text medals stay as badges with a red ✕, so nobody expects to import a PDF or Word file. **Tap one** for: "Counts the vowels in your writing. Only counts writing done in Brainstorm, because it reads the words themselves.", plus its current progress bar.
- **Code:** `offlinePreview()` and `previewBar()` in `medals.js` work out the day's rings and each medal before/after the log (medal totals are worked out once when the sheet opens). The sheet now takes `sessions`, `dailyGoals` and `goals` instead of `writtenDays`.
- **Tested:** `test23` covers the empty log, the bars, the Silver unlock, the streak and goal reasons, and the text medals staying put.

## Round 34 — medal bars in your medal's colour, Next medals, "Almost there!" (sponsor request)

- **Bars in your medal's colour** (`components/MedalProgress.js` → `MedalBar`): the filled part of every medal bar is the colour of the tier you hold now: soft blue (none yet), bronze, silver, gold, diamond. Green is always what you just added. Used on Session saved, the offline log, the Medals page, a medal's page and the Brainstorm medals card. Colours: `TIER_BAR` / `tierBarColor()` in `medals.js`.
- **Next medals on Session saved** (`SessionDoneSheet`): between Today and "How do you feel?", the **3 medals you're closest to**, with "See all ›".
  - Gold-style bar = before this session, green = this session ("+4", "+6 sec").
  - A medal this session took past a tier comes first, with "✦ Silver earned · next: Gold at 10,000", and its bar starts again towards the next tier. (The medal popup still shows first.) This replaces the old single "New medal" card.
  - Logic: `nextMedals(beforeStats, after)` in `medals.js`.
- **"Almost there!" while writing** (`BrainstormWriterScreen` → `ReachNote`): a small dark card under the rings, e.g. "Almost there! 12 more words …and you'll earn Silver Wordsmith", with a bar that fills as you type. If you get there while it's up: "✦ Silver Wordsmith! It'll pop up when you finish." ✕ closes it; otherwise it slides away after 6 s.
  - **Only when realistic this session**, judged by what's left, not a %: Wordsmith ≤ 50 words · Timekeeper ≤ 5 min · Vowel Voyager ≤ 75 · Consonant Collector ≤ 120 · Punctuation Pro ≤ 10 · Big Words ≤ 3 · Goal Getter when closing today's rings earns it and the lowest ring is at least 75%. Regular and On a Roll never (they count when you save). A Diamond that's 95% done but 2,400 words away never shows.
  - At most **once per medal per session**; never while the prompt, the Aa menu, Focus mode or a sheet is open. The limits are `REACH` / `GOAL_REACH_PCT` in `medals.js`, easy to tune.
  - Logic: `liveMedalStats`, `reachNudge`, `reachTitle` in `medals.js`.
- **Tested:** `test24` covers the nudge limits (including the far-away Diamond), skipping shown medals, Goal Getter, the live totals, the titles, Next medals ordering and bars, and the colours.

## Round 35 — Sessions fix, one shared medal summary, See all stays on Session saved (sponsor request)

- **Bug fix (Log offline writing):** changing only **Sessions** now moves Regular (and the day's sessions ring) straight away. Before, the preview waited until minutes or words were above 0. Saving still needs minutes or words ("Enter the minutes or words you wrote.").
- **One medal summary, two places** (`components/MedalProgress.js` → `MedalSummary`): the same rows, bars (in your medal's colour, green = added) and tap-to-learn notes on Session saved and Log offline writing.
  - Offline log (`pending`): "This log adds 500 words", "✦ Unlocks Silver Wordsmith". The four text medals stay as greyed badges there.
  - Session saved: "This session added 7 words", "✦ Silver earned". All 9 medals have bars, since Brainstorm writing counts toward every one.
  - A medal that passes a tier fills its bar to the end in green, then says what's next.
- **Session saved → See all:** "See all 9 ⌄" now opens every medal **inside the sheet** (same order as the Medals page), with "Show less ⌃". It no longer jumps to the Medals page, so How do you feel?, Send to myself and Done are never skipped. It starts folded each time.
- **Code:** `summaryRow` / `summaryRows` in `medals.js` (one row shape for both places); `nextMedals` builds on them.
- **Tested:** `test23` (Sessions-only preview) and `test24` (all 9 rows, passing a tier).

## Round 36 — Next medals only shows medals this session moved

- The brief list on Session saved now shows **only medals this session changed** (up to 3, any just earned first, then the closest). A medal that didn't move, like On a Roll on a day you'd already written, is left out; it's still in "See all 9".
- If nothing moved at all, it falls back to the 3 closest.
- Fixed: the faint curved line above each row in the medal summary is now a straight divider.
- Tested in `test24`.

## Round 37 — gold when you meet your goal, Minutes row, Calendar card that switches (sponsor request)

- **Gold bar = goal met** (`DayBubble`, `daySummary`): a day's bar on Brainstorm turns **gold as soon as all its rings close** (it used to need 110%), the same gold as "Goal met, write a little more?"; blue while still going. It now goes by the day's actual rings: before, it read a status saved with an earlier session, which is why today stayed blue after the rings closed. Days with no goal keep their saved status.
- **Log offline writing:** the "min" after the Minutes number is gone, so the three numbers and their − / + line up. The row is already called Minutes.
- **Calendar top card switches** (`components/Cycler.js`): today's rings ↔ the **countdown to the next event** (days / hours / min, Details · Share; "TONIGHT" and "HAPPENING NOW · Join" on the day).
  - Every 6 s; swipe either way or tap the dots. Touching it holds it still for ~12 s. With Reduce Motion on it switches without sliding.
  - Tapping another day in the calendar shows that day and stops the switching until today is selected again.
  - No upcoming event → just the day card, no dots.
- **Eventbrite:** "Are you attending?" is gone (and its GOING tag). The countdown no longer needs it: it's always on the Calendar card. "Tell me when a salon goes live" is unchanged.
- **Home:** the event countdown card is removed (it only showed when you'd switched on "Are you attending?"). It lives on the Calendar now.
- **Tested:** `test25` (gold once the rings close, even with an older saved status).

- **Revised (Calendar top card):** the day card is laid out to match the countdown card's height: the date on top, bigger rings (84) with one short line per ring ("MIN 5:34 of 5 min ✓", "WORDS 120 of 100 ✓", "SESSIONS 9 of 2 ✓", "All rings closed ✓"), and "Read what you wrote ›" at the bottom. Nothing runs off the edge any more, and the card no longer has a big empty band. `Cycler` also waits for its width before laying out the cards.

## Round 38 — one rings card everywhere (sponsor request)

- **Rings + bars** (`components/RingStats.js`): next to the rings, each line is now "MINUTES ……… 5:34 of 5 min ✓ 1.1×" with a bar in the ring's colour running to the card's edge, so the card uses its full width. Same fill animation as before.
- **Calendar top card** is now the same dark blue as the event countdown it takes turns with, and uses the same `RingStats` as Brainstorm: date, a gold "All rings closed ✓" tag, the rings and bars, any event that day (Open ›), and "Read what you wrote ›" (or the plan / "No writing this day").
- **Brainstorm's Today card** and the **day page** use the new bars too, so all three look the same.

## Round 39 — rings fill at a steady speed

- The rings (Brainstorm Today card, day page, Calendar) now fill at a **constant speed: one full lap every 1.4 s**, with no speed-up or slow-down. The total time depends on the day: a small day is quick; crushing your goal takes a little longer (up to ~3.4 s) instead of whizzing round.
- Rings start 0.3 s apart (minutes, words, sessions). A ring past its goal carries on into its second lap at the same speed; the drawing stops at two laps while the number keeps counting to the real total (e.g. 9 of 2 sessions), and the "4.5×" chip pops in on the way.
- The bars fill along with their ring. Reduce Motion still shows everything filled straight away.
- Code: `LAP_MS`, `fillPlan`, `fillFrac` in `components/RingStats.js`. Tested in `test26`.

## Round 40 — type your goals

- **Edit goals (My usual / A lighter day / first run)** (`components/GoalsSheet.js`): tap a number to type it on the phone's number pad, just like Log offline writing. − / + still step through the usual values.
  - While typing, the box can be empty; when you leave it (or tap Save) the number is kept in range (minutes 1–180, words 25–5,000, sessions 1–5; a lighter day never above your usual). Any number in range is allowed, not just the − / + steps.
- The "min" after the Minutes number is gone, so the three numbers line up (the row is called Minutes).

## Round 41 — the app's own number pad

- **New `components/NumberPad.js`**: a number pad in the app's colours (cream panel, white keys, blue numbers), shaped like the iPhone one. Used by **Edit goals** (My usual, A lighter day, first run) and **Log offline writing** instead of the phone's keyboard.
  - Tap a number: the pad slides up and the sheet grows upward, so the rows stay in view. The number being typed gets a blue outline and a blinking cursor (steady with Reduce Motion).
  - The header shows the field and its range ("MINUTES · 1 to 180"); **Done** closes it. Bottom-left **Next ›** goes Minutes → Words → Sessions (on the last one it reads Done).
  - The first key replaces the number, then keys add digits; ⌫ removes one. You can't go past the limit: it stops there and the header turns red ("Up to 5,000"). Done / Next keep it at least the minimum.
  - − / + still work while the pad is open.
- **Edit goals:** Save is hidden while the pad is open and comes back on Done.
- **Log offline writing:** with the pad open, the sheet scrolls so the rings card and the three numbers sit just above it; the card updates as you type. Limits: minutes up to 720, words up to 20,000, sessions 1–10.
- **`Sheet`** gained `footer` (pinned under the scrolling part; the sheet shrinks its scroll area so sheet + pad fit) and `scrollRef`.

## Round 42 — Settings, a cleaner Home banner, and dark mode (sponsor request)

- **Home banner:** a gold-outlined **⚙ Settings** button top right (same look and spot as Brainstorm's "✦ Show prompt"). The stat lines ("Still up. Day 5 of your streak.", "120 words already today…", "Evenings are your time…", "Learning your rhythm…") are removed; the banner is just the name and "parenting done, write."
- **Settings** (`components/SettingsSheet.js`): **Appearance** with three picture tiles: **System** (default, follows the phone), **Light**, **Dark**. Saved on the phone (`appearance.js`). Switching redraws the app in the new colours and keeps you where you were, with Settings still open.
- **Dark mode** (`theme.js`):
  - `colors` has a light and a dark palette; `applyScheme()` swaps them and the gradients. Dark: deep navy page, navy cards, light text, softer blue links, mid-blue buttons. The blue banners, rings, gold cards and medals keep their colours.
  - Every screen's styles now use `themed(() => ({ … }))` instead of `StyleSheet.create`. They're rebuilt on a switch, and in dark mode the light-only colours typed into them (white cards, pale tints, grey lines, brown text…) are swapped for dark versions by two tables, per property, so white text on blue stays white and dark text on gold stays dark.
  - Also made dark-aware: prompt-level tints (Simple / Thoughtful / Deep), the YouTube / Spotify / Discord / Facebook button tints, the day-card bars, the "Saved" tick. The opening logo animation always uses the light page.
  - App.js reads the setting, applies it before drawing, gives React Navigation a matching background, and redraws on change (also when the phone itself switches, in System).
- **Tested:** `test27` (light unchanged; dark cards, links, buttons, notes, text on blue and on gold, lines, gradients; switching back).
- If any spot still looks too bright in dark mode, its colour just needs adding to the table in `theme.js`.

## Round 43 — dark mode clarity fixes, dark opening, dark keyboard

- **One root cause fixed:** labels coloured "deep navy" (Log offline writing, feeling chips like Ecstatic / Frustrated, the tab bar's active name and marker, Aa / Pause on the writing page, the day page's feeling chip and HONOR SYSTEM tag, Unlock's button) vanished on the navy page. In dark mode that colour is now a light blue (`royalDeep` in the dark palette); light mode is unchanged. Navy shadows become plain dark shadows in dark mode.
- **Tab bar:** idle icons and names are brighter.
- **Days you didn't write:** a visible dashed outline with a faint fill in dark mode.
- **Number pad (dark):** lighter-navy keys with white numbers on a darker panel; ⌫ a little lighter.
- **Keyboard:** text boxes ask for the dark keyboard when the app is dark.
- **System appearance:** `app.json` now has `"userInterfaceStyle": "automatic"` (it was `"light"`, which made the phone always report light). Fully close and reopen the project in Expo Go to pick this up.
- **Settings:** picking Light / Dark no longer reopens Settings after the redraw.
- **Opening animation (dark):** navy page, white handwriting and full stop, a light silver pen, and a soft glowing edge on the logo tile. Light mode is unchanged.
- **Tested:** `test27` (deep-navy text, shadows, dashed outline, pad panel, tab colours; light unchanged).
- **Fix:** the opening animation waits for the saved Appearance before it starts (a split second), so it opens dark when the app is dark, even if the phone itself is light.

## Round 44 — Accountability groups (Airtable) in dark mode

- Airtable's embed has no dark version, so in dark mode the app darkens its page inside the WebView (`DARK_AIRTABLE` in `screens/CommunitiesScreen.js`): the page's colours are flipped and turned back to the right hues (pictures are flipped back so photos look normal), then a navy wash makes it match the app. Light mode loads Airtable exactly as before. "Open ↗" (the full Airtable page in the browser) isn't changed.

## Round 45 — status bar fix

- **Bug:** in light mode the top of every blue banner had a white fade and the clock / battery turned black. The status bar setting lived inside the part of the app that redraws on an Appearance switch, so it could fall back to dark text; on iOS that also paints a white fade behind the status bar.
- **Fix:** `<StatusBar style="light" />` now sits at the very top of App.js, outside the redrawn part, so the status bar is always white text over the blue banners, in light and dark.
- **Revised (the real fix):** the haze appeared only after dark mode, because `app.json` changed from `"light"` to `"automatic"`. Before, iOS always treated the app as light; after, iOS followed the phone (dark), while the app could be showing Light, so iOS's own parts (status bar text, the fade it paints at the top of scrolling pages, the keyboard) were in the wrong style. App.js now tells iOS the app's own choice with `Appearance.setColorScheme` (Light → light, Dark → dark, System → the phone's setting), which puts Light back exactly where it was before dark mode. The earlier status-bar-strip and `statusBarStyle` attempts were undone.

## Round 46 — Accountability groups wording, donor scroll update (sponsor request)

- **Community → Accountability groups:** a gold tag "★ Requires sustaining membership at the All-Access level", then "Guided goal-setting in a small group of writers who are also parents." and two points: choose a group by when you're free (12-week minimum participation); times are in each group's own time zone, so do your own time-zone math. The Airtable list follows as before.
- **Home → donor scroll** (`donors.js`): the placeholder names are replaced by the real list: 13 organizations by full name, then 15 people as first name + last initial (each listed once). Each loop ends with: "This app was developed and given by the talented individuals at Pace University, Seidenberg School of Computer Science and Information Systems · Developed by Brian M., Rony C., Rafael M. & Nala H." (`APP_CREDIT`).
  - The scroll now draws each name as its own piece of text, since the full line is too long to draw in one go.
- The Community page credits are unchanged.

## Round 47 — Home reworked, scroll fix, Accountability groups paragraph (sponsor request)

- **Home** (`screens/HomeScreen.js`), top to bottom: the banner with ⚙ Settings · **Follow Pen Parentis** with brand buttons, each showing its handle: Facebook (@PenParentis), Instagram (@penparentis), LinkedIn (Pen Parentis), X (@penparentis), **Bluesky (@penparentis.bsky.social, new)** · **Visit penparentis.org** with the Pen Parentis logo · Get Karma · "THANK YOU TO ALL OF OUR SUPPORTERS" · the donor scroll.
  - Removed from Home: Today's goal card and Today's prompt (both on Brainstorm / Calendar), and the Socials button with its sheet.
  - X and Bluesky marks are drawn in the app (they're not in the icon font). New links: `LINKS.bluesky`, `LINKS.website`.
- **Donor scroll:** Pace University, Seidenberg School of Computer Science and Information Systems is now with the organizations; Brian M., Rony C., Rafael M. and Nala H. are with the people. The separate "developed by" sentence and the "Thank you" at the start are gone (the heading above says it).
  - **Fix:** names no longer pile on top of each other over time. The moving strip is now as long as the list instead of the screen's width, so its two copies sit end to end.
- **Accountability groups:** one paragraph: "**Requires sustaining membership at the All-Access level.**" (bold gold) then the description, no line breaks.

## Round 48 — "From the blog" on Home (sponsor request)

- **Home → From the blog** (`components/BlogCarousel.js`), at the top under the banner: the 5 newest posts from https://penparentis.org/category/blog/ as cards you swipe through: featured picture, date ("SEP 8, 2026"), title and first line, with dots. **See all ›** opens the whole blog.
- **Tapping a post** opens it inside the app (the phone's built-in browser sheet: Done to come back, and a button to open it in Safari), coloured to match light / dark mode.
- **Always current** (`blogService.js`): the app reads the site's public WordPress post list (no key needed): it finds the "blog" category, then its newest posts with their pictures. If that isn't reachable it reads the blog's RSS feed instead. The last list is saved on the phone, so it still shows offline. A post without a picture shows the Pen Parentis logo.
- **Needs** `expo-web-browser`: run `npx expo install expo-web-browser` once.
- **Tested:** `test28` (WordPress posts, pictures, excerpts, RSS fallback, dates).

## Round 49 — blog fixes, website link moved, social colours

- **Blog dots:** the last card now lights the last dot (it can't scroll to the left edge, so reaching the end counts as the last card).
- **Blog pictures:** if a post has no featured image in the site's list, the app looks for the picture the site shares on social media, then the first picture in the post itself (including lazy-loaded ones). The Pen Parentis logo is only the last resort. Tested in `test28`.
- **Home order:** From the blog → Visit penparentis.org → Follow Pen Parentis → Get Karma → thank-you scroll, so the two website things sit together.
- **Social colours:** each button has its own tint: Facebook blue, Instagram pink, LinkedIn teal, X grey, Bluesky sky blue (with matching dark-mode versions).

## Round 50 — full-width blog cards, arrows, 10-second switching

- **From the blog:** each post is now a full-width card (same width as the buttons below): a bigger picture, the date, the title, up to four lines of the post and "Read post ›". The cards take turns every **10 seconds**; swipe, tap a dot, or tap the round **‹ ›** arrows either side of the dots (they wrap around). Touching it holds it still for a while.
- **Calendar top card** (today's rings ↔ next event countdown) now switches every **10 seconds** too.
- Both use `components/Cycler.js` (new `arrows` option; default timing now 10 s).
- **Calendar top card** now has the same round ‹ › arrows either side of its dots.

## Round 51 — 10 blog posts, wrap-around swiping

- **From the blog** now shows the **10** newest posts (`COUNT` in `blogService.js`).
- **Goes round and round** (`components/Cycler.js`): swiping on from the last card slides straight to the first (newest) post, and swiping back from the first shows the last. The ‹ › arrows and the 10-second switching wrap the same way. (A copy of the first and last card sits at each end; once the slide finishes it jumps to the real card, which you can't see.) Same on the Calendar's top card.
- The ‹ › arrows sit a little in from the left and right edges (44 px), with the dots in the middle.

## Round 52 — Share your rings (sponsor request)

- **Calendar → ⇪ Share** (in the "Your writing calendar" title row) opens **Share your rings** (`components/ShareCalendarSheet.js`):
  - **This month · 3 months · This year** (January to now; a year shows 3 months a row).
  - A live preview of the picture: the app's blue with "PEN PARENTIS · MY WRITING", the dates ("Aug – Oct 2026"), each month as a little calendar of your rings (future days faded), and the Pen Parentis logo with "parenting done, write.". It's always blue, in light or dark mode.
  - **Show totals** switch: days with every ring closed, words, and best streak in that range.
  - **Share image…** turns the preview into a picture and opens the phone's share sheet (Messages, Instagram, Save Image…). Only rings and totals, never any writing.
- **Logic** (`writingLogic.js`): `shareMonths`, `shareTitle`, `shareStats`. Tested in `test29`.
- **Needs** two add-ons that work in Expo Go: `npx expo install react-native-view-shot expo-sharing`.
- **Revised ranges:** **This month · 3 months · 6 months** (no full year: too big to read). This month fills the width; 3 months sit side by side in one row, and 6 months in two rows of three, so the picture stays short enough to share without running into the phone's notch.

## Round 53 — smooth wrap-around

- **Fix (blog and Calendar cards):** going from the last card back to the first no longer flashes the second card. The swap from the end copy to the real first card used a timer that could fire mid-slide, and the strip's start position was being re-applied on every redraw. Now the swap happens the moment the slide lands on the copy (`onScroll`), and the start position is set once.

## Round 54 — the app tour (sponsor request)

- **Home:** a gold **Welcome to Pen Parentis** card above From the blog (`components/TourCard.js`): how many chapters are done, **Start / Continue the tour**, and "Hide for now". It disappears for good once every chapter is done.
- **The tour** (`components/TourModal.js`, full screen over the app):
  - **Chapters list** with ✓ on finished ones; tap any chapter to do it or go over it again.
  - **Chapter cards**: a picture of that part of the app (drawn with the app's own pieces, so it's right in light and dark mode), a title, a few plain sentences, dots, ‹ Back / Next ›, and "Done ✓" on the last card (moves on to the next chapter).
  - **Try it** on some cards closes the tour and opens the real thing: set today's goal, start writing, write with a prompt, Share your rings, Log offline writing. Your place is saved; "Continue the tour" picks it up.
  - **The end**: the 💎 **Diamond Tour Guide** medal pops up the first time, then a thank-you with **Get Karma**, the **credits**, and **Start writing**.
- **10 chapters** (`components/TourContent.js`, all the words in one place):
  1. Welcome & settings (pick Light / Dark / System right in the tour; the tour is always in Settings; the five tabs)
  2. Home (the blog, the website and socials, our supporters)
  3. Your goals & rings (three rings, today's goal, usual goals and the number pad, goal met)
  4. Start writing (the pencil, the writing page, picking up where you left off)
  5. Prompts & tools (prompts and levels, Aa text size and Focus, Pause and auto-pause, "Almost there!")
  6. Finish & check in (saving, how do you feel, send to myself, reading it again)
  7. Medals (the medals, four tiers and bars, Diamond)
  8. Calendar (your rings over time, salons and the countdown, Share your rings)
  9. Writing elsewhere (Log offline writing)
  10. Salons & community (Eventbrite, previous salons, Discord, Facebook group, Accountability groups)
- **⚙ Settings → The app tour:** **Open the tour** (review any chapter) and **Start over** (clears the ticks; the medal stays earned).
- **New medal: Tour Guide** (`medals.js`): one tier only, earned straight at Diamond when every chapter is done. Medals now total 37. The medal page shows just the Diamond tier.
- **Progress** is saved on the phone (`tour.js`). Tested in `test24` (the medal) and `test30` (chapters, finishing once, starting over, hiding).

## Round 55 — the tour goes hands-on (part 1 of 2) and a tiered Tour Guide medal

- **Every step has a task** in a dark bar under the dots: "Your turn: …" with live progress ("3 of 5 tabs seen"). Do it and the bar turns green ✓ and **Next** unlocks; until then the button reads **Skip ›** (grey) so nobody gets stuck. All practice: nothing done in the tour is saved.
- **Hands-on chapters 1–5** (`components/TourSteps.js`, working practice copies of the app):
  1. **Welcome & settings:** tap the logo (it pops and writes "parenting done, write."); pick Light / Dark / System and the whole app, tour included, changes; tap "Open the tour" in a practice Settings; **the tab bar at the bottom**: swipe the page above it or tap each tab to preview Home, Calendar, Brainstorm, Eventbrite and Community (each gets a ✓).
  2. **Home:** swipe or use the arrows through 3 blog cards; tap two social buttons (it says what each opens); say thanks to the supporters under the real scrolling list.
  3. **Goals & rings:** tap + until all three rings close (gold "Goal met" appears); try two kinds of day and watch the targets change; tap a number and type a new goal on the app's number pad.
  4. **Start writing:** tap the pencil in a practice tab bar; type 5 words in a practice writing page (real word counting, a running clock, rings filling); add 2 words to earlier writing ("Picking up where you left off").
  5. **Prompts & tools:** show a prompt, change its level, refresh it; change the text size and turn on Focus; type, Pause, then type again to restart the clock; tap "+2 words" until the "Almost there!" note flips to Silver Wordsmith.
- **"Try it" is now "Open ›"** under the hands-on part, for the real feature (today's goal, writing, a prompt).
- Chapters 6–10 keep their picture cards for now (no task); they become hands-on in part 2.
- **Tour Guide medal is tiered** (`medals.js`): Bronze at 3 chapters, Silver at 6, Gold at 9, Diamond at all 10. Each new tier pops up over the tour. Counted from chapters ever finished (`ever` in `tour.js`), so Start over doesn't take it away. Medals total 40 again. Home's welcome card shows the tier so far.
- **Tested:** `test24` (tiers 3/6/9/10), `test30` (progress kept after Start over).

## Round 56 — the tour runs on the real app (chapters 1–4)

The tour no longer uses practice copies for chapters 1–4. It sits **on top of the real app**: everything is dimmed except one spot (gold outline), and a speech bubble says what it is and what to do. You tap the real button and the real screen reacts.

- **Chapter 1, Welcome & settings:** a welcome card over Home with the logo and the pen from the opening writing "parenting done, write." Then tap the real ⚙ Settings, pick an appearance, see where the tour lives in Settings, close Settings, and tap each of the five real tabs (a ✓ appears on each one).
- **Chapter 2, Home:** swipe the real blog to 3 posts, tap a website or social button, then the supporters.
- **Chapter 3, Goals & rings:** the real Today card, then Edit goals → Edit on My usual → set goals with − / + or the number pad → Save → pick today's goal → Save today's goal. These are your real goals.
- **Chapter 4, Your first entry:** tap the pencil, Start writing, write at least 5 words, Finish & check in, then Done. **This is a real entry**: it's saved and counts toward rings and medals.
- **Appearance in the tour:** nothing is highlighted until you tap; the current one has a small gold "now" tag.
- Each bubble has Skip ›, and ✕ leaves the tour. If a step's spot isn't on screen, the bubble says so and offers Skip.
- After each chapter, a "Chapter done" card shows progress toward the next Tour Guide tier: Take a break, or go on to the next chapter.
- While the tour runs, Brainstorm's automatic "set your goals" and "today's goal" pop-ups wait, so they don't get in the way.
- Chapters 5–10 are still the card pages for now (next round).

How it's built: `tourRun.js` (the run), `components/TourTarget.js` (marks a spot), `components/TourLayer.js` (spotlight, bubble, cards; one over the app, one inside each sheet), `components/TourOverlay.js` (in App.js), and the steps in `components/TourContent.js`.

## Round 57 — the tour: no shortcuts, ‹ Back, chapters 5–7 on the real app

- **No shortcuts:** every chapter (after the welcome) starts by asking you to tap the right tab yourself: Home for chapter 2, the pencil (Brainstorm) for chapters 3, 4 and 7. You learn where everything is.
- **‹ Back** in the bubble goes back a step to try it again (to the right tab, if needed). It hides when there's no sensible step to go back to (e.g. from inside a sheet to the page under it).
- **Goals can't be closed by accident:** while the tour is on the goals sheet or today's goal, the × is hidden and tapping outside does nothing; "‹ Your goals" is hidden too.
- **What to tap on My usual:** a pulsing gold ring takes turns between − / + and the number, with "Tap − or + to change a goal" / "Or tap the number to type it", until you try one.
- **The chapter card's Next button** shows a small "NEXT" over a short name, and shrinks to fit.
- **Chapters now (all 10 kept, so the medal tiers are the same):** 1 Welcome & settings · 2 Home · 3 Goals · 4 Start writing (pencil, Start writing, 5 words) · 5 Prompts & tools on the real writing page (✦ Prompt, level and ↻ Refresh, Aa size, Focus mode on and off, Pause, type to resume) · 6 Finish & check in (Finish, then a gold outline around just "How do you feel?" and the faces, then Done) · 7 Medals (look only: the medals card at the bottom of Brainstorm, two short notes; it can't be opened from the tour) · 8 Calendar, 9 Writing elsewhere, 10 Salons & community (still cards).
- **Earning the medal:** when a chapter earns a Tour Guide tier, the chapter card becomes a "✦ MEDAL EARNED ✦" screen with the medal popping in.
- **Start over resets the medal:** Settings → Start over clears every chapter and the Tour Guide medal, so it's earned (and celebrated) again.
- Session saved no longer lists "Tour Guide +4" as if writing had moved it.
- `components/TourSteps.js` (the old practice copies) is no longer used: delete it.

## Round 58 — tour: time to read, prompt spotlight, scroll-down chapter

- **No more abrupt endings:** steps where you'd want to read or keep going now wait for you once done. The bubble turns green and shows a button:
  - Chapter 1, five tabs: read about the last tab (Community), then **Next ›**.
  - Chapter 4, write 5 words: keep writing as long as you like, then **I'm ready to go on ›**.
  - Chapter 5, type to restart the clock after Pause: see what you typed, then **Next ›**.
- **Prompt spotlight:** gold rings go around just the level chip and ↻ Refresh (not the whole prompt card), and the ✕ can't be tapped during that step.
- **Prompt card in dark mode:** ↻ Refresh and ✕ are now see-through pills with a light edge, so the level colour and ✕ are easy to read (they were pale pills before).
- **Chapter 7 is now "Your week, writing & medals":** tap the pencil, then scroll down yourself (the tour waits at the top without dimming):
  - This week, with a tip: a day with all three rings closed is a day you met your goal; tap a day to read it.
  - Your writing: everything is saved on your phone, each day has a card with how you felt, and "See all my writing" has every day, by week.
  - Medals: two short notes, look only.
