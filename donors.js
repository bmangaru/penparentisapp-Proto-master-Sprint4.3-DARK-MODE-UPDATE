// donors.js — the list behind US 8 (the banner scroll) and the Info sheet's donor grid.
//
// Kept as plain data on purpose: whoever manages the donor list shouldn't have
// to open component code to add a name. Later this can be swapped for a fetch
// from the same backend that issues unlock codes, with zero changes to the
// two components that read it.

// Organizations by their full name, then people as first name + last initial.
// Each name once (Sandell Morse and Michelle Hanson were sent twice).
export const DONORS = [
  // Organizations
  'Lower Manhattan Cultural Council',
  'New York City Department of Cultural Affairs, in partnership with the City Council',
  'National Endowment for the Arts',
  'The deGroot Foundation',
  'The Poetry Foundation',
  'Amazon Literary Partners',
  'Amazon Smile Foundation',
  'The Sustainable Arts Foundation',
  'Poets & Writers',
  'New York State Council on the Arts',
  'BCSWebstudio (Bronius M.)',
  'Michael C. Allen & Co., CPAs PLLC',
  'The John A. Hartford Foundation',
  'Pace University, Seidenberg School of Computer Science and Information Systems',
  // People
  'Emily Ann P.',
  'The family of Eric & Michelle H.',
  'Sandell M.',
  'Loretta S.',
  'Jackie Q.',
  'Sarah L.',
  'Leigh N.',
  'Maria G.',
  'Allison S.',
  'Dr. Lewis G.',
  'Ellen T.',
  'Audrey B.',
  'Carolyn H.',
  'Helene E.',
  'Julie P.',
  'Brian M.',
  'Rony C.',
  'Rafael M.',
  'Nala H.',
];


// Credits shown in the Info sheet (US 7). Fill in real names before shipping.
export const CREDITS = [
  { role: 'Design & development', name: '—' },
];
