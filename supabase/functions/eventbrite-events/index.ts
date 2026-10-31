// supabase/functions/eventbrite-events/index.ts
//
// Returns Pen Parentis's upcoming Eventbrite events as small JSON for the app:
//   { events:  [{ id, name, start, end, online, venue, url, summary }],
//     streams: [{ id, title, url, status, scheduledStart, actualStart, actualEnd }],  ← YouTube
//     podcast: { title, published, url } | null }                                     ← newest episode
// The app matches each event to the YouTube stream scheduled closest to it.
//
// Why a server function: Eventbrite's API needs a private token. Putting it in
// the app would let anyone pull it out of the download, so it lives here.
//
// Deploy (one time):
//   supabase secrets set EVENTBRITE_TOKEN=<private token from eventbrite.com/platform/api-keys>
//   supabase functions deploy eventbrite-events --no-verify-jwt
// Then paste the function URL into EVENTS_API_URL in links.js.
//
// Optional extras (the app works without them):
//   supabase secrets set YOUTUBE_API_KEY=<key>        → exact livestream links per event
//     (Google Cloud console → APIs & Services → enable "YouTube Data API v3" → Credentials → API key)
//   supabase secrets set PODCAST_RSS_URL=<feed url>   → "New episode in the feed" notifications
//     (Spotify for Creators → Settings → Availability/Distribution → RSS feed)
// After setting secrets, deploy again.

const ORGANIZER_ID = "4508348063"; // eventbrite.com/o/pen-parentis-4508348063
const API = `https://www.eventbriteapi.com/v3/organizers/${ORGANIZER_ID}/events/`;

const YT_HANDLE = "penparentis"; // youtube.com/@penparentis

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// deno-lint-ignore no-explicit-any
function trim(e: any) {
  return {
    id: e.id,
    name: e.name?.text ?? "Pen Parentis event",
    start: e.start?.utc,
    end: e.end?.utc,
    online: !!e.online_event,
    venue: e.venue?.name ?? (e.online_event ? "Online" : ""),
    url: e.url,
    summary: e.summary ?? "",
  };
}

// Eventbrite rejects some option combinations on this endpoint, so try a few,
// simplest last, and use the first that works.
const ATTEMPTS = [
  "status=live&order_by=start_asc&expand=venue",
  "order_by=start_asc&expand=venue",
  "expand=venue",
  "",
];

// ---------------------------------------------------------------------------
// YouTube: upcoming + live streams on the channel, with their times.
// Cached for 10 minutes while this function stays warm (search costs quota).
// ---------------------------------------------------------------------------
let ytCache: { at: number; streams: unknown[] } | null = null;
let channelId: string | null = null;

// deno-lint-ignore no-explicit-any
async function yt(path: string, params: Record<string, string>, key: string): Promise<any> {
  const q = new URLSearchParams({ ...params, key });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${q}`);
  if (!res.ok) throw new Error(`YouTube ${path} ${res.status}`);
  return res.json();
}

async function youtubeStreams(key: string, events: { start: string }[]) {
  if (ytCache && Date.now() - ytCache.at < 10 * 60 * 1000) return ytCache.streams;
  if (!channelId) {
    const ch = await yt("channels", { part: "id", forHandle: `@${YT_HANDLE}` }, key);
    channelId = ch.items?.[0]?.id ?? null;
    if (!channelId) return [];
  }
  // Upcoming streams always; live ones only around an event (saves quota).
  const now = Date.now();
  const near = events.some((e) => Math.abs(new Date(e.start).getTime() - now) < 4 * 60 * 60 * 1000);
  const kinds = near ? ["upcoming", "live"] : ["upcoming"];
  const ids: string[] = [];
  for (const eventType of kinds) {
    const r = await yt("search", { part: "id", channelId, eventType, type: "video", maxResults: "10" }, key);
    // deno-lint-ignore no-explicit-any
    for (const it of r.items ?? []) if ((it as any).id?.videoId) ids.push((it as any).id.videoId);
  }
  if (!ids.length) { ytCache = { at: now, streams: [] }; return []; }
  const v = await yt("videos", { part: "snippet,liveStreamingDetails", id: [...new Set(ids)].join(",") }, key);
  // deno-lint-ignore no-explicit-any
  const streams = (v.items ?? []).map((it: any) => {
    const d = it.liveStreamingDetails ?? {};
    const lb = it.snippet?.liveBroadcastContent;
    return {
      id: it.id,
      title: it.snippet?.title ?? "",
      url: `https://www.youtube.com/watch?v=${it.id}`,
      status: d.actualEndTime ? "ended" : lb === "live" || d.actualStartTime ? "live" : "upcoming",
      scheduledStart: d.scheduledStartTime ?? null,
      actualStart: d.actualStartTime ?? null,
      actualEnd: d.actualEndTime ?? null,
    };
  });
  ytCache = { at: now, streams };
  return streams;
}

// ---------------------------------------------------------------------------
// Podcast: the newest episode in the RSS feed (title, date, link).
// ---------------------------------------------------------------------------
function tag(xml: string, name: string) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").trim() : "";
}
async function latestEpisode(feed: string) {
  const res = await fetch(feed);
  if (!res.ok) return null;
  const xml = await res.text();
  const item = xml.match(/<item[\s\S]*?<\/item>/i)?.[0];
  if (!item) return null;
  const published = new Date(tag(item, "pubDate"));
  return {
    title: tag(item, "title"),
    published: isNaN(published.getTime()) ? null : published.toISOString(),
    url: tag(item, "link") || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const token = Deno.env.get("EVENTBRITE_TOKEN");
  if (!token) return Response.json({ error: "EVENTBRITE_TOKEN not set" }, { status: 500, headers: CORS });

  const errors: unknown[] = [];
  for (const query of ATTEMPTS) {
    const res = await fetch(`${API}${query ? `?${query}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      // Keep Eventbrite's own explanation so problems are easy to read.
      let detail: unknown = null;
      try { detail = await res.json(); } catch { /* not JSON */ }
      errors.push({ query, status: res.status, detail });
      continue;
    }
    const body = await res.json();
    const now = Date.now();
    const events = (body.events ?? [])
      .map(trim)
      .filter((e: { start?: string; end?: string }) => e.start && new Date(e.end ?? e.start).getTime() >= now)
      .sort((a: { start: string }, b: { start: string }) => a.start.localeCompare(b.start));
    // Extras never break the events: each one fails quietly to empty.
    const ytKey = Deno.env.get("YOUTUBE_API_KEY");
    const feed = Deno.env.get("PODCAST_RSS_URL");
    const [streams, podcast] = await Promise.all([
      ytKey ? youtubeStreams(ytKey, events).catch(() => []) : Promise.resolve([]),
      feed ? latestEpisode(feed).catch(() => null) : Promise.resolve(null),
    ]);
    return Response.json(
      { events, streams, podcast },
      { headers: { ...CORS, "Cache-Control": "public, max-age=900" } }, // 15 min
    );
  }
  return Response.json({ error: "Eventbrite refused every request", errors }, { status: 502, headers: CORS });
});
