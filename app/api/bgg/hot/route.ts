import { NextResponse } from "next/server";

export const revalidate = 3600;

const HOT_URL = "https://boardgamegeek.com/xmlapi2/hot?type=boardgame";
const THING_URL = (ids: string) =>
  `https://boardgamegeek.com/xmlapi2/thing?id=${ids}&stats=1`;

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

async function fetchWithRetry(url: string, maxRetries = 4): Promise<string> {
  let lastStatus = 0;
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "bobzabeth-tools/1.0" },
    });
    lastStatus = res.status;
    if (res.status === 200) {
      return await res.text();
    }
    if (res.status === 202 || res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      continue;
    }
    throw new Error(`BGG API error: ${res.status}`);
  }
  throw new Error(`BGG API timeout (last status: ${lastStatus})`);
}

function parseHot(xml: string): string[] {
  const ids: string[] = [];
  for (const m of xml.matchAll(/<item[^>]*\sid="(\d+)"/g)) {
    ids.push(m[1]);
  }
  return ids;
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

function parseThing(xml: string): BggGame[] {
  const games: BggGame[] = [];
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
  return games;
}

export async function GET() {
  try {
    const hotXml = await fetchWithRetry(HOT_URL);
    const ids = parseHot(hotXml);
    if (ids.length === 0) {
      return NextResponse.json({ games: [] });
    }
    const thingXml = await fetchWithRetry(THING_URL(ids.join(",")));
    const games = parseThing(thingXml);

    const order = new Map(ids.map((id, i) => [id, i]));
    games.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
    games.forEach((g, i) => (g.hotRank = i + 1));

    return NextResponse.json({ games, fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error("BGG API error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `BGGからのデータ取得に失敗しました: ${message}` },
      { status: 500 }
    );
  }
}
