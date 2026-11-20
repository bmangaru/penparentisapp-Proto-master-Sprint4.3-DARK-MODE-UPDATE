// components/SettingsSheet.js — ⚙ Settings, opened from Home's banner. Laid
// out like the iPhone's Settings: grouped rows that open pages.
//
//   Settings ─┬─ Appearance      System / Light / Dark, each a tiny picture of the app
//             ├─ Notifications   writing reminders (add, rename, remove), Streak
//             │                  saver, medals, month's medal, week in review,
//             │                  salons, quiet hours; each with an example
//             ├─ App tour        every chapter (tap one to go over it), start over
//             └─ Contact Pen Parentis
//
// It's one sheet with pages inside (‹ back), so the app tour can point at
// things in it. Switching Appearance redraws the app; Settings comes back on
// the same page (keepSettingsOpen).

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Switch, TextInput, Linking, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Sheet from './Sheet';
import TourTarget from './TourTarget';
import { colors, dk, isDark, radius, themed } from '../theme';
import { keepSettingsOpen, setAppearance, useAppearance } from '../appearance';
import { openTour, restartTour, useTour, TOUR_CHAPTER_IDS } from '../tour';
import { isTourTarget, tourEvent, useRun } from '../tourRun';
import {
  askPermission, notifyPermission, openPhoneSettings, setNotify, updateNotify, useNotifySettings,
} from '../notify';
import {
  DAY_LETTERS, countOn, daysText, examples, newReminder, stepTime, timeText,
} from '../reminders';
import { loadAll } from '../writingStore';
import { loadEvents, upcoming } from '../eventsService';
import { PEN_PARENTIS_EMAIL } from './MedalPopup';
import { CHAPTERS } from './TourContent';

const OPTIONS = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];
const APPEARANCE_LABEL = { system: 'System', light: 'Light', dark: 'Dark' };
const TITLES = { root: 'Settings', appearance: 'Appearance', notifications: 'Notifications', reminder: 'Reminder', quiet: 'Quiet hours', tour: 'App tour', prompts: 'Writing prompts' };
const PARENT = { appearance: 'root', notifications: 'root', tour: 'root', prompts: 'root', reminder: 'notifications', quiet: 'notifications' };
const BLUE = '#3352C4';


// ---------------------------------------------------------------------------
export default function SettingsSheet({ visible, onClose, page: startPage = 'root' }) {
  const [page, setPage] = useState(startPage || 'root');
  const [editing, setEditing] = useState(null); // reminder id on the 'reminder' page
  const [data, setData] = useState(null);       // { sessions, dailyGoals, goals }
  const [perm, setPerm] = useState(null);
  useEffect(() => {
    if (!visible) return;
    setPage(startPage || 'root');
    loadAll().then(setData).catch(() => {});
    notifyPermission().then(setPerm);
  }, [visible]);
  const go = (p) => { setPage(p); tourEvent('settings-page', p); };
  const back = () => go(PARENT[page] || 'root');

  return (
    <Sheet
      visible={visible} onClose={onClose} tourId="settings" full
      title={TITLES[page]} subtitle={page === 'root' ? 'Make the app yours.' : null}
      onBack={page === 'root' ? null : back} backLabel={TITLES[PARENT[page] || 'root']}
    >
      {page === 'root' ? <RootPage go={go} data={data} perm={perm} onClose={onClose} /> : null}
      {page === 'appearance' ? <AppearancePage /> : null}
      {page === 'notifications' ? (
        <NotificationsPage data={data} perm={perm} setPerm={setPerm} onEdit={(id) => { setEditing(id); go('reminder'); }} onQuiet={() => go('quiet')} />
      ) : null}
      {page === 'reminder' ? <ReminderPage id={editing} data={data} onDone={() => go('notifications')} /> : null}
      {page === 'quiet' ? <QuietPage /> : null}
      {page === 'tour' ? <TourPage onClose={onClose} /> : null}
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Pieces: a group of rows, a row, a section header and footnote.
// ---------------------------------------------------------------------------
function Group({ children, style }) {
  const list = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[s.group, style]}>
      {list.map((c, i) => <View key={i}>{i > 0 ? <View style={s.sep} /> : null}{c}</View>)}
    </View>
  );
}

