# 旅程スケジュールツール 実装計画

**設計ドキュメント:** `docs/superpowers/specs/2026-04-06-itinerary-tool-design.md`  
**作成日:** 2026-04-06

---

## ステップ 1: ライブラリのインストール

```bash
npm install lz-string html2canvas
npm install --save-dev @types/html2canvas
```

---

## ステップ 2: 型定義とユーティリティ

**`app/plan/types.ts`** — `Itinerary` / `Item` 型を定義

**`app/plan/utils.ts`** — 以下の関数を実装：
- `encodeItinerary(itinerary)` → URL用圧縮文字列
- `decodeItinerary(str)` → `Itinerary | null`
- `generateShareUrl(itinerary)` → フルURL文字列

---

## ステップ 3: コンポーネント

**`app/plan/components/TimelineView.tsx`**  
タイムライン全体を囲むコンポーネント。`html2canvas` のキャプチャ対象。`ref` を外部から受け取る。

**`app/plan/components/TimelineCard.tsx`**  
1コマのカード。`isEditing` フラグで表示モード／編集モードを切り替え。

**`app/plan/components/TransportBadge.tsx`**  
コマとコマの間に表示する移動情報バッジ（徒歩・電車・車・バス・その他）。

---

## ステップ 4: 作成・編集ページ

**`app/plan/page.tsx`**

- `"use client"` / `useState` で `Itinerary` を管理
- `useEffect` で `localStorage` への自動保存と起動時の復元
- コマ追加・削除・編集・開始時間順ソート
- シェアURL生成（クリップボードコピー）
- `html2canvas` で画像書き出し

---

## ステップ 5: 閲覧ページ

**`app/plan/view/page.tsx`**

- `useSearchParams()` で `d` パラメータを取得
- `decodeItinerary()` で展開・バリデーション（不正データは404相当のエラー表示）
- `TimelineView` を読み取り専用で表示
- 画像で保存 ＋ URLコピーボタン

---

## ステップ 6: トップページへの追加

**`app/page.tsx`** の `TOOLS` 配列に旅程ツールのエントリを追加。
カラー: `from-sky-400 to-blue-500`

---

## 実装順序

1. ライブラリインストール
2. `types.ts` + `utils.ts`
3. `TransportBadge.tsx` + `TimelineCard.tsx` + `TimelineView.tsx`
4. `app/plan/page.tsx`（作成ページ）
5. `app/plan/view/page.tsx`（閲覧ページ）
6. `app/page.tsx` のツール一覧に追加
7. 動作確認（作成→シェアURL→閲覧→画像書き出し）
