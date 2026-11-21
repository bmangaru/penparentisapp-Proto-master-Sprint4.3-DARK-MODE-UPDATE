// screens/WeekReviewScreen.js — This week's review: the week so far (Sunday
// to Saturday) next to last week, opened from "View review" on Brainstorm's
// This week card. Share my week makes a picture of it. (Earlier weeks: the
// Calendar. Last week's review and its Sunday notification were removed.)

import React, { useCallback, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../components/ui';
import WeekRings from '../components/WeekRings';
import ShareWeekSheet from '../components/ShareWeekSheet';
import Face from '../components/Face';
import { TIER_STYLE } from '../components/Medal';
import { colors, gradients, lift, space, themed } from '../theme';
import { loadAll, useDataChange } from '../writingStore';
import { changeText, dayKey, parseDayKey, timeClock, weekReview } from '../writingLogic';
import { weekMedals } from '../monthMedals';
import { feelingLabel } from '../feelings';
import { TIER_LABEL } from '../medals';

const short = (k) => parseDayKey(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const weekday = (k) => parseDayKey(k).toLocaleDateString(undefined, { weekday: 'long' });

// The headline for the week.
export function reviewHeadline(r, thisWeek = false) {
  if (r.empty) {
    return thisWeek
      ? { title: 'A fresh week', sub: 'Nothing written yet this week. Even a few lines counts.' }
      : { title: 'A quiet week', sub: 'Nothing written last week. A new week is a fresh page.' };
  }
  const up = r.prev.words > 0 && r.done.words > r.prev.words;
  const title = thisWeek
    ? (up ? 'Ahead of last week' : r.closedDays > 0 ? 'A good start' : 'You showed up')
    : r.closedDays >= 5 ? 'What a week' : up ? 'More than the week before' : r.closedDays > 0 ? 'A good week' : 'You showed up';
  const days = `${r.closedDays} day${r.closedDays === 1 ? '' : 's'} with all rings closed`;
  return { title, sub: r.restDays ? `${days} · ${r.restDays} rest day${r.restDays === 1 ? '' : 's'}` : days };
}

export default function WeekReviewScreen({ navigation, route }) {
  // This week so far (last week's review was removed: the Calendar has it).
  const thisWeek = true;
  const insets = useSafeAreaInsets();
  const [data, setData] = useState(null);
  const [shareOpen, setShareOpen] = useState(false); // Share my week: a picture
  const reload = useCallback(() => { loadAll().then(setData).catch(() => {}); }, []);
  useFocusEffect(reload);
  useDataChange(reload);
  if (!data) return <Screen><View style={{ height: 200 }} /></Screen>;
  const { sessions, dailyGoals, goals } = data;
  // This week = the week before next week's; its days to come are faded.
  const now = new Date();
  const base = thisWeek ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 12) : now;
  const raw = weekReview(sessions, dailyGoals, goals, base);
  const todayKey = dayKey(now);
  const r = thisWeek ? { ...raw, days: raw.days.map((d) => ({ ...d, isToday: d.key === todayKey, future: d.key > todayKey })) } : raw;
  const medals = weekMedals(sessions, dailyGoals, goals, r.start, r.end);
  const head = reviewHeadline(r, thisWeek);
  const when = thisWeek ? 'yet this week' : 'last week';
  return (
    <Screen>
      <LinearGradient colors={gradients.header} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={s.back} accessibilityRole="button">
          <Text style={s.backText}>‹  Back</Text>
        </Pressable>
        <Text style={s.kicker}>{thisWeek ? 'THIS WEEK SO FAR' : 'LAST WEEK'} · {short(r.start).toUpperCase()} – {short(r.end).toUpperCase()}</Text>
        <Text style={s.title}>{head.title}</Text>
        <Text style={s.sub}>{head.sub}</Text>
        <View style={s.stats}>
          <Stat n={r.done.words.toLocaleString()} label="words" change={changeText(r.done.words, r.prev.words)} />
          <Stat n={timeClock(r.done.seconds)} label="writing" change={changeText(r.done.seconds, r.prev.seconds)} />
          <Stat n={String(r.done.count)} label={r.done.count === 1 ? 'session' : 'sessions'} change={changeText(r.done.count, r.prev.count)} />
        </View>
        <Text style={s.vs}>{thisWeek ? 'Last week' : 'The week before'}: {r.prev.words.toLocaleString()} words</Text>
      </LinearGradient>

      <View style={s.pad}>
        <WeekRings
          week={r} title="Day by day" meta={`${r.closedDays} full`}
          onPressDay={(d) => navigation.navigate('BrainstormDay', { day: d.key })}
        />

        <View style={[s.card, lift]}>
          <Line icon={<Text style={s.big}>★</Text>} title="Best day" sub={r.best ? `${weekday(r.best.key)} · ${r.best.words.toLocaleString()} words` : `No writing ${when}`} />
          <View style={s.sep} />
          <Line
            icon={r.feelings[0] ? <Face id={r.feelings[0][0]} size={30} /> : <Text style={s.big}>·</Text>}
            title="Felt most"
            sub={r.feelings.length ? r.feelings.slice(0, 2).map(([id, n]) => `${feelingLabel(id)} (${n})`).join(' · ') : `No feelings picked ${when}`}
          />
          <View style={s.sep} />
          {medals.length ? medals.map((m, i) => (
            <View key={`${m.id}${i}`}>
              {i ? <View style={s.sep} /> : null}
              <Line
                icon={<View style={[s.medal, { backgroundColor: TIER_STYLE[m.tier]?.dot || '#C9884F' }]}><Text style={s.medalT}>{TIER_LABEL[m.tier][0]}</Text></View>}
                title={`${m.monthly ? m.when : m.name} reached ${TIER_LABEL[m.tier]}`}
                sub={m.monthly ? `${m.name}, the month’s medal` : 'Medal'}
              />
            </View>
          )) : <Line icon={<Text style={s.big}>○</Text>} title="Medals" sub={`No new tiers ${when}. They’re waiting.`} />}
        </View>

        <Pressable onPress={() => setShareOpen(true)} style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]} accessibilityRole="button">
          <Text style={s.btnText}>Share my week</Text>
        </Pressable>
      </View>
      <ShareWeekSheet visible={shareOpen} onClose={() => setShareOpen(false)} review={r} medals={medals} thisWeek={thisWeek} />
    </Screen>
  );
}

