# おでかけプランナー Phase 2 設計書

**日付:** 2026-04-06  
**対象:** Supabase DB導入による短縮URL・複数プラン管理・任意パスワード共同編集

---

## 概要

Phase 1 では旅程データを lz-string で URL エンコードして共有する方式を採用した。Phase 2 では Supabase DB を導入し、以下を実現する：

1. 短縮URL（`/plan/abc123` 形式）
2. 複数プランの管理（ブラウザ別 localStorage ベース）
3. 任意パスワードによる編集保護

---

## DB スキーマ（Supabase）

```sql
CREATE TABLE plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code      text UNIQUE NOT NULL,         -- 6文字英数字
  data            jsonb NOT NULL,               -- Itinerary オブジェクト
  edit_password_hash text,                      -- NULL = パスワードなし（URL知ってれば誰でも編集可）
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now()    -- クリーンアップ用
);

CREATE INDEX idx_plans_short_code ON plans(short_code);
```

### RLS ポリシー

- SELECT: anon で全行許可（閲覧は誰でも可）
- INSERT: anon で許可（アプリ側で short_code 生成）
- UPDATE: anon で許可（パスワード検証はアプリ側 API Route で行う）
- DELETE: 不可（クリーンアップは pg_cron のみ）

### ストレージ管理

旅程 1 件 ≈ 1〜3KB。無料枠 500MB ≒ 15万〜50万件。

```sql
-- 1年間アクセスなしのプランを毎週日曜 3:00 に削除（pg_cron）
SELECT cron.schedule(
  'weekly-cleanup',
  '0 3 * * 0',
  $$DELETE FROM plans WHERE last_accessed_at < NOW() - INTERVAL '1 year'$$
);
```

---

## URL 構造

| URL | 役割 |
|---|---|
| `/plan` | 新規作成ページ（既存、変更なし） |
| `/plan/[code]` | 閲覧専用（DB から取得） |
| `/plan/[code]/edit` | 編集ページ（パスワードなし or 認証後） |
| `/plan/view?d=...` | 旧URL（後方互換、引き続き動作） |

---

## フロー

### 新規作成 → シェア

1. `/plan` で旅程を作成（localStorage draft は Phase 1 と同じ）
2. 「シェアURLをコピー」または「LINEでシェア」押下時：
   - シェアモーダルを表示
   - パスワード設定（任意入力）
   - 「保存してURLをコピー」ボタン → API Route でDB保存
   - short_code を受け取り → `https://.../plan/abc123` をクリップボードにコピー
   - その short_code を localStorage の `my_plans` 配列に追記

### 閲覧（`/plan/[code]`）

1. DB から short_code で取得（`last_accessed_at` 更新）
2. ViewOnly な TimelineView を表示（編集ボタンへのリンクあり）
3. 「編集する」ボタン → `/plan/[code]/edit` へ

### 編集（`/plan/[code]/edit`）

- **パスワードなし:** そのまま編集画面
- **パスワードあり:** パスワード入力モーダル → 正しければ編集画面
  - パスワードはセッションストレージに保持（ページ離脱まで再入力不要）
- 変更は自動保存（デバウンス 1 秒）または「保存」ボタンで DB に PATCH

### マイプラン管理

- `/plan` ページ上部に「マイプラン」セクション
- localStorage `my_plans: ["abc123", "xyz789"]` を読み取り
- Supabase から `short_code IN (...)` でタイトル・日付を一括取得し表示
- 各プランのリンクは `/plan/[code]`
- 削除はローカルリストからの除外のみ（DB上は残る、TTLで自然消滅）

---

## API Routes

### `POST /api/plans`
プランを新規作成。

**Request body:**
```json
{
  "data": { /* Itinerary */ },
  "editPassword": "optional-password-or-null"
}
```

**Response:**
```json
{ "shortCode": "abc123" }
```

処理:
- 6文字の short_code をランダム生成（衝突時リトライ）
- editPassword が非 null の場合 bcrypt でハッシュ化
- Supabase に INSERT

### `GET /api/plans/[code]`
プランデータを取得。`last_accessed_at` を更新。

**Response:**
```json
{
  "data": { /* Itinerary */ },
  "hasPassword": true
}
```

### `PATCH /api/plans/[code]`
プランデータを更新。

**Request body:**
```json
{
  "data": { /* Itinerary */ },
  "editPassword": "current-password-or-null"
}
```

処理:
- DB の `edit_password_hash` が NULL → パスワード検証スキップ
- NULL でない場合 → bcrypt.compare で検証、失敗なら 403

### `POST /api/plans/[code]/verify`
パスワード検証のみ（編集前チェック用）。

**Request body:** `{ "editPassword": "..." }`  
**Response:** `{ "ok": true }` or 403

---

## 後方互換性

`/plan/view?d=...` は引き続き動作させる。  
既存ユーザーのブックマークや共有済みURLが壊れないよう、`app/plan/view/page.tsx` はそのまま維持する。

---

## セキュリティ

- パスワードは bcrypt (cost=10) でハッシュ化、平文は DB に保存しない
- short_code は cryptographically random（`crypto.randomBytes` ベース）
- API Route でレート制限（将来的に考慮、Phase 2 では省略可）
- Supabase anon key は環境変数で管理（`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`）
- DB への直接 UPDATE/DELETE は anon key では不可（service_role key は API Route のみで使用）

---

## 環境変数

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # API Route のみ（サーバーサイド）
```

---

## フロントエンド変更箇所

| ファイル | 変更内容 |
|---|---|
| `app/plan/page.tsx` | シェアボタンの動作変更（シェアモーダル追加）、マイプランセクション追加 |
| `app/plan/[code]/page.tsx` | 新規作成（閲覧ページ） |
| `app/plan/[code]/edit/page.tsx` | 新規作成（編集ページ、パスワード保護対応） |
| `app/plan/view/page.tsx` | 変更なし（後方互換） |
| `app/plan/utils.ts` | DB 保存・取得関数追加 |

---

## スコープ外（Phase 3 以降）

- ユーザー認証（ログイン）
- 複数日程（days[] 構造）→ Phase 3
- PDF 出力
- ドラッグ&ドロップ並び替え
