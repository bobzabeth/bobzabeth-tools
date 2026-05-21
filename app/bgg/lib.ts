export type Poll = {
  count: string;
  best: number;
  recommended: number;
  notRecommended: number;
};

export type BggGame = {
  id: string;
  hotRank: number;
  name: string;
  yearPublished?: number;
  thumbnail?: string;
  minPlayers?: number;
  maxPlayers?: number;
  averageRating: number;
  geekRating: number;
  usersRated: number;
  bggRank?: number;
  polls: Poll[];
  bestPlayers: string[];
  recommendedPlayers: string[];
};

export type DebugInfo = {
  hotIdCount: number;
  gamesCount: number;
  gamesWithoutPoll: number;
  gamesWithoutName: number;
  elapsedMs: number;
  hotElapsedMs: number;
  thingElapsedMs: number;
};

export type FetchError = Error & {
  where?: string;
  status?: number;
  bodyPreview?: string;
};

const HOT_URL = "https://boardgamegeek.com/xmlapi2/hot?type=boardgame";
const THING_URL = (ids: string) =>
  `https://boardgamegeek.com/xmlapi2/thing?id=${ids}&stats=1`;

const LOG = "[bgg]";

async function fetchWithRetry(url: string, label: string): Promise<string> {
  let lastStatus = 0;
  let lastBodyPreview = "";
  for (let i = 0; i < 4; i++) {
    const t0 = performance.now();
    const res = await fetch(url);
    const elapsed = Math.round(performance.now() - t0);
    lastStatus = res.status;
    console.log(
      `${LOG} fetch ${label} attempt=${i + 1} status=${res.status} time=${elapsed}ms`
    );
    if (res.status === 200) {
      return await res.text();
    }
    try {
      lastBodyPreview = (await res.text()).slice(0, 300);
    } catch {
      lastBodyPreview = "(body read failed)";
    }
    console.warn(`${LOG} ${label} non-200 body:`, lastBodyPreview);
    if (res.status === 202 || res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      continue;
    }
    const err: FetchError = new Error(`BGG ${label} returned ${res.status}`);
    err.where = label;
    err.status = res.status;
    err.bodyPreview = lastBodyPreview;
    throw err;
  }
  const err: FetchError = new Error(
    `BGG ${label} retries exhausted (last status ${lastStatus})`
  );
  err.where = label;
  err.status = lastStatus;
  err.bodyPreview = lastBodyPreview;
  throw err;
}

function intAttr(el: Element | null, name = "value"): number | undefined {
  if (!el) return undefined;
  const v = el.getAttribute(name);
  if (v == null) return undefined;
  const n = parseInt(v);
  return isNaN(n) ? undefined : n;
}

function floatAttr(el: Element | null, name = "value"): number {
  if (!el) return 0;
  const v = el.getAttribute(name);
  if (v == null) return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function parseHot(xml: string): string[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Hot XML parse error");
  }
  return Array.from(doc.querySelectorAll("item"))
    .map((it) => it.getAttribute("id") ?? "")
    .filter(Boolean);
}

