"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { Itinerary } from "../../types";
import TimelineView from "../../components/TimelineView";
import PlanFooter from "../../components/PlanFooter";

const DEMOS: Record<string, Itinerary> = {
  kyoto: {
    title: "京都2泊3日旅行",
    days: [
      {
        date: "2025-05-03",
        items: [
          { id: "k1", startTime: "10:00", endTime: "10:30", endMemo: "京都駅出発", name: "京都駅集合・荷物預け", memo: "コインロッカーは中央口付近が空いてることが多い", transport: { mode: "train", durationMin: "30分" } },
          { id: "k2", startTime: "11:00", name: "嵐山・竹林の小径" },
          { id: "k3", startTime: "12:30", name: "嵐山でランチ", memo: "渡月橋近くの湯豆腐がおすすめ" },
          { id: "k4", startTime: "14:30", name: "天龍寺・庭園散策", transport: { mode: "taxi", durationMin: "30分" } },
          { id: "k5", startTime: "16:30", name: "金閣寺", transport: { mode: "bus", durationMin: "40分" } },
          { id: "k6", startTime: "18:30", name: "錦市場で夕食・お土産", transport: { mode: "taxi", durationMin: "10分" } },
          { id: "k7", startTime: "20:30", name: "ホテルチェックイン" },
        ],
      },
      {
        date: "2025-05-04",
        items: [
          { id: "k8", startTime: "08:30", name: "朝食・ホテル出発" },
          { id: "k9", startTime: "09:30", name: "伏見稲荷大社", memo: "千本鳥居は朝早めがすいてる", transport: { mode: "train", durationMin: "20分" } },
          { id: "k10", startTime: "12:00", name: "伏見でランチ（稲荷寿司）" },
          { id: "k11", startTime: "14:00", name: "清水寺・三年坂散策", transport: { mode: "bus", durationMin: "40分" } },
          { id: "k12", startTime: "17:00", name: "祇園・白川沿いを散歩" },
          { id: "k13", startTime: "19:00", name: "祇園で夕食" },
        ],
      },
      {
        date: "2025-05-05",
        items: [
          { id: "k14", startTime: "09:00", name: "二条城", transport: { mode: "bus", durationMin: "20分" } },
          { id: "k15", startTime: "11:30", name: "哲学の道・南禅寺", transport: { mode: "bus", durationMin: "25分" } },
          { id: "k16", startTime: "13:30", name: "ランチ後、荷物回収" },
          { id: "k17", startTime: "15:30", name: "京都駅から帰路", endTime: "17:30", endMemo: "新幹線 のぞみ" },
        ],
      },
    ],
  },
  aquarium: {
    title: "子連れ水族館デー",
    days: [
      {
        date: "2025-04-19",
        items: [
          { id: "a1", startTime: "09:00", name: "自宅出発", memo: "授乳済み・おむつ替え済み" },
          { id: "a2", startTime: "09:30", name: "カーシェアピックアップ", transport: { mode: "car", durationMin: "40分", durationMax: "60分" } },
          { id: "a3", startTime: "10:30", name: "水族館到着・チケット購入", memo: "年パス持参を忘れずに" },
          { id: "a4", startTime: "11:00", name: "館内見学スタート（大水槽から）" },
          { id: "a5", startTime: "12:00", name: "館内レストランでランチ", memo: "混む前に早めに入ろう", endTime: "13:00" },
          { id: "a6", startTime: "13:30", name: "イルカショー", memo: "C席は水がかかるので注意！" },
          { id: "a7", startTime: "14:30", name: "おむつ替え・授乳タイム", memo: "3階に授乳室あり" },
          { id: "a8", startTime: "15:00", name: "お土産コーナー" },
          { id: "a9", startTime: "15:30", name: "帰宅", transport: { mode: "car", durationMin: "40分", durationMax: "70分" }, memo: "夕方は渋滞注意" },
        ],
      },
    ],
  },
  reunion: {
    title: "大学同窓会プラン",
    days: [
      {
        date: "2025-06-14",
        items: [
          { id: "r1", startTime: "17:00", name: "渋谷駅ハチ公前に集合", memo: "遅刻者は店に直接来てもOK" },
          { id: "r2", startTime: "17:30", name: "1軒目：個室居酒屋（2h飲み放題）", endTime: "19:30", memo: "予約済み・13名" },
          { id: "r3", startTime: "19:45", name: "2軒目：カラオケ", memo: "道玄坂のビッグエコー、予約あり", endTime: "21:30", transport: { mode: "walk", durationMin: "5分" } },
          { id: "r4", startTime: "21:30", name: "3軒目：バー（希望者のみ）" },
          { id: "r5", startTime: "23:00", name: "解散", memo: "終電注意！渋谷23:30が最終" },
        ],
      },
    ],
  },
};

