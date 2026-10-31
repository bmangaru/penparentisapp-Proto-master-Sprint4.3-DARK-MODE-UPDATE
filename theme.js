// theme.js — the single source of truth for colour and spacing, in a light
// and a dark version (Settings → Appearance: System / Light / Dark).
//
// How dark mode works, so screens don't need two sets of styles:
//   • `colors` holds the current palette. applyScheme('dark') swaps its values
//     (ink becomes light, paper becomes deep navy, royal becomes a softer blue
//     for links…), and rebuilds `gradients`.
//   • Every screen's styles are made with themed(() => ({ … })) instead of
//     StyleSheet.create({ … }). They're rebuilt after a switch, and in dark
//     mode the light-only colours typed into them (white cards, pale tints,
//     grey lines, dark-brown text…) are swapped for their dark versions by
//     the tables below, per property, so white TEXT on blue stays white.
//   • App.js redraws the whole app when the scheme changes.
// Change colours here, not in the screens.

import { StyleSheet } from 'react-native';

const LIGHT = {
  royal: '#1B3FA0',
  royalLight: '#2449B4',   // top of button gradients
  royalDeep: '#0C2265',
  ink: '#0A1633',
  cream: '#F6EADA',
  creamDeep: '#E8D6B8',
  paper: '#FFFDF8',
  karma: '#C8912B',
  karmaLight: '#E0AE45',
  muted: '#5A6484',
  body: '#2A3352',
  line: 'rgba(10,22,51,0.13)',
  tabIdle: '#7B8399',
  card: '#FFFFFF',
};

const DARK = {
  royal: '#9DB4FF',        // as text / links / outlines; as a background it becomes BUTTON_BLUE
  royalLight: '#4A6BE0',
  royalDeep: '#C9D5FF',    // as text (deep navy on light); gradients use their own dark blues
  ink: '#EEF1F8',
  cream: '#2A2618',
  creamDeep: '#4A3F25',
  paper: '#0D1324',
  karma: '#C8912B',
  karmaLight: '#E0AE45',
  muted: '#93A0C2',
  body: '#C9D1E6',
  line: 'rgba(255,255,255,0.12)',
  tabIdle: '#A3AECB',
  card: '#18213A',
};

const BUTTON_BLUE = '#3352C4';
// Text that sits on gold or white keys and must stay dark in both schemes.
export const ON_GOLD = '#0A1634';

export const colors = { ...LIGHT };
export const gradients = {};
export let scheme = 'light';
let version = 0;

function rebuild() {
  const dark = scheme === 'dark';
  gradients.header = dark ? ['#1A3489', '#0A1A4A'] : [LIGHT.royal, LIGHT.royalDeep];
  gradients.button = dark ? ['#4A6BE0', BUTTON_BLUE] : [LIGHT.royalLight, LIGHT.royal];
  gradients.gold = [LIGHT.karmaLight, LIGHT.karma];
  gradients.card = dark ? ['#18213A', '#141B30'] : [LIGHT.paper, LIGHT.cream];
}
rebuild();

// 'light' | 'dark'. Call before the app redraws.
export function applyScheme(name) {
  const next = name === 'dark' ? 'dark' : 'light';
  if (next === scheme && version > 0) return;
  scheme = next;
  Object.assign(colors, next === 'dark' ? DARK : LIGHT);
  rebuild();
  version += 1;
}
export const isDark = () => scheme === 'dark';
// For the odd inline colour: dk('#FFF4D6', '#2E2817').
export const dk = (light, dark) => (scheme === 'dark' ? dark : light);

