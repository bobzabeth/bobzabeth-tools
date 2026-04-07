"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { Item, Itinerary } from "../../types";
import {
  loadPlanFromDb,
  updatePlanInDb,
  verifyPlanPassword,
  changePassword,
  sortItemsByTime,
  updateMyPlanMeta,
  getMyPlans,
} from "../../utils";
import TimelineView from "../../components/TimelineView";
import FeedbackButton from "../../components/FeedbackButton";
import PlanFooter from "../../components/PlanFooter";

function newItem(baseTime?: string): Item {
  return { id: crypto.randomUUID(), startTime: baseTime ?? "09:00", name: "" };
}

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

export default function PlanEditPage() {
  const { code } = useParams<{ code: string }>();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [error, setError] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [deletingDayIndex, setDeletingDayIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItemId, setNewItemId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "">("");
  const [exporting, setExporting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState("");
  const [isCreator, setIsCreator] = useState(false);
  const [showPwSection, setShowPwSection] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [pwStatus, setPwStatus] = useState<"" | "saving" | "saved" | "error">("");
  const timelineRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialized = useRef(false);
  const sessionKey = `plan_pw_${code}`;

  useEffect(() => {
    loadPlanFromDb(code).then((result) => {
      if (!result) { setError(true); return; }
      setItinerary(result.data);
      setIsCreator(getMyPlans().some((p) => p.code === code));
      if (result.hasPassword) {
        setHasPassword(true);
        const saved = sessionStorage.getItem(sessionKey);
        if (saved) { setPasswordInput(saved); setUnlocked(true); }
      } else {
        setUnlocked(true);
      }
    });
  }, [code, sessionKey]);

  const handlePasswordSubmit = async () => {
    const ok = await verifyPlanPassword(code, passwordInput);
    if (ok) { sessionStorage.setItem(sessionKey, passwordInput); setUnlocked(true); }
    else setPasswordError(true);
  };

  const saveToDb = useCallback((updated: Itinerary) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    updateMyPlanMeta(code, updated.title, updated.days[0]?.date ?? "");
    saveTimer.current = setTimeout(async () => {
      const pw = sessionStorage.getItem(sessionKey) || undefined;
      const ok = await updatePlanInDb(code, updated, pw);
      setSaveStatus(ok ? "saved" : "");
      if (ok) setTimeout(() => setSaveStatus(""), 2000);
    }, 1000);
  }, [code, sessionKey]);

  // アイテム更新・削除はfunctional updaterで（連続呼び出し安全）
  const updateItem = useCallback((updated: Item) => {
    setItinerary((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((d, i) =>
          i === selectedDay ? { ...d, items: d.items.map((it) => it.id === updated.id ? updated : it) } : d
        ),
      };
    });
  }, [selectedDay]);

  const deleteItem = useCallback((id: string) => {
    setItinerary((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((d, i) =>
          i === selectedDay ? { ...d, items: d.items.filter((it) => it.id !== id) } : d
        ),
      };
    });
    setEditingId(null);
  }, [selectedDay]);

  // DB保存は useEffect で itinerary 変化時に行う（DBロード直後はスキップ）
  useEffect(() => {
    if (!itinerary || !unlocked) return;
    if (!isInitialized.current) {
      isInitialized.current = true;
      return; // 初回ロード時はスキップ
    }
    saveToDb(itinerary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itinerary]);

  const addItem = () => {
    if (!itinerary) return;
    const currentItems = itinerary.days[selectedDay]?.items ?? [];
    const sorted = sortItemsByTime(currentItems);
    let startTime = "09:00";
    if (sorted.length > 0) {
      const last = sorted[sorted.length - 1];
      const [h, m] = (last.endTime ?? last.startTime).split(":").map(Number);
      startTime = `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    const item = newItem(startTime);
    setItinerary((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((d, i) =>
          i === selectedDay ? { ...d, items: [...d.items, item] } : d
        ),
      };
    });
    setEditingId(item.id);
    setNewItemId(item.id);
  };

  const addDay = () => {
    setItinerary((prev) => {
      if (!prev) return prev;
      const lastDate = prev.days[prev.days.length - 1]?.date || localDateStr(new Date());
      return { ...prev, days: [...prev.days, { date: addDays(lastDate, 1), items: [] }] };
    });
    setEditingId(null);
  };

  const removeDay = (index: number) => {
    if (!itinerary || itinerary.days.length <= 1) return;
    const newDays = itinerary.days.filter((_, i) => i !== index);
    const newSelected = Math.min(selectedDay, newDays.length - 1);
    setItinerary({ ...itinerary, days: newDays });
    setSelectedDay(newSelected);
    setEditingId(null);
    setDeletingDayIndex(null);
  };

  const updateDayDate = (index: number, date: string) => {
    if (!itinerary) return;
    const newDays = itinerary.days.map((d, i) => i === index ? { ...d, date } : d);
    setItinerary({ ...itinerary, days: newDays });
  };

  const updateTitle = (title: string) => {
    if (!itinerary) return;
    setItinerary({ ...itinerary, title });
  };

  const shareUrl = `${window.location.origin}/plan/${code}`;

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
    const link = document.createElement("a");
    link.download = filename;
    link.href = previewUrl;
    link.click();
  };

  const handlePasswordSave = async (remove = false) => {
    setPwStatus("saving");
    const currentPw = sessionStorage.getItem(sessionKey) || undefined;
    const ok = await changePassword(code, currentPw, remove ? null : newPw);
    if (ok) {
      if (remove) { sessionStorage.removeItem(sessionKey); setHasPassword(false); }
      else { sessionStorage.setItem(sessionKey, newPw); setHasPassword(true); setPasswordInput(newPw); }
      setNewPw(""); setPwStatus("saved");
      setTimeout(() => { setPwStatus(""); setShowPwSection(false); }, 1500);
    } else { setPwStatus("error"); }
  };

  if (error) return (
    <main className="min-h-screen bg-[#FFFBF5] flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <p className="text-5xl">🗺️</p>
        <p className="font-bold text-slate-700">プランが見つかりません</p>
        <a href="/plan" className="inline-block mt-4 text-sm text-sky-500 hover:text-sky-700 font-medium">← マイおでかけ一覧へ</a>
      </div>
    </main>
  );

  if (!itinerary) return (
    <main className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-sky-400 border-t-transparent rounded-full" />
    </main>
  );

  if (hasPassword && !unlocked) return (
    <main className="min-h-screen bg-[#FFFBF5] flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-xl border border-sky-100 p-8 max-w-sm w-full space-y-4">
        <p className="text-xl font-black text-slate-800 text-center">🔒 編集パスワード</p>
        <p className="text-sm text-slate-400 text-center">このプランの編集にはパスワードが必要です。</p>
        <input type="password" value={passwordInput}
          onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
          onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
          placeholder="パスワードを入力"
          className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-slate-700 focus:outline-none focus:border-sky-300 bg-slate-50" autoFocus />
        {passwordError && <p className="text-xs text-red-400 text-center">パスワードが違います</p>}
        <button onClick={handlePasswordSubmit}
          className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold py-3 rounded-2xl transition-all active:scale-95">確認</button>
        <div className="text-center">
          <a href={`/plan/${code}`} className="text-xs text-slate-400 hover:text-sky-500">閲覧のみで見る</a>
        </div>
      </div>
    </main>
  );

  // selectedDayをitinerary.daysの範囲内に必ずクランプして表示
  // （2つのstateが別管理なのでレンダー間で一時的にズレても安全）
  const displayDay = Math.min(selectedDay, itinerary.days.length - 1);
  const currentDay = itinerary.days[displayDay];
  const dayView = { title: itinerary.title, date: currentDay.date, items: currentDay.items };

  return (
    <main className="min-h-screen bg-[#FFFBF5] font-sans text-slate-800">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-sky-100 rounded-full opacity-60 blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-blue-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 w-72 h-72 bg-cyan-100 rounded-full opacity-50 blur-3xl" />
      </div>

      <div className="relative max-w-xl mx-auto px-4 py-12 space-y-4">

        {/* ヘッダー */}
        <div className="px-2 pt-2 flex items-center justify-between gap-2">
          <a href="/plan" className="text-sm font-extrabold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent tracking-tight hover:opacity-75 transition-opacity flex-shrink-0">おでかけプランナー</a>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-400">
              {saveStatus === "saving" ? "保存中..." : saveStatus === "saved" ? "✓ 保存済み" : ""}
            </span>
            <a href={`/plan/${code}`}
              className="flex-shrink-0 border-2 border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 text-slate-500 hover:text-sky-600 font-bold px-3 py-1.5 rounded-2xl transition-all text-xs bg-white/80 backdrop-blur-sm shadow-sm">
              👁 閲覧
            </a>
          </div>
        </div>

        {/* タイトル */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">タイトル</label>
          <input type="text" value={itinerary.title} onChange={(e) => updateTitle(e.target.value)}
            placeholder="例：京都旅行"
            className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-slate-700 font-bold text-lg focus:outline-none focus:border-sky-300 bg-slate-50" />
        </div>

        {/* 日付セレクター（独立カード） */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">日程</p>
          <div className="space-y-2">
            {itinerary.days.map((day, i) => (
              <div key={i}>
                {deletingDayIndex === i ? (
                  <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3 space-y-2">
                    <p className="text-sm font-bold text-red-500">{i + 1}日目を削除しますか？</p>
                    <p className="text-xs text-red-400">この日のコマもすべて削除されます。</p>
                    <div className="flex gap-2">
                      <button onClick={() => setDeletingDayIndex(null)}
                        className="flex-1 border-2 border-slate-200 text-slate-400 font-bold py-2 rounded-xl text-xs">キャンセル</button>
                      <button onClick={() => removeDay(i)}
                        className="flex-1 bg-red-500 text-white font-bold py-2 rounded-xl text-xs">削除する</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSelectedDay(i); setEditingId(null); }}
                      className={`flex-shrink-0 px-3 py-2.5 rounded-xl text-xs font-black transition-all ${
                        displayDay === i
                          ? "bg-sky-500 text-white shadow-sm"
                          : "bg-slate-100 text-slate-400 hover:bg-sky-50 hover:text-sky-500"
                      }`}
                    >
                      {i + 1}日目
                    </button>
                    <input
                      type="date"
                      value={day.date}
                      onChange={(e) => updateDayDate(i, e.target.value)}
                      className="flex-1 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm text-slate-600 focus:outline-none focus:border-sky-300 bg-slate-50"
                    />
                    {itinerary.days.length > 1 && (
                      <button
                        onClick={() => setDeletingDayIndex(i)}
                        className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all text-lg"
                      >×</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addDay}
            className="mt-3 w-full border-2 border-dashed border-sky-200 rounded-2xl py-2.5 text-sky-400 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50/50 transition-all text-sm font-bold"
          >＋ 日を追加</button>
        </div>

        {/* タイムライン */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            {displayDay + 1}日目のタイムライン — {currentDay.items.length}コマ
          </p>
          <TimelineView
            ref={timelineRef}
            itinerary={dayView}
            editingId={editingId}
            newItemId={newItemId}
            onUpdate={updateItem}
            onDelete={deleteItem}
            onCardClick={(id) => { setNewItemId(null); setEditingId((prev) => prev === id ? null : id); }}
            onClose={() => { setNewItemId(null); setEditingId(null); }}
          />
          <button onClick={addItem}
            className="mt-4 w-full border-2 border-dashed border-sky-200 rounded-2xl py-3 text-sky-400 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50/50 transition-all text-sm font-bold">
            ＋ コマを追加
          </button>
        </div>

        {/* シェア・書き出し */}
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
          <button onClick={handleExport} disabled={exporting || currentDay.items.length === 0}
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

        {/* パスワード設定 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6">
          {isCreator ? (
            <>
              <button onClick={() => setShowPwSection((v) => !v)} className="w-full flex items-center justify-between text-left">
                <div className="flex items-center gap-2">
                  <span className="text-base">{hasPassword ? "🔒" : "🔓"}</span>
                  <span className="text-sm font-bold text-slate-600">編集パスワード</span>
                  {hasPassword && <span className="text-[10px] bg-sky-100 text-sky-600 font-bold px-2 py-0.5 rounded-full">設定済み</span>}
                </div>
                <span className="text-slate-300 text-sm">{showPwSection ? "▲" : "▼"}</span>
              </button>
              {showPwSection && (
                <div className="mt-4 space-y-3">
                  {hasPassword && (
                    <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs text-slate-400">現在のパスワード</span>
                      <span className="text-sm font-bold text-slate-600 font-mono">{sessionStorage.getItem(sessionKey) || "—"}</span>
                    </div>
                  )}
                  <p className="text-xs text-slate-400">
                    {hasPassword ? "新しいパスワードを入力すると変更できます。削除するとURLを知る人なら誰でも編集できます。" : "設定するとURLを知っていてもパスワードなしでは編集できません。"}
                  </p>
                  <input type="text" value={newPw} onChange={(e) => { setNewPw(e.target.value); setPwStatus(""); }}
                    placeholder={hasPassword ? "新しいパスワード" : "パスワードを設定"}
                    className="w-full border-2 border-slate-100 rounded-2xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-sky-300 bg-slate-50" />
                  {pwStatus === "error" && <p className="text-xs text-red-400">保存に失敗しました</p>}
                  {pwStatus === "saved" && <p className="text-xs text-sky-500">✓ 保存しました</p>}
                  <div className="flex gap-2">
                    {hasPassword && (
                      <button onClick={() => handlePasswordSave(true)} disabled={pwStatus === "saving"}
                        className="flex-1 border-2 border-red-200 text-red-400 hover:border-red-400 font-bold py-2.5 rounded-2xl text-xs transition-all disabled:opacity-50">
                        パスワードを削除
                      </button>
                    )}
                    <button onClick={() => handlePasswordSave(false)} disabled={!newPw || pwStatus === "saving"}
                      className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold py-2.5 rounded-2xl text-xs transition-all disabled:opacity-40">
                      {pwStatus === "saving" ? "保存中..." : hasPassword ? "変更する" : "設定する"}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* 作成者以外：現在のパスワードを表示するだけ */
            <div className="flex items-center gap-2">
              <span className="text-base">🔒</span>
              <span className="text-sm font-bold text-slate-600">編集パスワード</span>
              <span className="ml-auto text-sm font-bold text-slate-600 font-mono">{sessionStorage.getItem(sessionKey) || "—"}</span>
            </div>
          )}
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
              <div style={{ textAlign: "center", marginBottom: "32px" }}>
                <p style={{ fontSize: "22px", fontWeight: 900, color: "#1e293b", margin: 0 }}>
                  {itinerary.title || "タイトル未設定"}
                </p>
              </div>
              {itinerary.days.map((day, i) => (
                <div key={i} style={{ marginBottom: i < itinerary.days.length - 1 ? "40px" : 0 }}>
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

      <FeedbackButton page="plan-edit" />
    </main>
  );
}