export default function DemoPlanPage() {
  const { id } = useParams<{ id: string }>();
  const itinerary = DEMOS[id];
  const [selectedDay, setSelectedDay] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  if (!itinerary) return (
    <main className="min-h-screen bg-[#FFFBF5] flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <p className="text-5xl">🗺️</p>
        <p className="font-bold text-slate-700">デモプランが見つかりません</p>
        <a href="/plan" className="text-sm text-sky-500 hover:underline">← ホームへ戻る</a>
      </div>
    </main>
  );

  const currentDay = itinerary.days[selectedDay] ?? itinerary.days[0];
  const dayView = { title: itinerary.title, date: currentDay.date, items: currentDay.items };

  const handleExport = async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      setPreviewUrl(await toPng(exportRef.current, { pixelRatio: 2 }));
    } finally { setExporting(false); }
  };

  const handleDownload = async () => {
    if (!previewUrl) return;
    const filename = `${itinerary.title}.png`;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS && navigator.canShare) {
      try {
        const res = await fetch(previewUrl);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: filename }); return; }
      } catch { /* fallback */ }
    }
    const link = document.createElement("a");
    link.download = filename;
    link.href = previewUrl;
    link.click();
  };

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
          <span className="text-[10px] bg-amber-100 text-amber-600 font-bold px-3 py-1 rounded-full">使用例</span>
        </div>

        {/* タイトル */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-5 text-center">
          <h2 className="text-2xl font-black text-slate-800 leading-tight">{itinerary.title}</h2>
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
              <button key={i} onClick={() => setSelectedDay(i)}
                className={`flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-bold transition-all ${
                  selectedDay === i ? "bg-sky-500 text-white shadow-md" : "bg-white/80 border-2 border-slate-100 text-slate-400 hover:border-sky-200 hover:text-sky-500"
                }`}>
                {i + 1}日目
                {day.date && <span className="ml-1 text-xs opacity-75">{day.date.slice(5).replace("-", "/")}</span>}
              </button>
            ))}
          </div>
        )}

        {/* タイムライン */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6">
          <TimelineView ref={null} itinerary={dayView} hideHeader />
        </div>

        {/* SHARE */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6 space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">SHARE</p>
          <p className="text-[10px] text-slate-400 font-medium text-center">このプランの画像を保存</p>
          <button onClick={handleExport} disabled={exporting}
            className="w-full border-2 border-sky-200 hover:border-sky-400 hover:bg-sky-50/50 disabled:border-slate-100 disabled:text-slate-300 text-sky-500 font-bold py-3 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm">
            {exporting ? <><span className="animate-spin h-4 w-4 border-2 border-sky-400 border-t-transparent rounded-full" />書き出し中...</> : "📷 画像で保存"}
          </button>
          <div className="border-t border-slate-100 pt-3">
            <p className="text-[10px] text-slate-400 font-medium text-center mb-3">このツールを紹介する</p>
            <div className="space-y-2">
              <button
                onClick={() => window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin + "/plan" : "/plan")}`, "_blank")}
                style={{ backgroundColor: "#06C755" }}
                className="w-full text-white font-bold py-3 rounded-2xl transition-all active:scale-95 hover:opacity-90 flex items-center justify-center gap-2 text-sm shadow-lg">
                <span className="font-black">LINE</span><span>でシェア</span>
              </button>
              <button
                onClick={() => {
                  const text = "おでかけのスケジュールをかんたんに作れるツール「おでかけプランナー」見つけたよ！みんなも使ってみてね！ #おでかけプランナー";
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin + "/plan" : "/plan")}`, "_blank");
                }}
                className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm shadow-lg">
                <span className="text-base">𝕏</span><span>でシェア</span>
              </button>
            </div>
          </div>
        </div>

        {/* 自分も作るCTA */}
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-3xl p-6 text-center space-y-3 shadow-lg shadow-sky-200">
          <p className="text-white font-black text-lg">あなたもプランを作ってみよう</p>
          <p className="text-sky-100 text-sm">無料・登録不要ですぐ作れます</p>
          <a href="/plan" className="inline-block bg-white text-sky-600 font-black px-8 py-3 rounded-2xl text-sm transition-all active:scale-95 hover:bg-sky-50 shadow-sm">
            ＋ プランを作る
          </a>
        </div>

        {previewUrl && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center pt-4 px-4 flex-shrink-0">プレビュー</p>
              <div className="overflow-y-auto flex-1 px-4 py-3">
                <img src={previewUrl} alt="preview" className="w-full rounded-2xl border border-slate-100" />
              </div>
              <div className="flex gap-3 p-4 flex-shrink-0 border-t border-slate-100">
                <button onClick={() => setPreviewUrl(null)} className="flex-1 border-2 border-slate-200 text-slate-400 font-bold py-3 rounded-2xl text-sm">閉じる</button>
                <button onClick={handleDownload} className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold py-3 rounded-2xl text-sm shadow-lg shadow-sky-200">ダウンロード</button>
              </div>
            </div>
          </div>
        )}

        <PlanFooter />
      </div>

      {/* export用隠しdiv */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, pointerEvents: "none" }}>
        <div ref={exportRef} style={{ background: "#FFFBF5", padding: "40px", width: "480px" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <p style={{ fontSize: "22px", fontWeight: 900, color: "#1e293b", margin: 0 }}>{itinerary.title}</p>
          </div>
          {itinerary.days.map((day, i) => (
            <div key={i} style={{ marginBottom: i < itinerary.days.length - 1 ? "40px" : 0 }}>
              <div style={{ marginBottom: "12px", paddingBottom: "8px", borderBottom: "2px solid #e0f2fe" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#0ea5e9" }}>{i + 1}日目</span>
                {day.date && <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "8px" }}>
                  {new Date(day.date + "T00:00:00").toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
                </span>}
              </div>
              <TimelineView itinerary={{ title: itinerary.title, date: day.date, items: day.items }} exportMode hideHeader />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
