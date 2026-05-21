<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Workflow

- 変更したら毎回プルリクを作る（feature ブランチに push → `gh`/MCP で PR を立てる）。bobzabeth がローカルでプルして検証する流れ。
- デバッグ情報はトグル不要・**常時出力**（`?debug=1` のような明示フラグは作らない）。`console.log` / `console.error` は `[ツール名]` プレフィックスで残し、エラー画面にも詳細JSONを `<details>` で展開できるようにする。

# 外部APIを叩くときの注意

- **BoardGameGeek (BGG) XML API は Vercel/AWS等のクラウドIPから 401 "Unauthorized" を返す**。さらにBGG側にCORSヘッダもないのでブラウザ直fetchも `Load failed` で死ぬ。**ブラウザから公開CORSプロキシ (`https://corsproxy.io/?url=...`) 経由で叩く**のが現実解。プロキシはBGGとCORS両方の問題を同時に回避してくれる（プロキシのIPは弾かれてない＆プロキシがCORSヘッダを付与してくれる）。
- 一般に「クラウドIPから弾かれそうな公開API」 × 「CORSヘッダがないAPI」の組み合わせは同じ方針で。プロキシ依存が嫌なら自前のCloudflare Workersに薄いproxyを立てる。
