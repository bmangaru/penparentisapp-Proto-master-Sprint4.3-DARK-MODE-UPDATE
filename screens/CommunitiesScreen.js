// screens/CommunitiesScreen.js — the Community tab.
//   • Join the Pen Parentis Discord / Join the Facebook group: buttons with each
//     service's logo, tinted in its own colour (same style as YouTube / Spotify).
//   • Accountability groups: one paragraph starting with "Requires sustaining
//     membership at the All-Access level." in bold gold, then the sponsor's Airtable, shown live inside the page
//     exactly as Airtable draws it ("Open ↗" opens the full view), with a short
//     description. It replaced the old "Find a weekly accountability group"
//     button, which linked to it.
//   • Credits at the very bottom, like the end of a film (text only, no logo): Pace University,
//     led by, facilitated by, and the developers of the app.

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Header, openLink } from '../components/ui';
import { colors, lift, radius, space, themed, dk, isDark } from '../theme';
import { LINKS } from '../links';
import { BrandButton, DISCORD_BLURPLE, FACEBOOK_BLUE } from '../components/LinkButtons';

const TABLE_HEIGHT = 540;

export default function CommunitiesScreen() {
  return (
    <Screen>
      <Header title="Community" subtitle="The National Writer-Parent Hub" />
      <View style={s.pad}>
        <Text style={s.h}>There's almost always someone up</Text>
        <Text style={s.p}>
          Our Discord runs around the clock: accountability groups, residency tips, and a
          channel for the 4am feed shift. Free to join, no meetings, no hierarchy.
        </Text>

        <BrandButton
          brand="discord"
          icon={<View style={[s.mark, { backgroundColor: DISCORD_BLURPLE }]}><Ionicons name="logo-discord" size={17} color="#FFFFFF" /></View>}
          label="Join the Pen Parentis Discord"
          onPress={() => openLink(LINKS.discord)}
        />
        <BrandButton
          brand="facebook"
          icon={<Ionicons name="logo-facebook" size={24} color={FACEBOOK_BLUE} />}
          label="Join the Facebook group"
          onPress={() => openLink(LINKS.facebookGroup)}
        />

        <View style={s.secRow}>
          <Text style={s.sec}>Accountability groups</Text>
          <Pressable onPress={() => openLink(LINKS.cycleOfSupport)} hitSlop={8} accessibilityRole="link" accessibilityLabel="Open the accountability groups in Airtable">
            <Text style={s.open}>Open ↗</Text>
          </Pressable>
        </View>
        <Text style={[s.p, { marginBottom: 8 }]}>
          <Text style={s.req}>Requires sustaining membership at the All-Access level.</Text>
          {' '}Guided goal-setting in a small group of writers who are also parents. Choose a group by
          when you're free, with a 12-week minimum participation. Times are listed in each group's own
          time zone, so do your own time-zone math.
        </Text>
        <AirtableView />

        <Credits />
      </View>
    </Screen>
  );
}

// Dark mode for the Airtable page (it has no dark version of its own):
// invert the page and turn the hues back, re-invert images so photos look
// right, then lay a navy tint over it with 'screen' so black turns navy and
// white text stays white. Touches nothing in the app itself.
const DARK_AIRTABLE = `(function(){
  var css = 'html{background:#1A1A1A}body{filter:invert(0.9) hue-rotate(180deg);background:#fff;min-height:100vh}'
    + 'img,video,picture,svg image,[style*="background-image"]{filter:invert(1) hue-rotate(180deg)}'
    + 'html::after{content:"";position:fixed;inset:0;background:rgb(8,16,52);mix-blend-mode:screen;pointer-events:none;z-index:2147483647}';
  function add(){ if(document.getElementById('pp-dark'))return; var st=document.createElement('style'); st.id='pp-dark'; st.textContent=css; (document.head||document.documentElement).appendChild(st); }
  add(); document.addEventListener('DOMContentLoaded', add);
})(); true;`;

