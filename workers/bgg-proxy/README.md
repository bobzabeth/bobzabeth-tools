# BGG Proxy (Cloudflare Workers)

BoardGameGeek XML API を叩くための薄いプロキシ。CloudflareのIPからBGGを叩いて、レスポンスにCORSヘッダを付けてブラウザに返すだけ。

## なぜ必要か

| 経路 | 結果 |
|---|---|
| Vercel/AWS → BGG | 401 Unauthorized（クラウドIPブロック） |
| ブラウザ → BGG | "Load failed"（BGGがCORSヘッダ返さない） |
| ブラウザ → corsproxy.io → BGG | 開発環境のみ無料、本番URLからは403 |
| **ブラウザ → このWorker → BGG** | ✅ |

## デプロイ手順（Dashboard版・推奨）

1. **Cloudflareアカウント作成**（持ってればスキップ）
   - https://dash.cloudflare.com/sign-up にメアドだけで登録（無料・カード不要）

2. **Workerを作成**
   - ダッシュボード → 左メニュー「Workers & Pages」
   - 「Create application」→「Create Worker」
   - 名前を `bgg-proxy` などにして「Deploy」（デフォルトHello Worldが立つ）

3. **コードを差し替え**
   - Workerページの「Edit code」をクリック
   - 左ペインのコードを全削除して、本リポジトリの [`src/index.js`](./src/index.js) の中身をコピペ
   - 右上「Save and Deploy」

4. **URLをコピー**
   - Workerのトップに `https://bgg-proxy.<あなたのサブドメイン>.workers.dev` というURLが表示される
   - ブラウザで `https://bgg-proxy.<sub>.workers.dev/?url=https%3A%2F%2Fboardgamegeek.com%2Fxmlapi2%2Fhot%3Ftype%3Dboardgame` を叩いてXMLが返ってくれば成功 🎉

5. **Vercelの環境変数に登録**
   - Vercelプロジェクト → Settings → Environment Variables
   - `NEXT_PUBLIC_BGG_PROXY_URL` = `https://bgg-proxy.<sub>.workers.dev/?url=`（末尾の `?url=` まで含める）
   - 全環境（Production / Preview / Development）にチェック
   - Save → 次のデプロイから有効

## デプロイ手順（wrangler CLI派）

```bash
cd workers/bgg-proxy
npm install -g wrangler   # 初回のみ
npx wrangler login         # ブラウザでCloudflare認証
npx wrangler deploy        # デプロイ、URL表示される
```

その後、上記「5. Vercelの環境変数に登録」を実施。

## ローカル動作確認

Vercel env varを設定しない場合、`app/bgg/lib.ts` は `corsproxy.io` にフォールバックします（localhostでは無料で動く）。

env varを設定すれば本番Workerが使われます。ローカルでもWorker経由にしたい場合は `.env.local` に同じ値を入れればOK。

## 制限・運用

- 無料枠: 100,000 リクエスト/日（個人ツールなら十分余裕）
- BGG XML API以外のURLは403で弾く（汎用プロキシ化を防止）
- Workerのlogsはダッシュボードから見れる（`Logs`タブ）