// ---------------------------------------------------------------------------
// Dark versions of colours typed straight into styles. Keys are upper-case.
// ---------------------------------------------------------------------------
const LINE_DK = 'rgba(255,255,255,0.12)';
const BG_DARK = {
  '#FFFFFF': '#18213A', '#FFF': '#18213A',
  // pale blues → deep blue tint
  '#E6ECFA': '#22305A', '#EEF1F7': '#1F2945', '#DCE4F7': '#2A3A6A', '#E8EBF2': '#1F2945', '#F5F7FD': '#1C2541',
  '#F2F5FD': '#1F2A4C', '#EEF2FB': '#1F2A4C', '#F7F8FB': '#1C2541', '#F6F7FA': '#1C2541', '#F3F5FA': '#1C2541',
  '#E3E9F8': '#22305A', '#EEF0FF': '#252B5C', '#E9F2FE': '#1A2B48',
  // pale golds / creams → deep gold tint
  '#FFF8E6': '#2E2817', '#FFF4D6': '#2E2817', '#FFF6DF': '#2E2817', '#F1EDE3': '#111829', '#FFFBEF': '#2E2817',
  // pale greens / reds / violets
  '#EEF8F1': '#173225', '#E7F8EE': '#173225', '#E6F6EA': '#173225', '#FDECEA': '#3A1E22', '#FDE7E7': '#3A1E22',
  '#FFEDED': '#3A1E22', '#F7F5FF': '#231F45',
  // brand tints: Instagram, LinkedIn, X, Bluesky
  '#FDEBF3': '#3A1E2E', '#E8F1FA': '#1A2B48', '#F1F1F2': '#22262F', '#E6F1FF': '#1A2B48',
  '#F4B3CF': '#6B2E4A', '#A9CBEA': '#2D4E80', '#C9CBD1': '#4A4E58', '#A8CDFB': '#2D4E80',
  // greys used for tracks, lines and input edges
  '#ECEEF3': LINE_DK, '#EEF0F5': LINE_DK, '#D9DEEA': LINE_DK, '#D7DDEA': LINE_DK, '#D5DAE4': LINE_DK,
  '#CBD1DC': LINE_DK, '#C8CEDE': 'rgba(255,255,255,0.22)', '#E2DCCB': LINE_DK, '#D9DDE7': 'rgba(255,255,255,0.22)',
  // edges of tinted buttons
  '#F0D48A': '#6B5622', '#F7B4B4': '#6B2E33', '#F3B7B7': '#6B2E33', '#A6E3BE': '#2C6A47', '#ADCDF8': '#2D4E80',
  '#C3C8FB': '#3B4290', '#B9C6E8': '#3A4A78', '#9FB0DA': '#3A4A78', '#EAD9B6': '#5A4A26',
  // dark-palette tokens used as backgrounds
  [DARK.royal]: BUTTON_BLUE, [DARK.ink]: '#26314F', [DARK.body]: '#26314F', [DARK.royalDeep]: '#9DB4FF',
  'RGBA(10,22,51,0.22)': 'rgba(255,255,255,0.28)', 'RGBA(10,22,51,0.2)': 'rgba(255,255,255,0.22)', 'RGBA(10,22,51,0.18)': 'rgba(255,255,255,0.2)',
  'RGBA(10,22,51,0.13)': LINE_DK, 'RGBA(10,22,51,0.07)': 'rgba(255,255,255,0.06)', 'RGBA(10,22,51,0.08)': 'rgba(255,255,255,0.07)',
};
const TEXT_DARK = {
  '#8A5E12': '#E7B85A', '#7A5208': '#E7B85A', '#5C4A2A': '#E0CFA6', '#3D2A05': '#E7B85A', '#8A4F1E': '#E0A57A',
  '#4F5878': '#A7B2CF', '#4A5366': '#B5BDD0', '#2A3352': '#C9D1E6', '#0A1633': '#EEF1F8',
  '#B3261E': '#FF8A80', '#8C1D18': '#FF8A80', '#1E7B3A': '#6FD49A', '#1E5E33': '#6FD49A', '#237F54': '#6EE0A8',
  '#4B3FB8': '#B7AAFF', '#0C2265': '#C9D5FF', '#B07A1C': '#F2C14E', '#3C8BBF': '#9AD8FF',
  // light-palette tokens that are only right on blue (text on headers)
  [DARK.cream]: '#F6EADA', [DARK.paper]: '#FFFDF8', [DARK.creamDeep]: '#E8D6B8',
};
const BG_KEYS = ['backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor'];
const TEXT_KEYS = ['color', 'textDecorationColor', 'tintColor'];

function darken(style) {
  if (!style || typeof style !== 'object') return style;
  const out = { ...style };
  for (const k of BG_KEYS) {
    const v = out[k];
    if (typeof v === 'string') { const m = BG_DARK[v.toUpperCase().replace(/\s/g, '')]; if (m) out[k] = m; }
  }
  // Navy shadows would glow on a navy page: use a plain dark shadow.
  if (typeof out.shadowColor === 'string' && [DARK.royalDeep, '#0A1633', '#0C2265'].includes(out.shadowColor.toUpperCase())) out.shadowColor = '#000000';
  for (const k of TEXT_KEYS) {
    const v = out[k];
    if (typeof v === 'string') { const m = TEXT_DARK[v.toUpperCase()]; if (m) out[k] = m; }
  }
  return out;
}

// Use instead of StyleSheet.create: const s = themed(() => ({ … }));
// The styles are made on first use, and again after the scheme changes.
export function themed(factory) {
  let cache = null;
  let made = -1;
  const get = () => {
    if (made !== version) {
      const raw = factory();
      const styles = scheme === 'dark'
        ? Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, darken(v)]))
        : raw;
      cache = StyleSheet.create(styles);
      made = version;
    }
    return cache;
  };
  return new Proxy({}, {
    get: (_, key) => get()[key],
    has: (_, key) => key in get(),
    ownKeys: () => Reflect.ownKeys(get()),
    getOwnPropertyDescriptor: (_, key) => Object.getOwnPropertyDescriptor(get(), key),
  });
}

// Two-layer blue-tinted shadow. iOS reads the shadow* keys, Android reads elevation.
export const lift = {
  shadowColor: LIGHT.royalDeep,
  shadowOpacity: 0.22,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 4,
};

export const space = { xs: 6, sm: 10, md: 16, lg: 22, xl: 30 };

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };

// A style object with light-only colours, made right for the current scheme
// (for the few styles built outside themed()).
export const tone = (style) => (scheme === 'dark' ? darken(style) : style);

// Exported for tests.
export const _darken = darken;
export const _palettes = { LIGHT, DARK };
