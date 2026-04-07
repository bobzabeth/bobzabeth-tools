"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Itinerary } from "../types";
import { loadPlanFromDb } from "../utils";
import TimelineView from "../components/TimelineView";

export default function PlanViewPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [error, setError] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState("");
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPlanFromDb(code).then((result) => {
      if (!result) setError(true);
      else setItinerary(result.data);
    });
  }, [code]);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/plan/${code}` : `/plan/${code}`;

  const handleShare = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setShareMsg("URLをコピーしました！"); }
    catch { setShareMsg(shareUrl); }
    setTimeout(() => setShareMsg(""), 3000);
  };

  const handleLineShare = () => {
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const handleXShare = () => {
    const text = "おでかけのスケジュールをかんたんに作れるツール「おでかけプランナー」見つけたよ！みんなも使ってみてね！ #おでかけプランナー";
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(`${window.location.origin}/plan`)}`, "_blank");
  };

  const handleExport = async () => {
    if (!timelineRef.current) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const el = timelineRef.current;
      // ラッパーdivを作って余白を付けてからキャプチャ
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "padding:40px;background:#FFFBF5;display:inline-block;";
      const clone = el.cloneNode(true) as HTMLElement;
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);
      try {
        setPreviewUrl(await toPng(wrapper, { backgroundColor: "#FFFBF5", pixelRatio: 2 }));
      } finally {
        document.body.removeChild(wrapper);
      }
    } finally { setExporting(false); }
  };

  const handleDownload = () => {
    if (!previewUrl || !itinerary) return;
    const link = document.createElement("a");
    link.download = `${itinerary.title || "おでかけ"}.png`;
    link.href = previewUrl;
    link.click();
  };

  if (error) return (
    <main className="min-h-screen bg-[#FFFBF5] flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <p className="text-5xl">🗺️</p>
        <p className="font-bold text-slate-700">プランが見つかりません</p>
        <p className="text-sm text-slate-400">URLが間違っているか、削除された可能性があります。</p>
        <a href="/plan" className="inline-block mt-4 text-sm text-sky-500 hover:text-sky-700 font-medium">← マイおでかけ一覧へ</a>
      </div>
    </main>
  );

  if (!itinerary) return (
    <main className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-sky-400 border-t-transparent rounded-full" />
    </main>
  );

  const currentDay = itinerary.days[selectedDay] ?? itinerary.days[0];
  const dayView = { title: itinerary.title, date: currentDay.date, items: currentDay.items };

  return (
    <main className="min-h-screen bg-[#FFFBF5] font-sans text-slate-800">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-sky-100 rounded-full opacity-60 blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-blue-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 w-72 h-72 bg-cyan-100 rounded-full opacity-50 blur-3xl" />
      </div>

      <div className="relative max-w-xl mx-auto px-4 py-12 space-y-4">

        <div className="px-2 pt-2 flex items-center justify-between gap-3">
          <a href="/plan" className="text-sm font-extrabold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent tracking-tight hover:opacity-75 transition-opacity">おでかけプランナー</a>
          <button onClick={() => router.push(`/plan/${code}/edit`)}
            className="flex-shrink-0 border-2 border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 text-slate-500 hover:text-sky-600 font-bold px-4 py-2 rounded-2xl transition-all active:scale-95 flex items-center gap-1.5 text-xs bg-white/80 backdrop-blur-sm shadow-sm">
            ✏️ 編集
          </button>
        </div>

        {/* タイトル */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-5 text-center">
          <h2 className="text-2xl font-black text-slate-800 leading-tight">
            {itinerary.title || "タイトル未設定"}
          </h2>
          {currentDay.date && (
            <p className="text-sm text-slate-400 font-medium mt-1">
              {new Date(currentDay.date + "T00:00:00").toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
            </p>
          )}
        </div>

        {/* 日タブ（複数日のみ） */}
        {itinerary.days.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {itinerary.days.map((day, i) => (
              <button key={i}
                onClick={() => setSelectedDay(i)}
                className={`flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-bold transition-all ${
                  selectedDay === i ? "bg-sky-500 text-white shadow-md" : "bg-white/80 border-2 border-slate-100 text-slate-400 hover:border-sky-200 hover:text-sky-500"
                }`}
              >
                {i + 1}日目
                {day.date && <span className="ml-1 text-xs opacity-75">{day.date.slice(5).replace("-", "/")}</span>}
              </button>
            ))}
          </div>
        )}

        {/* タイムライン */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6">
          <TimelineView ref={timelineRef} itinerary={dayView} hideHeader />
        </div>

        {/* SHARE */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6 space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">SHARE</p>
          {/* このプランをシェア */}
          <p className="text-[10px] text-slate-400 font-medium text-center">このプランをシェア</p>
          <button onClick={handleLineShare} style={{ backgroundColor: "#06C755" }}
            className="w-full text-white font-bold py-4 rounded-2xl transition-all active:scale-95 hover:opacity-90 flex items-center justify-center gap-2 shadow-lg">
            <span className="font-black text-base">LINE</span><span>でシェア</span>
          </button>
          <button onClick={handleShare}
            className="w-full border-2 border-sky-200 hover:border-sky-400 hover:bg-sky-50/50 text-sky-500 font-bold py-3 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm">
            🔗 URLをコピー
          </button>
          {shareMsg && <p className="text-xs text-center text-sky-500 font-medium break-all">{shareMsg}</p>}
          <button onClick={handleExport} disabled={exporting}
            className="w-full border-2 border-sky-200 hover:border-sky-400 hover:bg-sky-50/50 disabled:border-slate-100 disabled:text-slate-300 text-sky-500 font-bold py-3 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm">
            {exporting ? <><span className="animate-spin h-4 w-4 border-2 border-sky-400 border-t-transparent rounded-full" />書き出し中...</> : "📷 画像で保存"}
          </button>
          {/* 区切り */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-[10px] text-slate-400 font-medium text-center mb-3">このツールを紹介する</p>
            <button onClick={handleXShare}
              className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm shadow-lg">
              <span className="text-base">𝕏</span><span>でシェア</span>
            </button>
          </div>
        </div>

        {previewUrl && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center pt-4 px-4 flex-shrink-0">プレビュー</p>
              <div className="overflow-y-auto flex-1 px-4 py-3">
                <img src={previewUrl} alt="preview" className="w-full rounded-2xl border border-slate-100" />
              </div>
              <div className="flex gap-3 p-4 flex-shrink-0 border-t border-slate-100">
                <button onClick={() => setPreviewUrl(null)}
                  className="flex-1 border-2 border-slate-200 text-slate-400 font-bold py-3 rounded-2xl text-sm hover:border-slate-300 transition-all active:scale-95">閉じる</button>
                <button onClick={handleDownload}
                  className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold py-3 rounded-2xl text-sm shadow-lg shadow-sky-200 transition-all active:scale-95">ダウンロード</button>
              </div>
            </div>
          </div>
        )}

        <footer className="pb-6 space-y-2">
          <a href="/plan" className="flex items-center justify-center gap-1.5 w-full border-2 border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 text-slate-500 hover:text-sky-600 font-bold py-3 rounded-2xl transition-all text-sm bg-white/80 backdrop-blur-sm shadow-sm">
            ← マイおでかけ一覧に戻る
          </a>
          <a href="/" className="flex items-center justify-center gap-1.5 w-full border-2 border-slate-100 hover:border-slate-300 text-slate-400 hover:text-slate-600 font-bold py-3 rounded-2xl transition-all text-sm bg-white/60 backdrop-blur-sm">
            ← ツール一覧に戻る
          </a>
        </footer>
      </div>
    </main>
  );
}
