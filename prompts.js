// prompts.js — short writing prompts for writer-parents, in three levels:
//   simple     — everyday and quick to start ("How was your day?")
//   thoughtful — a memory or a small scene
//   deep       — harder, more personal
// Pure logic, no React Native, so it can be tested in Node.
//
// • promptForDay(key, level): the same prompt all day, a new one each day
// • nextPrompt(current, level): "Another" — the next one at that level
// Add or edit prompts freely; order within a level doesn't matter. Each
// level has enough for months of daily prompts without a repeat, and some
// are written for writing with (or about) your kids.

export const PROMPT_LEVELS = ['simple', 'thoughtful', 'deep'];
export const LEVEL_LABEL = { simple: 'Simple', thoughtful: 'Thoughtful', deep: 'Deep' };
export const DEFAULT_LEVEL = 'simple';

const BY_LEVEL = {
  simple: [
    'How was your day, in three sentences?',
    'What’s the weather like where you are right now?',
    'What are your plans for the weekend?',
    'What did you eat today? Which bite was best?',
    'Describe the room you’re sitting in.',
    'What made you smile today?',
    'Describe your morning, from waking up to walking out the door.',
    'What song has been stuck in your head lately?',
    'What’s the last thing you bought, and why?',
    'What was your favourite part of today?',
    'What are you looking forward to this week?',
    'What can you hear right now? List every sound.',
    'Who did you talk to today, and what about?',
    'What’s one thing on your to-do list, and how do you feel about it?',
    'Describe what you’re wearing and why you picked it.',
    'What did you have for breakfast, and who else was at the table?',
    'Describe your shoes and where they’ve been this week.',
    'What’s the messiest spot in your home right now?',
    'List five things you can see from where you’re sitting.',
    'What’s the best thing you’ve heard someone say today?',
    'What did your kid find funny today?',
    'Describe the last photo you took on your phone.',
    'What’s in your fridge that needs eating soon?',
    'What’s one small thing you’d change about today?',
    'Describe today’s sky in one sentence, then in three words.',
    'What are you drinking right now? Describe it.',
    'What was the first thing you thought this morning?',
    'What’s a chore you secretly don’t mind?',
    'Write about the last text message you sent.',
    'What’s a word your family uses that nobody else does?',
    'What’s on your nightstand?',
    'What did you forget today?',
    'Describe your favourite mug.',
    'When is the noisiest moment of your day?',
    'Who would you call if you had a free hour today?',
    'What’s a snack you hide from the kids?',
    'What’s the next thing on your calendar?',
    'Describe your commute or school run this morning.',
    'What’s one thing you finished today, however small?',
    'If your family had a superpower, what would it be, and how would you use it?',
    'Describe your kid’s favourite toy as if it were alive.',
    'What’s the best thing about this time of year?',
    'What would you do with an extra hour today?',
    'What can you smell in your home right now?',
    'What did you learn today?',
    'What’s the last thing that made you say “wow”?',
    'Write a thank-you note to something you used today.',
    'What’s a question you’ve been asked three times this week?',
    'Describe the clothes piled on a chair somewhere in your home.',
    'Whose laugh was the loudest you heard today?',
    'What are you avoiding doing right now?',
    'What did you notice on your last walk?',
    'What’s your go-to dinner on a hard night?',
    'Pick an object near you and write its life story in five lines.',
    'What do you want to remember about today?',
  ],
  thoughtful: [
    'Describe the kitchen at 7 a.m. using only sounds.',
    'A character finds a note in a coat pocket. What does it say?',
    'What did you love doing at age ten that you never do now?',
    'Write the bedtime story you wish someone had told you.',
    'Describe a small fight over something that wasn’t really the problem.',
    'Write about a place you only go to when you need to be alone.',
    'Describe a stranger you saw today as if they were the main character.',
    'Write about a toy, a blanket or a book your family can’t throw away.',
    'What does your writing time look like, honestly, today?',
    'Write a scene that takes place entirely in a parked car.',
    'Describe a smell that takes you straight back to childhood.',
    'Write about the last time you laughed until you couldn’t breathe.',
    'Write a list of ten things in your bag right now, then the story behind one.',
    'What’s a rule in your house that would make no sense to anyone else?',
    'Write about a morning when everything went wrong — then the one thing that went right.',
    'Describe your own parent through one thing they always said.',
    'Write a short poem using only words your child knows.',
    'A door in your home that’s always closed is open. What’s on the other side?',
    'Describe the view from the window you look out of most.',
    'Write the first paragraph of a book you’ll never finish — on purpose.',
    'Write a story where your child is the hero.',
    'What would your child’s perfect day look like, told by your child?',
    'Write the bedtime story your kid keeps asking for.',
    'Write about a family recipe and who taught it to you.',
    'Describe a holiday from your childhood through one object on the table.',
    'Write a conversation overheard at the playground or the school gate.',
    'A character packs a suitcase in five minutes. What goes in?',
    'Describe your home at night, room by room.',
    'Write about a gift that meant more than it cost.',
    'Write the scene where two strangers meet in a waiting room.',
    'Write about the first home you remember.',
    'Describe a meal where something important was said.',
    'What would your teenage self think of your life now?',
    'Write about a time you got lost.',
    'A character finds an old voicemail they never listened to. What happens?',
    'Describe a family car trip through the back-seat window.',
    'Write about a neighbour you know only by sight.',
    'Write the instructions your kid would write for being you.',
    'Write about a hobby you gave up, and why.',
    'Describe a rainy day indoors with children, hour by hour.',
    'Write a letter from your pet to your family.',
    'A kid’s drawing is stuck to a fridge. Write the story it tells.',
    'Write about the best advice you ignored.',
    'Describe a birthday party from under the table.',
    'Write about a time a child taught you something.',
    'Write about your favourite place in town and what happens there at dawn.',
    'A grandparent tells a story at dinner. Write it in their voice.',
    'Write about two siblings arguing over the one thing they both want.',
    'Describe a photograph from your childhood that isn’t in any album.',
    'Write about the moment you realized you’d become your parent.',
    'A character keeps a secret drawer. What’s in it?',
    'Write a scene on a train where nobody speaks.',
    'Write about the first time your child held your hand.',
    'Describe the playground from a parent’s bench.',
    'Write about something lost in your home that turned up years later.',
    'Write a list poem: “Things I carry that aren’t in my bag.”',
    'Write the conversation you’d have with your favourite author over coffee.',
    'Retell a fairy tale where the parent gets the last word.',
    'Write about the hour before guests arrive.',
    'Describe a season through what’s piled by your front door.',
  ],
  deep: [
    'Write about the five minutes after the house finally goes quiet.',
    "What did your child ask you today that you couldn't answer?",
    'Write a letter to yourself from the year before you became a parent.',
    'Your child is grown and reading this page. What do you want them to know?',
    'Start with the line: “Nobody told me it would feel like this.”',
    'Write about something you’re proud of that nobody noticed.',
    'A parent and a child each tell the same afternoon differently. Write both.',
    'What would you write if you knew no one would ever read it?',
    'Write about the version of you that exists only after everyone is asleep.',
    'What are you waiting for right now, big or small?',
    'Write a letter to your child to open when they turn 18.',
    'What part of yourself did you put on hold, and are you getting it back?',
    'Write about a day you felt like you weren’t enough, and what got you through.',
    'What traits do you hope your kids never inherit from you?',
    'What traits do you hope your kids do inherit from you?',
    'Write about the parent you thought you’d be.',
    'Write about one thing you’d do differently, and why you forgive yourself.',
    'Write about someone you lost and what they’d say about your family now.',
    'What does rest mean to you now, compared with before?',
    'Write about a promise you made yourself and kept.',
    'Start with: “The thing I never say out loud is…”',
    'Why do you keep coming back to the page?',
    'Describe the loneliest part of parenting, and the least lonely.',
    'Write about a time you asked for help.',
    'What does home mean, now that you’ve made one?',
    'Write about your body: what it has carried, done and endured.',
    'Write the conversation you’re afraid to have.',
    'Write about a fear you keep from your children.',
    'What would you tell a friend who is exactly where you are right now?',
    'Write about a decision that changed the shape of your family.',
    'Write about the moment you felt most like yourself this year.',
    'Start with: “If I had one more ordinary day with…”',
    'Which story about your family do you want to be the one that’s told?',
    'Write about an argument you’re glad you lost.',
    'What did your parents never tell you that you’ve had to learn alone?',
    'Write about the gap between who you are at work and who you are at home.',
    'Write about a time you were braver than you felt.',
    'Describe the life you’d have without children, honestly and kindly.',
    'Write about what your child sees when they look at you.',
    'Start with the line: “This is what I want to remember.”',
  ],
};

