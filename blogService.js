// blogService.js — the newest posts from the Pen Parentis blog
// (https://penparentis.org/category/blog/), for Home's "From the blog".
//
// The site runs WordPress, which has a public read-only list of posts
// (no key needed): find the "blog" category's id, then ask for its newest
// posts with their featured images. If that isn't reachable, the blog's RSS
// feed is used instead. The last good list is kept on the phone, so Home
// still shows posts when offline.

import AsyncStorage from '@react-native-async-storage/async-storage';

export const BLOG_URL = 'https://penparentis.org/category/blog/';
const SITE = 'https://penparentis.org';
const CACHE_KEY = 'pp.blog.v1';
const COUNT = 5;

// ---------------------------------------------------------------------------
// Pure helpers (tested in Node).
// ---------------------------------------------------------------------------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—' };
export function decodeEntities(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => (ENTITIES[n.toLowerCase()] ?? m));
}

// HTML → one line of plain text.
export function plainText(html) {
  return decodeEntities(String(html || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').replace(/\s*\[…\]\s*$|\s*\[&hellip;\]\s*$/, '…').trim();
}

// "Continue reading" and the like, and trim to a sentence-ish length.
export function excerptOf(html, max = 110) {
  let t = plainText(html).replace(/\s*(Continue reading|Read more)[\s\S]*$/i, '').trim();
  if (t.length > max) t = `${t.slice(0, max).replace(/\s+\S*$/, '')}…`;
  return t;
}

// WordPress REST post (with _embed) → our post.
export function fromWordPress(p) {
  const media = p?._embedded?.['wp:featuredmedia']?.[0];
  const sizes = media?.media_details?.sizes || {};
  const image = sizes.medium_large?.source_url || sizes.large?.source_url || sizes.medium?.source_url || media?.source_url || null;
  return {
    id: String(p.id),
    title: plainText(p?.title?.rendered),
    excerpt: excerptOf(p?.excerpt?.rendered),
    date: p.date,
    url: p.link,
    image,
  };
}

// RSS feed text → our posts (fallback; images from the post's first <img>).
export function fromRss(xml) {
  const items = String(xml || '').split(/<item[\s>]/i).slice(1);
  return items.map((it, i) => {
    const tag = (name) => {
      const m = it.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
      return m ? m[1].replace(/^<!\[CDATA\[|\]\]>$/g, '') : '';
    };
    const content = tag('content:encoded') || tag('description');
    const img = (it.match(/<media:content[^>]+url="([^"]+)"/i) || content.match(/<img[^>]+src="([^"]+)"/i) || [])[1] || null;
    const date = new Date(tag('pubDate'));
    return {
      id: tag('guid') || String(i),
      title: plainText(tag('title')),
      excerpt: excerptOf(tag('description') || content),
      date: Number.isNaN(date.getTime()) ? null : date.toISOString(),
      url: plainText(tag('link')),
      image: img ? decodeEntities(img) : null,
    };
  }).filter((p) => p.title && p.url);
}

// "SEP 8, 2026"
export function postDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
}

// ---------------------------------------------------------------------------
// Loading.
// ---------------------------------------------------------------------------

async function getJSON(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

async function fromSite() {
  try {
    const cats = await getJSON(`${SITE}/wp-json/wp/v2/categories?slug=blog`);
    const cat = Array.isArray(cats) && cats[0] ? `&categories=${cats[0].id}` : '';
    const posts = await getJSON(`${SITE}/wp-json/wp/v2/posts?per_page=${COUNT}&_embed=wp:featuredmedia${cat}`);
    const list = (Array.isArray(posts) ? posts : []).map(fromWordPress).filter((p) => p.title && p.url);
    if (list.length) return list;
  } catch {}
  const r = await fetch(`${BLOG_URL}feed/`);
  if (!r.ok) throw new Error(String(r.status));
  return fromRss(await r.text()).slice(0, COUNT);
}

// { posts, fresh } — fresh=false when these are the saved ones.
export async function loadBlog() {
  try {
    const posts = await fromSite();
    if (posts.length) {
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(posts)).catch(() => {});
      return { posts, fresh: true };
    }
  } catch {}
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(CACHE_KEY)) || '[]');
    return { posts: saved, fresh: false };
  } catch {
    return { posts: [], fresh: false };
  }
}
