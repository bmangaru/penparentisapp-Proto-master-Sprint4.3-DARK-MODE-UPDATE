// components/LinkButtons.js — pieces shared by the Eventbrite, Calendar and Community tabs.
//   • BrandButton: a button with a service's mark, tinted in that service's own
//     colour so it stands out from the cream page (brand="youtube" | "spotify"
//     | "discord" | "facebook"; no brand = plain white).
//   • ToggleCard: a white card with a title, a line of text and a switch.
//   • DeniedNote: "Notifications are off for this app · Open Settings".

import React from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import { colors, lift, radius, themed, tone } from '../theme';
import { openPhoneSettings } from '../eventActions';

export const YT_RED = '#FF0000';
export const SPOTIFY_GREEN = '#1DB954';
export const DISCORD_BLURPLE = '#5865F2';
export const FACEBOOK_BLUE = '#1877F2';

// A soft wash of each brand's colour, with a matching edge.
const TINT = {
  youtube: { backgroundColor: '#FFEDED', borderColor: '#F7B4B4' },
  spotify: { backgroundColor: '#E7F8EE', borderColor: '#A6E3BE' },
  discord: { backgroundColor: '#EEF0FF', borderColor: '#C3C8FB' },
  facebook: { backgroundColor: '#E9F2FE', borderColor: '#ADCDF8' },
  instagram: { backgroundColor: '#FDEBF3', borderColor: '#F4B3CF' },
  linkedin: { backgroundColor: '#E4F5F2', borderColor: '#93D4C9' },   // teal
  x: { backgroundColor: '#F1F1F2', borderColor: '#C9CBD1' },
  bluesky: { backgroundColor: '#E2F6FD', borderColor: '#8FD6F0' },    // sky
};

export function BrandButton({ icon, label, sub, onPress, live, brand }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.brand, brand && tone(TINT[brand]), live && s.brandLive, pressed && { opacity: 0.85 }]}
      accessibilityRole="link"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
    >
      {icon}
      <Text style={[s.brandText, live && tone({ color: '#B3261E' })]}>{label}</Text>
      {sub ? <Text style={s.brandSub}>· {sub}</Text> : null}
    </Pressable>
  );
}

export function ToggleCard({ title, sub, value, onChange }) {
  return (
    <View style={[s.toggle, lift]}>
      <View style={{ flex: 1 }}>
        <Text style={s.toggleTitle}>{title}</Text>
        <Text style={s.toggleSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.royal, false: '#C8CEDE' }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#C8CEDE"
        accessibilityLabel={title}
      />
    </View>
  );
}

export function DeniedNote() {
  return (
    <View style={s.denied}>
      <Text style={s.deniedText}>Notifications are off for this app.</Text>
      <Pressable onPress={openPhoneSettings} hitSlop={6}>
        <Text style={s.deniedLink}>Open Settings</Text>
      </Pressable>
    </View>
  );
}

const s = themed(() => ({
  brand: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: '#D9DEEA', backgroundColor: '#FFFFFF', paddingHorizontal: 12,
  },
  brandLive: { backgroundColor: '#FDE7E7', borderColor: '#F3B7B7' },
  brandText: { fontSize: 14, fontWeight: '700', color: colors.ink },
  brandSub: { fontSize: 12, fontWeight: '600', color: colors.muted },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 14 },
  toggleTitle: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
  toggleSub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  denied: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: '#FDECEA', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  deniedText: { flex: 1, fontSize: 12.5, color: '#8C1D18' },
  deniedLink: { fontSize: 12.5, fontWeight: '700', color: colors.royal },
}));
