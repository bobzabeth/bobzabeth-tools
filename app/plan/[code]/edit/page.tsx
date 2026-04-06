"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { Item, Itinerary } from "../../types";
import {
  loadPlanFromDb,
  updatePlanInDb,
  verifyPlanPassword,
  sortItemsByTime,
  updateMyPlanMeta,
} from "../../utils";
import TimelineView from "../../components/TimelineView";

function newItem(): Item {
  return {
    id: crypto.randomUUID(),
    startTime: "09:00",
    name: "",
  };
}

export default function PlanEditPage() {
  const { code } = useParams<{ code: string }>();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [error, setError] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItemId, setNewItemId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "">("");
  const [exporting, setExporting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState("");
  const timelineRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sessionKey = `plan_pw_${code}`;

  useEffect(() => {
    loadPlanFromDb(code).then((result) => {
      if (!result) {
        setError(true);
        return;
      }
      setItinerary(result.data);
      if (result.hasPassword) {
        const saved = sessionStorage.getItem(sessionKey);
        if (saved) {
          setPasswordInput(saved);
          setUnlocked(true);
        } else {
          setHasPassword(true);
        }
      } else {
        setUnlocked(true);
      }
    });
  }, [code, sessionKey]);

  const handlePasswordSubmit = async () => {
    const ok = await verifyPlanPassword(code, passwordInput);
    if (ok) {
      sessionStorage.setItem(sessionKey, passwordInput);
      setHasPassword(false);
      setUnlocked(true);
    } else {
      setPasswordError(true);
    }
  };

  const saveToDb = useCallback(
    (updated: Itinerary) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveStatus("saving");
      updateMyPlanMeta(code, updated.title, updated.date);
      saveTimer.current = setTimeout(async () => {
        const pw = sessionStorage.getItem(sessionKey) || undefined;
        const ok = await updatePlanInDb(code, updated, pw);
        setSaveStatus(ok ? "saved" : "");
        if (ok) setTimeout(() => setSaveStatus(""), 2000);
      }, 1000);
    },
    [code, sessionKey]
  );

  const updateItem = useCallback(
    (updated: Item) => {
      setItinerary((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          items: prev.items.map((it) => (it.id === updated.id ? updated : it)),
        };
        saveToDb(next);
        return next;
      });
    },
    [saveToDb]
  );

  const deleteItem = useCallback(
    (id: string) => {
      setItinerary((prev) => {
        if (!prev) return prev;
        const next = { ...prev, items: prev.items.filter((it) => it.id !== id) };
        saveToDb(next);
        return next;
      });
      setEditingId(null);
    },
    [saveToDb]
  );

  const addItem = () => {
    if (!itinerary) return;
    const item = newItem();
    const sorted = sortItemsByTime(itinerary.items);
    if (sorted.length > 0) {
      const last = sorted[sorted.length - 1];
      const [h, m] = (last.endTime ?? last.startTime).split(":").map(Number);
      const nextH = Math.min(h + 1, 23);
      item.startTime = `${String(nextH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    setItinerary((prev) => {
      if (!prev) return prev;
      const next = { ...prev, items: [...prev.items, item] };
      saveToDb(next);
      return next;
    });
    setEditingId(item.id);
    setNewItemId(item.id);
  };

  const updateMeta = (patch: Partial<Itinerary>) => {
    setItinerary((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      saveToDb(next);
      return next;
    });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/plan/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg("URLをコピーしました！");
    } catch {
      setShareMsg(url);
    }
    setTimeout(() => setShareMsg(""), 3000);
  };

  const handleLineShare = () => {
    const url = `${window.location.origin}/plan/${code}`;
    window.open(
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
      "_blank"
    );
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
    if (!previewUrl || !itinerary) return;
    const link = document.createElement("a");
    link.download = `${itinerary.title || "おでかけ"}_${itinerary.date}.png`;
    link.href = previewUrl;
    link.click();
  };

  if (error) {
    return (
      <main className="min-h-screen bg-[#FFFBF5] flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <p className="text-5xl">🗺️</p>
          <p className="font-bold text-slate-700">プランが見つかりません</p>
          <a href="/plan" className="inline-block mt-4 text-sm text-sky-500 hover:text-sky-700 font-medium">
            ← 新しいプランを作る
          </a>
        </div>
      </main>
    );
  }

  if (!itinerary) {
    return (
      <main className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-sky-400 border-t-transparent rounded-full" />
      </main>
    );
  }

  if (hasPassword && !unlocked) {
    return (
      <main className="min-h-screen bg-[#FFFBF5] flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl shadow-xl border border-sky-100 p-8 max-w-sm w-full space-y-4">
          <p className="text-xl font-black text-slate-800 text-center">🔒 編集パスワード</p>
          <p className="text-sm text-slate-400 text-center">このプランの編集にはパスワードが必要です。</p>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
            onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
            placeholder="パスワードを入力"
            className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-slate-700 focus:outline-none focus:border-sky-300 bg-slate-50"
            autoFocus
          />
          {passwordError && (
            <p className="text-xs text-red-400 text-center">パスワードが違います</p>
          )}
          <button
            onClick={handlePasswordSubmit}
            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold py-3 rounded-2xl transition-all active:scale-95"
          >
            確認
          </button>
          <div className="text-center">
            <a href={`/plan/${code}`} className="text-xs text-slate-400 hover:text-sky-500">
              閲覧のみで見る
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFBF5] font-sans text-slate-800">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-sky-100 rounded-full opacity-60 blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-blue-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 w-72 h-72 bg-cyan-100 rounded-full opacity-50 blur-3xl" />
      </div>

      <div className="relative max-w-xl mx-auto px-4 py-12 space-y-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6 text-center space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
              おでかけプランナー
            </span>
          </h1>
          {saveStatus === "saving" && (
            <p className="text-xs text-slate-400">保存中...</p>
          )}
          {saveStatus === "saved" && (
            <p className="text-xs text-sky-500">✓ 保存しました</p>
          )}
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">タイトル</label>
            <input
              type="text"
              value={itinerary.title}
              onChange={(e) => updateMeta({ title: e.target.value })}
              placeholder="例：京都旅行 1日目"
              className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-slate-700 font-bold text-lg focus:outline-none focus:border-sky-300 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">日付</label>
            <input
              type="date"
              value={itinerary.date}
              onChange={(e) => updateMeta({ date: e.target.value })}
              className="border-2 border-slate-100 rounded-2xl px-4 py-3 text-slate-700 focus:outline-none focus:border-sky-300 bg-slate-50"
            />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              タイムライン — {itinerary.items.length}コマ
            </p>
          </div>
          <TimelineView
            ref={timelineRef}
            itinerary={itinerary}
            editingId={editingId}
            newItemId={newItemId}
            onUpdate={updateItem}
            onDelete={deleteItem}
            onCardClick={(id) => {
              setNewItemId(null);
              setEditingId((prev) => (prev === id ? null : id));
            }}
            onClose={() => { setNewItemId(null); setEditingId(null); }}
          />
          <button
            onClick={addItem}
            className="mt-4 w-full border-2 border-dashed border-sky-200 rounded-2xl py-3 text-sky-400 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50/50 transition-all text-sm font-bold"
          >
            ＋ コマを追加
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6 space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-2">
            シェア・書き出し
          </p>
          <button
            onClick={handleShare}
            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-sky-200 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            🔗 シェアURLをコピー
          </button>
          {shareMsg && (
            <p className="text-xs text-center text-sky-500 font-medium break-all">{shareMsg}</p>
          )}
          <button
            onClick={handleLineShare}
            style={{ backgroundColor: "#06C755" }}
            className="w-full text-white font-bold py-3 rounded-2xl transition-all active:scale-95 hover:opacity-90 flex items-center justify-center gap-2 text-sm shadow-lg"
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

        <footer className="text-center text-xs text-slate-300 pb-4 space-y-1">
          <div>
            <a href="/plan" className="hover:text-sky-400 transition-colors">
              ← マイおでかけ一覧に戻る
            </a>
          </div>
          <div>
            <a href="/" className="hover:text-sky-400 transition-colors">
              ← ツール一覧に戻る
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
