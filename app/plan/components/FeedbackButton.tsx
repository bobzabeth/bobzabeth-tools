"use client";

import { useState } from "react";

export default function FeedbackButton({ page }: { page?: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"" | "sending" | "sent" | "error">("");

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, page }),
      });
      if (res.ok) {
        setStatus("sent");
        setText("");
        setTimeout(() => { setStatus(""); setOpen(false); }, 1500);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      {/* フローティングボタン */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 bg-white border-2 border-sky-200 hover:border-sky-400 shadow-lg hover:shadow-sky-100 text-sky-500 font-bold text-xs px-4 py-2.5 rounded-full transition-all active:scale-95 flex items-center gap-1.5"
      >
        💬 ご意見
      </button>

      {/* モーダル */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <p className="font-black text-slate-800 text-base">ご意見・ご要望</p>
              <p className="text-xs text-slate-400 mt-0.5">匿名で送れます。バグ報告・改善案なんでも！</p>
            </div>
            {status === "sent" ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-2xl">🙏</p>
                <p className="font-bold text-sky-500 text-sm">送信しました！ありがとうございます</p>
              </div>
            ) : (
              <>
                <textarea
                  value={text}
                  onChange={(e) => { setText(e.target.value); setStatus(""); }}
                  placeholder="例：○○な機能がほしい、○○が使いにくい..."
                  rows={4}
                  className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm text-slate-700 resize-none focus:outline-none focus:border-sky-300 bg-slate-50"
                  autoFocus
                />
                {status === "error" && <p className="text-xs text-red-400">送信に失敗しました。もう一度お試しください。</p>}
                <div className="flex gap-3">
                  <button onClick={() => setOpen(false)}
                    className="flex-1 border-2 border-slate-200 text-slate-400 font-bold py-2.5 rounded-2xl text-sm">
                    キャンセル
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!text.trim() || status === "sending"}
                    className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold py-2.5 rounded-2xl text-sm disabled:opacity-40 transition-all"
                  >
                    {status === "sending" ? "送信中..." : "送信する"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
