"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Item, Itinerary } from "./types";
import {
  generateShareUrl,
  loadDraft,
  saveDraft,
  sortItemsByTime,
} from "./utils";
import TimelineView from "./components/TimelineView";

const DEFAULT_ITINERARY: Itinerary = {
  title: "",
  date: new Date().toISOString().slice(0, 10),
  items: [],
};

function newItem(): Item {
  return {
    id: crypto.randomUUID(),
    startTime: "09:00",
    name: "",
  };
}

export default function PlanPage() {
  const [itinerary, setItinerary] = useState<Itinerary>(DEFAULT_ITINERARY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [exporting, setExporting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // localStorageから復元
  useEffect(() => {
    const draft = loadDraft();
    if (draft) setItinerary(draft);
  }, []);

  // 自動保存
  useEffect(() => {
    saveDraft(itinerary);
  }, [itinerary]);

  const updateItem = useCallback((updated: Item) => {
    setItinerary((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === updated.id ? updated : it)),
    }));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItinerary((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== id),
    }));
    setEditingId(null);
  }, []);

  const addItem = () => {
    const item = newItem();
    // 最後のアイテムの時間の1時間後を初期値に
    const sorted = sortItemsByTime(itinerary.items);
    if (sorted.length > 0) {
      const last = sorted[sorted.length - 1];
      const [h, m] = (last.endTime ?? last.startTime).split(":").map(Number);
      const nextH = Math.min(h + 1, 23);
      item.startTime = `${String(nextH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    setItinerary((prev) => ({ ...prev, items: [...prev.items, item] }));
    setEditingId(item.id);
  };

  const handleShare = async () => {
    const url = generateShareUrl(itinerary);
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg("URLをコピーしました！");
    } catch {
      setShareMsg(url);
    }
    setTimeout(() => setShareMsg(""), 3000);
  };

  const handleExport = async () => {
    if (!timelineRef.current) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(timelineRef.current, {
        backgroundColor: "#FFFBF5",
        pixelRatio: 2,
      });
      setPreviewUrl(dataUrl);
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const link = document.createElement("a");
    link.download = `${itinerary.title || "おでかけ"}_${itinerary.date}.png`;
    link.href = previewUrl;
    link.click();
  };

  const handleLineShare = () => {
    const url = generateShareUrl(itinerary);
    const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
    window.open(lineUrl, "_blank");
  };

  const handleReset = () => {
    if (!confirm("作成中の旅程をリセットしますか？")) return;
    setItinerary(DEFAULT_ITINERARY);
    setEditingId(null);
  };

  return (
    <main className="min-h-screen bg-[#FFFBF5] font-sans text-slate-800">
      {/* 背景装飾 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-sky-100 rounded-full opacity-60 blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-blue-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 w-72 h-72 bg-cyan-100 rounded-full opacity-50 blur-3xl" />
      </div>

      <div className="relative max-w-xl mx-auto px-4 py-12 space-y-4">

        {/* ページヘッダー */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6 text-center space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
              おでかけプランナー
            </span>
          </h1>
          <p className="text-slate-500 text-sm">
            旅の流れをかんたんにまとめて、みんなにシェアしよう
          </p>
        </div>

        {/* タイトル・日付カード */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              タイトル
            </label>
            <input
              type="text"
              value={itinerary.title}
              onChange={(e) =>
                setItinerary((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="例：京都旅行 1日目"
              className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-slate-700 font-bold text-lg focus:outline-none focus:border-sky-300 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              日付
            </label>
            <input
              type="date"
              value={itinerary.date}
              onChange={(e) =>
                setItinerary((prev) => ({ ...prev, date: e.target.value }))
              }
              className="border-2 border-slate-100 rounded-2xl px-4 py-3 text-slate-700 focus:outline-none focus:border-sky-300 bg-slate-50"
            />
          </div>
        </div>

        {/* タイムライン */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              タイムライン — {itinerary.items.length}コマ
            </p>
            <button
              onClick={() => { setIsPreview((v) => !v); setEditingId(null); }}
              className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                isPreview
                  ? "bg-sky-500 text-white"
                  : "border-2 border-sky-200 text-sky-400 hover:border-sky-400 hover:text-sky-600"
              }`}
            >
              {isPreview ? "✏️ 編集に戻る" : "👁 完成プレビュー"}
            </button>
          </div>
          <TimelineView
            ref={timelineRef}
            itinerary={itinerary}
            editingId={isPreview ? null : editingId}
            onUpdate={isPreview ? undefined : updateItem}
            onDelete={isPreview ? undefined : deleteItem}
            onCardClick={isPreview ? undefined : (id) =>
              setEditingId((prev) => (prev === id ? null : id))
            }
            onClose={() => setEditingId(null)}
          />

          {/* コマ追加ボタン（プレビュー時は非表示） */}
          {!isPreview && (
            <button
              onClick={addItem}
              className="mt-4 w-full border-2 border-dashed border-sky-200 rounded-2xl py-3 text-sky-400 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50/50 transition-all text-sm font-bold"
            >
              ＋ コマを追加
            </button>
          )}
        </div>

        {/* アクションエリア */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6 space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-2">
            シェア・書き出し
          </p>
          <button
            onClick={handleShare}
            disabled={!itinerary.title || itinerary.items.length === 0}
            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-sky-200 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            🔗 シェアURLをコピー
          </button>
          {shareMsg && (
            <p className="text-xs text-center text-sky-500 font-medium break-all">
              {shareMsg}
            </p>
          )}
          <button
            onClick={handleLineShare}
            disabled={!itinerary.title || itinerary.items.length === 0}
            style={{ backgroundColor: "#06C755" }}
            className="w-full disabled:opacity-40 text-white font-bold py-3 rounded-2xl transition-all active:scale-95 hover:opacity-90 flex items-center justify-center gap-2 text-sm shadow-lg"
          >
            <span className="font-black">LINE</span>
            <span>でシェア</span>
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || itinerary.items.length === 0}
            className="w-full border-2 border-sky-200 hover:border-sky-400 hover:bg-sky-50/50 disabled:border-slate-100 disabled:text-slate-300 text-sky-500 font-bold py-3 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
          >
            {exporting ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-sky-400 border-t-transparent rounded-full" />
                書き出し中...
              </>
            ) : (
              "📷 画像で保存"
            )}
          </button>
        </div>

        {/* 画像プレビューモーダル */}
        {previewUrl && (
          <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewUrl(null)}
          >
            <div
              className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full space-y-4 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">プレビュー</p>
              <img src={previewUrl} alt="preview" className="w-full rounded-2xl border border-slate-100" />
              <div className="flex gap-3">
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="flex-1 border-2 border-slate-200 text-slate-400 font-bold py-3 rounded-2xl text-sm hover:border-slate-300 transition-all active:scale-95"
                >
                  閉じる
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold py-3 rounded-2xl text-sm shadow-lg shadow-sky-200 transition-all active:scale-95"
                >
                  ダウンロード
                </button>
              </div>
            </div>
          </div>
        )}

        {/* リセット */}
        <div className="text-center">
          <button
            onClick={handleReset}
            className="text-xs text-slate-300 hover:text-slate-500 transition-colors"
          >
            最初からやり直す
          </button>
        </div>

        <footer className="text-center text-xs text-slate-300 pb-4">
          <a href="/" className="hover:text-sky-400 transition-colors">
            ← ツール一覧に戻る
          </a>
        </footer>
      </div>
    </main>
  );
}