// Every prompt as { text, level }.
export const PROMPTS = PROMPT_LEVELS.flatMap((level) => BY_LEVEL[level].map((text) => ({ text, level })));

export function normalizeLevel(level) {
  return PROMPT_LEVELS.includes(level) ? level : DEFAULT_LEVEL;
}

export function promptsFor(level) {
  return BY_LEVEL[normalizeLevel(level)];
}

// The level a prompt belongs to (null if it isn't one of ours).
export function levelOf(text) {
  const p = PROMPTS.find((x) => x.text === text);
  return p ? p.level : null;
}

// Simple → Thoughtful → Deep → Simple (for the header chip).
export function nextLevel(level) {
  const i = PROMPT_LEVELS.indexOf(normalizeLevel(level));
  return PROMPT_LEVELS[(i + 1) % PROMPT_LEVELS.length];
}

// Days since a fixed date, from a 'YYYY-MM-DD' key (local calendar day).
function dayNumber(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

// The same prompt all day at a level; consecutive days get different prompts.
export function promptForDay(key, level = DEFAULT_LEVEL) {
  const list = promptsFor(level);
  const n = list.length;
  // A step that shares no factor with n visits every prompt before repeating.
  let step = 7;
  while (gcd(step, n) !== 1) step += 1;
  return list[((dayNumber(key) * step) % n + n) % n];
}

function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

// "Another": the next prompt after `current` at that level (wraps around).
export function nextPrompt(current, level = DEFAULT_LEVEL) {
  const list = promptsFor(level);
  const i = list.indexOf(current);
  return list[(i + 1) % list.length];
}
