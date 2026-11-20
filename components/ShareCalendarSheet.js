// components/ShareCalendarSheet.js — Calendar → ⇪ Share. It shares the view
// the calendar is on (mode): 'rings' (your rings), 'feelings' (the faces you
// picked) or 'medals' (your monthly medals). Medals can be shared two ways:
// the ink-drop calendar (a drop a day, bigger for more words, with each
// month's medal by its name) or the medals themselves.
// A picture of your rings for This month / 3 months / 6 months, in the
// app's blue with the Pen Parentis logo, plus (switchable) totals: days with
// every ring closed, words, best streak. Never any of your writing.
// "Share image…" turns the preview into a picture (react-native-view-shot)
// and opens the phone's share sheet (expo-sharing): Messages, Instagram,
// Save Image…

import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Switch, Image, Alert, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Sheet from './Sheet';
import TourTarget from './TourTarget';
import { isTourTarget, tourEvent, useRun } from '../tourRun';
import { useTapHint } from './TapHint';
import Rings from './Rings';
import { colors, radius, themed } from '../theme';
import { calendarDay, dayFeelings, dayKey, monthFeelings, monthGrid, shareMonths, shareStats, shareTitle } from '../writingLogic';
import Face from './Face';
import Medal from './Medal';
import { MilestoneBar } from './MonthMedal';
import { TIER_LABEL } from '../medals';
import { monthDays, monthKey, monthProgress } from '../monthMedals';
import { InkDrop, MedalPin, WordBadge } from './InkDrop';
import { feelingLabel } from '../feelings';

const MODE = {
  rings: { title: 'Share your rings', sub: 'Show off your streak. Your writing is never included.', kick: 'MY WRITING', totals: 'Show totals (days, words, streak)' },
  feelings: { title: 'Share how you’ve felt', sub: 'The faces you picked. Your writing is never included.', kick: 'HOW I FELT', totals: 'Show totals (feelings, days)' },
  medals: { title: 'Share your medals', sub: 'Your monthly medals. Your writing is never included.', kick: 'MY MONTHLY MEDALS', totals: 'Show totals (medals, words)' },
};

const RANGES = [
  { id: 'month', label: 'This month' },
  { id: '3months', label: '3 months' },
  { id: '6months', label: '6 months' },
];
// Medals sit two months to a row, so they go by 2 and 4.
const MEDAL_RANGES = [
  { id: 'month', label: 'This month' },
  { id: '2months', label: '2 months' },
  { id: '4months', label: '4 months' },
];

