"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMyPlans,
  addMyPlan,
  removeMyPlanCode,
  savePlanToDb,
  deletePlanFromDb,
  type MyPlanMeta,
} from "./utils";

export default function PlanPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<MyPlanMeta[]>([]);
  const [creating, setCreating] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  useEffect(() => {
    setPlans(getMyPlans());
  }, []);

  const handleNew = async () => {
    setCreating(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const itinerary = { title: "", date: today, items: [] };
      const code = await savePlanToDb(itinerary);
      addMyPlan(code, "", today);
      router.push(`/plan/${code}/edit`);
    } catch {
      setCreating(false);
    }
  };

  const handleDeleteConfirm = async (code: string) => {
    await deletePlanFromDb(code);
    removeMyPlanCode(code);
    setPlans((prev) => prev.filter((p) => p.code !== code));
    setDeletingCode(null);
  };

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

        {/* 新規作成ボタン */}
        <button
          onClick={handleNew}
          disabled={creating}
          className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:opacity-60 text-white font-bold py-4 rounded-2xl shadow-lg shadow-sky-200 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {creating ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              作成中...
            </>
          ) : (
            "＋ 新規おでかけ"
          )}
        </button>

        {/* マイプラン一覧 */}
        {plans.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6 space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">マイおでかけ</p>
            {plans.map((plan) => (
              <div key={plan.code}>
                {deletingCode === plan.code ? (
                  <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3 space-y-2">
                    <p className="text-sm font-bold text-red-500">「{plan.title || "タイトル未設定"}」を削除しますか？</p>
                    <p className="text-xs text-red-400">この操作は元に戻せません。</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeletingCode(null)}
                        className="flex-1 border-2 border-slate-200 text-slate-400 font-bold py-2 rounded-xl text-xs"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => handleDeleteConfirm(plan.code)}
                        className="flex-1 bg-red-500 text-white font-bold py-2 rounded-xl text-xs"
                      >
                        削除する
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 group">
                    <a
                      href={`/plan/${plan.code}`}
                      className="flex-1 min-w-0 bg-slate-50 hover:bg-sky-50 border-2 border-slate-100 hover:border-sky-200 rounded-2xl px-4 py-3 transition-all"
                    >
                      <p className="font-bold text-slate-700 text-sm truncate">
                        {plan.title || "タイトル未設定"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{plan.date}</p>
                    </a>
                    <button
                      onClick={() => setDeletingCode(plan.code)}
                      className="flex-shrink-0 text-slate-200 hover:text-red-400 transition-colors text-lg leading-none opacity-0 group-hover:opacity-100"
                      title="削除"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {plans.length === 0 && (
          <div className="text-center py-8 text-slate-300 text-sm">
            まだおでかけがありません
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
