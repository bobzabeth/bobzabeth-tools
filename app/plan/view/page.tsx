"use client";

import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { decodeItinerary } from "../utils";
import TimelineView from "../components/TimelineView";

function ViewContent() {
  const searchParams = useSearchParams();
  const d = searchParams.get("d");
  const itinerary = d ? decodeItinerary(d) : null;
  const timelineRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [copyMsg, setCopyMsg] = useState("");

  if (!itinerary) {
    return (
      <div className="text-center py-24 space-y-3">
        <p className="text-4xl">😢</p>
        <p className="text-slate-500 font-medium">旅程データが見つかりませんでした</p>
        <a href="/plan" className="text-sm text-sky-500 hover:underline">
          新しく旅程を作る →
        </a>
      </div>
    );
  }

  const handleExport = async () => {
    if (!timelineRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(timelineRef.current, {
        backgroundColor: "#FFFBF5",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `${itinerary.title || "旅程"}_${itinerary.date}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setExporting(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyMsg("コピーしました！");
    } catch {
      setCopyMsg("URLをコピーしてください");
    }
    setTimeout(() => setCopyMsg(""), 2500);
  };

  return (
    <div className="space-y-4">
      {/* タイムライン */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6">
        <TimelineView ref={timelineRef} itinerary={itinerary} />
      </div>

      {/* アクションエリア */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6 space-y-3">
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
          onClick={handleCopyUrl}
          className="w-full py-2 text-xs text-slate-400 hover:text-sky-500 transition-colors font-medium flex items-center justify-center gap-1"
        >
          🔗 {copyMsg || "URLをコピー"}
        </button>
      </div>

      <footer className="text-center text-xs text-slate-300 pb-4 space-y-2">
        <p>
          <a href="/plan" className="hover:text-sky-400 transition-colors">
            自分の旅程を作る →
          </a>
        </p>
        <p>
          <a href="/" className="hover:text-sky-400 transition-colors">
            ← ツール一覧に戻る
          </a>
        </p>
      </footer>
    </div>
  );
}

export default function ViewPage() {
  return (
    <main className="min-h-screen bg-[#FFFBF5] font-sans text-slate-800">
      {/* 背景装飾 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-sky-100 rounded-full opacity-60 blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-blue-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 w-72 h-72 bg-cyan-100 rounded-full opacity-50 blur-3xl" />
      </div>

      <div className="relative max-w-xl mx-auto px-4 py-12">
        {/* ヘッダー */}
        <div className="mb-4 text-center">
          <span className="inline-block bg-sky-100 text-sky-600 text-xs font-bold px-3 py-1 rounded-full tracking-wide">
            旅程メーカー
          </span>
        </div>

        <Suspense
          fallback={
            <div className="text-center py-24 text-slate-300">
              <span className="animate-spin inline-block h-6 w-6 border-2 border-sky-300 border-t-transparent rounded-full" />
            </div>
          }
        >
          <ViewContent />
        </Suspense>
      </div>
    </main>
  );
}
