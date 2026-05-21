<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Workflow

- 変更したら毎回プルリクを作る（feature ブランチに push → `gh`/MCP で PR を立てる）。bobzabeth がローカルでプルして検証する流れ。
- デバッグ情報はトグル不要・**常時出力**（`?debug=1` のような明示フラグは作らない）。`console.log` / `console.error` は `[ツール名]` プレフィックスで残し、エラー画面にも詳細JSONを `<details>` で展開できるようにする。

# 外部APIを叩くときの注意

- **BoardGameGeek (BGG) XML API は Vercel/AWS等のクラウドIPを 401 で弾く + CORSヘッダも返さない**。さらに `corsproxy.io` 等の公開プロキシは本番URLから叩くと 403（無料利用は localhost のみ）。**自前の Cloudflare Workers proxy を立てて経由する**のが最終解（`workers/bgg-proxy/` 参照）。lib側は `NEXT_PUBLIC_BGG_PROXY_URL` env varでプロキシURLを切替、未設定時は `corsproxy.io` にフォールバック（localhost開発用）。
- 一般に「クラウドIPから弾かれそうな公開API」 × 「CORSヘッダがないAPI」の組み合わせは Cloudflare Workers proxy 方式で。コードは `workers/bgg-proxy/src/index.js` のテンプレを流用すればOK。
