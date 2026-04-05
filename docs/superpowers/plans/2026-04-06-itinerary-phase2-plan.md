# おでかけプランナー Phase 2 実装計画

**設計ドキュメント:** `docs/superpowers/specs/2026-04-06-itinerary-phase2-design.md`  
**作成日:** 2026-04-06

---

## ステップ 1: Supabase セットアップ

**作業内容:**
1. Supabase ダッシュボードで新しいプロジェクトを作成（または既存プロジェクトを使用）
2. SQL Editor で `plans` テーブルと RLS ポリシーを作成
3. pg_cron でクリーンアップジョブを登録
4. Vercel 環境変数に `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` を設定
5. ローカル `.env.local` に同じ変数を設定

**SQL:**
```sql
CREATE TABLE plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code      text UNIQUE NOT NULL,
  data            jsonb NOT NULL,
  edit_password_hash text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now()
);

CREATE INDEX idx_plans_short_code ON plans(short_code);

-- RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_all" ON plans FOR SELECT USING (true);
CREATE POLICY "insert_all" ON plans FOR INSERT WITH CHECK (true);
-- UPDATE/DELETE はサービスロールのみ（API Route 経由）

-- pg_cron（Supabase ダッシュボード > Database > Extensions で pg_cron を有効化してから）
SELECT cron.schedule(
  'weekly-cleanup',
  '0 3 * * 0',
  $$DELETE FROM plans WHERE last_accessed_at < NOW() - INTERVAL '1 year'$$
);
```

**依存ライブラリのインストール:**
```bash
npm install @supabase/supabase-js bcryptjs
npm install --save-dev @types/bcryptjs
```

**完了条件:** Supabase に plans テーブルが存在し、ローカルから接続確認できる。

---

## ステップ 2: API Routes の作成

**ファイル:** `app/api/plans/route.ts`, `app/api/plans/[code]/route.ts`, `app/api/plans/[code]/verify/route.ts`

### `app/api/plans/route.ts` (POST)
- 6文字 short_code をランダム生成（`crypto.randomBytes(4).toString('base64url').slice(0,6)`）
- 衝突時は最大 5 回リトライ
- editPassword が非 null → bcrypt.hash(password, 10)
- Supabase service_role client で INSERT
- レスポンス: `{ shortCode: "abc123" }`

### `app/api/plans/[code]/route.ts` (GET, PATCH)
- GET: short_code で SELECT、`last_accessed_at` を UPDATE、レスポンスに `hasPassword: boolean`
- PATCH: editPassword を検証（hasPassword の場合）→ data を UPDATE、`updated_at`/`last_accessed_at` も更新
- パスワード不一致: 403 返却

### `app/api/plans/[code]/verify/route.ts` (POST)
- パスワード検証のみ。`{ ok: true }` or 403

**完了条件:** curl や API クライアントで POST→GET→PATCH が正常動作する。

---

## ステップ 3: `app/plan/utils.ts` にDB関連関数を追加

**追加関数:**
```typescript
// プランをDBに保存（新規）
savePlanToDb(itinerary: Itinerary, editPassword?: string): Promise<string> // short_code を返す

// プランをDBから取得
loadPlanFromDb(code: string): Promise<{ data: Itinerary; hasPassword: boolean } | null>

// プランをDBに更新（編集保存）
updatePlanInDb(code: string, itinerary: Itinerary, editPassword?: string): Promise<boolean>

// パスワード検証
verifyPlanPassword(code: string, password: string): Promise<boolean>

// マイプラン: localStorage管理
getMyPlanCodes(): string[]
addMyPlanCode(code: string): void
removeMyPlanCode(code: string): void
```

**完了条件:** 各関数が型エラーなく動作する。

---

## ステップ 4: 閲覧ページ `app/plan/[code]/page.tsx` の作成

**動作:**
1. `params.code` で DB からプランを取得
2. 取得失敗 → 「プランが見つかりません」エラー表示 + `/plan` へのリンク
3. 取得成功 → `TimelineView`（isEditable=false）を表示
4. 「編集する」ボタン → `/plan/[code]/edit` へのリンク
5. 既存の画像エクスポート・LINE シェアボタンも配置
6. `last_accessed_at` 更新のため GET は API Route 経由

**SSR vs CSR:** `useSearchParams` 不要なので、Server Component + Client Component 分離で実装。ただし Next.js App Router の `params` を使う構成。

**完了条件:** `/plan/abc123` にアクセスして旅程が表示される。

---

## ステップ 5: 編集ページ `app/plan/[code]/edit/page.tsx` の作成

**動作:**
1. DB からプランを取得
2. `hasPassword: true` → パスワード入力モーダル表示
   - 正しいパスワード → sessionStorage に保存 → 編集画面へ
   - 誤り → エラーメッセージ
3. 編集画面は既存の `page.tsx` とほぼ同じ UI
4. 変更を自動保存（1秒デバウンス）or 「保存」ボタンで PATCH
5. 「シェアURL」は `/plan/[code]` 形式のURLをコピー

**完了条件:** `/plan/abc123/edit` で編集・保存ができる。

---

## ステップ 6: `/plan` ページのシェアフロー変更

**変更箇所:** `app/plan/page.tsx`

1. 「シェアURLをコピー」押下 → シェアモーダルを表示
   - 旅程タイトル・日付の確認表示
   - パスワード入力欄（任意、`type="password"`）
   - 「保存してURLをコピー」ボタン
2. ボタン押下 → `savePlanToDb()` → short_code 取得 → `addMyPlanCode()` → URLをクリップボードにコピー
3. 「LINEでシェア」も同様（先に DB 保存してから LINE URL 生成）
4. シェア済みプランは以降 PATCH（same short_code）で更新したいが、Phase 2 では「毎回新規作成」でシンプルに実装（将来的に再編集フローは `/plan/[code]/edit` を使ってもらう）

**完了条件:** シェアボタンから DB 保存 → 短縮URL コピーができる。

---

## ステップ 7: マイプランセクションの追加

**変更箇所:** `app/plan/page.tsx` の上部

1. `getMyPlanCodes()` で localStorage からコード一覧取得
2. `Promise.all` で各プランの data（タイトル・日付）を GET /api/plans/[code] から取得
3. カード形式でリスト表示（タイトル・日付・編集リンク）
4. 「このリストから削除」ボタン → `removeMyPlanCode()` → 表示から消える（DB のデータは残る）
5. コードが 0 件のときはセクション非表示

**完了条件:** マイプランが一覧表示され、クリックで `[code]/edit` に遷移できる。

---

## ステップ 8: 動作確認・後方互換テスト

1. `/plan/view?d=...` の旧URLが引き続き動作することを確認
2. 新規作成 → シェア → 閲覧 → 編集 → 保存 のフルフローを確認
3. パスワードあり・なし両方確認
4. マイプランリストの表示・削除を確認
5. スマホブラウザで動作確認（Vercel デプロイ後）

---

## ステップ 9: コミット・デプロイ

- 各ステップ完了ごとにコミット
- 最終確認後 `git push origin main` → Vercel 自動デプロイ

---

## 実装順序サマリー

```
1. Supabase セットアップ（手動作業）
2. npm install
3. API Routes
4. utils.ts 追加
5. /plan/[code]/page.tsx（閲覧）
6. /plan/[code]/edit/page.tsx（編集）
7. /plan/page.tsx のシェアフロー変更
8. マイプランセクション
9. 動作確認・デプロイ
```