function Row({ icon, iconBg, title, sub, value, onPress, right, chevron = true, disabled, label }) {
  const body = (
    <View style={[s.row, icon && s.bigRow, disabled && { opacity: 0.45 }]}>
      {icon ? <View style={[s.ico, { backgroundColor: iconBg || BLUE }]}><Ionicons name={icon} size={21} color="#FFFFFF" /></View> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={s.rowSub} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {value ? <Text style={s.value} numberOfLines={1}>{value}</Text> : null}
      {right}
      {onPress && chevron ? <Ionicons name="chevron-forward" size={17} color={colors.muted} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => pressed && { opacity: 0.7 }} accessibilityRole="button" accessibilityLabel={label || title} accessibilityState={{ disabled: !!disabled }}>
      {body}
    </Pressable>
  );
}

const Header = ({ children }) => <Text style={s.header}>{children}</Text>;
const Foot = ({ children }) => <Text style={s.foot}>{children}</Text>;

function Toggle({ value, onChange, label }) {
  return (
    <Switch
      value={!!value} onValueChange={onChange} accessibilityLabel={label}
      trackColor={{ false: dk('#D6DAE6', '#39426A'), true: '#34C759' }} thumbColor="#FFFFFF" ios_backgroundColor={dk('#D6DAE6', '#39426A')}
    />
  );
}

// An example of what a notification says (under its switch).
function Example({ title, body, when, actions }) {
  return (
    <View style={s.eg} accessibilityLabel={`Example: ${title}. ${body}`}>
      <View style={s.egIcon}><Image source={require('../assets/pen-parentis-logo.png')} style={{ width: 28, height: 28 }} resizeMode="cover" accessibilityIgnoresInvertColors /></View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text style={s.egTitle} numberOfLines={1}>{title}</Text>
          <Text style={s.egWhen}>{when}</Text>
        </View>
        <Text style={s.egBody}>{body}</Text>
        {actions ? (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
            {actions.map((a) => <Text key={a} style={s.egAct}>{a}</Text>)}
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Settings (the first page)
// ---------------------------------------------------------------------------
function RootPage({ go, data, perm, onClose }) {
  const choice = useAppearance() || 'system';
  const prefs = useNotifySettings();
  const tour = useTour();
  const run = useRun();
  // During the tour, only the row it points at can be tapped.
  const off = (id) => !!run && !run.min && !isTourTarget(id, run);
  const doneN = tour ? TOUR_CHAPTER_IDS.filter((id) => tour.done?.[id]).length : 0;
  const notifyValue = perm && !perm.granted ? 'Off' : `${countOn(prefs)} on`;
  return (
    <View>
      <Group>
        <TourTarget id="settings.rowAppearance">
          <Row icon="contrast" iconBg="#5B6CD8" title="Appearance" value={APPEARANCE_LABEL[choice]} onPress={() => go('appearance')} disabled={off('settings.rowAppearance')} />
        </TourTarget>
        <TourTarget id="settings.rowNotify">
          <Row icon="notifications" iconBg="#E5484D" title="Notifications" value={notifyValue} onPress={() => go('notifications')} disabled={off('settings.rowNotify')} />
        </TourTarget>
      </Group>

      <Header>HELP</Header>
      <TourTarget id="settings.tour">
        <Group>
          <TourTarget id="settings.rowTour">
            <Row icon="compass" iconBg={BLUE} title="App tour" value={`${doneN} of ${TOUR_CHAPTER_IDS.length}`} onPress={() => go('tour')} disabled={!!run} />
          </TourTarget>
          <Row
            icon="mail" iconBg="#7C8DB0" title="Contact Pen Parentis" sub={PEN_PARENTIS_EMAIL}
            onPress={() => Linking.openURL(`mailto:${PEN_PARENTIS_EMAIL}`).catch(() => {})} disabled={off('settings.rowContact')}
          />
        </Group>
      </TourTarget>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Appearance: three tiny pictures of the app.
// ---------------------------------------------------------------------------
function AppearancePage() {
  return (
    <View>
      <Header>LOOK</Header>
      <TourTarget id="settings.appearance">
        <View style={s.group}>
          <AppearancePicker />
        </View>
      </TourTarget>
      <Foot>System follows your phone, so the app turns dark when your phone does (at night, if your phone is set to switch).</Foot>
    </View>
  );
}

// The three pictures (System is half light, half dark). During the app tour
// nothing is highlighted until you tap one (yours just gets a small "now").
export function AppearancePicker({ onPick }) {
  const choice = useAppearance() || 'system';
  const run = useRun();
  const neutral = isTourTarget('settings.appearance', run) && !run.taskDone;
  return (
    <View style={s.pickRow} accessibilityRole="radiogroup">
      {OPTIONS.map((o) => {
        const on = o.id === choice && !neutral;
        return (
          <Pressable
            key={o.id}
            onPress={() => {
              if (onPick) onPick(o.id);
              tourEvent('appearance', o.id);
              // The app redraws in the new colours; Settings stays open on this page.
              if (o.id !== choice) { keepSettingsOpen('appearance'); setAppearance(o.id); }
            }}
            style={s.pick}
            accessibilityRole="radio"
            accessibilityState={{ checked: o.id === choice }}
            accessibilityLabel={`${o.label} appearance`}
          >
            <View style={[s.phone, on && s.phoneOn]}>
              {o.id === 'system' ? (
                <View style={{ flex: 1, flexDirection: 'row' }}>
                  <View style={{ flex: 1, overflow: 'hidden' }}><MiniApp dark={false} /></View>
                  <View style={{ flex: 1, overflow: 'hidden' }}><View style={{ marginLeft: -36, width: 72 }}><MiniApp dark /></View></View>
                </View>
              ) : <MiniApp dark={o.id === 'dark'} />}
            </View>
            <Text style={s.pickText}>{o.label}</Text>
            {o.id === choice && neutral ? <Text style={s.now}>now</Text> : (
              <View style={[s.radio, on && s.radioOn]}>{on ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}</View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// A tiny Brainstorm page: banner, the rings card, Start writing, the tab bar.
function MiniApp({ dark }) {
  const page = dark ? '#0F1326' : '#F6F4EE';
  const card = dark ? '#18213A' : '#FFFFFF';
  return (
    <View style={{ width: 72, height: '100%', backgroundColor: page }}>
      <LinearGradient colors={['#1C2C7A', '#2C3E9E']} style={{ height: 30, paddingLeft: 7, justifyContent: 'flex-end', paddingBottom: 7 }}>
        <View style={{ width: 30, height: 5, borderRadius: 3, backgroundColor: '#FFFFFF' }} />
      </LinearGradient>
      <View style={{ margin: 5, height: 38, borderRadius: 7, backgroundColor: card, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 5, borderWidth: dark ? 0 : 1, borderColor: '#E3E6EE' }}>
        <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: '#E9B949', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2.5, borderColor: '#7DD3A0' }} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ height: 3, borderRadius: 2, backgroundColor: '#E9B949' }} />
          <View style={{ height: 3, borderRadius: 2, backgroundColor: '#7DD3A0', width: '80%' }} />
          <View style={{ height: 3, borderRadius: 2, backgroundColor: '#9AD0F5', width: '60%' }} />
        </View>
      </View>
      <View style={{ marginHorizontal: 5, height: 16, borderRadius: 6, backgroundColor: BLUE }} />
      <View style={{ margin: 5, height: 24, borderRadius: 7, backgroundColor: card, borderWidth: dark ? 0 : 1, borderColor: '#E3E6EE' }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 13, backgroundColor: dark ? '#141A33' : '#FFFFFF' }} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
function NotificationsPage({ data, perm, setPerm, onEdit, onQuiet }) {
  const prefs = useNotifySettings();
  const [denied, setDenied] = useState(false);
  const eg = examples(prefs, data || {});
  // Switching one on asks for permission first (once).
  const ensure = async () => {
    if (perm?.granted) return true;
    const ok = await askPermission();
    setPerm(await notifyPermission());
    if (!ok) setDenied(true);
    return ok;
  };
  const set = async (patch, turningOn) => {
    if (turningOn && !(await ensure())) return;
    updateNotify(patch);
  };
  const setReminder = (id, patch) => set({ reminders: prefs.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) }, patch.on);
  const salon = async (kind, on) => {
    if (on && !(await ensure())) return;
    const r = await loadEvents().catch(() => ({ events: [], podcast: null }));
    const res = await setNotify(kind, on, { events: upcoming(r.events || []), podcast: r.podcast });
    if (res === 'denied') setDenied(true);
  };
  // Saved first, then its page opens (so the page finds it); permission is
  // asked after, and the reminder stays even if the phone says no.
  const add = async () => {
    const r = newReminder(prefs.reminders);
    await updateNotify({ reminders: [...prefs.reminders, r] });
    onEdit(r.id);
    if (!perm?.granted) ensure();
  };
  const evening = prefs.reminders.find((r) => r.id === 'evening') || { h: 20, m: 30 };
  // The example: your first reminder that's on (none on → no example).
  const firstOn = prefs.reminders.find((r) => r.on !== false);
  const q = prefs.quiet;

  return (
    <View>
      {perm && !perm.granted ? (
        <View style={s.permBox}>
          <Ionicons name="notifications-off-outline" size={20} color={dk('#8A5E12', '#F2C14E')} />
          <View style={{ flex: 1 }}>
            <Text style={s.permTitle}>Notifications are off for Pen Parentis</Text>
            <Text style={s.permText}>{perm.canAsk ? 'Turn them on to get the ones you pick below.' : 'Turn them on in your phone’s Settings, under Notifications.'}</Text>
          </View>
          <Pressable onPress={perm.canAsk ? ensure : openPhoneSettings} style={s.permBtn} accessibilityRole="button">
            <Text style={s.permBtnText}>{perm.canAsk ? 'Turn on' : 'Open Settings'}</Text>
          </Pressable>
        </View>
      ) : null}
      {denied && perm && !perm.granted ? <Foot>Your phone said no. You can change that in your phone’s Settings → Pen Parentis → Notifications.</Foot> : null}
      <Foot>Under each one, an example of what it says.</Foot>

      <Header>WRITING REMINDERS</Header>
      <Group>
        {prefs.reminders.map((r) => (
          <Row
            key={r.id} title={r.name} sub={daysText(r.days)} onPress={() => onEdit(r.id)} chevron={false}
            label={`${r.name}, ${timeText(r.h, r.m)}, ${daysText(r.days)}. Tap to edit.`}
            right={(
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.time}>{timeText(r.h, r.m)}</Text>
                <Toggle value={r.on !== false} onChange={(v) => setReminder(r.id, { on: v })} label={`${r.name} reminder`} />
              </View>
            )}
          />
        ))}
        <Row title="＋ Add a reminder" onPress={add} chevron={false} label="Add a reminder" />
        {firstOn ? <Example {...eg.reminder(firstOn)} when={timeText(firstOn.h, firstOn.m)} /> : null}
      </Group>
      <Group style={{ marginTop: 8 }}>
        <Row title="Skip once today’s rings are closed" chevron={false} right={<Toggle value={prefs.skipDone} onChange={(v) => set({ skipDone: v })} label="Skip reminders once today's rings are closed" />} />
      </Group>
      <Foot>Tap a reminder to rename it, change its time or days, or remove it.</Foot>

      <Header>STREAK SAVER</Header>
      <Group>
        <Row title="Save my streak" sub="At your Evening time, only if you haven’t written yet" chevron={false} right={<Toggle value={prefs.streak} onChange={(v) => set({ streak: v }, v)} label="Streak saver" />} />
        {prefs.streak ? <Example {...eg.streak} when={timeText(evening.h, evening.m)} actions={['Write now', '🌙 Rest day']} /> : null}
      </Group>
      <Foot>Hold the notification for its buttons. A rest day keeps your streak going without opening the app (2 a week). No writing and no rest day by midnight, and the streak starts again. Instead of the Evening reminder that day, never as well as it.</Foot>

      <Header>MEDALS</Header>
      <Group>
        <Row title="Almost there" sub="When a medal’s next tier is close" chevron={false} right={<Toggle value={prefs.almost} onChange={(v) => set({ almost: v }, v)} label="Medal almost there" />} />
        {prefs.almost ? <Example {...eg.almost} when="next morning" /> : null}
        <Row title="Month’s medal" sub="On the 1st, and 3 days before the month ends" chevron={false} right={<Toggle value={prefs.month} onChange={(v) => set({ month: v }, v)} label="Month's medal" />} />
        {prefs.month ? <Example {...eg.monthStart} when="the 1st" /> : null}
        {prefs.month ? <Example {...eg.monthEnd} when="3 days left" /> : null}
      </Group>
      <Foot>No writing last month? The 1st just introduces the new month’s medal.</Foot>

      <Header>WEEK IN REVIEW</Header>
      <Group>
        <Row
          title="Sunday summary" sub="Last week’s words, rings and medals" chevron={false}
          right={(
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.time}>{timeText(prefs.weekly.h, prefs.weekly.m)}</Text>
              <Toggle value={prefs.weekly.on} onChange={(v) => set({ weekly: { ...prefs.weekly, on: v } }, v)} label="Sunday week in review" />
            </View>
          )}
        />
        {prefs.weekly.on ? <Example {...eg.week} when="Sunday" /> : null}
      </Group>
      <Foot>It’s always on Brainstorm too: swipe This week to the right to see last week.</Foot>

      <Header>SALONS</Header>
      <Group>
        <Row title="When a salon goes live" sub="30 minutes before · also on Eventbrite" chevron={false} right={<Toggle value={prefs.live} onChange={(v) => salon('live', v)} label="When a salon goes live" />} />
        {prefs.live ? <Example title="Salon in 30 minutes" body="Pen Parentis Literary Salon. Tap for the link." when="6:30 PM" /> : null}
        <Row title="New episode in the feed" chevron={false} right={<Toggle value={prefs.episodes} onChange={(v) => salon('episodes', v)} label="New episode in the feed" />} />
        {prefs.episodes ? <Example title="New salon episode on Spotify" body="A new Pen Parentis salon just landed in the feed." when="now" /> : null}
      </Group>
      <Foot>The same two switches are on the Eventbrite page; changing one changes both.</Foot>

      <Header>QUIET HOURS</Header>
      <Group>
        <Row
          title="Nothing between" sub={`${timeText(q.from[0], q.from[1])} – ${timeText(q.to[0], q.to[1])} · tap to change`} onPress={onQuiet} chevron={false}
          label={`Quiet hours, ${timeText(q.from[0], q.from[1])} to ${timeText(q.to[0], q.to[1])}. Tap to change.`}
          right={<Toggle value={q.on} onChange={(v) => set({ quiet: { ...q, on: v } })} label="Quiet hours" />}
        />
      </Group>
      <Foot>Medal, month and week notes due then wait until quiet hours end. Your own reminders still come at the time you set.</Foot>
    </View>
  );
}

// ---------------------------------------------------------------------------
// One reminder: name, time, days, remove.
// ---------------------------------------------------------------------------
function ReminderPage({ id, data, onDone }) {
  const prefs = useNotifySettings();
  const rem = prefs.reminders.find((r) => r.id === id);
  const [name, setName] = useState(rem ? rem.name : '');
  const [confirm, setConfirm] = useState(false);
  if (!rem) return <Foot>That reminder was removed.</Foot>;
  const save = (patch) => updateNotify({ reminders: prefs.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const saveName = () => { const n = name.trim() || 'Reminder'; if (n !== rem.name) save({ name: n }); };
  const step = (mins) => { const [h, m] = stepTime(rem.h, rem.m, mins); save({ h, m }); };
  const toggleDay = (d) => {
    const has = rem.days.includes(d);
    const days = has ? rem.days.filter((x) => x !== d) : [...rem.days, d].sort();
    if (days.length) save({ days });
  };
  const eg = examples(prefs, data || {}).reminder({ ...rem, name: name.trim() || 'Reminder' });
  return (
    <View>
      <Group>
        <View style={s.row}>
          <Text style={s.fieldLabel}>Name</Text>
          <TextInput
            value={name} onChangeText={setName} onEndEditing={saveName} onBlur={saveName} maxLength={30}
            style={s.input} placeholder="Reminder" placeholderTextColor={colors.muted} returnKeyType="done" accessibilityLabel="Reminder name"
          />
        </View>
      </Group>

      <Header>TIME</Header>
      <Group>
        <TimeStepper h={rem.h} m={rem.m} onStep={step} />
      </Group>

      <Header>REPEAT</Header>
      <Group>
        <View style={[s.row, { gap: 6, paddingVertical: 12 }]}>
          {DAY_LETTERS.map((l, d) => {
            const on = rem.days.includes(d);
            return (
              <Pressable key={d} onPress={() => toggleDay(d)} style={[s.dayChip, on && s.dayOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]}>
                <Text style={[s.dayText, on && { color: '#FFFFFF' }]}>{l}</Text>
              </Pressable>
            );
          })}
        </View>
      </Group>
      <Foot>{daysText(rem.days)}. At least one day stays on.</Foot>

      <Header>EXAMPLE</Header>
      <Example {...eg} when={timeText(rem.h, rem.m)} />
      <Foot>It changes with your day: nothing yet, partway, or skipped once your rings are closed.</Foot>

      {confirm ? (
        <View style={[s.group, { marginTop: 16, padding: 12, gap: 10 }]}>
          <Text style={s.rowTitle}>Remove “{rem.name}”?</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => setConfirm(false)} style={[s.btn, { flex: 1, backgroundColor: BLUE }]} accessibilityRole="button"><Text style={[s.btnText, { color: '#FFFFFF' }]}>Keep it</Text></Pressable>
            <Pressable
              onPress={() => { updateNotify({ reminders: prefs.reminders.filter((r) => r.id !== id) }); onDone(); }}
              style={[s.btn, { flex: 1, borderWidth: 1.5, borderColor: dk('#C62828', '#FF8A80') }]} accessibilityRole="button"
            >
              <Text style={[s.btnText, { color: dk('#C62828', '#FF8A80') }]}>Remove</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Group style={{ marginTop: 16 }}>
          <Pressable onPress={() => setConfirm(true)} style={[s.row, { justifyContent: 'center' }]} accessibilityRole="button">
            <Ionicons name="trash-outline" size={16} color={dk('#C62828', '#FF8A80')} />
            <Text style={[s.rowTitle, { color: dk('#C62828', '#FF8A80'), marginLeft: 6 }]}>Remove reminder</Text>
          </Pressable>
        </Group>
      )}
    </View>
  );
}

// A time with − 1 hr / − 5 min / + 5 min / + 1 hr.
function TimeStepper({ h, m, onStep }) {
  return (
    <View>
      <View style={[s.row, { justifyContent: 'center', paddingVertical: 10 }]}>
        <Text style={s.bigTime} accessibilityLiveRegion="polite">{timeText(h, m)}</Text>
      </View>
      <View style={[s.row, { gap: 8, justifyContent: 'center', flexWrap: 'wrap', paddingBottom: 12 }]}>
        {[[-60, '− 1 hr'], [-5, '− 5 min'], [5, '+ 5 min'], [60, '+ 1 hr']].map(([n, t]) => (
          <Pressable key={t} onPress={() => onStep(n)} style={({ pressed }) => [s.stepBtn, pressed && { opacity: 0.7 }]} accessibilityRole="button">
            <Text style={s.stepText}>{t}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Quiet hours: from / until.
// ---------------------------------------------------------------------------
function QuietPage() {
  const prefs = useNotifySettings();
  const q = prefs.quiet;
  const save = (patch) => updateNotify({ quiet: { ...q, ...patch } });
  const move = (key) => (mins) => save({ [key]: stepTime(q[key][0], q[key][1], mins) });
  return (
    <View>
      <Group>
        <Row title="Quiet hours" sub={q.on ? 'On' : 'Off'} chevron={false} right={<Toggle value={q.on} onChange={(v) => save({ on: v })} label="Quiet hours" />} />
      </Group>
      <Header>FROM</Header>
      <Group><TimeStepper h={q.from[0]} m={q.from[1]} onStep={move('from')} /></Group>
      <Header>UNTIL</Header>
      <Group><TimeStepper h={q.to[0]} m={q.to[1]} onStep={move('to')} /></Group>
      <Foot>Medal, month and week notes due in quiet hours wait until they end. Your own writing reminders still come at the time you set.</Foot>
    </View>
  );
}

// ---------------------------------------------------------------------------
// App tour: every chapter (tap one to go over it), then Start over.
// ---------------------------------------------------------------------------
function TourPage({ onClose }) {
  const run = useRun();
  const tour = useTour();
  const touring = !!run;
  const done = tour?.done || {};
  const doneN = TOUR_CHAPTER_IDS.filter((id) => done[id]).length;
  const go = (id, restart = false) => {
    if (touring) return;
    onClose();
    setTimeout(async () => { if (restart) { await restartTour(); openTour(); } else openTour(id); }, 350);
  };
  return (
    <View>
      <Foot>A hands-on guide to everything in the app. Tap a chapter to go over it. {doneN} of {TOUR_CHAPTER_IDS.length} done.</Foot>
      {touring ? <Foot>You’re in the tour now, so these are off until it’s done.</Foot> : null}
      <Group style={{ marginTop: 10 }}>
        {CHAPTERS.map((c, i) => (
          <Row
            key={c.id} title={`${i + 1}. ${c.title}`} sub={c.sub} onPress={() => go(c.id)} disabled={touring}
            right={done[c.id] ? <Ionicons name="checkmark-circle" size={20} color="#2E9E62" accessibilityLabel="done" /> : null}
          />
        ))}
      </Group>
      <Pressable onPress={() => go(null, true)} disabled={touring} style={[s.tourBtn, { marginTop: 16 }, touring && { opacity: 0.4 }]} accessibilityRole="button" accessibilityState={{ disabled: touring }}>
        <Ionicons name="refresh" size={16} color={colors.royal} />
        <Text style={s.tourText}>Start the tour over</Text>
      </Pressable>
      <Foot>Starting over clears every ✓ (and the Tour Guide medal, so you can earn it again).</Foot>
    </View>
  );
}

const s = themed(() => ({
  group: { backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden', borderWidth: isDark() ? 0 : 1, borderColor: colors.line },
  sep: { height: 1, backgroundColor: colors.line, marginLeft: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, paddingVertical: 6 },
  ico: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bigRow: { minHeight: 64 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  rowSub: { fontSize: 12.5, color: colors.muted, marginTop: 1 },
  value: { fontSize: 14, color: colors.muted, maxWidth: 140 },
  header: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.9, color: colors.muted, marginTop: 20, marginBottom: 7, marginLeft: 6 },
  foot: { fontSize: 12.5, lineHeight: 17, color: colors.muted, marginTop: 7, marginHorizontal: 6 },
  time: { fontSize: 13, fontWeight: '700', color: colors.royal, backgroundColor: dk('#EEF1FF', '#24305A'), paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', fontVariant: ['tabular-nums'] },
  eg: { flexDirection: 'row', gap: 9, marginHorizontal: 12, marginBottom: 12, marginTop: 2, padding: 10, borderRadius: 13, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, backgroundColor: colors.paper },
  egIcon: { width: 28, height: 28, borderRadius: 7, overflow: 'hidden', backgroundColor: '#1B3FA0' },
  egP: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  egTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.ink },
  egWhen: { fontSize: 11, color: colors.muted },
  egBody: { fontSize: 13, lineHeight: 18, color: colors.ink, marginTop: 2 },
  egAct: { fontSize: 11.5, fontWeight: '700', color: colors.royal, backgroundColor: dk('#EEF1FF', '#24305A'), paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  permBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: dk('#FFF6DE', '#2A2618'), borderWidth: 1, borderColor: dk('#F1DFA6', '#5A4A1C'), marginBottom: 4 },
  permTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  permText: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  permBtn: { backgroundColor: BLUE, borderRadius: 999, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
  permBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  pickRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, paddingHorizontal: 6 },
  pick: { alignItems: 'center', gap: 7, minWidth: 76 },
  phone: { width: 72, height: 136, borderRadius: 13, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  phoneOn: { borderColor: BLUE },
  pickText: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderWidth: 0, backgroundColor: BLUE },
  now: { fontSize: 10, fontWeight: '800', color: '#8A5E12', backgroundColor: '#FFF4D6', borderWidth: 1, borderColor: '#F0D48A', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1, overflow: 'hidden' },
  fieldLabel: { width: 56, fontSize: 15, color: colors.muted },
  input: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink, paddingVertical: 8 },
  bigTime: { fontSize: 34, fontWeight: '700', color: colors.ink, fontVariant: ['tabular-nums'] },
  stepBtn: { minHeight: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: dk('#EEF1FF', '#24305A'), justifyContent: 'center' },
  stepText: { fontSize: 13.5, fontWeight: '700', color: colors.royal },
  dayChip: { flex: 1, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: dk('#EEF1FF', '#24305A') },
  dayOn: { backgroundColor: BLUE },
  dayText: { fontSize: 13, fontWeight: '800', color: colors.muted },
  btn: { minHeight: 42, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '800' },
  tourBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 46, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.royal },
  tourBtnFill: { backgroundColor: BLUE, borderColor: BLUE },
  tourText: { fontSize: 14, fontWeight: '700', color: colors.royal },
}));
