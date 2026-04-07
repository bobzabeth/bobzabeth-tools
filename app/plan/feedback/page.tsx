"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function FeedbackForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "";

  const [text, setText] = useState("");
  const [status, setStatus] = useState<"" | "sending" | "sent" | "error">("");

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, page: from }),
      });
      if (res.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <main className="min-h-screen bg-[#FFFBF5] font-sans text-slate-800">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-sky-100 rounded-full opacity-60 blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-blue-100 rounded-full opacity-50 blur-3xl" />
      </div>

      <div className="relative max-w-xl mx-auto px-4 py-12 space-y-4">
        <div className="px-2 pt-2">
          <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-sky-500 transition-colors flex items-center gap-1">
            ← 戻る
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-sky-100 p-6 space-y-4">
          {status === "sent" ? (
            <div className="text-center py-10 space-y-3">
              <p className="text-5xl">🙏</p>
              <p className="font-black text-slate-800 text-lg">ありがとうございます！</p>
              <p className="text-sm text-slate-400">ご意見を送信しました。開発の参考にします。</p>
              <button
                onClick={() => router.back()}
                className="mt-4 inline-block bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold px-8 py-3 rounded-2xl text-sm transition-all active:scale-95"
              >
                戻る
              </button>
            </div>
          ) : (
            <>
              <div>
                <p className="font-black text-slate-800 text-xl">ご意見・ご要望</p>
                <p className="text-sm text-slate-400 mt-1">匿名で送れます。バグ報告・機能リクエストなんでも！</p>
              </div>
              <textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setStatus(""); }}
                placeholder="例：○○な機能がほしい、○○が使いにくい、バグを見つけた..."
                rows={6}
                className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm text-slate-700 resize-none focus:outline-none focus:border-sky-300 bg-slate-50"
                autoFocus
              />
              {status === "error" && (
                <p className="text-xs text-red-400">送信に失敗しました。もう一度お試しください。</p>
              )}
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || status === "sending"}
                className="w-full bg-gradient-to-r from-sky-500 to-blue-600 disabled:opacity-40 text-white font-bold py-4 rounded-2xl transition-all active:scale-95"
              >
                {status === "sending" ? "送信中..." : "送信する"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense>
      <FeedbackForm />
    </Suspense>
  );
}
