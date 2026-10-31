// components/BlogCarousel.js — Home's "From the blog": the newest posts from
// penparentis.org as full-width cards (big picture, date, title, a few lines)
// that take turns every 10 s; swipe or tap ‹ ›. Tapping one opens the post inside the app (✕ / Done to come back,
// with a button to open it in Safari); "See all ›" opens the whole blog.

import React, { useEffect, useState } from 'react';
import Cycler from './Cycler';
import { tourEvent } from '../tourRun';
import { View, Text, Pressable, Image, ActivityIndicator, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { colors, isDark, radius, themed } from '../theme';
import { BLOG_URL, loadBlog, postDate } from '../blogService';


export function openPost(url) {
  WebBrowser.openBrowserAsync(url, {
    toolbarColor: isDark() ? '#0D1324' : '#FFFDF8',
    controlsColor: isDark() ? '#9DB4FF' : '#1B3FA0',
    presentationStyle: WebBrowser.WebBrowserPresentationStyle?.PAGE_SHEET,
  }).catch(() => Linking.openURL(url).catch(() => {}));
}

export default function BlogCarousel() {
  const [posts, setPosts] = useState(null); // null = loading
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
        // Full-width cards that take turns every 10 s; swipe, or tap ‹ ›.
        <Cycler arrows tourId="blog" onIndex={(k) => tourEvent('blog-index', k)}>
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
              <View style={s.body}>
                {p.date ? <Text style={s.date}>{postDate(p.date)}</Text> : null}
                <Text style={s.title} numberOfLines={2}>{p.title}</Text>
                {p.excerpt ? <Text style={s.excerpt} numberOfLines={4}>{p.excerpt}</Text> : null}
                <Text style={s.read}>Read post ›</Text>
              </View>
            </Pressable>
          ))}
        </Cycler>
      )}
    </View>
  );
}

const s = themed(() => ({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  h: { fontSize: 17, fontWeight: '700', color: colors.ink },
  all: { fontSize: 13, fontWeight: '800', color: colors.royal },
  loading: { height: 300, alignItems: 'center', justifyContent: 'center' },
  // flex: 1 so every card is as tall as the tallest one.
  card: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, overflow: 'hidden' },
  img: { width: '100%', height: 190, backgroundColor: '#E6ECFA' },
  noImg: { alignItems: 'center', justifyContent: 'center' },
  noImgLogo: { width: 100, height: 86, borderRadius: 10 },
  body: { padding: 14, paddingTop: 10 },
  date: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, color: '#8A5E12' },
  title: { fontSize: 17, fontWeight: '800', color: colors.ink, marginTop: 3, lineHeight: 22 },
  excerpt: { fontSize: 13.5, lineHeight: 19.5, color: colors.muted, marginTop: 4 },
  read: { fontSize: 13, fontWeight: '800', color: colors.royal, marginTop: 8 },
}));
