"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Itinerary } from "../types";
import { loadPlanFromDb, generateShareUrl } from "../utils";
import TimelineView from "../components/TimelineView";

export default function PlanViewPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [error, setError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState("");
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPlanFromDb(code).then((result) => {
      if (!result) {
        setError(true);
      } else {
        setItinerary(result.data);
      }
    });
  }, [code]);

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
          <p className="text-sm text-slate-400">URLが間違っているか、削除された可能性があります。</p>
          <a
            href="/plan"
            className="inline-block mt-4 text-sm text-sky-500 hover:text-sky-700 font-medium"
          >
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

  return (
    <main className="min-h-screen bg-[#FFFBF5] font-sans text-slate-800">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-sky-100 rounded-full opacity-60 blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-blue-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 w-72 h-72 bg-cyan-100 rounded-full opacity-50 blur-3xl" />
      </div>

      <div className="relative max-w-xl mx-auto px-4 py-12 space-y-4">
        {/* ヘッダー */}
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

        {/* タイムライン */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6">
          <TimelineView ref={timelineRef} itinerary={itinerary} />
        </div>

        {/* アクション */}
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
            disabled={exporting}
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
          <button
            onClick={() => router.push(`/plan/${code}/edit`)}
            className="w-full border-2 border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700 font-bold py-3 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
          >
            ✏️ このプランを編集
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

        <footer className="text-center text-xs text-slate-300 pb-4">
          <a href="/" className="hover:text-sky-400 transition-colors">
            ← ツール一覧に戻る
          </a>
        </footer>
      </div>
    </main>
  );
}
