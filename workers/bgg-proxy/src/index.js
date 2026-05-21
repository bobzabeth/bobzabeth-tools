// Cloudflare Workers proxy for BoardGameGeek XML API
//
// なぜ必要か:
//   - BGG XML APIは Vercel/AWS等のクラウドIPを401で弾く
//   - BGG側はCORSヘッダを返さないのでブラウザ直fetchも"Load failed"で死ぬ
//   - corsproxy.io等の公開プロキシは本番URLからだと403を返す
//   → CloudflareのIPからBGGを叩き、CORSヘッダを付与してブラウザに返す薄いproxy
//
// 安全策: BGG XML API以外のURLは弾く（汎用proxyとして悪用されないように）

const ALLOWED_PREFIX = "https://boardgamegeek.com/xmlapi2/";
const UA =
  "bobzabeth-tools-bgg-proxy/1.0 (+https://github.com/bobzabeth/bobzabeth-tools)";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, { status: 405 });
    }

    const url = new URL(request.url);
    const target = url.searchParams.get("url");

    if (!target) {
      return json(
        {
          error:
            "Missing ?url= query parameter. Example: ?url=https%3A%2F%2Fboardgamegeek.com%2Fxmlapi2%2Fhot%3Ftype%3Dboardgame",
        },
        { status: 400 }
      );
    }

    if (!target.startsWith(ALLOWED_PREFIX)) {
      return json(
        {
          error: `Only ${ALLOWED_PREFIX}* URLs are proxied. Got: ${target}`,
        },
        { status: 403 }
      );
    }

    console.log(`[bgg-proxy] GET upstream=${target}`);

    try {
      const upstream = await fetch(target, {
        headers: {
          "User-Agent": UA,
          Accept: "application/xml, text/xml, */*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        cf: {
          // Cloudflare edge cache: 1時間
          cacheTtl: 3600,
          cacheEverything: true,
        },
      });

      console.log(`[bgg-proxy] upstream status=${upstream.status}`);

      const body = await upstream.text();
      const contentType =
        upstream.headers.get("Content-Type") || "application/xml";

      return new Response(body, {
        status: upstream.status,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
          "X-Upstream-Status": String(upstream.status),
        },
      });
    } catch (e) {
      console.error("[bgg-proxy] upstream fetch failed", e);
      return json(
        { error: `Upstream fetch failed: ${e && e.message ? e.message : String(e)}` },
        { status: 502 }
      );
    }
  },
};
