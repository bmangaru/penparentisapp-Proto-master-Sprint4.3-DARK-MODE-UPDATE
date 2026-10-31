// components/TourSteps.js — the hands-on parts of the app tour. Each step is a
// small working practice copy of part of the app. It calls onDone() once the
// step's task is done (the tour then turns the task bar green and unlocks
// Next) and can call onProgress('3 of 5 tabs seen') to show how far along
// you are. Nothing here is saved: it's all practice.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Image, Animated, Easing, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Rings, { RING_LABEL } from './Rings';
import Medal from './Medal';
import Cycler from './Cycler';
import DonorCrawl from './DonorCrawl';
import { MedalBar } from './MedalProgress';
import { BrandButton } from './LinkButtons';
import { AppearancePicker } from './SettingsSheet';
import { PadValue, useNumberPad } from './NumberPad';
import { LEVEL_STYLE } from './usePromptLevel';
import { LEVEL_LABEL, nextLevel, nextPrompt, promptForDay } from '../prompts';
import { createWordCounter, dayKey, planFor, timeClock } from '../writingLogic';
import { MEDALS, TIER_LABEL } from '../medals';
import { colors, gradients, isDark, radius, themed } from '../theme';

const medal = (id) => MEDALS.find((m) => m.id === id);
const GOALS = { minutes: 15, words: 100, sessions: 2 };

// Calls onDone once, when `cond` first becomes true.
function useDoneWhen(cond, onDone) {
  const fired = useRef(false);
  useEffect(() => { if (cond && !fired.current) { fired.current = true; onDone(); } }, [cond]);
}

// A clock that ticks while `running`.
function useClock(running) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setSec((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return [sec, setSec];
}

// ---------------------------------------------------------------------------
// 1 · Welcome & settings
// ---------------------------------------------------------------------------

export function WelcomeStep({ onDone }) {
  const pop = useRef(new Animated.Value(0.9)).current;
  const write = useRef(new Animated.Value(0)).current;
  const [tapped, setTapped] = useState(false);
  useDoneWhen(tapped, onDone);
  function tap() {
    setTapped(true);
    pop.setValue(0.85);
    write.setValue(0);
    Animated.parallel([
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
      Animated.timing(write, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: false }),
    ]).start();
  }
  return (
    <View style={[s.stage, { alignItems: 'center', paddingVertical: 26 }]}>
      <Pressable onPress={tap} accessibilityRole="button" accessibilityLabel="Pen Parentis logo">
        <Animated.Image source={require('../assets/pen-parentis-logo.png')} style={{ width: 130, height: 112, borderRadius: 12, transform: [{ scale: pop }] }} />
      </Pressable>
      <View style={{ height: 40, marginTop: 14, overflow: 'hidden' }}>
        <Animated.View style={{ width: write.interpolate({ inputRange: [0, 1], outputRange: [0, 260] }), overflow: 'hidden' }}>
          <Text style={s.hand} numberOfLines={1}>parenting done, write.</Text>
        </Animated.View>
      </View>
      {!tapped ? <Text style={s.hint}>👆 tap the logo</Text> : null}
    </View>
  );
}

export function AppearanceStep({ onDone }) {
  const [picked, setPicked] = useState(false);
  useDoneWhen(picked, onDone);
  return (
    <View style={s.stage}>
      <LinearGradient colors={gradients.header} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={s.banner}>
        <View style={{ flex: 1 }}><Text style={s.bannerTitle}>Pen Parentis</Text><Text style={s.bannerSub}>parenting done, write.</Text></View>
        <Text style={s.pillGold}>⚙ Settings</Text>
      </LinearGradient>
      <View style={{ padding: 12 }}>
        <Text style={s.label}>APPEARANCE</Text>
        <AppearancePicker onPick={() => setPicked(true)} />
        <Text style={s.hint}>The whole app, this tour included, changes as you tap.</Text>
      </View>
    </View>
  );
}

export function TourHereStep({ onDone }) {
  const [opened, setOpened] = useState(false);
  useDoneWhen(opened, onDone);
  return (
    <View style={[s.stage, { padding: 14 }]}>
      <Text style={s.cardTitle}>Settings</Text>
      <Text style={s.small}>Make the app yours.</Text>
      <Text style={[s.label, { marginTop: 14 }]}>THE APP TOUR</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => setOpened(true)} style={[s.btn, s.btnFill, { flex: 1 }, !opened && s.glow]} accessibilityRole="button">
          <Ionicons name="compass-outline" size={16} color="#FFFFFF" /><Text style={[s.btnText, { color: '#FFFFFF' }]}>Open the tour</Text>
        </Pressable>
        <View style={[s.btn, { flex: 1 }]}><Ionicons name="refresh" size={15} color={colors.royal} /><Text style={s.btnText}>Start over</Text></View>
      </View>
      {opened ? <Text style={s.toast}>🎉 That's this tour! It'll always be here in ⚙ Settings.</Text> : null}
    </View>
  );
}

