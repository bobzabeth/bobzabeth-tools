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
  source: string;
  fetchedAt: string;
  gamesCount: number;
  elapsedMs: number;
};

export type FetchError = Error & {
  where?: string;
  status?: number;
  bodyPreview?: string;
};

const STATIC_URL = "/bgg-hot.json";
const LOG = "[bgg]";

// BGGはクラウドIP(Vercel/Cloudflare等)を401で弾く、ブラウザ直fetchはCORSで死ぬ、
// 公開CORSプロキシは本番URLで403...と全方位塞がってるため、bobzabethのローカルPCで
// `npm run fetch:bgg` を実行→生成された public/bgg-hot.json をcommit→Vercel配信、
// という静的JSON運用に落ち着いた。
export async function fetchHotGames(): Promise<{
  games: BggGame[];
  debug: DebugInfo;
  fetchedAt: string;
}> {
  const t0 = performance.now();
  console.log(`${LOG} fetching static ${STATIC_URL}`);

  let res: Response;
  try {
    res = await fetch(STATIC_URL, { cache: "no-store" });
  } catch (networkErr) {
    console.error(`${LOG} network error`, networkErr);
    const err: FetchError = new Error(
      `静的JSON取得に失敗: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`
    );
    err.where = "static-fetch";
    throw err;
  }

  const elapsedMs = Math.round(performance.now() - t0);

  if (!res.ok) {
    const bodyPreview = await res.text().catch(() => "(body read failed)");
    console.error(
      `${LOG} ${STATIC_URL} returned ${res.status}: ${bodyPreview.slice(0, 200)}`
    );
    const err: FetchError = new Error(
      `${STATIC_URL} returned HTTP ${res.status}`
    );
    err.where = "static-fetch";
    err.status = res.status;
    err.bodyPreview = bodyPreview.slice(0, 300);
    throw err;
  }

  const data = await res.json();
  const games: BggGame[] = data.games ?? [];
  const fetchedAt: string = data.fetchedAt ?? "";

  console.log(
    `${LOG} loaded ${games.length} games (fetchedAt=${fetchedAt}) in ${elapsedMs}ms`
  );

  if (games.length === 0) {
    console.warn(
      `${LOG} games array is empty — run \`npm run fetch:bgg\` locally to populate ${STATIC_URL}`
    );
  }

  return {
    games,
    fetchedAt,
    debug: {
      source: STATIC_URL,
      fetchedAt,
      gamesCount: games.length,
      elapsedMs,
    },
  };
}
