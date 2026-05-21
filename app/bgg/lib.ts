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

export type FetchAttempt = {
  label: string;
  attempt: number;
  status: number;
  elapsedMs: number;
  bodyPreview?: string;
};

export type DebugInfo = {
  proxy: string;
  attempts: FetchAttempt[];
  hotIdCount: number;
  gamesCount: number;
  gamesWithoutPoll: number;
  gamesWithoutName: number;
  hotElapsedMs: number;
  thingElapsedMs: number;
  elapsedMs: number;
};

export type FetchError = Error & {
  where?: string;
  status?: number;
  bodyPreview?: string;
  attempts?: FetchAttempt[];
};

// BGGはVercel/AWS等のクラウドIPを401で弾く＆BGG側にCORSヘッダもない
// → ブラウザからプロキシ経由でBGGを叩く
// 本番: 自前のCloudflare Workers proxy (NEXT_PUBLIC_BGG_PROXY_URLで指定)
// 未設定時: corsproxy.io (localhostでは無料、本番URLからは403)
//
// Worker のデプロイ手順は workers/bgg-proxy/README.md 参照
const PROXY =
  process.env.NEXT_PUBLIC_BGG_PROXY_URL || "https://corsproxy.io/?url=";
const HOT_URL = "https://boardgamegeek.com/xmlapi2/hot?type=boardgame";
const THING_URL = (ids: string) =>
  `https://boardgamegeek.com/xmlapi2/thing?id=${ids}&stats=1`;

const LOG = "[bgg]";

function proxied(url: string): string {
  return `${PROXY}${encodeURIComponent(url)}`;
}

async function fetchWithRetry(
  url: string,
  label: string,
  attempts: FetchAttempt[]
): Promise<string> {
  let lastStatus = 0;
  let lastBodyPreview = "";
  for (let i = 0; i < 4; i++) {
    const t0 = performance.now();
    let res: Response;
    try {
      res = await fetch(proxied(url));
    } catch (networkErr) {
      const elapsedMs = Math.round(performance.now() - t0);
      console.error(`${LOG} ${label} network error`, networkErr);
      attempts.push({
        label,
        attempt: i + 1,
        status: 0,
        elapsedMs,
        bodyPreview:
          networkErr instanceof Error ? networkErr.message : String(networkErr),
      });
      if (i < 3) {
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        continue;
      }
      const err: FetchError = new Error(
        `BGG ${label} network error: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`
      );
      err.where = label;
      err.attempts = attempts;
      throw err;
    }
    const elapsedMs = Math.round(performance.now() - t0);
    lastStatus = res.status;
    console.log(
      `${LOG} fetch ${label} attempt=${i + 1} status=${res.status} time=${elapsedMs}ms`
    );
    if (res.status === 200) {
      attempts.push({ label, attempt: i + 1, status: res.status, elapsedMs });
      return await res.text();
    }
    try {
      lastBodyPreview = (await res.text()).slice(0, 300);
    } catch {
      lastBodyPreview = "(body read failed)";
    }
    attempts.push({
      label,
      attempt: i + 1,
      status: res.status,
      elapsedMs,
      bodyPreview: lastBodyPreview,
    });
    console.warn(`${LOG} ${label} non-200 body:`, lastBodyPreview);
    if (res.status === 202 || res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      continue;
    }
    const err: FetchError = new Error(`BGG ${label} returned ${res.status}`);
    err.where = label;
    err.status = res.status;
    err.bodyPreview = lastBodyPreview;
    err.attempts = attempts;
    throw err;
  }
  const err: FetchError = new Error(
    `BGG ${label} retries exhausted (last status ${lastStatus})`
  );
  err.where = label;
  err.status = lastStatus;
  err.bodyPreview = lastBodyPreview;
  err.attempts = attempts;
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
    throw new Error(
      `Hot XML parse error: ${xml.slice(0, 200)}`
    );
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
    throw new Error(`Thing XML parse error: ${xml.slice(0, 200)}`);
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
    const averageRating = floatAttr(
      ratingsEl?.querySelector("average") ?? null
    );
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
  console.log(`${LOG} fetchHotGames start via proxy=${PROXY}`);
  const attempts: FetchAttempt[] = [];

  const hotT0 = performance.now();
  const hotXml = await fetchWithRetry(HOT_URL, "hot", attempts);
  const hotElapsedMs = Math.round(performance.now() - hotT0);
  const ids = parseHot(hotXml);
  console.log(`${LOG} parsed ${ids.length} hot IDs in ${hotElapsedMs}ms`);
  if (ids.length === 0) {
    throw new Error("Hot list returned 0 items");
  }

  const thingT0 = performance.now();
  const thingXml = await fetchWithRetry(THING_URL(ids.join(",")), "thing", attempts);
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
      proxy: PROXY,
      attempts,
      hotIdCount: ids.length,
      gamesCount: games.length,
      gamesWithoutPoll: withoutPoll,
      gamesWithoutName: withoutName,
      hotElapsedMs,
      thingElapsedMs,
      elapsedMs,
    },
  };
}