// The tab bar where it really is, with a preview of each tab above it.
const TABS = [
  { name: 'Home', icon: 'book', about: 'News from the blog, the website, socials and Get Karma.' },
  { name: 'Calendar', icon: 'calendar', about: 'Every day you wrote, as rings, and the next salon.' },
  { name: 'Brainstorm', icon: null, about: 'Where you write: today’s rings, Start writing, your week and everything you’ve written.' },
  { name: 'Eventbrite', icon: 'ticket', about: 'Upcoming Pen Parentis salons: register, watch live, get reminders.' },
  { name: 'Community', icon: 'chatbubbles', about: 'Discord, the Facebook group and Accountability groups.' },
];

function TabPreview({ tab }) {
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={gradients.header} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={s.banner}>
        <Text style={s.bannerTitle}>{tab.name === 'Home' ? 'Pen Parentis' : tab.name}</Text>
      </LinearGradient>
      <View style={{ padding: 12, gap: 8 }}>
        {tab.name === 'Home' ? (<><View style={s.fake}><Text style={s.fakeT}>From the blog</Text></View><View style={s.fake}><Text style={s.fakeT}>Follow Pen Parentis</Text></View><LinearGradient colors={gradients.gold} style={s.fake}><Text style={[s.fakeT, { color: '#231702' }]}>Get Karma</Text></LinearGradient></>) : null}
        {tab.name === 'Calendar' ? (<View style={[s.fake, { flexDirection: 'row', flexWrap: 'wrap', gap: 4 }]}>{Array.from({ length: 14 }, (_, i) => <Rings key={i} minutes={i % 5 ? 100 : 30} words={i % 4 ? 100 : 40} sessions={100} size={26} />)}</View>) : null}
        {tab.name === 'Brainstorm' ? (<><View style={[s.fake, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}><Rings minutes={80} words={60} sessions={100} size={44} /><Text style={s.fakeT}>Today</Text></View><View style={[s.fake, { backgroundColor: colors.royal }]}><Text style={[s.fakeT, { color: '#FFFFFF' }]}>Start writing</Text></View></>) : null}
        {tab.name === 'Eventbrite' ? (<View style={[s.fake, { borderColor: '#E0C27A', borderWidth: 2 }]}><Text style={[s.small, { color: '#8A5E12', fontWeight: '800' }]}>★ NEXT EVENT</Text><Text style={s.fakeT}>Monthly salon</Text></View>) : null}
        {tab.name === 'Community' ? (<><View style={s.fake}><Text style={s.fakeT}>Join the Pen Parentis Discord</Text></View><View style={s.fake}><Text style={s.fakeT}>Accountability groups</Text></View></>) : null}
        <Text style={s.about}><Text style={{ fontWeight: '800', color: colors.ink }}>{tab.name}: </Text>{tab.about}</Text>
      </View>
    </View>
  );
}

