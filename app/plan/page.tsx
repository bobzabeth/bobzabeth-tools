"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Item, Itinerary } from "./types";
import {
  loadDraft,
  saveDraft,
  sortItemsByTime,
  savePlanToDb,
  addMyPlanCode,
  getMyPlanCodes,
  removeMyPlanCode,
  loadPlanFromDb,
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

type MyPlan = { code: string; title: string; date: string };

export default function PlanPage() {
  const [itinerary, setItinerary] = useState<Itinerary>(DEFAULT_ITINERARY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItemId, setNewItemId] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [myPlans, setMyPlans] = useState<MyPlan[]>([]);

  // シェアモーダル
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [shareForLine, setShareForLine] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) setItinerary(draft);
  }, []);

  useEffect(() => {
    saveDraft(itinerary);
  }, [itinerary]);

  // マイプラン読み込み
  useEffect(() => {
    const codes = getMyPlanCodes();
    if (codes.length === 0) return;
    Promise.all(codes.map((code) => loadPlanFromDb(code).then((r) => r ? { code, title: r.data.title, date: r.data.date } : null)))
      .then((results) => setMyPlans(results.filter((r): r is MyPlan => r !== null)));
  }, []);

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
    const sorted = sortItemsByTime(itinerary.items);
    if (sorted.length > 0) {
      const last = sorted[sorted.length - 1];
      const [h, m] = (last.endTime ?? last.startTime).split(":").map(Number);
      const nextH = Math.min(h + 1, 23);
      item.startTime = `${String(nextH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    setItinerary((prev) => ({ ...prev, items: [...prev.items, item] }));
    setEditingId(item.id);
    setNewItemId(item.id);
  };

  const openShareModal = (forLine = false) => {
    setShareForLine(forLine);
    setSharePassword("");
    setShareMsg("");
    setShowShareModal(true);
  };

  const handleShareSave = async () => {
    setSharing(true);
    try {
      const code = await savePlanToDb(itinerary, sharePassword || undefined);
      addMyPlanCode(code);
      // マイプランに追加
      setMyPlans((prev) => [{ code, title: itinerary.title, date: itinerary.date }, ...prev.filter((p) => p.code !== code)]);

      const url = `${window.location.origin}/plan/${code}`;
      if (shareForLine) {
        setShowShareModal(false);
        window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`, "_blank");
      } else {
        try {
          await navigator.clipboard.writeText(url);
          setShareMsg("URLをコピーしました！");
        } catch {
          setShareMsg(url);
        }
        setTimeout(() => { setShowShareModal(false); setShareMsg(""); }, 2000);
      }
    } catch {
      setShareMsg("保存に失敗しました");
    } finally {
      setSharing(false);
    }
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

  const handleReset = () => {
    if (!confirm("作成中の旅程をリセットしますか？")) return;
    setItinerary(DEFAULT_ITINERARY);
    setEditingId(null);
  };

  const handleRemoveMyPlan = (code: string) => {
    removeMyPlanCode(code);
    setMyPlans((prev) => prev.filter((p) => p.code !== code));
  };

  const canShare = !!itinerary.title && itinerary.items.length > 0;

  return (
    <main className="min-h-screen bg-[#FFFBF5] font-sans text-slate-800">
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

        {/* マイプラン */}
        {myPlans.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6 space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">マイプラン</p>
            {myPlans.map((plan) => (
              <div key={plan.code} className="flex items-center gap-3 group">
                <a
                  href={`/plan/${plan.code}/edit`}
                  className="flex-1 min-w-0 bg-slate-50 hover:bg-sky-50 border-2 border-slate-100 hover:border-sky-200 rounded-2xl px-4 py-3 transition-all"
                >
                  <p className="font-bold text-slate-700 text-sm truncate">{plan.title || "タイトル未設定"}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{plan.date}</p>
                </a>
                <button
                  onClick={() => handleRemoveMyPlan(plan.code)}
                  className="flex-shrink-0 text-slate-200 hover:text-red-400 transition-colors text-lg leading-none opacity-0 group-hover:opacity-100"
                  title="リストから削除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

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
            newItemId={isPreview ? null : newItemId}
            onUpdate={isPreview ? undefined : updateItem}
            onDelete={isPreview ? undefined : deleteItem}
            onCardClick={isPreview ? undefined : (id) => {
              setNewItemId(null);
              setEditingId((prev) => (prev === id ? null : id));
            }}
            onClose={() => { setNewItemId(null); setEditingId(null); }}
          />
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
            onClick={() => openShareModal(false)}
            disabled={!canShare}
            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-sky-200 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            🔗 シェアURLをコピー
          </button>
          <button
            onClick={() => openShareModal(true)}
            disabled={!canShare}
            style={canShare ? { backgroundColor: "#06C755" } : undefined}
            className="w-full disabled:opacity-40 disabled:bg-slate-200 text-white font-bold py-3 rounded-2xl transition-all active:scale-95 hover:opacity-90 flex items-center justify-center gap-2 text-sm shadow-lg"
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

        {/* シェアモーダル */}
        {showShareModal && (
          <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowShareModal(false)}
          >
            <div
              className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-base font-black text-slate-800">🔗 プランをシェア</p>
              <div className="bg-slate-50 rounded-2xl px-4 py-3">
                <p className="font-bold text-slate-700 text-sm">{itinerary.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{itinerary.date} / {itinerary.items.length}コマ</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  編集パスワード（任意）
                </label>
                <input
                  type="password"
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                  placeholder="設定しない場合はURL共有で誰でも編集可"
                  className="w-full border-2 border-slate-100 rounded-2xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-sky-300 bg-white"
                />
              </div>
              {shareMsg && (
                <p className="text-xs text-center text-sky-500 font-medium break-all">{shareMsg}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 border-2 border-slate-200 text-slate-400 font-bold py-3 rounded-2xl text-sm hover:border-slate-300 transition-all"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleShareSave}
                  disabled={sharing}
                  className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold py-3 rounded-2xl text-sm shadow-lg transition-all active:scale-95 disabled:opacity-60"
                >
                  {sharing ? "保存中..." : shareForLine ? "LINEでシェア" : "URLをコピー"}
                </button>
              </div>
            </div>
          </div>
        )}

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
