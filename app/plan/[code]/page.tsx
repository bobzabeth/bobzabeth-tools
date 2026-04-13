"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Itinerary } from "../types";
import { loadPlanFromDb, updateTodosInDb, addMyPlan, getMyPlans } from "../utils";
import TimelineView from "../components/TimelineView";
import FeedbackButton from "../components/FeedbackButton";
import PlanFooter from "../components/PlanFooter";

export default function PlanViewPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [error, setError] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState("");
  const [showTodos, setShowTodos] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(getMyPlans().some((p) => p.code === code));
  }, [code]);

  const handleSaveToMyPlans = () => {
    if (!itinerary || saved) return;
    addMyPlan(code, itinerary.title, itinerary.days[0]?.date ?? "", false);
    setSaved(true);
  };

  const toggleViewTodo = (id: string) => {
    if (!itinerary) return;
    const newTodos = (itinerary.todos ?? []).map((t) =>
      t.id === id ? { ...t, done: !t.done } : t
    );
    setItinerary({ ...itinerary, todos: newTodos });
    updateTodosInDb(code, newTodos);
  };
  const timelineRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

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
    const text = "旅のしおりがかんたんに作れるアプリ「イイ感じ旅のしおりくん」見つけたよ！みんなも使ってみてね！ #イイ感じ旅のしおりくん";
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(`${window.location.origin}/plan`)}`, "_blank");
  };

  const handleExport = async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      setPreviewUrl(await toPng(exportRef.current, { pixelRatio: 2 }));
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = async () => {
    if (!previewUrl || !itinerary) return;
    const filename = `${itinerary.title || "おでかけ"}.png`;
    // iOS Safari：Web Share APIでファイル共有→写真アプリに保存できる
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS && navigator.canShare) {
      try {
        const res = await fetch(previewUrl);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: filename });
          return;
        }
      } catch { /* フォールバックへ */ }
    }
    // 通常のダウンロード
    const link = document.createElement("a");
    link.download = filename;
    link.href = previewUrl;
    link.click();
  };

  if (error) return (
    <main className="min-h-screen bg-[#FFFBF5] flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <p className="text-5xl">🗺️</p>
        <p className="font-bold text-slate-700">プランが見つかりません</p>
        <p className="text-sm text-slate-400">URLが間違っているか、削除された可能性があります。</p>
        <a href="/plan" className="inline-block mt-4 text-sm text-sky-500 hover:text-sky-700 font-medium">← マイしおり一覧へ</a>
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

        <div className="px-2 pt-2 flex items-center justify-between gap-2">
          <a href="/plan" className="text-sm font-extrabold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent tracking-tight hover:opacity-75 transition-opacity flex-shrink-0">イイ感じ旅のしおりくん</a>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleSaveToMyPlans}
              disabled={saved}
              className={`flex-shrink-0 border-2 font-bold px-3 py-1.5 rounded-2xl transition-all active:scale-95 flex items-center gap-1 text-xs bg-white/80 backdrop-blur-sm shadow-sm ${
                saved
                  ? "border-emerald-200 text-emerald-500 cursor-default"
                  : "border-sky-200 text-sky-500 hover:border-sky-400 hover:bg-sky-50/50"
              }`}
            >
              {saved ? "✓ 追加済み" : "＋ マイしおりに追加"}
            </button>
            <button onClick={() => router.push(`/plan/${code}/edit`)}
              className="flex-shrink-0 border-2 border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 text-slate-500 hover:text-sky-600 font-bold px-3 py-1.5 rounded-2xl transition-all active:scale-95 flex items-center gap-1 text-xs bg-white/80 backdrop-blur-sm shadow-sm">
              ✏️ 編集
            </button>
          </div>
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

        {/* やることリスト（あれば表示） */}
        {(itinerary.todos ?? []).length > 0 && (() => {
          const todos = itinerary.todos!;
          const remaining = todos.filter((t) => !t.done).length;
          return (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-5">
              <button
                onClick={() => setShowTodos((v) => !v)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">📋</span>
                  <span className="text-sm font-bold text-slate-600">やることリスト</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${remaining === 0 ? "bg-emerald-100 text-emerald-600" : "bg-sky-100 text-sky-600"}`}>
                    {remaining === 0 ? "全完了 🎉" : `残り ${remaining}件`}
                  </span>
                </div>
                <span className="text-slate-300 text-sm">{showTodos ? "▲" : "▼"}</span>
              </button>

              {showTodos && (
                <div className="mt-4 space-y-2">
                  {todos.map((todo) => (
                    <div key={todo.id} className="flex items-center gap-2">
                      <button
                        onClick={() => toggleViewTodo(todo.id)}
                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          todo.done ? "bg-emerald-400 border-emerald-400" : "border-slate-300 hover:border-sky-400"
                        }`}
                      >
                        {todo.done && <span className="text-white text-[10px] leading-none font-bold">✓</span>}
                      </button>
                      <span className={`text-sm ${todo.done ? "line-through text-slate-300" : "text-slate-700"}`}>
                        {todo.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

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

        <PlanFooter />
      </div>

      {/* 画像export用の隠しレンダリング領域（全日程縦並び） */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, pointerEvents: "none" }}>
        <div ref={exportRef} style={{ background: "#FFFBF5", padding: "40px", width: "480px" }}>
          {itinerary && (
            <>
              {/* タイトル */}
              <div style={{ textAlign: "center", marginBottom: "32px" }}>
                <p style={{ fontSize: "22px", fontWeight: 900, color: "#1e293b", margin: 0 }}>
                  {itinerary.title || "タイトル未設定"}
                </p>
              </div>
              {/* 全日程 */}
              {itinerary.days.map((day, i) => (
                <div key={i} style={{ marginBottom: i < itinerary.days.length - 1 ? "40px" : 0 }}>
                  {/* 日付ヘッダー */}
                  <div style={{ marginBottom: "12px", paddingBottom: "8px", borderBottom: "2px solid #e0f2fe" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#0ea5e9", letterSpacing: "0.05em" }}>
                      {i + 1}日目
                    </span>
                    {day.date && (
                      <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "8px" }}>
                        {new Date(day.date + "T00:00:00").toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
                      </span>
                    )}
                  </div>
                  <TimelineView
                    itinerary={{ title: itinerary.title, date: day.date, items: day.items }}
                    exportMode
                    hideHeader
                  />
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <FeedbackButton page="plan-view" />
    </main>
  );
}
