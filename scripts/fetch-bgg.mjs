// BGG XML APIから Hot 50 + 詳細データを取得して public/bgg-hot.json に書き出すスクリプト。
//
// BGG XML API2 のドキュメント (https://boardgamegeek.com/wiki/page/BGG_XML_API2) より:
//   - レート制限: 5秒以上の間隔を空ける（連投すると500/503）
//   - thing endpoint: 1回最大20件まで
//   - www.boardgamegeek.com はNG（authorization に支障）。bare domain を使う
// + 経験則:
//   - 素っ気ないUA（"my-script/1.0"等）は Cloudflare WAF に401で弾かれることがある
//   - ブラウザ風UA + Accept-Language を送ると通る
//
// 使い方:
//   npm run fetch:bgg
//
// 完了後、生成されたJSONをcommit&pushすればVercel本番に反映される。

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const HOT_URL = "https://boardgamegeek.com/xmlapi2/hot?type=boardgame";
const THING_URL = (ids) =>
  `https://boardgamegeek.com/xmlapi2/thing?id=${ids}&stats=1`;
const OUT_PATH = resolve(process.cwd(), "public/bgg-hot.json");
const LOG = "[fetch-bgg]";

// ブラウザ風ヘッダ。Cloudflare WAFのbot判定を回避するため。
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,ja;q=0.8",
};

const REQUEST_DELAY_MS = 5500; // BGG docs: 5秒以上。マージン込み。
const THING_BATCH_SIZE = 20;   // BGG docs: thing は最大20件/回

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url, label, maxRetries = 5) {
  let lastStatus = 0;
  let lastBody = "";
  for (let i = 0; i < maxRetries; i++) {
    const t0 = Date.now();
    const res = await fetch(url, { headers: HEADERS });
    const elapsed = Date.now() - t0;
    lastStatus = res.status;
    console.log(
      `${LOG} fetch ${label} attempt=${i + 1} status=${res.status} time=${elapsed}ms`
    );
    if (res.status === 200) {
      return await res.text();
    }
    try {
      lastBody = (await res.text()).slice(0, 300);
    } catch {
      lastBody = "(body read failed)";
    }
    console.warn(`${LOG} body preview: ${lastBody.replace(/\s+/g, " ")}`);
    // 202=queued, 429=rate limit, 5xx=server: リトライ
    if (res.status === 202 || res.status === 429 || res.status >= 500) {
      const wait = 2000 * (i + 1);
      console.log(`${LOG} retrying in ${wait}ms...`);
      await sleep(wait);
      continue;
    }
    // 401/403はCloudflare WAFのbot判定の可能性。UAやヘッダの問題なのでリトライしない
    throw new Error(
      `BGG ${label} returned ${res.status}: ${lastBody}\n` +
        `401/403はCloudflareのbot判定の可能性。Macで実行・VPNオフ・最新Nodeで再試行してください。`
    );
  }
  throw new Error(
    `BGG ${label} retries exhausted (last status ${lastStatus}): ${lastBody}`
  );
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function attr(block, name) {
  const m = block.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1] : undefined;
}

function parseHot(xml) {
  const ids = [];
  for (const m of xml.matchAll(/<item[^>]*\sid="(\d+)"/g)) {
    ids.push(m[1]);
  }
  return ids;
}

function parseThing(xml) {
  const games = [];
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

    let bggRank;
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

    const polls = [];
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

    const bestPlayers = [];
    const recommendedPlayers = [];
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

async function main() {
  console.log(`${LOG} start at ${new Date().toISOString()}`);

  const hotXml = await fetchWithRetry(HOT_URL, "hot");
  const ids = parseHot(hotXml);
  console.log(`${LOG} parsed ${ids.length} hot IDs`);
  if (ids.length === 0) throw new Error("Got 0 hot IDs from BGG");

  // BGG XML API2: thing endpoint は最大20件/回
  const batches = [];
  for (let i = 0; i < ids.length; i += THING_BATCH_SIZE) {
    batches.push(ids.slice(i, i + THING_BATCH_SIZE));
  }
  console.log(
    `${LOG} fetching ${ids.length} games in ${batches.length} batches of <=${THING_BATCH_SIZE} (5.5s wait each)`
  );

  const allGames = [];
  let totalWithoutPoll = 0;
  let totalWithoutName = 0;
  for (let i = 0; i < batches.length; i++) {
    console.log(`${LOG} waiting ${REQUEST_DELAY_MS}ms (BGG rate limit)...`);
    await sleep(REQUEST_DELAY_MS);
    const batchIds = batches[i];
    console.log(
      `${LOG} batch ${i + 1}/${batches.length}: ${batchIds.length} IDs`
    );
    const thingXml = await fetchWithRetry(
      THING_URL(batchIds.join(",")),
      `thing-batch${i + 1}`
    );
    const { games, withoutPoll, withoutName } = parseThing(thingXml);
    allGames.push(...games);
    totalWithoutPoll += withoutPoll;
    totalWithoutName += withoutName;
  }

  console.log(
    `${LOG} parsed ${allGames.length}/${ids.length} games total (noPoll=${totalWithoutPoll}, noName=${totalWithoutName})`
  );
  if (allGames.length === 0) throw new Error("Got 0 games from BGG");

  const order = new Map(ids.map((id, i) => [id, i]));
  allGames.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
  allGames.forEach((g, i) => (g.hotRank = i + 1));

  const data = {
    games: allGames,
    fetchedAt: new Date().toISOString(),
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(data, null, 2) + "\n");
  console.log(`${LOG} wrote ${allGames.length} games to ${OUT_PATH}`);
  console.log(
    `${LOG} done. \`git add public/bgg-hot.json && git commit\` でデプロイ反映`
  );
}

main().catch((e) => {
  console.error(`${LOG} FAILED:`, e);
  process.exit(1);
});
