// components/BottomBar.js — the app's bottom tab bar.
//   • Five tabs: Home · Calendar · Brainstorm · Eventbrite · Community.
//   • Brainstorm is a big blue circle that sits fully inside a slightly taller
//     bar, so it never covers anything on a page (the donor ticker on Home,
//     the end of long pages). The old bar clipped it; a raised one covered content.
//   • "You are here" is a short bar under the current tab's label, the same for
//     every tab, Brainstorm included (the old top bar hid behind the circle).
// Used as the `tabBar` of the material-top-tabs navigator in App.js, so
// swiping between tabs still works.

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, themed } from '../theme';
import TourTarget from './TourTarget';
import { isTourTarget, tourEvent, useRun } from '../tourRun';

export const TAB_ICONS = {
  Home: 'book',
  Calendar: 'calendar',
  Eventbrite: 'ticket',
  Community: 'chatbubbles',
};
const CENTER = 'Brainstorm';
const CIRCLE = 46;

export default function BottomBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  // The app tour's "tap each tab" step: a ✓ on each tab you've opened.
  const run = useRun();
  const seen = isTourTarget('tabbar', run) ? run.data?.seen || {} : null;
  return (
    <TourTarget id="tabbar" style={[s.bar, { paddingBottom: Math.max(insets.bottom - 4, 8) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const color = focused ? colors.royalDeep : colors.tabIdle;

        function onPress() {
          tourEvent('tab', route.name);
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        }
        function onLongPress() {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        }

        const center = route.name === CENTER;
        return (
          <TourTarget key={route.key} id={`tab.${route.name}`} style={s.slot}>
          <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            style={s.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
          >
            {center ? (
              <View style={s.circleWrap} pointerEvents="none">
                <LinearGradient colors={gradients.button} style={s.circle}>
                  <Ionicons name="pencil" size={21} color="#FFFFFF" />
                </LinearGradient>
              </View>
            ) : (
              <View style={s.iconBox}>
                <Ionicons name={TAB_ICONS[route.name] || 'ellipse'} size={focused ? 23 : 22} color={color} />
              </View>
            )}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={1.15}
              style={[s.label, { color }, focused && s.labelOn]}
            >
              {label}
            </Text>
            <View style={[s.mark, focused && s.markOn]} />
            {seen && seen[route.name] ? (
              <View style={[s.seen, center && { right: '18%', top: -6 }]} pointerEvents="none">
                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
              </View>
            ) : null}
          </Pressable>
          </TourTarget>
        );
      })}
    </TourTarget>
  );
}

const s = themed(() => ({
  bar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.line,
    paddingTop: 8,
  },
  slot: { flex: 1 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', minHeight: 52 },
  iconBox: { height: CIRCLE, alignItems: 'center', justifyContent: 'center' },
  circleWrap: {
    // Every tab's icon sits in a box as tall as the circle, so the circle is
    // fully inside the bar and all five labels line up.
    width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2,
    shadowColor: colors.royalDeep, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  circle: { width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10.5, fontWeight: '600', marginTop: 3, textAlign: 'center', width: '100%', paddingHorizontal: 1 },
  labelOn: { fontWeight: '800' },
  mark: { width: 22, height: 3, borderRadius: 2, marginTop: 4, backgroundColor: 'transparent' },
  markOn: { backgroundColor: colors.royalDeep },
  seen: { position: 'absolute', top: -2, right: '24%', width: 16, height: 16, borderRadius: 8, backgroundColor: '#1E9E50', alignItems: 'center', justifyContent: 'center' },
}));
