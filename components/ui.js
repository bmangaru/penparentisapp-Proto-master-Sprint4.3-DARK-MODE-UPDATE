// components/ui.js — the small set of pieces every screen is built from.

import React, { useMemo, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, lift, radius, space, themed } from '../theme';
import { TourScrollContext, stepOf, useRun } from '../tourRun';

// The app tour can scroll a page to the spot it's pointing at.
export function Screen({ children, scrollRef }) {
  const own = useRef(null);
  const ref = scrollRef || own;
  const y = useRef(0);
  const tour = useMemo(() => ({ ref, y }), [ref]);
  // While a tour step is showing, the page holds still (the tour scrolls it
  // to the right spot itself). "Scroll down to…" steps and a tucked-away
  // tour leave scrolling on.
  const run = useRun();
  const st = run && !run.min ? stepOf(run) : null;
  const hold = !!run && !run.min && (run.phase === 'done' || (st && !st.reveal));
  return (
    <TourScrollContext.Provider value={tour}>
      <ScrollView
        ref={ref}
        style={{ flex: 1, backgroundColor: colors.paper }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!hold}
        onScroll={(e) => { y.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={32}
      >
        {children}
      </ScrollView>
    </TourScrollContext.Provider>
  );
}

// `right`: optional small buttons shown in the title row.
export function Header({ title, subtitle, right, children }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={gradients.header}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[s.header, { paddingTop: insets.top + space.md }]}
    >
      <LinearGradient
        colors={['rgba(200,145,43,0.32)', 'rgba(12,34,101,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.8 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {right ? (
        <View style={s.titleRow}>
          <Text style={[s.headerTitle, { flex: 1 }]}>{title}</Text>
          {right}
        </View>
      ) : (
        <Text style={s.headerTitle}>{title}</Text>
      )}
      {subtitle ? <Text style={s.headerSub}>{subtitle}</Text> : null}
      {children}
    </LinearGradient>
  );
}

export function Card({ children, style }) {
  return <View style={[s.card, lift, style]}>{children}</View>;
}

export function Button({ label, onPress, variant = 'primary' }) {
  if (variant === 'outline') {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.btn, s.btnOutline, lift, pressed && s.pressed]}>
        <Text style={[s.btnText, { color: colors.royal }]}>{label}</Text>
      </Pressable>
    );
  }
  const palette = variant === 'gold' ? gradients.gold : variant === 'dark' ? ['#16244A', '#0A1633'] : gradients.button;
  const textColor = variant === 'gold' ? '#231702' : '#FFFFFF';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [lift, s.btnWrap, pressed && s.pressed]}>
      <LinearGradient colors={palette} style={s.btn}>
        <Text style={[s.btnText, { color: textColor }]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function openLink(url) {
  Linking.openURL(url).catch(() => {});
}

const s = themed(() => ({
  header: { paddingHorizontal: space.lg, paddingBottom: space.lg, overflow: 'hidden' },
  headerTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '700', letterSpacing: -0.2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12.5, marginTop: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: radius.md, padding: space.md, marginBottom: space.sm, borderWidth: 1, borderColor: colors.line },
  btnWrap: { borderRadius: radius.md, marginBottom: space.sm },
  btn: { borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  btnOutline: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: colors.royal, marginBottom: space.sm },
  btnText: { fontSize: 14.5, fontWeight: '600' },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.92 },
}));