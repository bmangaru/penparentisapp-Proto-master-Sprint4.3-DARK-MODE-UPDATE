// screens/MedalsScreen.js — the medals:
//   • This month's medal (its name, where you are, the milestone bar).
//   • Monthly medals: one row per year, 12 small medals Jan–Dec in the tier
//     you reached. Only this year is open; earlier years fold to one line
//     ("2025 · 10 medals · best: Gold (Snow Day)"), so years of use stay tidy.
//     Tap a month for its name, words and the day each tier was reached.
//   • All-time medals in a 3-across grid. Tap one for its tiers.

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../components/ui';
import Medal, { TIER_STYLE } from '../components/Medal';
import { colors, gradients, radius, space, themed } from '../theme';
import { TIER_LABEL, TIERS, TOTAL_TIERS, tierCounts, tierBarColor } from '../medals';
import { loadAll, syncMedals, useToday } from '../writingStore';
import { MonthMedalCard } from '../components/MonthMedal';
import { medalYears, monthDays, monthKeyOf, monthProgress, yearMedals, yearSummary } from '../monthMedals';
import { parseDayKey } from '../writingLogic';
import MedalPopup, { replayItem } from '../components/MedalPopup';

export default function MedalsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [medals, setMedals] = useState([]);
  const [sessions, setSessions] = useState([]);
  const today = useToday();
  const [openYears, setOpenYears] = useState({}); // years you opened/closed
  const [picked, setPicked] = useState(null); // a month you tapped: '2026-10'

  useFocusEffect(
    useCallback(() => {
      syncMedals().then((r) => setMedals(r.medals));
      loadAll().then((d) => setSessions(d.sessions));
    }, [])
  );

  const thisMonth = monthProgress(sessions, monthKeyOf(today));
  const years = medalYears(sessions, today).map((y) => ({ y, list: yearMedals(sessions, y, today) }));
  const thisYear = Number(today.slice(0, 4));
  const isOpen = (y) => (y in openYears ? openYears[y] : y === thisYear);
  const earnedMonths = years.reduce((n, { list }) => n + list.filter((p) => p && p.tier).length, 0);

  const counts = tierCounts(medals);

  return (
    <Screen>
      <LinearGradient colors={gradients.header} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={s.back}>
          <Text style={s.backText}>‹  Brainstorm</Text>
        </Pressable>
        <Text style={s.title}>Medals</Text>
        <Text style={s.sub}>{counts.total} of {TOTAL_TIERS} tiers earned · every word you type counts</Text>
        <View style={s.countRow}>
          {TIERS.map((t) => (
            <View key={t} style={s.countChip}>
              <View style={[s.dot, { backgroundColor: TIER_STYLE[t].dot }]} />
              <Text style={s.countText}>{TIER_LABEL[t]} {counts[t]}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ---------- This month ---------- */}
      <View style={s.pad}>
        <View style={s.card}>
          <Text style={s.kicker}>THIS MONTH’S MEDAL</Text>
          <MonthMedalCard progress={thisMonth} />
        </View>

        {/* ---------- Monthly medals, by year ---------- */}
        <View style={s.sectionHead}>
          <Text style={s.section}>Monthly medals</Text>
          <Text style={s.sectionSub}>{earnedMonths} earned</Text>
        </View>
        {years.map(({ y, list }) => {
          const open = isOpen(y);
          const sum = yearSummary(list);
          return (
            <View key={y} style={[s.year, open && s.yearOpen]}>
              <Pressable onPress={() => setOpenYears((o) => ({ ...o, [y]: !open }))} style={s.yearHead} accessibilityRole="button" accessibilityState={{ expanded: open }}>
                <Text style={s.yearNum}>{y}</Text>
                <Text style={s.yearSum} numberOfLines={1}>
                  {sum.count ? `${sum.count} medal${sum.count === 1 ? '' : 's'} · best: ${TIER_LABEL[sum.best.tier]} (${sum.best.name})` : 'No medals yet'}
                </Text>
                <Text style={s.chev}>{open ? '⌃' : '⌄'}</Text>
              </Pressable>
              {open ? (
                <View style={s.slots}>
                  {list.map((p, m) => (
                    <Pressable
                      key={m}
                      disabled={!p}
                      onPress={() => setPicked((k) => (k === p.monthKey ? null : p.monthKey))}
                      style={[s.slot, p && picked === p.monthKey && s.slotOn]}
                      accessibilityRole="button"
                      accessibilityLabel={p ? `${p.title}, ${p.tier ? TIER_LABEL[p.tier] : 'not earned'}` : 'Still to come'}
                    >
                      {p && p.tier ? <Medal medal={p} tier={p.tier} size={26} /> : <View style={p ? s.missed : s.future} />}
                      <Text style={s.slotText}>{'JFMAMJJASOND'[m]}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {open && picked && picked.startsWith(String(y)) ? <MonthNote sessions={sessions} mk={picked} /> : null}
            </View>
          );
        })}

        <Text style={[s.section, { marginTop: space.lg }]}>All-time medals</Text>
      </View>

      <View style={s.grid}>
        {medals.map((m) => {
          const st = TIER_STYLE[m.tier || 'locked'];
          return (
            <Pressable
              key={m.id}
              style={s.cell}
              onPress={() => navigation.navigate('MedalDetail', { id: m.id })}
              accessibilityRole="button"
              accessibilityLabel={`${m.name}, ${m.tier ? TIER_LABEL[m.tier] : 'not earned yet'}, ${m.progressText}`}
            >
              <Medal medal={m} tier={m.tier} size={86} />
              <Text style={s.name} numberOfLines={2}>{m.name}</Text>
              <Text style={[s.tier, { color: st.label }]}>{m.tier ? TIER_LABEL[m.tier].toUpperCase() : 'NOT YET'}</Text>
              <View style={s.track}>
                <View style={[s.fill, { width: `${Math.max(2, m.pct)}%`, backgroundColor: tierBarColor(m.tier) }]} />
              </View>
              <Text style={s.progress} numberOfLines={2}>{m.progressText}</Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

// A tapped month: its name, tier, words, and the day each tier was reached.
function MonthNote({ sessions, mk }) {
  const p = monthProgress(sessions, mk);
  const [again, setAgain] = useState(false); // its celebration, shown again
  const { reached, days } = monthDays(sessions, mk);
  const fmt = (k) => parseDayKey(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return (
    <View style={s.note}>
      <Medal medal={p} tier={p.tier} size={48} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={s.noteTitle}>{p.title}</Text>
        <Text style={s.noteText}>
          {p.tier ? TIER_LABEL[p.tier] : 'Not earned'} · {p.value.toLocaleString()} words · {Object.keys(days).length} days of writing
        </Text>
        {Object.keys(reached).length ? (
          <Text style={s.noteText}>{TIERS.filter((t) => reached[t]).map((t) => `${TIER_LABEL[t]} · ${fmt(reached[t])}`).join('   ')}</Text>
        ) : null}
        {p.tier ? (
          <Pressable onPress={() => setAgain(true)} hitSlop={6} accessibilityRole="button" accessibilityHint="Shows this month's medal celebration again, with Share">
            <Text style={s.noteLink}>✦ See the celebration again</Text>
          </Pressable>
        ) : null}
      </View>
      {again ? <MedalPopup medals={[replayItem(p)]} replay onClose={() => setAgain(false)} /> : null}
    </View>
  );
}

const s = themed(() => ({
  pad: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: 10 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 10 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: colors.muted },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: space.md },
  section: { fontSize: 16, fontWeight: '800', color: colors.ink },
  sectionSub: { fontSize: 12.5, color: colors.muted },
  year: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  yearOpen: { borderColor: colors.royal },
  yearHead: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 12 },
  yearNum: { fontSize: 15, fontWeight: '800', color: colors.ink },
  yearSum: { flex: 1, fontSize: 12.5, color: colors.muted, textAlign: 'right' },
  chev: { fontSize: 14, fontWeight: '800', color: colors.royal },
  slots: { flexDirection: 'row', paddingHorizontal: 6, paddingBottom: 10 },
  slot: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4, borderRadius: 8 },
  slotOn: { backgroundColor: '#E8EDFB' },
  slotText: { fontSize: 9.5, fontWeight: '700', color: colors.muted },
  missed: { width: 24, height: 24, borderRadius: 12, margin: 1, backgroundColor: '#E6E3DA' },
  future: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#D6D3C8' },
  note: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#EEF2FB', margin: 8, marginTop: 0, borderRadius: 12, padding: 10 },
  noteTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  noteText: { fontSize: 12, color: colors.body },
  noteLink: { marginTop: 4, fontSize: 12.5, fontWeight: '800', color: colors.royal },
  header: { paddingHorizontal: space.lg, paddingBottom: space.lg },
  back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  backText: { color: colors.cream, fontSize: 14, fontWeight: '700' },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '700' },
  sub: { color: 'rgba(255,255,255,0.82)', fontSize: 13, marginTop: 4 },
  countRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  countChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  countText: { color: '#FFFFFF', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingTop: 20, rowGap: 22 },
  cell: { width: '33.33%', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  name: { fontSize: 12.5, fontWeight: '700', color: colors.ink, textAlign: 'center', lineHeight: 16 },
  tier: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5 },
  track: { width: 78, height: 5, borderRadius: radius.pill, backgroundColor: '#E8EBF2', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.royal },
  progress: { fontSize: 10.5, color: '#4F5878', textAlign: 'center' },
}));
