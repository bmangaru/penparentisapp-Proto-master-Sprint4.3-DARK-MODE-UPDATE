// screens/HomeScreen.js — Home.
//   • Blue banner: "Pen Parentis · parenting done, write." with ⚙ Settings.
//   • From the blog: the newest posts from penparentis.org (components/BlogCarousel.js).
//   • Follow Pen Parentis: Facebook, Instagram, LinkedIn, X and Bluesky as
//     brand buttons (same style as Discord / YouTube / Spotify), each with its
//     handle.
//   • Visit penparentis.org (with the Pen Parentis logo), then Get Karma.
//   • "Thank you to all of our supporters" over the donor scroll.
// (Today's goal and Today's prompt live on Brainstorm and Calendar.)

import React, { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { Screen, Header, openLink } from '../components/ui';
import SettingsSheet from '../components/SettingsSheet';
import { BrandButton } from '../components/LinkButtons';
import { takeSettingsOpen } from '../appearance';
import DonorCrawl from '../components/DonorCrawl';
import BlogCarousel from '../components/BlogCarousel';
import { colors, lift, radius, space, themed } from '../theme';
import { LINKS } from '../links';

// X's mark and Bluesky's butterfly (not in the icon font), drawn as paths.
function XMark({ size = 15, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill={color} d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </Svg>
  );
}
function Butterfly({ size = 17, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size * (530 / 600)} viewBox="0 0 600 530">
      <Path fill={color} d="M135.72 44.03C202.216 93.951 273.74 195.17 300 249.49c26.262-54.316 97.782-155.54 164.28-205.46C512.26 8.009 590-19.862 590 68.825c0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.38-3.69-10.832-3.708-7.896-.017-2.936-1.193.516-3.707 7.896-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.45-163.25-81.433C20.15 217.613 9.997 86.535 9.997 68.825c0-88.687 77.742-60.816 125.72-24.795z" />
    </Svg>
  );
}

// A small rounded square in the brand's colour holding its mark.
function Mark({ bg, children }) {
  return <View style={[s.mark, { backgroundColor: bg }]}>{children}</View>;
}

const SOCIALS = [
  { brand: 'facebook', label: 'Facebook', handle: '@PenParentis', url: LINKS.facebook, icon: <Mark bg="#1877F2"><Ionicons name="logo-facebook" size={16} color="#FFFFFF" /></Mark> },
  { brand: 'instagram', label: 'Instagram', handle: '@penparentis', url: LINKS.instagram, icon: <Mark bg="#DD2A7B"><Ionicons name="logo-instagram" size={16} color="#FFFFFF" /></Mark> },
  { brand: 'linkedin', label: 'LinkedIn', handle: 'Pen Parentis', url: LINKS.linkedin, icon: <Mark bg="#0A66C2"><Ionicons name="logo-linkedin" size={15} color="#FFFFFF" /></Mark> },
  { brand: 'x', label: 'X', handle: '@penparentis', url: LINKS.x, icon: <Mark bg="#000000"><XMark /></Mark> },
  { brand: 'bluesky', label: 'Bluesky', handle: '@penparentis.bsky.social', url: LINKS.bluesky, icon: <Mark bg="#1185FE"><Butterfly /></Mark> },
];

export default function HomeScreen() {
  // ⚙ Settings.
  const [settingsOpen, setSettingsOpen] = useState(takeSettingsOpen);

  return (
    <Screen>
      <Header
        title="Pen Parentis"
        subtitle="parenting done, write."
        right={(
          <Pressable onPress={() => setSettingsOpen(true)} hitSlop={6} style={s.settings} accessibilityRole="button" accessibilityLabel="Settings">
            <Ionicons name="settings-outline" size={14} color="#F2C14E" />
            <Text style={s.settingsText}>Settings</Text>
          </Pressable>
        )}
      />

      <View style={s.pad}>
        <BlogCarousel />

        <Text style={[s.h, { marginTop: space.md }]}>Follow Pen Parentis</Text>
        {SOCIALS.map((n) => (
          <BrandButton key={n.brand} brand={n.brand} icon={n.icon} label={n.label} sub={n.handle} onPress={() => openLink(n.url)} />
        ))}

        <Pressable onPress={() => openLink(LINKS.website)} style={({ pressed }) => [s.web, pressed && { opacity: 0.85 }]} accessibilityRole="link" accessibilityLabel="Visit penparentis.org">
          <Image source={require('../assets/pen-parentis-logo.png')} style={s.webLogo} resizeMode="cover" accessibilityIgnoresInvertColors />
          <Text style={s.webText}>Visit penparentis.org</Text>
          <Ionicons name="arrow-up-outline" size={16} color={colors.royal} style={{ transform: [{ rotate: '45deg' }] }} />
        </Pressable>

        <Pressable onPress={() => openLink(LINKS.donate)}>
          <LinearGradient
            colors={[colors.karmaLight, colors.karma]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.karma, lift]}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.karmaTitle}>Get Karma</Text>
              <Text style={s.karmaSub}>Keep the salons free for the next parent</Text>
            </View>
            <View style={s.give}><Text style={s.giveText}>Give</Text></View>
          </LinearGradient>
        </Pressable>

        <Text style={s.thanks}>THANK YOU TO ALL OF OUR SUPPORTERS</Text>
      </View>

      <DonorCrawl />

      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Screen>
  );
}

const s = themed(() => ({
  // Same look and spot as Brainstorm's "✦ Show prompt".
  settings: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(242,193,78,0.55)', borderRadius: 999, paddingHorizontal: 10, minHeight: 30 },
  settingsText: { color: '#F2C14E', fontSize: 12, fontWeight: '700' },
  pad: { padding: space.lg, paddingTop: space.md, gap: 9 },
  h: { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 2 },
  mark: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  web: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: space.sm,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#B9C6E8', borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12,
  },
  webLogo: { width: 46, height: 40, borderRadius: 8 },
  webText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  karma: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, padding: 16, marginTop: space.xs },
  karmaTitle: { fontSize: 17, fontWeight: '700', color: '#231702' },
  karmaSub: { fontSize: 11.5, color: 'rgba(35,23,2,0.82)' },
  give: { backgroundColor: colors.ink, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 15 },
  giveText: { color: colors.cream, fontWeight: '700', fontSize: 13 },
  thanks: { textAlign: 'center', fontSize: 11.5, fontWeight: '800', letterSpacing: 1, color: colors.muted, marginTop: space.md },
}));