function parseThing(xml: string): {
  games: BggGame[];
  withoutPoll: number;
  withoutName: number;
} {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Thing XML parse error");
  }
  const items = doc.querySelectorAll('item[type="boardgame"]');
  const games: BggGame[] = [];
  let withoutPoll = 0;
  let withoutName = 0;

  items.forEach((item) => {
    const id = item.getAttribute("id") ?? "";

    const nameEl = Array.from(item.querySelectorAll("name")).find(
      (n) => n.getAttribute("type") === "primary"
    );
    const name = nameEl?.getAttribute("value") ?? "";
    if (!name) withoutName++;

    const yearPublished = intAttr(item.querySelector("yearpublished"));
    const thumbnail =
      item.querySelector("thumbnail")?.textContent?.trim() || undefined;
    const minPlayers = intAttr(item.querySelector("minplayers"));
    const maxPlayers = intAttr(item.querySelector("maxplayers"));

    const ratingsEl = item.querySelector("statistics ratings");
    const averageRating = floatAttr(ratingsEl?.querySelector("average") ?? null);
    const geekRating = floatAttr(
      ratingsEl?.querySelector("bayesaverage") ?? null
    );
    const usersRated =
      intAttr(ratingsEl?.querySelector("usersrated") ?? null) ?? 0;

    let bggRank: number | undefined;
    ratingsEl?.querySelectorAll("ranks rank").forEach((rank) => {
      if (
        rank.getAttribute("name") === "boardgame" &&
        rank.getAttribute("type") === "subtype"
      ) {
        const v = rank.getAttribute("value");
        if (v && v !== "Not Ranked") {
          const n = parseInt(v);
          if (!isNaN(n)) bggRank = n;
        }
      }
    });

    const polls: Poll[] = [];
    const pollEl = Array.from(item.querySelectorAll("poll")).find(
      (p) => p.getAttribute("name") === "suggested_numplayers"
    );
    if (pollEl) {
      pollEl.querySelectorAll("results").forEach((results) => {
        const count = results.getAttribute("numplayers") ?? "";
        let best = 0,
          recommended = 0,
          notRecommended = 0;
        results.querySelectorAll("result").forEach((r) => {
          const v = r.getAttribute("value");
          const n = parseInt(r.getAttribute("numvotes") ?? "0");
          if (v === "Best") best = n;
          else if (v === "Recommended") recommended = n;
          else if (v === "Not Recommended") notRecommended = n;
        });
        polls.push({ count, best, recommended, notRecommended });
      });
    }
    if (polls.length === 0) withoutPoll++;

    const bestPlayers: string[] = [];
    const recommendedPlayers: string[] = [];
    for (const p of polls) {
      const total = p.best + p.recommended + p.notRecommended;
      if (total === 0) continue;
      if (p.best >= p.recommended && p.best >= p.notRecommended && p.best > 0) {
        bestPlayers.push(p.count);
        recommendedPlayers.push(p.count);
      } else if (p.recommended > p.notRecommended && p.recommended > 0) {
        recommendedPlayers.push(p.count);
      }
    }

    games.push({
      id,
      hotRank: 0,
      name,
      yearPublished,
      thumbnail,
      minPlayers,
      maxPlayers,
      averageRating,
      geekRating,
      usersRated,
      bggRank,
      polls,
      bestPlayers,
      recommendedPlayers,
    });
  });

  return { games, withoutPoll, withoutName };
}

export async function fetchHotGames(): Promise<{
  games: BggGame[];
  debug: DebugInfo;
  fetchedAt: string;
}> {
  const t0 = performance.now();
  console.log(`${LOG} fetchHotGames start`);

  const hotT0 = performance.now();
  const hotXml = await fetchWithRetry(HOT_URL, "hot");
  const hotElapsedMs = Math.round(performance.now() - hotT0);
  const ids = parseHot(hotXml);
  console.log(`${LOG} parsed ${ids.length} hot IDs in ${hotElapsedMs}ms`);
  if (ids.length === 0) {
    throw new Error("Hot list returned 0 items");
  }

  const thingT0 = performance.now();
  const thingXml = await fetchWithRetry(THING_URL(ids.join(",")), "thing");
  const thingElapsedMs = Math.round(performance.now() - thingT0);
  const { games, withoutPoll, withoutName } = parseThing(thingXml);
  console.log(
    `${LOG} parsed ${games.length}/${ids.length} games in ${thingElapsedMs}ms (noPoll=${withoutPoll}, noName=${withoutName})`
  );

  const order = new Map(ids.map((id, i) => [id, i]));
  games.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
  games.forEach((g, i) => (g.hotRank = i + 1));

  const elapsedMs = Math.round(performance.now() - t0);
  console.log(`${LOG} fetchHotGames done in ${elapsedMs}ms`);

  return {
    games,
    fetchedAt: new Date().toISOString(),
    debug: {
      hotIdCount: ids.length,
      gamesCount: games.length,
      gamesWithoutPoll: withoutPoll,
      gamesWithoutName: withoutName,
      elapsedMs,
      hotElapsedMs,
      thingElapsedMs,
    },
  };
}
