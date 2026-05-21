import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 3600;

const HOT_URL = "https://boardgamegeek.com/xmlapi2/hot?type=boardgame";
const THING_URL = (ids: string) =>
  `https://boardgamegeek.com/xmlapi2/thing?id=${ids}&stats=1`;

// BGGはbot的なUAを401で弾くことがあるので、実ブラウザ風のヘッダを送る
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/xml, text/xml, */*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,ja;q=0.8",
  Referer: "https://boardgamegeek.com/",
};

type Poll = {
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

const LOG = "[bgg/hot]";

type FetchAttempt = {
  label: string;
  attempt: number;
  status: number;
  elapsedMs: number;
  bodyPreview?: string;
};

async function fetchWithRetry(
  url: string,
  label: string,
  attempts: FetchAttempt[]
): Promise<string> {
  let lastStatus = 0;
  let lastBodyPreview = "";
  for (let i = 0; i < 4; i++) {
    const t0 = Date.now();
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      next: { revalidate: 3600 },
    });
    const elapsedMs = Date.now() - t0;
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
    console.warn(
      `${LOG} ${label} non-200 body preview: ${lastBodyPreview.replace(/\s+/g, " ").slice(0, 200)}`
    );
    if (res.status === 202 || res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      continue;
    }
    const err = new Error(`BGG ${label} returned ${res.status}`) as Error & {
      where?: string;
      status?: number;
      bodyPreview?: string;
    };
    err.where = label;
    err.status = res.status;
    err.bodyPreview = lastBodyPreview;
    throw err;
  }
  const err = new Error(
    `BGG ${label} retries exhausted (last status ${lastStatus})`
  ) as Error & { where?: string; status?: number; bodyPreview?: string };
  err.where = label;
  err.status = lastStatus;
  err.bodyPreview = lastBodyPreview;
  throw err;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function attr(block: string, name: string): string | undefined {
  const m = block.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1] : undefined;
}

function parseHot(xml: string): string[] {
  const ids: string[] = [];
  for (const m of xml.matchAll(/<item[^>]*\sid="(\d+)"/g)) {
    ids.push(m[1]);
  }
  return ids;
}

function parseThing(xml: string): {
  games: BggGame[];
  withoutPoll: number;
  withoutName: number;
} {
  const games: BggGame[] = [];
  let withoutPoll = 0;
  let withoutName = 0;
  for (const m of xml.matchAll(/<item\s+type="boardgame"[\s\S]*?<\/item>/g)) {
    const block = m[0];
    const headEnd = block.indexOf(">");
    const head = block.slice(0, headEnd);
    const id = attr(head, "id") ?? "";

    let name = "";
    for (const nm of block.matchAll(/<name\s+([^/]+?)\/>/g)) {
      const inner = nm[1];
      if (/type="primary"/.test(inner)) {
        const v = inner.match(/value="([^"]*)"/);
        if (v) {
          name = decodeEntities(v[1]);
          break;
        }
      }
    }
    if (!name) withoutName++;

    const yearM = block.match(/<yearpublished\s+value="(-?\d+)"/);
    const yearPublished = yearM ? parseInt(yearM[1]) : undefined;

    const thumbM = block.match(/<thumbnail>([^<]*)<\/thumbnail>/);
    const thumbnail = thumbM ? thumbM[1] : undefined;

    const minP = block.match(/<minplayers\s+value="(\d+)"/);
    const maxP = block.match(/<maxplayers\s+value="(\d+)"/);
    const minPlayers = minP ? parseInt(minP[1]) : undefined;
    const maxPlayers = maxP ? parseInt(maxP[1]) : undefined;

    const avgM = block.match(/<average\s+value="([0-9.]+)"/);
    const averageRating = avgM ? parseFloat(avgM[1]) : 0;

    const bayesM = block.match(/<bayesaverage\s+value="([0-9.]+)"/);
    const geekRating = bayesM ? parseFloat(bayesM[1]) : 0;

    const urM = block.match(/<usersrated\s+value="(\d+)"/);
    const usersRated = urM ? parseInt(urM[1]) : 0;

    let bggRank: number | undefined;
    for (const rm of block.matchAll(/<rank\s+([^/]+?)\/>/g)) {
      const inner = rm[1];
      if (/name="boardgame"/.test(inner) && /type="subtype"/.test(inner)) {
        const v = inner.match(/value="([^"]+)"/);
        if (v && v[1] !== "Not Ranked") {
          bggRank = parseInt(v[1]);
        }
        break;
      }
    }

    const polls: Poll[] = [];
    const pollM = block.match(
      /<poll\s+name="suggested_numplayers"[\s\S]*?<\/poll>/
    );
    if (pollM) {
      for (const rm of pollM[0].matchAll(
        /<results\s+numplayers="([^"]*)">([\s\S]*?)<\/results>/g
      )) {
        const count = rm[1];
        const inner = rm[2];
        const best = parseInt(
          inner.match(/value="Best"\s+numvotes="(\d+)"/)?.[1] ?? "0"
        );
        const recommended = parseInt(
          inner.match(/value="Recommended"\s+numvotes="(\d+)"/)?.[1] ?? "0"
        );
        const notRecommended = parseInt(
          inner.match(/value="Not Recommended"\s+numvotes="(\d+)"/)?.[1] ?? "0"
        );
        polls.push({ count, best, recommended, notRecommended });
      }
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
  }
  return { games, withoutPoll, withoutName };
}

export async function GET() {
  const startedAt = Date.now();
  const attempts: FetchAttempt[] = [];
  console.log(`${LOG} GET start runtime=${runtime}`);
  try {
    const hotXml = await fetchWithRetry(HOT_URL, "hot", attempts);
    const ids = parseHot(hotXml);
    console.log(`${LOG} parsed ${ids.length} hot IDs`);
    if (ids.length === 0) {
      return NextResponse.json({
        games: [],
        warning: "Hot list returned 0 items",
        debug: { attempts, elapsedMs: Date.now() - startedAt },
      });
    }
    const thingXml = await fetchWithRetry(
      THING_URL(ids.join(",")),
      "thing",
      attempts
    );
    const { games, withoutPoll, withoutName } = parseThing(thingXml);
    console.log(
      `${LOG} parsed ${games.length}/${ids.length} games (noPoll=${withoutPoll}, noName=${withoutName})`
    );

    const order = new Map(ids.map((id, i) => [id, i]));
    games.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
    games.forEach((g, i) => (g.hotRank = i + 1));

    const elapsedMs = Date.now() - startedAt;
    console.log(`${LOG} GET ok in ${elapsedMs}ms`);

    return NextResponse.json({
      games,
      fetchedAt: new Date().toISOString(),
      debug: {
        elapsedMs,
        hotIdCount: ids.length,
        gamesCount: games.length,
        gamesWithoutPoll: withoutPoll,
        gamesWithoutName: withoutName,
        attempts,
        runtime,
      },
    });
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    const e = error as Error & {
      where?: string;
      status?: number;
      bodyPreview?: string;
    };
    console.error(
      `${LOG} GET FAILED after ${elapsedMs}ms where=${e.where ?? "unknown"} status=${e.status ?? "?"} msg=${e.message}`
    );
    if (e.stack) console.error(e.stack);

    return NextResponse.json(
      {
        error: `BGGからのデータ取得に失敗しました: ${e.message}`,
        debug: {
          where: e.where,
          status: e.status,
          bodyPreview: e.bodyPreview,
          stack: e.stack,
          elapsedMs,
          attempts,
          runtime,
        },
      },
      { status: 500 }
    );
  }
}
