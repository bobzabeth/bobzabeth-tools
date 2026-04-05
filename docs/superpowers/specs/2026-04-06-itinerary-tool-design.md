# 旅程スケジュールツール 設計ドキュメント

**作成日:** 2026-04-06  
**ステータス:** 承認済み

---

## 概要

旅行グループ向けの旅程・日程スケジュール作成ツール。
作るのが簡単で、当日の流れがひと目でわかる洗練されたUIを目指す。
「あのツール使おうよ！」と友達に勧めたくなる体験を目標とする。

既存サイト「ボブザベスの『これ便利じゃね？』」に新ツールとして追加する。

---

## スコープ（v1）

**含む：**
- 手動での行程作成・編集
- タイムライン表示（縦並び＋カード）
- URLシェア（閲覧専用）
- 画像書き出し（PNG）

**含まない（将来対応）：**
- AIアドバイス機能
- リアルタイム共同編集
- PDF書き出し
- 写真アップロード（外部URLのみ対応）

---

## ページ構成

### `/plan` — 作成・編集ページ

作る人が使うページ。行程を入力してタイムラインをプレビューしながら編集できる。

**レイアウト（上から順に）：**
1. ヘッダーカード：タイトル入力 ＋ 日付選択
2. タイムラインエリア：各コマのカードを縦に並べる
3. 「＋ コマを追加」ボタン
4. アクションエリア：シェアURL生成 ＋ 画像で保存

**インタラクション：**
- 各カードをタップするとインライン編集（モーダルなし）
- コマは開始時間順に自動ソート
- 移動情報はコマとコマの間にバッジとして表示
- 編集内容は `localStorage` にリアルタイム自動保存（タブを閉じても復元できる）

### `/plan/view?d=<base64>` — 閲覧ページ（シェア先）

シェアされたURLを開いた人が見るページ。編集UIは一切表示しない。

**レイアウト：**
1. ヘッダー：タイトル ＋ 日付（シンプル表示）
2. タイムライン（作成ページと同じ見た目）
3. フッター：「📷 画像で保存」＋「🔗 URLをコピー」

---

## データ構造

```typescript
type Itinerary = {
  title: string       // 例: "京都旅行 1日目"
  date: string        // "YYYY-MM-DD"
  items: Item[]
}

type Item = {
  id: string
  startTime: string        // "HH:mm"（必須）
  endTime?: string         // "HH:mm"（任意）
  name: string             // イベント名（必須）
  memo?: string            // メモ（任意）
  photoUrl?: string        // 外部画像URL（任意）
  mapUrl?: string          // Google Maps等のURL（任意）
  transport?: {            // 次のコマへの移動情報（任意）
    mode: "walk" | "train" | "car" | "bus" | "other"
    duration?: string      // 例: "約15分"
  }
}
```

---

## URLシェアの仕組み

1. `JSON.stringify(itinerary)` でJSON化
2. `lz-string` ライブラリで圧縮（`compressToEncodedURIComponent`）
3. `/plan/view?d=<圧縮文字列>` として生成
4. 閲覧ページで逆に展開して表示

データが増えてURLが長くなった場合も `lz-string` の圧縮で実用的な長さに収まる。

---

## 画像書き出し

- `html2canvas` ライブラリでタイムライン部分をキャプチャ
- PNGとしてダウンロード
- ファイル名: `{タイトル}_{日付}.png`
- スマホでも動作確認必須

---

## 追加ライブラリ

| ライブラリ | 用途 |
|-----------|------|
| `lz-string` | URLへのデータ圧縮 |
| `html2canvas` | タイムラインの画像書き出し |

---

## UIデザイン方針

既存の「イイ感じ敬語くん」と同じデザイン言語を踏襲する：

- 背景: `bg-[#FFFBF5]` または淡いグラデーション
- カード: `bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl`
- アクセントカラー: 旅行らしく **空色系**（`from-sky-400 to-blue-500`）
- フォント: 既存のTailwind sans設定を使用
- アニメーション: `animate-in fade-in slide-in-from-bottom-4` で入場

---

## ファイル構成（予定）

```
app/
  plan/
    page.tsx              # 作成・編集ページ（Client Component）
    view/
      page.tsx            # 閲覧ページ（Client Component）
    components/
      TimelineCard.tsx    # 1コマのカード
      TransportBadge.tsx  # 移動情報バッジ
      TimelineView.tsx    # タイムライン全体（画像書き出し対象）
    types.ts              # Itinerary / Item 型定義
    utils.ts              # URL圧縮・展開ユーティリティ
```

---

## 将来拡張ポイント

- **AIアドバイス**: 行程を渡して「もっと良い順番は？」などを提案（Gemini API活用）
- **テンプレート**: よくある旅行パターンのひな形を選べる
- **複数日対応**: `items` を日付ごとにグループ化する拡張
