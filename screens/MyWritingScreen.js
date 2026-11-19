// screens/MyWritingScreen.js — every day you've written, built to stay easy
// to get around as it grows to hundreds of days:
//   • Search: finds any word you wrote; each match shows the line it's in.
//   • This week: the same white day bubbles as the Brainstorm page, plus
//     "Send this week's writing to myself".
//   • Earlier: one folded row per month ("October 2026 · 22 days · 6,105
//     words", a dot per day written: gold when that day's goal was met).
//     Tap a month to open it as short one-line rows; the newest one starts
//     open. Year chips (when there's more than one year) pick the year.
// Tap any day to read it in full and send it to yourself.

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button } from '../components/ui';
import DayBubble from '../components/DayBubble';
import { colors, space, themed } from '../theme';
import { dayKey, daySummary, parseDayKey, timeText, weekDayKeys } from '../writingLogic';
import { loadAll, shareDays } from '../writingStore';

const monthKey = (k) => k.slice(0, 7); // "2026-10"
const monthName = (mk) => parseDayKey(`${mk}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const shortDay = (k) => parseDayKey(k).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const dayText = (d) => (d.pieces || []).map((p) => p.text || '').join('\n');
const plural = (n, w) => `${n.toLocaleString()} ${w}${n === 1 ? '' : 's'}`;

// The line around a search match: "…and nobody moved, the kettle…"
function snippet(text, q) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return null;
  const from = Math.max(0, i - 30);
  const to = Math.min(text.length, i + q.length + 40);
  return {
    before: (from > 0 ? '…' : '') + text.slice(from, i).replace(/\s+/g, ' '),
    match: text.slice(i, i + q.length),
    after: text.slice(i + q.length, to).replace(/\s+/g, ' ') + (to < text.length ? '…' : ''),
  };
}

export default function MyWritingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState({ sessions: [], dailyGoals: {} });
  const [query, setQuery] = useState('');
  const [year, setYear] = useState(null); // null = the newest year
  const [open, setOpen] = useState(null); // months opened/closed by you: { '2026-10': true }

  useFocusEffect(
    useCallback(() => {
      loadAll().then(setData);
    }, [])
  );

  const today = dayKey();
  const days = useMemo(() => [...new Set(data.sessions.map((s) => s.day))]
    .sort()
    .reverse()
    .map((k) => daySummary(data.sessions, data.dailyGoals, k, data.goals)), [data]);

  const thisWeekKeys = new Set(weekDayKeys());
  const thisWeek = days.filter((d) => thisWeekKeys.has(d.key));
  const earlier = days.filter((d) => !thisWeekKeys.has(d.key));

  // Earlier days, by month (newest first), and the years they cover.
  const months = useMemo(() => {
    const out = [];
    for (const d of earlier) {
      const mk = monthKey(d.key);
      if (!out.length || out[out.length - 1].mk !== mk) out.push({ mk, days: [], words: 0 });
      const m = out[out.length - 1];
      m.days.push(d);
      m.words += d.words || 0;
    }
    return out;
  }, [days]);
  const years = [...new Set(months.map((m) => m.mk.slice(0, 4)))];
  const shownYear = year && years.includes(year) ? year : years[0];
  const yearMonths = months.filter((m) => m.mk.startsWith(shownYear));
  // The newest month starts open; after that, it's whatever you tap.
  const isOpen = (mk) => (open && mk in open ? open[mk] : mk === months[0]?.mk);
  const toggle = (mk) => setOpen((o) => ({ ...(o || {}), [mk]: !isOpen(mk) }));

  // Search: every day with the words in it, newest first.
  const q = query.trim();
  const results = q.length >= 2
    ? days.map((d) => ({ d, hit: snippet(dayText(d), q) })).filter((r) => r.hit)
    : null;

  const goDay = (k) => navigation.navigate('BrainstormDay', { day: k });

  return (
    <Screen>
      <View style={[s.top, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={s.backBtn}>
          <Text style={s.back}>‹ Brainstorm</Text>
        </Pressable>
        <Text style={s.title}>My writing</Text>
        <Text style={s.sub}>{plural(days.length, 'day')} of writing saved on this phone</Text>
      </View>

      <View style={s.pad}>
        {days.length === 0 ? (
          <Text style={s.empty}>Nothing here yet. Every day you write shows up here automatically.</Text>
        ) : (
          <View style={s.search}>
            <Ionicons name="search" size={16} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search your writing"
              placeholderTextColor={colors.muted}
              style={s.searchInput}
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel="Search your writing"
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        )}

        {results ? (
          // ---- Search results ----
          <View style={{ marginTop: space.md }}>
            <Text style={s.section}>{results.length ? `${plural(results.length, 'day')} with “${q}”` : `Nothing with “${q}” yet`}</Text>
            <View style={s.list}>
              {results.map(({ d, hit }, i) => (
                <Pressable key={d.key} onPress={() => goDay(d.key)} style={({ pressed }) => [s.hitRow, i > 0 && s.rowLine, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                  <View style={s.rowTop}>
                    <Text style={s.rowDate}>{shortDay(d.key)}{d.key === today ? ' · today' : ''}</Text>
                    <Text style={s.rowMeta}>{plural(d.words || 0, 'word')}</Text>
                  </View>
                  <Text style={s.hit} numberOfLines={2}>
                    {hit.before}<Text style={s.hitMatch}>{hit.match}</Text>{hit.after}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <>
            {/* ---- This week ---- */}
            {thisWeek.length > 0 && (
              <View style={{ marginTop: space.md }}>
                <Text style={s.section}>This week</Text>
                {thisWeek.map((d) => (
                  <DayBubble key={d.key} day={d} isToday={d.key === today} onPress={() => goDay(d.key)} />
                ))}
                <Button
                  label="Send this week's writing to myself"
                  variant="outline"
                  onPress={() => shareDays(thisWeek.slice().reverse(), "This week's writing — Pen Parentis")}
                />
              </View>
            )}

            {/* ---- Earlier, by month ---- */}
            {months.length > 0 && (
              <View style={{ marginTop: space.lg }}>
                <View style={s.earlierHead}>
                  <Text style={[s.section, { marginBottom: 0 }]}>Earlier</Text>
                  {years.length > 1 ? (
                    <View style={s.chips}>
                      {years.map((y) => (
                        <Pressable key={y} onPress={() => setYear(y)} style={[s.chip, y === shownYear && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: y === shownYear }}>
                          <Text style={[s.chipText, y === shownYear && s.chipTextOn]}>{y}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
                {yearMonths.map((m) => {
                  const on = isOpen(m.mk);
                  return (
                    <View key={m.mk} style={[s.month, on && s.monthOn]}>
                      <Pressable onPress={() => toggle(m.mk)} style={s.monthHead} accessibilityRole="button" accessibilityState={{ expanded: on }} accessibilityLabel={`${monthName(m.mk)}, ${plural(m.days.length, 'day')}, ${plural(m.words, 'word')}`}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={s.monthName}>{monthName(m.mk)}</Text>
                          <Text style={s.monthMeta}>{plural(m.days.length, 'day')} · {plural(m.words, 'word')}</Text>
                        </View>
                        {/* A dot per day written, oldest first; gold = goal met. */}
                        <View style={s.dots}>
                          {m.days.slice().reverse().map((d) => (
                            <View key={d.key} style={[s.dot, { backgroundColor: d.pct != null && d.pct >= 100 ? colors.karma : '#3E9B65' }]} />
                          ))}
                        </View>
                        <Ionicons name={on ? 'chevron-up' : 'chevron-down'} size={18} color={colors.royal} />
                      </Pressable>
                      {on ? (
                        <View style={s.monthBody}>
                          {m.days.map((d, i) => (
                            <Pressable key={d.key} onPress={() => goDay(d.key)} style={({ pressed }) => [s.row, i > 0 && s.rowLine, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                              <View style={s.rowTop}>
                                <Text style={s.rowDate}>{shortDay(d.key)}</Text>
                                <Text style={s.rowMeta}>{plural(d.words || 0, 'word')} · {timeText(d.seconds || 0)}</Text>
                              </View>
                              {d.preview ? <Text style={s.rowPreview} numberOfLines={1}>“{d.preview.replace(/\s+/g, ' ')}”</Text> : d.offline ? <Text style={s.rowPreview}>Written elsewhere</Text> : null}
                            </Pressable>
                          ))}
                          <Pressable onPress={() => shareDays(m.days.slice().reverse(), `${monthName(m.mk)} — Pen Parentis`)} style={s.sendMonth} accessibilityRole="button">
                            <Ionicons name="share-outline" size={14} color={colors.royal} />
                            <Text style={s.sendMonthText}>Send {monthName(m.mk).split(' ')[0]} to myself</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

const s = themed(() => ({
  top: { paddingHorizontal: space.lg, paddingBottom: space.sm, backgroundColor: colors.paper },
  backBtn: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  back: { color: colors.royal, fontSize: 14, fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '700', color: colors.ink },
  sub: { fontSize: 12.5, color: colors.muted, marginTop: 3 },
  pad: { paddingHorizontal: space.lg },
  empty: { fontSize: 13.5, color: colors.muted, marginTop: space.lg, lineHeight: 20 },
  section: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 10 },

  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, minHeight: 44, marginTop: space.sm },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 10 },

  earlierHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12 },
  chipOn: { backgroundColor: colors.royal, borderColor: colors.royal },
  chipText: { fontSize: 12.5, fontWeight: '700', color: colors.muted },
  chipTextOn: { color: '#FFFFFF' },

  month: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, marginBottom: 10, overflow: 'hidden' },
  monthOn: { borderColor: colors.royal },
  monthHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, minHeight: 56 },
  monthName: { fontSize: 15, fontWeight: '800', color: colors.ink },
  monthMeta: { fontSize: 12.5, color: colors.muted, fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, width: 96, justifyContent: 'flex-end' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  monthBody: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingHorizontal: 14, paddingBottom: 6 },

  list: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14 },
  row: { paddingVertical: 10, gap: 2 },
  hitRow: { paddingVertical: 11, gap: 3 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  rowDate: { fontSize: 14, fontWeight: '700', color: colors.ink },
  rowMeta: { fontSize: 12.5, color: colors.muted, fontVariant: ['tabular-nums'] },
  rowPreview: { fontSize: 12.5, color: colors.muted, fontStyle: 'italic' },
  hit: { fontSize: 13, lineHeight: 18, color: colors.body },
  hitMatch: { fontWeight: '800', color: colors.ink, backgroundColor: 'rgba(200,145,43,0.25)' },
  sendMonth: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 10 },
  sendMonthText: { fontSize: 13, fontWeight: '700', color: colors.royal },
}));
