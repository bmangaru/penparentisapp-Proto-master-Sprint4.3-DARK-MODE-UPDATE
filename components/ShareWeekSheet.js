// components/ShareWeekSheet.js — Week review → Share my week. A picture of
// the week, like the Calendar's share pictures: the app's blue, the week's
// rings day by day, words / time / sessions, the best day, how you felt and
// medals reached, with the Pen Parentis icon. Never any of your writing.
// "Share image…" turns it into a picture (react-native-view-shot) and opens
// the phone's share sheet (expo-sharing): Messages, Instagram, Save Image…
//
//   <ShareWeekSheet visible onClose review={weekReview(…)} medals={weekMedals(…)} thisWeek />

import React, { useRef, useState } from 'react';
import { View, Text, Pressable, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Sheet from './Sheet';
import Rings from './Rings';
import Face from './Face';
import { colors, radius, themed } from '../theme';
import { parseDayKey, timeClock } from '../writingLogic';
import { feelingLabel } from '../feelings';
import { TIER_LABEL } from '../medals';
import { useRun } from '../tourRun';

const TIER_DOT = { bronze: '#C9884F', silver: '#C4CAD6', gold: '#E9B949', diamond: '#9FB0FF' };
const short = (k) => parseDayKey(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const weekday = (k) => parseDayKey(k).toLocaleDateString(undefined, { weekday: 'long' });

export default function ShareWeekSheet({ visible, onClose, review: r, medals = [], thisWeek = false }) {
  const shot = useRef(null);
  const [busy, setBusy] = useState(false);
  const touring = !!useRun();
  if (!r) return null;
  const felt = r.feelings && r.feelings[0];

  async function share() {
    if (busy) return;
    setBusy(true);
    try {
      const uri = await captureRef(shot, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share my week' });
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
    <Sheet visible={visible} onClose={onClose} title="Share my week" subtitle="A picture of your week. Your writing is never included.">
      {/* The picture. Always the app's blue, in light or dark mode. */}
      <View ref={shot} collapsable={false} style={{ borderRadius: 18, overflow: 'hidden' }}>
        <LinearGradient colors={['#1B3FA0', '#0C2265']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={s.img}>
          <Text style={s.kick}>PEN PARENTIS · {thisWeek ? 'MY WEEK SO FAR' : 'MY WRITING WEEK'}</Text>
          <Text style={s.big}>{short(r.start)} – {short(r.end)}</Text>

          <View style={s.stats}>
            <Stat n={r.done.words.toLocaleString()} label="words" />
            <Stat n={timeClock(r.done.seconds)} label="writing" />
            <Stat n={String(r.done.count)} label={r.done.count === 1 ? 'session' : 'sessions'} />
          </View>

          <View style={s.week}>
            {r.days.map((d) => (
              <View key={d.key} style={s.day}>
                <Text style={s.dayL}>{d.label}</Text>
                <Rings minutes={d.rings.minutes} words={d.rings.words} sessions={d.rings.sessions} off={d.off && !d.future} faded={d.future} size={34} variant="dark" />
              </View>
            ))}
          </View>
          <Text style={s.closed}>{r.closedDays} day{r.closedDays === 1 ? '' : 's'} with all rings closed{r.restDays ? ` · ${r.restDays} rest day${r.restDays === 1 ? '' : 's'}` : ''}</Text>

          {r.best || felt ? (
            <View style={s.pair}>
              {r.best ? (
                <View style={s.box}>
                  <Text style={s.boxK}>BEST DAY</Text>
                  <Text style={s.boxV}>{weekday(r.best.key)}</Text>
                  <Text style={s.boxS}>{r.best.words.toLocaleString()} words</Text>
                </View>
              ) : null}
              {felt ? (
                <View style={[s.box, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                  <Face id={felt[0]} size={34} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.boxK}>FELT MOST</Text>
                    <Text style={s.boxV}>{feelingLabel(felt[0])}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {medals.length ? (
            <View style={s.medals}>
              {medals.slice(0, 4).map((m, i) => (
                <View key={`${m.id}${i}`} style={s.medal}>
                  <View style={[s.medalDot, { backgroundColor: TIER_DOT[m.tier] || '#E9B949' }]} />
                  <Text style={s.medalT} numberOfLines={1}>{TIER_LABEL[m.tier]} {m.name}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={s.foot}>
            <Image source={require('../assets/icon.png')} style={s.logo} resizeMode="cover" />
            <Text style={s.footText}>parenting done, write.</Text>
          </View>
        </LinearGradient>
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
      <Text style={s.statN} numberOfLines={1}>{n}</Text>
      <Text style={s.statL}>{label}</Text>
    </View>
  );
}

// Inside the picture: fixed colours (it's always blue).
const s = themed(() => ({
  img: { padding: 16 },
  kick: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1, color: '#F2C14E' },
  big: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  stats: { flexDirection: 'row', gap: 6, marginVertical: 12 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  statN: { fontSize: 19, fontWeight: '800', color: '#FFFFFF' },
  statL: { fontSize: 10.5, color: 'rgba(255,255,255,0.8)' },
  week: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  day: { alignItems: 'center', gap: 4 },
  dayL: { fontSize: 10.5, fontWeight: '800', color: 'rgba(255,255,255,0.75)' },
  closed: { fontSize: 11.5, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 8 },
  pair: { flexDirection: 'row', gap: 8, marginTop: 12 },
  box: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  boxK: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8, color: '#F2C14E' },
  boxV: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  boxS: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  medals: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  medal: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', maxWidth: '100%' },
  medalDot: { width: 10, height: 10, borderRadius: 5 },
  medalT: { fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  logo: { width: 26, height: 26, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  footText: { fontSize: 11.5, color: 'rgba(255,255,255,0.85)' },
  btn: { backgroundColor: colors.royal, borderRadius: radius.md, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14.5 },
  hint: { fontSize: 11.5, color: colors.muted, textAlign: 'center', marginTop: 6, marginBottom: 4 },
}));