function Stat({ n, label, change }) {
  return (
    <View style={s.stat}>
      <Text style={s.statN} numberOfLines={1}>{n}</Text>
      <Text style={s.statL}>{label}</Text>
      {change ? <Text style={[s.change, change.startsWith('▼') && { color: '#FFC7C2' }]}>{change}</Text> : null}
    </View>
  );
}

function Line({ icon, title, sub }) {
  return (
    <View style={s.line}>
      <View style={s.lineIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={s.lineTitle}>{title}</Text>
        <Text style={s.lineSub}>{sub}</Text>
      </View>
    </View>
  );
}

const s = themed(() => ({
  header: { paddingHorizontal: space.lg, paddingBottom: space.lg },
  back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  backText: { color: colors.cream, fontSize: 14, fontWeight: '700' },
  kicker: { color: 'rgba(255,255,255,0.8)', fontSize: 11.5, fontWeight: '800', letterSpacing: 0.9 },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '700', marginTop: 4 },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 14 },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  statN: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  statL: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5 },
  change: { color: '#8BE8B0', fontSize: 11, fontWeight: '800', marginTop: 2 },
  vs: { color: 'rgba(255,255,255,0.7)', fontSize: 11.5, marginTop: 8 },
  pad: { padding: space.lg, gap: space.md },
  card: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14 },
  sep: { height: 1, backgroundColor: colors.line },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 8 },
  lineIcon: { width: 34, alignItems: 'center' },
  lineTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  lineSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  big: { fontSize: 20, color: '#E9B949', fontWeight: '800' },
  medal: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  medalT: { fontSize: 13, fontWeight: '800', color: '#2A1A00' },
  btn: { minHeight: 48, borderRadius: 999, backgroundColor: '#3352C4', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
}));
