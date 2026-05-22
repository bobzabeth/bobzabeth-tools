<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Workflow

- 変更したら毎回プルリクを作る（feature ブランチに push → `gh`/MCP で PR を立てる）。bobzabeth がローカルでプルして検証する流れ。
- デバッグ情報はトグル不要・**常時出力**（`?debug=1` のような明示フラグは作らない）。`console.log` / `console.error` は `[ツール名]` プレフィックスで残し、エラー画面にも詳細JSONを `<details>` で展開できるようにする。

# 外部APIを叩くときの注意

- **BoardGameGeek (BGG) XML API は2025年から登録制 + Bearer token 必須化**（[公式docs](https://boardgamegeek.com/wiki/page/Using_the_XML_API)）。さらに公式が「サーバー側でキャッシュ前提・クライアント直叩きは禁止寄り」と明言してるので、ローカル取得して静的JSONを同梱する方式が最も筋がいい。
- 実装: `scripts/fetch-bgg.mjs` をローカルで実行 (`npm run fetch:bgg`) → `public/bgg-hot.json` 生成 → commit&push で Vercel に反映。アプリ (`app/bgg/lib.ts`) は静的JSONを読むだけ。
- セットアップ: `.env.example` を `.env.local` にコピー、`BGG_API_TOKEN` にトークン貼り付け（取得手順は `.env.example` 参照）。トークンは個人ツールなら "Non-commercial" で無料、承認は数日〜1週間。
- BGG XML API2 の追加仕様（ [docs](https://boardgamegeek.com/wiki/page/BGG_XML_API2) より）:
  - **Authorization: Bearer <token>** ヘッダ必須（無いと401、`Bearer` の後ろは半角スペース、コロンは付けない）
  - **連続リクエストは5秒以上空ける**（連投すると500/503）
  - **thing endpointは1回最大20件**
  - **`boardgamegeek.com` を使う**（`www.boardgamegeek.com` はNG、authorization に支障）
- 一般に「認証必須＆CORSヘッダ無し」のAPIはこの静的JSON方式で。リアルタイム性が必要なAPIには使えない。
