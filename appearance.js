// appearance.js — Settings → Appearance: 'system' | 'light' | 'dark',
// remembered on this phone. 'system' follows the phone's own setting.
// App.js reads it, applies the colours (theme.js) and redraws the app.

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'pp.appearance.v1';
export const APPEARANCES = ['system', 'light', 'dark'];
let pref = null; // null until loaded
const listeners = new Set();

export async function loadAppearance() {
  if (pref) return pref;
  try {
    const v = await AsyncStorage.getItem(KEY);
    pref = APPEARANCES.includes(v) ? v : 'system';
  } catch { pref = 'system'; }
  return pref;
}

export async function setAppearance(v) {
  if (!APPEARANCES.includes(v)) return;
  pref = v;
  listeners.forEach((fn) => fn(v));
  try { await AsyncStorage.setItem(KEY, v); } catch {}
}

// The saved choice (null while loading).
export function useAppearance() {
  const [v, setV] = useState(pref);
  useEffect(() => {
    listeners.add(setV);
    loadAppearance().then(setV);
    return () => listeners.delete(setV);
  }, []);
  return v;
}

// 'light' | 'dark' from the choice and the phone's setting.
export function effectiveScheme(choice, phone) {
  if (choice === 'dark') return 'dark';
  if (choice === 'light') return 'light';
  return phone === 'dark' ? 'dark' : 'light';
}

// The app redraws after a switch; this keeps Settings open through it.
let reopen = false;
export const keepSettingsOpen = () => { reopen = true; };
export const takeSettingsOpen = () => { const r = reopen; reopen = false; return r; };
