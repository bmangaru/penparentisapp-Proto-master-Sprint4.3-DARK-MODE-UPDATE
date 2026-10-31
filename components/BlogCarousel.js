// components/BlogCarousel.js — Home's "From the blog": the newest posts from
// penparentis.org as cards you swipe through (picture, date, title, first
// line). Tapping one opens the post inside the app (✕ / Done to come back,
// with a button to open it in Safari); "See all ›" opens the whole blog.

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, ActivityIndicator, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { colors, isDark, radius, themed } from '../theme';
import { BLOG_URL, loadBlog, postDate } from '../blogService';

const CARD_W = 250;
const GAP = 10;

export function openPost(url) {
  WebBrowser.openBrowserAsync(url, {
    toolbarColor: isDark() ? '#0D1324' : '#FFFDF8',
    controlsColor: isDark() ? '#9DB4FF' : '#1B3FA0',
    presentationStyle: WebBrowser.WebBrowserPresentationStyle?.PAGE_SHEET,
  }).catch(() => Linking.openURL(url).catch(() => {}));
}

export default function BlogCarousel() {
  const [posts, setPosts] = useState(null); // null = loading
  const [i, setI] = useState(0);
  useEffect(() => {
    let live = true;
    loadBlog().then((r) => live && setPosts(r.posts));
    return () => { live = false; };
  }, []);

  // Nothing to show (offline on first run): leave the section out.
  if (posts && !posts.length) return null;

  return (
    <View>
      <View style={s.head}>
        <Text style={s.h}>From the blog</Text>
        <Pressable onPress={() => openPost(BLOG_URL)} hitSlop={8} accessibilityRole="link" accessibilityLabel="See all blog posts">
          <Text style={s.all}>See all ›</Text>
        </Pressable>
      </View>

      {!posts ? (
        <View style={s.loading}><ActivityIndicator color={colors.royal} /></View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_W + GAP}
            decelerationRate="fast"
            contentContainerStyle={{ gap: GAP, paddingRight: 22 }}
            style={s.scroller}
            onScroll={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / (CARD_W + GAP)))}
            scrollEventThrottle={32}
          >
            {posts.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => openPost(p.url)}
                style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}
                accessibilityRole="link"
                accessibilityLabel={`${p.title}. ${postDate(p.date)}`}
              >
                {p.image ? (
                  <Image source={{ uri: p.image }} style={s.img} resizeMode="cover" accessibilityIgnoresInvertColors />
                ) : (
                  <View style={[s.img, s.noImg]}>
                    <Image source={require('../assets/pen-parentis-logo.png')} style={s.noImgLogo} resizeMode="contain" />
                  </View>
                )}
                {p.date ? <Text style={s.date}>{postDate(p.date)}</Text> : null}
                <Text style={s.title} numberOfLines={2}>{p.title}</Text>
                {p.excerpt ? <Text style={s.excerpt} numberOfLines={3}>{p.excerpt}</Text> : null}
              </Pressable>
            ))}
          </ScrollView>
          {posts.length > 1 ? (
            <View style={s.dots}>
              {posts.map((p, k) => <View key={p.id} style={[s.dot, k === Math.min(i, posts.length - 1) && s.dotOn]} />)}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const s = themed(() => ({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  h: { fontSize: 17, fontWeight: '700', color: colors.ink },
  all: { fontSize: 13, fontWeight: '800', color: colors.royal },
  scroller: { marginRight: -22 },
  loading: { height: 220, alignItems: 'center', justifyContent: 'center' },
  card: { width: CARD_W, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 10 },
  img: { width: '100%', height: 120, borderRadius: 10, backgroundColor: '#E6ECFA' },
  noImg: { alignItems: 'center', justifyContent: 'center' },
  noImgLogo: { width: 70, height: 60, borderRadius: 8 },
  date: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, color: '#8A5E12', marginTop: 8 },
  title: { fontSize: 15, fontWeight: '800', color: colors.ink, marginTop: 2, lineHeight: 20 },
  excerpt: { fontSize: 12.5, lineHeight: 18, color: colors.muted, marginTop: 3 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#C8CEDE' },
  dotOn: { width: 18, backgroundColor: colors.royal },
}));