export default function ShareCalendarSheet({ visible, onClose, mode = 'rings', sessions = [], dailyGoals = {}, goals = null }) {
  const M = MODE[mode] || MODE.rings;
  const run = useRun();
  const touring = !!run;
  // In the tour the three ranges pulse, drawn on the chips so they move with them.
  const chipTip = useTapHint(isTourTarget('share.card', run));
  const [rangePick, setRange] = useState('3months');
  const rangeList = mode === 'medals' ? MEDAL_RANGES : RANGES;
  // A pick from the other list (e.g. 3 months, then switching to Medals) → its middle choice.
  const range = rangeList.some((r) => r.id === rangePick) ? rangePick : rangeList[1].id;
  const [medalLook, setMedalLook] = useState('ink'); // 'ink' | 'medals'
  const [totals, setTotals] = useState(true);
  const [busy, setBusy] = useState(false);
  const shot = useRef(null);
  const { width } = useWindowDimensions();
  const today = dayKey();

  const months = useMemo(() => shareMonths(range, today), [range, today]);
  const stats = useMemo(
    () => (visible ? shareStats(sessions, dailyGoals, goals, months, today) : null),
    [visible, sessions, dailyGoals, goals, months, today],
  );
  // Feelings: every feeling picked in these months. Medals: each month's medal.
  const feel = useMemo(() => {
    if (!visible || mode !== 'feelings') return null;
    const all = {};
    for (const m of months) for (const x of monthFeelings(sessions, monthKey(m.year, m.month)).list) all[x.id] = (all[x.id] || 0) + x.n;
    const list = Object.entries(all).sort((a, b) => b[1] - a[1]);
    const days = new Set(sessions.filter((x) => x.feeling && months.some((m) => x.day?.startsWith(monthKey(m.year, m.month)))).map((x) => x.day)).size;
    return { top: list[0]?.[0] || null, total: list.reduce((n, [, c]) => n + c, 0), days };
  }, [visible, mode, months, sessions]);
  const medals = useMemo(
    () => (visible && mode === 'medals' ? months.map((m) => monthProgress(sessions, monthKey(m.year, m.month))) : []),
    [visible, mode, months, sessions],
  );
  // Ink-drop calendar: words each day and the day each tier was reached, per month.
  const ink = useMemo(() => {
    const out = {};
    if (!visible || mode !== 'medals') return out;
    for (const m of months) {
      const mk = monthKey(m.year, m.month);
      const { days, reached } = monthDays(sessions, mk);
      const tierOn = {};
      for (const [t, k] of Object.entries(reached)) tierOn[k] = t;
      out[mk] = { days, tierOn };
    }
    return out;
  }, [visible, mode, months, sessions]);

  // Picture width: the sheet's width less its padding.
  const imgW = Math.min(width, 520) - 44;
  const inner = imgW - 32;
  // One month fills the width with big rings; 3 and 6 months sit 3 to a
  // row, so the picture stays short enough to share (one row for 3 months,
  // two for 6).
  const perRow = range === 'month' ? 1 : mode === 'medals' ? 2 : 3;
  const gap = 10;
  const monthW = (inner - gap * (perRow - 1)) / perRow;
  const ring = Math.floor(monthW / 7) - (perRow === 1 ? 6 : 2);

  async function share() {
    if (busy) return;
    setBusy(true);
    try {
      const uri = await captureRef(shot, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: M.title });
      } else {
        Alert.alert('Sharing isn’t available on this device.');
      }
    } catch (e) {
      Alert.alert('Couldn’t make the picture', 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} tourId="share" title={M.title} subtitle={M.sub}>
      <View style={s.chips}>
        {rangeList.map((r) => {
          const on = r.id === range;
          return (
            <TourTarget key={r.id} id={`share.${r.id}`}>
            <Pressable onPress={() => { setRange(r.id); tourEvent('share-range', r.id); }} style={[s.chip, on && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <Text style={[s.chipText, on && { color: '#FFFFFF' }]}>{r.label}</Text>
              {chipTip.ring(chipTip.on)}
            </Pressable>
            </TourTarget>
          );
        })}
      </View>

      {mode === 'medals' ? (
        <View style={[s.chips, { marginTop: -4 }]}>
          {[['ink', 'Ink calendar'], ['medals', 'Medals']].map(([id, label]) => {
            const on = medalLook === id;
            return (
              <Pressable key={id} onPress={() => setMedalLook(id)} style={[s.look, on && s.lookOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[s.lookText, on && { color: colors.royal }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* The picture. Always drawn in the app's blue, in light or dark mode. */}
      <View ref={shot} collapsable={false} style={{ borderRadius: 18, overflow: 'hidden' }}>
        <LinearGradient colors={['#1B3FA0', '#0C2265']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={s.img}>
          <Text style={s.kick}>PEN PARENTIS · {M.kick}</Text>
          <Text style={s.big}>{shareTitle(range, months)}</Text>

          {totals && stats && mode === 'rings' ? (
            <View style={s.stats}>
              <Stat n={stats.closedDays} label={stats.closedDays === 1 ? 'day rings closed' : 'days rings closed'} />
              <Stat n={stats.words.toLocaleString()} label="words" />
              <Stat n={stats.bestStreak} label={stats.bestStreak === 1 ? 'day best streak' : 'day best streak'} />
            </View>
          ) : totals && feel && mode === 'feelings' ? (
            <View style={s.stats}>
              <Stat n={feel.top ? feelingLabel(feel.top) : '—'} label="mostly" />
              <Stat n={feel.total} label={feel.total === 1 ? 'feeling picked' : 'feelings picked'} />
              <Stat n={feel.days} label={feel.days === 1 ? 'day' : 'days'} />
            </View>
          ) : totals && stats && mode === 'medals' ? (
            <View style={s.stats}>
              <Stat n={medals.filter((p) => p.tier).length} label={medals.filter((p) => p.tier).length === 1 ? 'medal' : 'medals'} />
              <Stat n={stats.words.toLocaleString()} label="words" />
              <Stat n={(() => { const b = medals.reduce((a, p) => (p.tierIndex > (a?.tierIndex ?? -1) ? p : a), null); return b && b.tier ? TIER_LABEL[b.tier] : '—'; })()} label="best" />
            </View>
          ) : <View style={{ height: 10 }} />}

          {mode === 'medals' && medalLook === 'ink' ? (
            // The ink-drop calendar: each month with the medal it earned by its name.
            <View style={[s.months, { gap, justifyContent: 'center' }]}>
              {months.map((m) => {
                const mk = monthKey(m.year, m.month);
                const p = medals.find((x) => x.monthKey === mk);
                const { days = {}, tierOn = {} } = ink[mk] || {};
                // One month: big drops with the badge on the drop. 3 and 6
                // months: two months to a row (room for each day's "+words"
                // under its drop).
                const one = perRow === 1;
                const mW = one ? monthW : (inner - gap) / 2;
                const cellW = mW / 7;
                const drop = Math.floor(cellW - (one ? 12 : 5));
                const badgeH = one ? 0 : 11;
                const cellH = one ? drop + 14 : drop + badgeH + 3;
                return (
                  <View key={mk} style={{ width: mW }}>
                    <View style={s.inkHead}>
                      <Text style={[s.mon, { marginTop: 0, marginBottom: 0 }, !one && { fontSize: 9.5 }]} numberOfLines={1}>
                        {new Date(m.year, m.month, 1).toLocaleDateString('en-US', { month: one ? 'long' : 'short' }).toUpperCase()}
                      </Text>
                      {p && p.tier ? <MedalPin tier={p.tier} height={one ? 22 : 16} /> : null}
                      {one && p ? <Text style={s.inkName} numberOfLines={1}>{p.name} · {p.tier ? TIER_LABEL[p.tier] : 'on the way'} · {p.value.toLocaleString()} words</Text> : null}
                      {!one && p && p.value > 0 ? <Text style={s.inkTotal} numberOfLines={1}>{p.value.toLocaleString()} words</Text> : null}
                    </View>
                    {monthGrid(m.year, m.month).map((row, r) => (
                      <View key={r} style={s.week}>
                        {row.map((k, c) => {
                          if (!k) return <View key={c} style={{ width: cellW, height: cellH }} />;
                          const w = days[k] || 0;
                          return (
                            <View key={k} style={{ width: cellW, height: cellH, alignItems: 'center', justifyContent: one ? 'center' : 'flex-start', paddingTop: one ? 0 : 1 }}>
                              <View style={{ width: drop, height: drop, alignItems: 'center', justifyContent: 'center' }}>
                                {w > 0
                                  ? <InkDrop words={w} min={Math.max(4, drop * 0.22)} max={drop} color="#0B0C10" edge="rgba(255,255,255,0.45)" />
                                  : <View style={[s.blank, { width: drop * 0.2, height: drop * 0.2, borderRadius: drop, opacity: k > today ? 0.4 : 1 }]} />}
                              </View>
                              {w > 0 && one ? <WordBadge words={w} size={8.5} border="#1B3FA0" at={s.inkBadge} /> : null}
                              {w > 0 && !one ? <WordBadge words={w} size={6.5} border={null} at={s.inkBadgeSmall} align="center" /> : null}
                              {tierOn[k] ? <View style={[s.inkPin, !one && { top: -3, right: -2 }]}><MedalPin tier={tierOn[k]} height={one ? 16 : 11} /></View> : null}
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          ) : mode === 'medals' ? (
            // One medal per month: big with its bar for one month, three to a row otherwise.
            <View style={[s.months, { gap }]}>
              {medals.map((p) => (
                <View key={p.monthKey} style={[{ width: monthW, alignItems: 'center', gap: 4, paddingVertical: 6 }, perRow === 1 && { alignItems: 'stretch' }]}>
                  {perRow === 1 ? (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Medal medal={p} tier={p.tier} size={72} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.medName}>{p.name}</Text>
                          <Text style={s.medSub}>{p.when} · {p.tier ? TIER_LABEL[p.tier] : 'on the way'} · {p.value.toLocaleString()} words</Text>
                        </View>
                      </View>
                      <MilestoneBar words={p.value} dark />
                    </>
                  ) : (
                    <>
                      <Medal medal={p} tier={p.tier} size={Math.min(64, monthW - 30)} />
                      <Text style={s.medSmall} numberOfLines={1}>{p.name}</Text>
                      <Text style={s.medTier}>{p.tier ? TIER_LABEL[p.tier] : 'No medal yet'}</Text>
                      <Text style={s.medTier}>{p.value.toLocaleString()} words</Text>
                    </>
                  )}
                </View>
              ))}
            </View>
          ) : (
          <View style={[s.months, { gap }]}>
            {months.map((m) => (
              <View key={`${m.year}-${m.month}`} style={{ width: monthW }}>
                <Text style={[s.mon, perRow > 1 && { fontSize: 9 }]}>
                  {new Date(m.year, m.month, 1).toLocaleDateString('en-US', { month: perRow > 1 ? 'short' : 'long' }).toUpperCase()}
                </Text>
                {monthGrid(m.year, m.month).map((row, r) => (
                  <View key={r} style={s.week}>
                    {row.map((k, c) => {
                      if (!k) return <View key={c} style={{ width: monthW / 7, height: ring + 3 }} />;
                      if (mode === 'feelings') {
                        // The latest feeling that day (a faint dot on days without one).
                        const f = dayFeelings(sessions, k);
                        return (
                          <View key={k} style={{ width: monthW / 7, height: ring + 3, alignItems: 'center', justifyContent: 'center' }}>
                            {f.length ? <Face id={f[f.length - 1].feeling} size={ring} /> : <View style={[s.blank, { width: ring * 0.35, height: ring * 0.35, borderRadius: ring }]} />}
                          </View>
                        );
                      }
                      const d = calendarDay(sessions, dailyGoals, goals, k, today);
                      return (
                        <View key={k} style={{ width: monthW / 7, height: ring + 3, alignItems: 'center', justifyContent: 'center' }}>
                          <Rings minutes={d.rings.minutes} words={d.rings.words} sessions={d.rings.sessions} off={d.off && !d.future} faded={d.future} size={ring} variant="dark" />
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            ))}
          </View>
          )}

          <View style={s.foot}>
            <Image source={require('../assets/pen-parentis-logo.png')} style={s.logo} resizeMode="cover" />
            <Text style={s.footText}>parenting done, write.</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={s.toggle}>
        <Text style={s.toggleText}>{M.totals}</Text>
        <Switch value={totals} onValueChange={setTotals} trackColor={{ true: colors.royal, false: '#C8CEDE' }} thumbColor="#FFFFFF" ios_backgroundColor="#C8CEDE" />
      </View>

      {/* Off during the app tour (it would leave the app). */}
      <Pressable onPress={share} disabled={busy || touring} style={[s.btn, (busy || touring) && { opacity: 0.45 }]} accessibilityRole="button" accessibilityState={{ disabled: busy || touring }}>
        <Text style={s.btnText}>{busy ? 'Making the picture…' : 'Share image…'}</Text>
      </Pressable>
      <Text style={s.hint}>{touring ? 'Sharing is off during the tour. Come back any time to share yours.' : "Opens your phone's share sheet: Messages, Instagram, Save Image…"}</Text>
    </Sheet>
  );
}

function Stat({ n, label }) {
  return (
    <View style={s.stat}>
      <Text style={s.statN}>{n}</Text>
      <Text style={s.statL}>{label}</Text>
    </View>
  );
}

const s = themed(() => ({
  chips: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1.5, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 13, minHeight: 34, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  chipOn: { backgroundColor: colors.royal, borderColor: colors.royal },
  chipText: { fontSize: 13, fontWeight: '800', color: colors.muted },
  // Inside the picture: fixed colours (it's always blue).
  img: { padding: 16 },
  kick: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1, color: '#F2C14E' },
  big: { fontSize: 21, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  stats: { flexDirection: 'row', gap: 6, marginVertical: 12 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  statN: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  statL: { fontSize: 10, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  months: { flexDirection: 'row', flexWrap: 'wrap' },
  look: { borderRadius: 999, paddingHorizontal: 12, minHeight: 30, justifyContent: 'center', backgroundColor: '#EEF0F5' },
  lookOn: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: colors.royal },
  lookText: { fontSize: 12.5, fontWeight: '800', color: '#5A6484' },
  inkHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 4, minHeight: 16 },
  inkName: { flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  inkBadge: { bottom: -1, right: -2 },
  // under the drop, centred on the day (may run a little into its neighbours)
  inkBadgeSmall: { bottom: 1, left: '50%', marginLeft: -40 },
  inkTotal: { flex: 1, textAlign: 'right', fontSize: 9.5, fontWeight: '800', color: '#B8F07A' },
  inkPin: { position: 'absolute', top: -2, right: 0 },
  blank: { backgroundColor: 'rgba(255,255,255,0.18)' },
  medName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  medSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  medSmall: { fontSize: 11.5, fontWeight: '800', color: '#FFFFFF', maxWidth: '100%' },
  medTier: { fontSize: 10.5, color: 'rgba(255,255,255,0.8)' },
  mon: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, color: 'rgba(255,255,255,0.75)', marginBottom: 4, marginTop: 4 },
  week: { flexDirection: 'row' },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  logo: { width: 28, height: 24, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  footText: { fontSize: 11.5, color: 'rgba(255,255,255,0.85)' },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  toggleText: { fontSize: 13, color: colors.body },
  btn: { backgroundColor: colors.royal, borderRadius: radius.md, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14.5 },
  hint: { fontSize: 11.5, color: colors.muted, textAlign: 'center', marginTop: 6, marginBottom: 4 },
}));
