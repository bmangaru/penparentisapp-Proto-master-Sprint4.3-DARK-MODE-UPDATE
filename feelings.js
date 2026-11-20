// feelings.js — "How do you feel?" after a session. Twelve feelings: the ten
// from Pen Parentis' own "How do you feel?" page, plus Okay (not great, not
// bad) and Tired. The faces are simple line drawings on a 48×48 grid: `line`
// is stroked, `fill` is solid ink, `tint` is a blue accent (a tear or a drop
// of sweat). Each has its own soft `color` and one small `move` it plays now
// and then (components/Face.js). Every colour is its own hue (yellow, amber,
// grey, lavender, orchid, mint, pink, clay, red, slate, sky, green), so
// feelings never look alike on the calendar or the month's ring.
// Pure data — no React Native imports.

const EYES = 'M16 20a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0 M27.6 20a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0';
const EYES_LOW = 'M16 22a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0 M27.6 22a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0';
const EYES_DOWN = 'M16 23a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0 M27.6 23a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0';

// move: bob · hop · shrug · doze · tilt · jitter · shake · grit · huff · glance · tear · sink
// extra (a little thing beside the face that comes and goes): sparkle · z · question · steam
export const FEELINGS = [
  { id: 'happy', label: 'Happy', color: '#FFD873', move: 'bob', line: 'M16 28 q8 8 16 0', fill: EYES },
  { id: 'ecstatic', label: 'Ecstatic', color: '#FFA62B', move: 'hop', extra: 'sparkle', line: 'M14 21 q4 -5 8 0 M26 21 q4 -5 8 0', fill: 'M15 27 h18 q0 10 -9 10 q-9 0 -9 -10z' },
  { id: 'okay', label: 'Okay', color: '#E3E1D9', move: 'shrug', line: 'M17 30 h14', fill: EYES },
  { id: 'tired', label: 'Tired', color: '#B8B3E0', move: 'doze', extra: 'z', line: 'M15 21 q3 2 6 0 M27 21 q3 2 6 0 M20 31 q4 -1.5 8 0' },
  { id: 'confused', label: 'Confused', color: '#E6A3EB', move: 'tilt', extra: 'question', line: 'M27 13 l7 -2 M17 32 q3 -3 6 0 t6 0 t6 0', fill: EYES },
  { id: 'anxious', label: 'Anxious', color: '#6FD3B0', move: 'jitter', line: 'M14 17 l7 -3 M34 17 l-7 -3 M16 32 q2 -2 4 0 t4 0 t4 0 t4 0', fill: EYES },
  {
    id: 'panicked', label: 'Panicked', color: '#FF9CB4', move: 'shake',
    line: 'M14 20a4 4 0 1 0 8 0a4 4 0 1 0 -8 0 M26 20a4 4 0 1 0 8 0a4 4 0 1 0 -8 0',
    fill: 'M16.5 20a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0 M28.5 20a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0 M20 32a4 5 0 1 0 8 0a4 5 0 1 0 -8 0',
    tint: 'M38 9 q-4 5 0 7 q4 -2 0 -7z',
  },
  { id: 'frustrated', label: 'Frustrated', color: '#C98A6B', move: 'grit', line: 'M14 16 h8 M26 16 h8 M16 29 h16 v6 h-16 z M20 29 v6 M24 29 v6 M28 29 v6', fill: EYES },
  { id: 'angry', label: 'Angry', color: '#EE6A5A', move: 'huff', extra: 'steam', line: 'M14 14 l8 4 M34 14 l-8 4 M17 34 q7 -7 14 0', fill: EYES_LOW },
  {
    id: 'betrayed', label: 'Betrayed', color: '#7C8DB0', move: 'glance', line: 'M14 20 h8 M26 20 h8 M17 33 q7 -4 14 1',
    fill: 'M18.5 21.5a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0 M30.5 21.5a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0',
  },
  { id: 'hurt', label: 'Hurt', color: '#8FCBF2', move: 'tear', line: 'M18 33 q6 -5 12 0', fill: EYES, tint: 'M17.5 24 q-3 5 0 7 q3 -2 0 -7z' },
  { id: 'guilty', label: 'Guilty', color: '#B9DA9C', move: 'sink', line: 'M15 15 q3 -2 6 0 M27 15 q3 -2 6 0 M20 31 q4 3 8 0', fill: EYES_DOWN },
];

export function feelingById(id) {
  return FEELINGS.find((f) => f.id === id) || null;
}

export function feelingLabel(id) {
  return feelingById(id)?.label || '';
}
