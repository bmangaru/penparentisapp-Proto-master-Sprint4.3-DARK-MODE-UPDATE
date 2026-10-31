// components/DonorCrawl.js — the scrolling donor banner.

import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { colors, themed } from '../theme';
import { DONORS } from '../donors';

const SPEED = 40;

export default function DonorCrawl() {
  const x = useRef(new Animated.Value(0)).current;
  const [rowWidth, setRowWidth] = useState(0);

  useEffect(() => {
    if (!rowWidth) return;
    x.setValue(0);
    const loop = Animated.loop(
      Animated.timing(x, { toValue: -rowWidth, duration: (rowWidth / SPEED) * 1000, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [rowWidth]);

  // Every funder, then round again ("Thank you to all of our supporters" sits
  // above the scroll on Home). Each name is its own piece of text: one very
  // long line can be too wide for the phone to draw.
  const parts = DONORS;
  const copy = (key, measure) => (
    <View key={key} style={s.row} onLayout={measure ? (e) => setRowWidth(e.nativeEvent.layout.width) : undefined}>
      {parts.map((p, i) => <Text key={i} style={s.text} numberOfLines={1}>{p}{'   ·   '}</Text>)}
    </View>
  );

  return (
    <View style={s.wrap}>
      <Animated.View style={[s.track, { transform: [{ translateX: x }] }]}>
        {copy('a', true)}
        {copy('b', false)}
      </Animated.View>
    </View>
  );
}

const s = themed(() => ({
  wrap: { height: 34, backgroundColor: colors.ink, overflow: 'hidden', justifyContent: 'center' },
  // The moving strip sits on its own (absolute), so it's as long as the list
  // instead of being squeezed to the screen's width; the two copies of the
  // list then sit end to end instead of on top of each other.
  track: { position: 'absolute', left: 0, flexDirection: 'row' },
  row: { flexDirection: 'row', flexShrink: 0 },
  text: { color: '#F0E6D2', fontSize: 11.5, flexShrink: 0 },
}));