export function TabsStep({ onDone, onProgress }) {
  const [w, setW] = useState(0);
  const [i, setI] = useState(0);
  const [seen, setSeen] = useState(new Set([0]));
  const ref = useRef(null);
  useEffect(() => { onProgress?.(`${seen.size} of ${TABS.length} tabs seen`); }, [seen]);
  useDoneWhen(seen.size === TABS.length, onDone);
  const go = (k) => { setI(k); setSeen((x) => new Set(x).add(k)); ref.current?.scrollTo({ x: k * w, animated: true }); };
  return (
    <View style={[s.stage, { flex: 1, minHeight: 360 }]} onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
      {w ? (
        <ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          onMomentumScrollEnd={(e) => { const k = Math.round(e.nativeEvent.contentOffset.x / w); setI(k); setSeen((x) => new Set(x).add(k)); }}
        >
          {TABS.map((t) => <View key={t.name} style={{ width: w }}><TabPreview tab={t} /></View>)}
        </ScrollView>
      ) : <View style={{ flex: 1 }} />}
      <Text style={s.swipe}>‹ swipe, or tap a tab ›</Text>
      <View style={s.tabbar}>
        {TABS.map((t, k) => {
          const on = k === i;
          return (
            <Pressable key={t.name} onPress={() => go(k)} style={s.tab} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t.name}>
              {t.icon ? <Ionicons name={t.icon} size={22} color={on ? colors.royalDeep : colors.tabIdle} /> : (
                <LinearGradient colors={gradients.button} style={[s.circle, on && s.glow]}><Ionicons name="pencil" size={18} color="#FFFFFF" /></LinearGradient>
              )}
              <Text style={[s.tabLabel, on && { color: colors.royalDeep, fontWeight: '800' }]} numberOfLines={1}>{t.name}</Text>
              {seen.has(k) ? <View style={s.seen}><Ionicons name="checkmark" size={9} color="#FFFFFF" /></View> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 2 · Home
// ---------------------------------------------------------------------------

const POSTS = [
  { t: 'NOW: a podcast', d: 'SEP 8, 2026', c: '#1DB954', e: 'Our monthly Literary Salons are now also a podcast on Spotify!' },
  { t: 'Fellowship Winners List', d: 'SEP 8, 2026', c: '#C8912B', e: 'Congratulations to this year’s fellowship winners…' },
  { t: 'Hey Brooklyn!', d: 'SEP 3, 2026', c: '#7D8597', e: 'We are coming to a bookstore near you!…' },
];

export function BlogStep({ onDone, onProgress }) {
  const [seen, setSeen] = useState(new Set([0]));
  useEffect(() => { onProgress?.(`${seen.size} of ${POSTS.length} posts seen`); }, [seen]);
  useDoneWhen(seen.size === POSTS.length, onDone);
  return (
    <View>
      <Text style={s.sectionH}>From the blog</Text>
      <Cycler arrows every={60000} onIndex={(k) => setSeen((x) => new Set(x).add(k))}>
        {POSTS.map((p) => (
          <View key={p.t} style={s.post}>
            <View style={{ height: 110, backgroundColor: p.c, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="image-outline" size={30} color="rgba(255,255,255,0.85)" /></View>
            <View style={{ padding: 12 }}><Text style={s.date}>{p.d}</Text><Text style={s.cardTitle}>{p.t}</Text><Text style={s.small}>{p.e}</Text></View>
          </View>
        ))}
      </Cycler>
    </View>
  );
}

const SOCIAL = [
  { brand: 'facebook', label: 'Facebook', sub: '@PenParentis', icon: 'logo-facebook', c: '#1877F2' },
  { brand: 'instagram', label: 'Instagram', sub: '@penparentis', icon: 'logo-instagram', c: '#DD2A7B' },
  { brand: 'linkedin', label: 'LinkedIn', sub: 'Pen Parentis', icon: 'logo-linkedin', c: '#0A66C2' },
];

export function SocialsStep({ onDone, onProgress }) {
  const [tapped, setTapped] = useState([]);
  const last = tapped[tapped.length - 1];
  useEffect(() => { onProgress?.(`${tapped.length} of 2 tapped`); }, [tapped]);
  useDoneWhen(tapped.length >= 2, onDone);
  return (
    <View style={{ gap: 8 }}>
      <View style={s.web}><Image source={require('../assets/pen-parentis-logo.png')} style={{ width: 36, height: 31, borderRadius: 6 }} /><Text style={s.cardTitle}>Visit penparentis.org</Text></View>
      {SOCIAL.map((n) => (
        <BrandButton key={n.brand} brand={n.brand} icon={<Ionicons name={n.icon} size={20} color={n.c} />} label={n.label} sub={n.sub}
          onPress={() => setTapped((t) => (t.includes(n.label) ? t : [...t, n.label]))} />
      ))}
      {last ? <Text style={s.toast}>In the app this opens {last} ({SOCIAL.find((x) => x.label === last).sub}).</Text> : null}
    </View>
  );
}

export function SupportersStep({ onDone }) {
  const [hearts, setHearts] = useState(0);
  useDoneWhen(hearts > 0, onDone);
  return (
    <View style={[s.stage, { paddingTop: 14 }]}>
      <Text style={[s.label, { textAlign: 'center' }]}>THANK YOU TO ALL OF OUR SUPPORTERS</Text>
      <DonorCrawl />
      <Pressable onPress={() => setHearts((h) => h + 1)} style={[s.btn, { margin: 12 }, !hearts && s.glow]} accessibilityRole="button">
        <Text style={s.btnText}>{hearts ? `${'❤️'.repeat(Math.min(hearts, 6))}  Thank you!` : '❤️  Say thanks'}</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 3 · Goals & rings
// ---------------------------------------------------------------------------

function RingsPanel({ v, goal = GOALS, dark = true }) {
  const pct = (k) => Math.round((v[k] / goal[k]) * 100);
  const lines = [['minutes', 'MINUTES', `${v.minutes} of ${goal.minutes} min`], ['words', 'WORDS', `${v.words} of ${goal.words}`], ['sessions', 'SESSIONS', `${v.sessions} of ${goal.sessions}`]];
  const col = { minutes: '#F2C14E', words: '#6EE0A8', sessions: '#9AD8FF' };
  return (
    <LinearGradient colors={gradients.header} style={[s.ringsCard]}>
      <Rings minutes={pct('minutes')} words={pct('words')} sessions={pct('sessions')} size={88} variant={dark ? 'dark' : 'light'} />
      <View style={{ flex: 1, gap: 7 }}>
        {lines.map(([k, label, text]) => (
          <View key={k}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[s.ringLabel, { color: col[k] }]}>{label}</Text>
              <Text style={s.ringVal}>{text}{pct(k) >= 100 ? ' ✓' : ''}</Text>
            </View>
            <View style={s.track}><View style={{ width: `${Math.min(100, pct(k))}%`, height: '100%', borderRadius: 3, backgroundColor: col[k] }} /></View>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

function Stepper({ label, value, onMinus, onPlus }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Pressable onPress={onMinus} style={s.round} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Less ${label}`}><Text style={s.roundText}>−</Text></Pressable>
      <Text style={s.val}>{value}</Text>
      <Pressable onPress={onPlus} style={s.round} hitSlop={6} accessibilityRole="button" accessibilityLabel={`More ${label}`}><Text style={s.roundText}>+</Text></Pressable>
    </View>
  );
}

export function RingsStep({ onDone, onProgress }) {
  const [v, setV] = useState({ minutes: 5, words: 25, sessions: 1 });
  const step = { minutes: 5, words: 25, sessions: 1 };
  const add = (k, d) => setV((x) => ({ ...x, [k]: Math.max(0, x[k] + d * step[k]) }));
  const closed = ['minutes', 'words', 'sessions'].filter((k) => v[k] >= GOALS[k]).length;
  useEffect(() => { onProgress?.(`${closed} of 3 rings closed`); }, [closed]);
  useDoneWhen(closed === 3, onDone);
  return (
    <View style={{ gap: 8 }}>
      <RingsPanel v={v} />
      <Stepper label="Minutes" value={v.minutes} onMinus={() => add('minutes', -1)} onPlus={() => add('minutes', 1)} />
      <Stepper label="Words" value={v.words} onMinus={() => add('words', -1)} onPlus={() => add('words', 1)} />
      <Stepper label="Sessions" value={v.sessions} onMinus={() => add('sessions', -1)} onPlus={() => add('sessions', 1)} />
      {closed === 3 ? (
        <LinearGradient colors={gradients.gold} style={s.gold}><Text style={s.goldT}>Goal met — write a little more?</Text><Text style={s.goldS}>All rings closed · anything extra is a bonus</Text></LinearGradient>
      ) : null}
    </View>
  );
}

const PLANS = [
  { id: 'light', label: 'A lighter day', tag: 'EASY' },
  { id: 'usual', label: 'My usual', tag: 'NORMAL' },
  { id: 'stretch', label: 'A stretch day', tag: 'HARD' },
  { id: 'rest', label: 'Rest today', tag: null },
];

export function PlanStep({ onDone, onProgress }) {
  const [plan, setPlan] = useState('usual');
  const [tried, setTried] = useState(new Set());
  useEffect(() => { onProgress?.(`${tried.size} of 2 tried`); }, [tried]);
  useDoneWhen(tried.size >= 2, onDone);
  const g = plan === 'rest' ? null : planFor(plan, GOALS);
  return (
    <View style={{ gap: 8 }}>
      {g ? <RingsPanel v={{ minutes: 0, words: 0, sessions: 0 }} goal={g} /> : (
        <LinearGradient colors={gradients.header} style={[s.ringsCard, { justifyContent: 'center' }]}><Rings off size={70} variant="dark" /><Text style={[s.ringVal, { flex: 1 }]}>Rest day: no rings to close, and that’s okay.</Text></LinearGradient>
      )}
      {PLANS.map((p) => (
        <Pressable key={p.id} onPress={() => { setPlan(p.id); if (p.id !== 'usual') setTried((t) => new Set(t).add(p.id)); }} style={[s.opt, plan === p.id && s.optOn]} accessibilityRole="radio" accessibilityState={{ checked: plan === p.id }}>
          <Text style={[s.fieldLabel, { flex: 1, color: colors.ink }]}>{p.label}</Text>
          {p.tag ? <Text style={s.tag}>{p.tag}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

export function PadStep({ onDone }) {
  const [g, setG] = useState({ minutes: 15, words: 100, sessions: 2 });
  const changed = g.minutes !== 15 || g.words !== 100 || g.sessions !== 2;
  useDoneWhen(changed, onDone);
  const pad = useNumberPad({
    fields: [
      { k: 'minutes', label: 'MINUTES', min: 1, max: 180 },
      { k: 'words', label: 'WORDS', min: 25, max: 5000 },
      { k: 'sessions', label: 'SESSIONS', min: 1, max: 5 },
    ],
    values: g,
    onChange: (k, n) => setG((x) => ({ ...x, [k]: n })),
  });
  return (
    <View>
      <View style={[s.stage, { padding: 8 }]}>
        {['minutes', 'words', 'sessions'].map((k) => (
          <View key={k} style={[s.field, { borderWidth: 0 }]}>
            <View style={[s.dot, { backgroundColor: RING_LABEL[k] }]} />
            <Text style={[s.fieldLabel, { flex: 1, color: colors.ink }]}>{k[0].toUpperCase() + k.slice(1)}</Text>
            <PadValue pad={pad} k={k} value={g[k]} label={k} />
          </View>
        ))}
      </View>
      {pad.footer ? <View style={{ marginTop: 8, borderRadius: 16, overflow: 'hidden' }}>{pad.footer}</View> : <Text style={s.hint}>👆 tap a number</Text>}
    </View>
  );
}

// ---------------------------------------------------------------------------
// 4 · Start writing
// ---------------------------------------------------------------------------

export function PencilStep({ onDone }) {
  const [tapped, setTapped] = useState(false);
  useDoneWhen(tapped, onDone);
  return (
    <View style={[s.stage, { overflow: 'hidden' }]}>
      <View style={{ padding: 16, minHeight: 140, justifyContent: 'center' }}>
        {tapped ? (
          <><Text style={s.cardTitle}>Brainstorm</Text><Text style={s.small}>Small goals, kept quietly.</Text>
            <View style={[s.fake, { backgroundColor: colors.royal, marginTop: 10 }]}><Text style={[s.fakeT, { color: '#FFFFFF', textAlign: 'center' }]}>Start writing</Text></View></>
        ) : <Text style={[s.small, { textAlign: 'center' }]}>The pencil is always in the middle of the tab bar.</Text>}
      </View>
      <View style={s.tabbar}>
        {TABS.map((t) => (
          <View key={t.name} style={s.tab}>
            {t.icon ? <Ionicons name={t.icon} size={22} color={colors.tabIdle} /> : (
              <Pressable onPress={() => setTapped(true)} accessibilityRole="button" accessibilityLabel="Brainstorm">
                <LinearGradient colors={gradients.button} style={[s.circle, !tapped && s.glow]}><Ionicons name="pencil" size={18} color="#FFFFFF" /></LinearGradient>
              </Pressable>
            )}
            <Text style={[s.tabLabel, !t.icon && tapped && { color: colors.royalDeep, fontWeight: '800' }]}>{t.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// The practice writing page: real word counting, a clock and live rings.
function PracticeWriter({ start = '', need, onDone, onProgress, banner, pausable = false, focusTools = false }) {
  const counter = useRef(createWordCounter(start));
  const [text, setText] = useState(start);
  const [words, setWords] = useState(0);
  const [paused, setPaused] = useState(true);
  const [sec] = useClock(!paused);
  const lastTyped = useRef(0);
  const [size, setSize] = useState(17);
  const [focus, setFocus] = useState(false);
  useEffect(() => { onProgress?.(`${Math.min(words, need)} of ${need} words`); }, [words]);
  useDoneWhen(words >= need, onDone);
  // A quiet stretch pauses the clock (shorter than the real minute, for practice).
  useEffect(() => {
    if (paused || !pausable) return undefined;
    const id = setInterval(() => { if (Date.now() - lastTyped.current > 8000) setPaused(true); }, 1000);
    return () => clearInterval(id);
  }, [paused, pausable]);
  function onChange(t) {
    setText(t);
    lastTyped.current = Date.now();
    if (paused) setPaused(false);
    const gained = counter.current.update(t);
    if (gained > 0) setWords((w) => w + gained);
  }
  const pct = (v, g) => Math.round((v / g) * 100);
  return (
    <View style={{ gap: 8 }}>
      {!focus ? (
        <View style={s.liveBar}>
          <Rings minutes={pct(sec / 60, 1)} words={pct(words, 10)} sessions={100} size={36} />
          <Text style={[s.liveItem, { color: RING_LABEL.minutes }]}>MIN <Text style={s.liveNum}>{timeClock(sec)}</Text></Text>
          <Text style={[s.liveItem, { color: RING_LABEL.words }]}>WORDS <Text style={s.liveNum}>{words}</Text></Text>
          <Text style={[s.liveState, { color: paused ? colors.muted : '#1E7B3A' }]}>{paused ? '❚❚ paused' : '● running'}</Text>
        </View>
      ) : null}
      {banner ? <Text style={s.note}>{banner}</Text> : null}
      {focusTools ? (
        <View style={s.tools}>
          <Pressable onPress={() => setSize((x) => Math.max(13, x - 2))} style={s.round}><Text style={s.roundText}>A−</Text></Pressable>
          <Pressable onPress={() => setSize((x) => Math.min(25, x + 2))} style={s.round}><Text style={s.roundText}>A+</Text></Pressable>
          <Text style={[s.fieldLabel, { flex: 1, textAlign: 'right' }]}>Focus</Text>
          <Switch value={focus} onValueChange={setFocus} trackColor={{ true: colors.royal, false: '#C8CEDE' }} thumbColor="#FFFFFF" />
        </View>
      ) : null}
      {pausable ? (
        <Pressable onPress={() => setPaused((p) => !p)} style={[s.btn, { alignSelf: 'flex-end' }]} accessibilityRole="button">
          <Text style={s.btnText}>{paused ? '▶ Resume' : '❚❚ Pause'}</Text>
        </Pressable>
      ) : null}
      <TextInput
        value={text}
        onChangeText={onChange}
        multiline
        placeholder="Start typing…"
        placeholderTextColor={colors.muted}
        keyboardAppearance={isDark() ? 'dark' : 'light'}
        contextMenuHidden
        style={[s.input, { fontSize: size, lineHeight: Math.round(size * 1.5) }]}
      />
      <Text style={s.hint}>Practice page: nothing here is saved. Words count once finished (space or full stop).</Text>
    </View>
  );
}

export function WriteStep(props) { return <PracticeWriter need={5} {...props} />; }
export function ResumeStep(props) {
  return <PracticeWriter need={2} start="The kids are finally asleep and " banner="Picking up where you left off at 9:40 PM" {...props} />;
}

// ---------------------------------------------------------------------------
// 5 · Prompts & tools
// ---------------------------------------------------------------------------

export function PromptStep({ onDone, onProgress }) {
  const [level, setLevel] = useState('simple');
  const [prompt, setPrompt] = useState(null);
  const [did, setDid] = useState({ show: false, level: false, refresh: false });
  const n = Object.values(did).filter(Boolean).length;
  useEffect(() => { onProgress?.(`${n} of 3: show it, change the level, refresh`); }, [n]);
  useDoneWhen(n === 3, onDone);
  const ls = LEVEL_STYLE[level];
  return (
    <View style={[s.stage, { padding: 12, gap: 10 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
        <Pressable onPress={() => { setPrompt((p) => p || promptForDay(dayKey(), level)); setDid((d) => ({ ...d, show: true })); }} style={[s.pill, s.pillGold, !did.show && s.glow]}>
          <Text style={s.pillGoldText}>✦ Prompt</Text>
        </Pressable>
        <View style={s.pill}><Text style={s.pillText}>Aa</Text></View>
        <View style={s.pill}><Text style={s.pillText}>Pause</Text></View>
      </View>
      {prompt ? (
        <View style={[s.prompt, { backgroundColor: ls.tint, borderLeftColor: ls.solid }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => { const l = nextLevel(level); setLevel(l); setPrompt(promptForDay(dayKey(), l)); setDid((d) => ({ ...d, level: true })); }} style={[s.levelChip, { borderColor: ls.solid }, !did.level && s.glow]}>
              <Text style={[s.levelText, { color: ls.fg }]}>✦ {LEVEL_LABEL[level]} ▾</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => { setPrompt((p) => nextPrompt(p, level)); setDid((d) => ({ ...d, refresh: true })); }} hitSlop={6} style={!did.refresh && did.level ? s.glow : null}>
              <Text style={[s.levelText, { color: ls.fg }]}>↻ Refresh</Text>
            </Pressable>
          </View>
          <Text style={s.promptText}>“{prompt}”</Text>
        </View>
      ) : <Text style={s.hint}>👆 tap ✦ Prompt</Text>}
    </View>
  );
}

export function ToolsStep({ onDone, onProgress }) {
  const [size, setSize] = useState(16);
  const [focus, setFocus] = useState(false);
  const did = (size !== 16 ? 1 : 0) + (focus ? 1 : 0);
  useEffect(() => { onProgress?.(`${did} of 2: change the size, turn on Focus`); }, [did]);
  const [tried, setTried] = useState(false);
  useEffect(() => { if (focus && size !== 16) setTried(true); }, [focus, size]);
  useDoneWhen(tried, onDone);
  return (
    <View style={[s.stage, { padding: 12, gap: 10 }]}>
      {!focus ? (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
          <View style={s.pill}><Text style={s.pillText}>✦ Prompt</Text></View>
          <View style={[s.pill, s.pillOn]}><Text style={[s.pillText, { color: '#FFFFFF' }]}>Aa</Text></View>
          <View style={s.pill}><Text style={s.pillText}>Pause</Text></View>
        </View>
      ) : null}
      <View style={s.menu}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable onPress={() => setSize((x) => Math.max(12, x - 2))} style={s.round}><Text style={s.roundText}>A−</Text></Pressable>
          <Text style={[s.fieldLabel, { flex: 1, textAlign: 'center' }]}>Text size</Text>
          <Pressable onPress={() => setSize((x) => Math.min(26, x + 2))} style={s.round}><Text style={s.roundText}>A+</Text></Pressable>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
          <Text style={[s.fieldLabel, { flex: 1 }]}>Focus mode (just your words)</Text>
          <Switch value={focus} onValueChange={setFocus} trackColor={{ true: colors.royal, false: '#C8CEDE' }} thumbColor="#FFFFFF" />
        </View>
      </View>
      <Text style={[s.writing, { fontSize: size, lineHeight: Math.round(size * 1.5) }]}>The kids are finally asleep, and the house is quiet enough to think.</Text>
    </View>
  );
}

export function PauseStep(props) {
  const [phase, setPhase] = useState('start'); // start → paused → resumed
  const { onDone, onProgress } = props;
  useEffect(() => { onProgress?.(phase === 'start' ? 'Type a word, then tap Pause' : phase === 'paused' ? 'Now type to start it again' : 'Done!'); }, [phase]);
  useDoneWhen(phase === 'resumed', onDone);
  return <PauseWriter onPhase={setPhase} />;
}

function PauseWriter({ onPhase }) {
  const [paused, setPaused] = useState(true);
  const [sec] = useClock(!paused);
  const [text, setText] = useState('');
  const phase = useRef('start');
  const set = (p) => { phase.current = p; onPhase(p); };
  return (
    <View style={[s.stage, { padding: 12, gap: 10 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={[s.liveItem, { color: RING_LABEL.minutes }]}>MIN <Text style={s.liveNum}>{timeClock(sec)}</Text></Text>
        <Text style={[s.liveState, { color: paused ? colors.muted : '#1E7B3A' }]}>{paused ? '❚❚ paused' : '● running'}</Text>
        <Pressable onPress={() => { if (!paused) { setPaused(true); if (phase.current === 'start') set('paused'); } else setPaused(false); }} style={[s.btn, { marginLeft: 'auto', minHeight: 36 }, !paused && phase.current === 'start' && s.glow]}>
          <Text style={s.btnText}>{paused ? 'Resume' : 'Pause'}</Text>
        </Pressable>
      </View>
      {paused && phase.current === 'paused' ? (
        <View style={s.pauseNote}><Ionicons name="pause" size={14} color={colors.muted} /><View style={{ flex: 1 }}><Text style={s.fieldLabel}>Paused</Text><Text style={s.small}>Typing picks it back up, or tap Resume.</Text></View></View>
      ) : null}
      <TextInput
        value={text}
        onChangeText={(t) => { setText(t); if (paused) { setPaused(false); if (phase.current === 'paused') set('resumed'); } }}
        placeholder="Type here…"
        placeholderTextColor={colors.muted}
        keyboardAppearance={isDark() ? 'dark' : 'light'}
        style={[s.input, { minHeight: 70 }]}
        multiline
      />
      <Text style={s.hint}>In the app, a quiet minute also pauses the clock by itself.</Text>
    </View>
  );
}

export function NudgeStep({ onDone, onProgress }) {
  const [words, setWords] = useState(990);
  const silver = words >= 1000;
  useEffect(() => { onProgress?.(`${Math.min(words, 1000).toLocaleString()} / 1,000 words`); }, [words]);
  useDoneWhen(silver, onDone);
  const m = medal('words');
  return (
    <View style={{ gap: 10 }}>
      <View style={s.nudge}>
        <Medal medal={m} tier={silver ? 'silver' : 'bronze'} size={42} />
        <View style={{ flex: 1 }}>
          <Text style={s.nudgeTitle}>{silver ? `✦ ${TIER_LABEL.silver} Wordsmith!` : `Almost there! ${1000 - words} more word${1000 - words === 1 ? '' : 's'}`}</Text>
          <Text style={s.nudgeSub}>{silver ? 'It’ll pop up when you finish.' : <>…and you'll earn <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Silver Wordsmith</Text>.</>}</Text>
          <View style={{ marginTop: 3 }}><MedalBar now={Math.min(100, words / 10)} tier={silver ? 'silver' : 'bronze'} dark height={7} /></View>
        </View>
      </View>
      <Pressable onPress={() => setWords((w) => Math.min(1000, w + 2))} disabled={silver} style={[s.btn, s.btnFill, silver && { opacity: 0.5 }, !silver && s.glow]} accessibilityRole="button">
        <Text style={[s.btnText, { color: '#FFFFFF' }]}>+2 words (pretend you typed)</Text>
      </Pressable>
    </View>
  );
}

const s = themed(() => ({
  stage: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, overflow: 'hidden' },
  banner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  bannerTitle: { fontSize: 19, fontWeight: '800', color: '#FFFFFF' },
  bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  pillGold: { borderWidth: 2, borderColor: '#E0C27A', backgroundColor: 'transparent' },
  pillGoldText: { fontSize: 12, fontWeight: '800', color: '#8A5E12' },
  label: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.9, color: colors.muted, marginBottom: 8 },
  hint: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 8 },
  hand: { fontSize: 24, fontStyle: 'italic', color: colors.ink, width: 260 },
  cardTitle: { fontSize: 15.5, fontWeight: '800', color: colors.ink },
  small: { fontSize: 12.5, lineHeight: 18, color: colors.muted },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.royal, paddingHorizontal: 14 },
  btnFill: { backgroundColor: colors.royal },
  btnText: { fontSize: 14, fontWeight: '700', color: colors.royal },
  glow: { shadowColor: '#F2C14E', shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6, borderColor: '#F2C14E', borderWidth: 2 },
  toast: { fontSize: 13, color: colors.body, backgroundColor: '#E7F6EE', borderRadius: 10, padding: 10, marginTop: 10, overflow: 'hidden' },
  fake: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10 },
  fakeT: { fontSize: 13, fontWeight: '700', color: colors.ink },
  about: { fontSize: 13, lineHeight: 19, color: colors.body, marginTop: 4 },
  swipe: { alignSelf: 'center', fontSize: 11.5, fontWeight: '800', color: '#8A5E12', backgroundColor: '#FFF4D6', borderWidth: 1, borderColor: '#F0D48A', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 6, overflow: 'hidden' },
  tabbar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8, paddingBottom: 10, backgroundColor: colors.paper },
  tab: { alignItems: 'center', width: 64 },
  tabLabel: { fontSize: 10, color: colors.tabIdle, marginTop: 3 },
  circle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  seen: { position: 'absolute', top: -4, right: 12, width: 15, height: 15, borderRadius: 8, backgroundColor: '#1E7B3A', alignItems: 'center', justifyContent: 'center' },
  sectionH: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  post: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, overflow: 'hidden' },
  date: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, color: '#8A5E12' },
  web: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#B9C6E8', borderRadius: radius.md, padding: 10 },
  ringsCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.md, padding: 14 },
  ringLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  ringVal: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.14)', marginTop: 3, overflow: 'hidden' },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#D9DEEA', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  fieldLabel: { fontSize: 13.5, fontWeight: '700', color: colors.muted },
  round: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  roundText: { fontSize: 15, fontWeight: '800', color: colors.royal },
  val: { minWidth: 50, textAlign: 'center', fontSize: 17, fontWeight: '800', color: colors.ink },
  gold: { borderRadius: radius.md, padding: 12, alignItems: 'center' },
  goldT: { fontSize: 15, fontWeight: '800', color: '#231702' },
  goldS: { fontSize: 12, color: '#3D2A05', marginTop: 2 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.line, borderRadius: 12, padding: 12, backgroundColor: '#FFFFFF' },
  optOn: { borderColor: colors.royal, backgroundColor: '#EEF2FB' },
  tag: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6, color: colors.royal, backgroundColor: '#E6ECFA', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  liveBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 8 },
  liveItem: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  liveNum: { fontSize: 15, color: colors.ink },
  liveState: { marginLeft: 'auto', fontSize: 11.5, fontWeight: '800' },
  note: { fontSize: 12.5, color: colors.body, backgroundColor: '#FFF8E6', borderRadius: 10, padding: 9, overflow: 'hidden' },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { minHeight: 110, borderWidth: 2, borderColor: colors.royal, borderRadius: 12, padding: 12, color: colors.ink, backgroundColor: '#FFFFFF', textAlignVertical: 'top' },
  pill: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: '#EEF1F7' },
  pillText: { fontSize: 12, fontWeight: '800', color: colors.royalDeep },
  pillOn: { backgroundColor: colors.royal },
  prompt: { borderLeftWidth: 3, borderRadius: 10, padding: 10 },
  levelChip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  levelText: { fontSize: 12, fontWeight: '800' },
  promptText: { fontSize: 15.5, lineHeight: 22, color: colors.ink, marginTop: 8, fontStyle: 'italic' },
  menu: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12 },
  writing: { color: colors.ink },
  pauseNote: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EEF1F7', borderRadius: 12, padding: 10 },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#0A1633', borderRadius: 16, padding: 12 },
  nudgeTitle: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  nudgeSub: { fontSize: 12, color: '#C9D1E6' },
}));
