<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Workflow

- 変更したら毎回プルリクを作る（feature ブランチに push → `gh`/MCP で PR を立てる）。bobzabeth がローカルでプルして検証する流れ。
- デバッグ情報はトグル不要・**常時出力**（`?debug=1` のような明示フラグは作らない）。`console.log` / `console.error` は `[ツール名]` プレフィックスで残し、エラー画面にも詳細JSONを `<details>` で展開できるようにする。

# 外部APIを叩くときの注意

- **BoardGameGeek (BGG) XML API は全方位ブロック済み**: Vercel/AWS/Cloudflare Workers 等のクラウドIPは401で弾かれ、ブラウザ直fetchはCORSヘッダ無しで死に、`corsproxy.io` 等の公開プロキシも本番URLから403で弾く。**結論: ローカル(自宅IP)で取得して静的JSONとしてリポジトリに同梱する方式に決定**。
- 実装: `scripts/fetch-bgg.mjs` をローカルで実行 (`npm run fetch:bgg`) → `public/bgg-hot.json` 生成 → commit&push で Vercel に反映。アプリ (`app/bgg/lib.ts`) は静的JSONを読むだけ。
- 一般に「クラウドIPから弾かれる公開API」 × 「CORSヘッダがないAPI」はこの静的JSON方式で。リアルタイム性が必要なAPIには使えない。