// The sponsor's shared Airtable view, live. Airtable's embed page draws the
// table; we show a spinner until it's ready, and a way out if it can't load.
function AirtableView() {
  const [state, setState] = useState('loading'); // 'loading' | 'ready' | 'error'
  const embed = airtableEmbedUrl(LINKS.cycleOfSupport);
  if (state === 'error' || !embed) {
    return (
      <View style={[s.table, s.tableError]}>
        <Ionicons name="cloud-offline-outline" size={22} color={colors.muted} />
        <Text style={s.errorText}>Couldn't load the table here.</Text>
        <Pressable onPress={() => openLink(LINKS.cycleOfSupport)} style={s.errorBtn} accessibilityRole="link">
          <Text style={s.errorBtnText}>Open it in Airtable ↗</Text>
        </Pressable>
        <Pressable onPress={() => setState('loading')} hitSlop={8} accessibilityRole="button">
          <Text style={s.retry}>Try again</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={[s.table, lift]}>
      <WebView
        source={{ uri: embed }}
        style={{ flex: 1, backgroundColor: dk('#FFFFFF', '#14182A') }}
        // Airtable has no dark embed, so in dark mode we darken its page:
        // flip the colours (pictures are flipped back), then a navy wash.
        injectedJavaScriptBeforeContentLoaded={isDark() ? DARK_AIRTABLE : undefined}
        injectedJavaScript={isDark() ? DARK_AIRTABLE : undefined}
        nestedScrollEnabled // scroll the table without scrolling the page (Android)
        onLoadEnd={() => setState((v) => (v === 'error' ? v : 'ready'))}
        onError={() => setState('error')}
        onHttpError={() => setState('error')}
        // Links inside the table (e.g. a website in a row) open in the browser.
        onShouldStartLoadWithRequest={(req) => {
          const inside = req.url.startsWith('https://airtable.com/') || req.url.startsWith('about:') || req.url.startsWith('data:');
          if (!inside && req.navigationType === 'click') { openLink(req.url); return false; }
          return true;
        }}
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures={false}
        {...(Platform.OS === 'ios' ? { contentInsetAdjustmentBehavior: 'never' } : {})}
      />
      {state === 'loading' && (
        <View style={s.loading} pointerEvents="none">
          <ActivityIndicator color={colors.royal} />
          <Text style={s.loadingText}>Loading the accountability groups…</Text>
        </View>
      )}
    </View>
  );
}

// The credits, centred like the end of a film.
const CREDITS = {
  ledBy: { name: 'Dr. Li-Chiou Chen', role: 'Professor, Interim Dean' },
  facilitatedBy: { name: 'Dr. Tom Schmidt', role: 'Clinical Assistant Professor' },
  developers: ['Brian Mangaru', 'Rony Castillo', 'Rafael Mendoza', 'Nala Hamer'],
};

function Credits() {
  return (
    <View style={s.credits} accessibilityRole="summary">
      <View style={s.rule} />
      <Text style={s.kicker}>CREDITS</Text>
      <Text style={[s.school, { marginTop: 12 }]}>Pace University</Text>
      <Text style={s.dept}>Seidenberg School of Computer Science{'\n'}and Information Systems</Text>

      <Text style={[s.kicker, s.group]}>LED BY</Text>
      <Text style={s.person}>{CREDITS.ledBy.name}</Text>
      <Text style={s.role}>{CREDITS.ledBy.role}</Text>

      <Text style={[s.kicker, s.group]}>FACILITATED BY</Text>
      <Text style={s.person}>{CREDITS.facilitatedBy.name}</Text>
      <Text style={s.role}>{CREDITS.facilitatedBy.role}</Text>

      <Text style={[s.kicker, s.group]}>DEVELOPERS OF THE APP</Text>
      {CREDITS.developers.map((n) => <Text key={n} style={s.dev}>{n}</Text>)}

      <Text style={s.thanks}>Built for Pen Parentis with care.</Text>
    </View>
  );
}

// https://airtable.com/<app>/<shr…>/<tbl…>  →  https://airtable.com/embed/<app>/<shr…>
export function airtableEmbedUrl(shareUrl) {
  const m = String(shareUrl || '').match(/airtable\.com\/(app[\w]+)\/(shr[\w]+)/);
  return m ? `https://airtable.com/embed/${m[1]}/${m[2]}?backgroundColor=blue&viewControls=on` : null;
}

const s = themed(() => ({
  pad: { padding: space.lg, gap: 10 },
  h: { fontSize: 17, fontWeight: '700', color: colors.ink },
  p: { fontSize: 13.5, lineHeight: 20, color: colors.body, marginBottom: 4 },
  // Accountability groups: the membership requirement, seen first.
  req: { fontWeight: '800', color: '#8A5E12' },

  mark: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },

  credits: { alignItems: 'center', marginTop: space.lg, paddingBottom: space.lg },
  rule: { alignSelf: 'stretch', height: 1, backgroundColor: colors.line, marginBottom: 22 },
  kicker: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, color: colors.muted },
  group: { marginTop: 22, marginBottom: 4 },
  school: { fontSize: 15.5, fontWeight: '700', color: colors.ink },
  dept: { fontSize: 13, lineHeight: 19, color: colors.body, textAlign: 'center', marginTop: 2 },
  person: { fontSize: 15, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  role: { fontSize: 12.5, color: colors.muted, marginTop: 1 },
  dev: { fontSize: 14.5, fontWeight: '600', color: colors.ink, lineHeight: 26 },
  thanks: { fontSize: 12, fontStyle: 'italic', color: colors.muted, marginTop: 20 },

  secRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.md },
  sec: { fontSize: 16, fontWeight: '700', color: colors.ink },
  open: { fontSize: 13, fontWeight: '800', color: colors.royal },

  table: { height: TABLE_HEIGHT, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFFFFF' },
  loadingText: { fontSize: 12.5, color: colors.muted },
  tableError: { height: 200, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  errorText: { fontSize: 13, color: colors.body },
  errorBtn: { borderWidth: 1.5, borderColor: colors.royal, borderRadius: radius.md, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  errorBtnText: { fontSize: 13, fontWeight: '700', color: colors.royal },
  retry: { fontSize: 12.5, fontWeight: '700', color: colors.muted },
}));
