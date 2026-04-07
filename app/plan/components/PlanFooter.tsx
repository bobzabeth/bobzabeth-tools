"use client";

export default function PlanFooter({ showMyPlan = true }: { showMyPlan?: boolean }) {
  return (
    <footer className="pb-20 space-y-3">
      {showMyPlan && (
        <a href="/plan" className="flex items-center justify-center gap-1.5 w-full border-2 border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 text-slate-500 hover:text-sky-600 font-bold py-3 rounded-2xl transition-all text-sm bg-white/80 backdrop-blur-sm shadow-sm">
          ← マイしおり一覧に戻る
        </a>
      )}
      <a href="/" className="flex items-center justify-center gap-1.5 w-full border-2 border-slate-100 hover:border-slate-300 text-slate-400 hover:text-slate-600 font-bold py-3 rounded-2xl transition-all text-sm bg-white/60 backdrop-blur-sm">
        ← ツール一覧に戻る
      </a>
      <div className="text-center pt-2 space-y-1">
        <p className="text-[11px] text-slate-300 font-medium">イイ感じ旅のしおりくん</p>
        <p className="text-[10px] text-slate-200">© 2025 bobzabeth. All rights reserved.</p>
      </div>
    </footer>
  );
}
