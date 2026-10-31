// components/ShareCalendarSheet.js — Calendar → ⇪ Share: "Share your rings".
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
import Rings from './Rings';
import { colors, radius, themed } from '../theme';
import { calendarDay, dayKey, monthGrid, shareMonths, shareStats, shareTitle } from '../writingLogic';

const RANGES = [
  { id: 'month', label: 'This month' },
  { id: '3months', label: '3 months' },
  { id: '6months', label: '6 months' },
];

export default function ShareCalendarSheet({ visible, onClose, sessions = [], dailyGoals = {}, goals = null }) {
  const [range, setRange] = useState('3months');
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

  // Picture width: the sheet's width less its padding. One month fills the
  // width; 3 and 6 months sit 3 to a row, so the picture stays short enough
  // to share (one row for 3 months, two for 6).
  const imgW = Math.min(width, 520) - 44;
  const inner = imgW - 32;
  const perRow = range === 'month' ? 1 : 3;
  const gap = 10;
  const monthW = (inner - gap * (perRow - 1)) / perRow;
  const ring = Math.floor(monthW / 7) - (perRow === 1 ? 6 : 2);

  async function share() {
    if (busy) return;
    setBusy(true);
    try {
      const uri = await captureRef(shot, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share your rings' });
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
    <Sheet visible={visible} onClose={onClose} title="Share your rings" subtitle="Show off your streak. Your writing is never included.">
      <View style={s.chips}>
        {RANGES.map((r) => {
          const on = r.id === range;
          return (
            <Pressable key={r.id} onPress={() => setRange(r.id)} style={[s.chip, on && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <Text style={[s.chipText, on && { color: '#FFFFFF' }]}>{r.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* The picture. Always drawn in the app's blue, in light or dark mode. */}
      <View ref={shot} collapsable={false} style={{ borderRadius: 18, overflow: 'hidden' }}>
        <LinearGradient colors={['#1B3FA0', '#0C2265']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={s.img}>
          <Text style={s.kick}>PEN PARENTIS · MY WRITING</Text>
          <Text style={s.big}>{shareTitle(range, months)}</Text>

          {totals && stats ? (
            <View style={s.stats}>
              <Stat n={stats.closedDays} label={stats.closedDays === 1 ? 'day rings closed' : 'days rings closed'} />
              <Stat n={stats.words.toLocaleString()} label="words" />
              <Stat n={stats.bestStreak} label={stats.bestStreak === 1 ? 'day best streak' : 'day best streak'} />
            </View>
          ) : <View style={{ height: 10 }} />}

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

          <View style={s.foot}>
            <Image source={require('../assets/pen-parentis-logo.png')} style={s.logo} resizeMode="cover" />
            <Text style={s.footText}>parenting done, write.</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={s.toggle}>
        <Text style={s.toggleText}>Show totals (days, words, streak)</Text>
        <Switch value={totals} onValueChange={setTotals} trackColor={{ true: colors.royal, false: '#C8CEDE' }} thumbColor="#FFFFFF" ios_backgroundColor="#C8CEDE" />
      </View>

      <Pressable onPress={share} disabled={busy} style={[s.btn, busy && { opacity: 0.6 }]} accessibilityRole="button">
        <Text style={s.btnText}>{busy ? 'Making the picture…' : 'Share image…'}</Text>
      </Pressable>
      <Text style={s.hint}>Opens your phone's share sheet: Messages, Instagram, Save Image…</Text>
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
