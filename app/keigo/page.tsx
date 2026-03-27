"use client";

import { useState } from "react";

const RELATIONS = [
  { id: "superior", label: "上司・取引先", emoji: "👔", desc: "ビジネス敬語でしっかり伝える" },
  { id: "colleague", label: "同僚・知人", emoji: "🤝", desc: "丁寧だけど堅すぎない自然な言葉で" },
  { id: "friend", label: "友達・後輩", emoji: "😊", desc: "親しみやすくフレンドリーに" },
];

const ADMIN_PASSWORD = "keigo-admin-2026";

export default function KeigoPlusPage() {
  const [message, setMessage] = useState("");
  const [relation, setRelation] = useState("superior");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminInput, setAdminInput] = useState("");
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;

    const today = new Date().toLocaleDateString();
    const localData = localStorage.getItem("keigo_limit");
    let usage = localData ? JSON.parse(localData) : { date: today, count: 0 };

    if (usage.date !== today) {
      usage = { date: today, count: 0 };
    }

    if (!isAdmin && usage.count >= 10) {
      setError("本日の利用回数（10回）を超えました。また明日お越しください！");
      return;
    }

    setLoading(true);
    setResult("");
    setError("");

    try {
      const selectedRelation = RELATIONS.find((r) => r.id === relation)?.label;
      const res = await fetch("/api/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation: `【伝えたいこと】:${message} \n【相手との関係性】:${selectedRelation}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "エラーが発生しました");

      setResult(data.result);
      if (!isAdmin) {
        usage.count += 1;
        localStorage.setItem("keigo_limit", JSON.stringify(usage));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "予期しないエラーです");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    const text = encodeURIComponent("伝えたいことをいい感じの敬語に変換してくれるAIツール見つけた！ #イイ感じ敬語くん #AI");
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex flex-col items-center justify-center p-4 md:p-6 font-sans text-slate-800">
      
      {/* 背景装飾 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative w-full max-w-xl space-y-4">

        {/* ヘッダーカード */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-emerald-100 p-6 md:p-8 text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              イイ感じ敬語くん
            </span>
          </h1>
          <p className="text-slate-500 text-sm">伝えたいことを入力するだけで、<br/>空気を読んだ言葉に変換します</p>
        </div>

        {/* メインカード */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-emerald-100 p-6 md:p-8 space-y-6">

          {/* 相手との関係性 */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              相手との関係性
            </label>
            <div className="grid grid-cols-3 gap-2">
              {RELATIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRelation(r.id)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl text-sm font-medium transition-all border-2 ${
                    relation === r.id
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm"
                      : "border-slate-100 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50/50"
                  }`}
                >
                  <span className="text-xl">{r.emoji}</span>
                  <span className="text-xs font-bold leading-tight text-center">{r.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400 text-center">
              {RELATIONS.find(r => r.id === relation)?.desc}
            </p>
          </div>

          {/* 伝えたいこと入力 */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              伝えたいこと（ざっくりでOK）
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={"例：明日の会議、行けない\n例：この資料、わかりにくい\n例：締め切り、延ばしてほしい"}
              className="w-full border-2 border-slate-100 rounded-2xl p-4 text-slate-700 h-32 resize-none focus:outline-none focus:border-emerald-300 transition-colors bg-slate-50 text-sm leading-relaxed"
            />
          </div>

          {/* 生成ボタン */}
          <button
            onClick={handleSubmit}
            disabled={loading || !message.trim()}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                <span>いい感じに変換中...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>いい感じに変換する</span>
              </>
            )}
          </button>

          <p className="text-[10px] text-center text-slate-400 -mt-2">
            ※無料版は1日3回まで利用可能です。
          </p>

          {error && (
            <div className="bg-red-50 rounded-xl py-3 px-4 space-y-1">
              <p className="text-red-500 text-sm text-center font-medium">{error}</p>
              {/* もっと使いたい方へのDM誘導（必要な時はコメントアウトを外してね）
              <p className="text-xs text-center text-slate-400">
                もっと使いたい方は{" "}
                <a href="https://twitter.com/bobzabeth012" target="_blank" rel="noopener noreferrer" className="text-emerald-500 underline font-bold">
                  @bobzabeth012
                </a>{" "}
                までDMをどうぞ！
              </p>
              */}
            </div>
          )}
        </div>

        {/* 結果表示 */}
        {result && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">変換結果 — 3パターン</p>
            {result.split("---").filter(text => text.includes("【本文】")).map((plan, index) => {
              const levelMatch = plan.match(/【レベル】(.*)/);
              const bodyMatch = plan.match(/【本文】([\s\S]*?)【解説】/);
              const commentMatch = plan.match(/【解説】([\s\S]*)/);

              const level = levelMatch ? levelMatch[1].trim() : "案";
              const bodyText = bodyMatch ? bodyMatch[1].trim() : "";
              const commentText = commentMatch ? commentMatch[1].trim() : "";

              const styles = [
                { bg: "from-slate-700 to-slate-900", badge: "bg-slate-700 text-white", accent: "border-slate-200" },
                { bg: "from-emerald-500 to-teal-500", badge: "bg-emerald-500 text-white", accent: "border-emerald-200" },
                { bg: "from-teal-400 to-cyan-500", badge: "bg-teal-400 text-white", accent: "border-teal-200" },
              ];
              const style = styles[index] || styles[0];

              return (
                <div key={index} className={`bg-white/80 backdrop-blur-sm border-2 ${style.accent} rounded-3xl overflow-hidden shadow-lg`}>
                  <div className={`bg-gradient-to-r ${style.bg} px-5 py-3 flex justify-between items-center`}>
                    <span className="text-white text-xs font-black tracking-wider uppercase">{level}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(bodyText);
                        alert(`${level}の文章をコピーしました！`);
                      }}
                      className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full transition-all font-bold active:scale-95"
                    >
                      コピー
                    </button>
                  </div>
                  <div className="p-5 space-y-3">
                    <p className="text-slate-700 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">
                      {bodyText}
                    </p>
                    {commentText && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 relative">
                        <span className="absolute -top-2 left-3 bg-white px-2 text-[9px] font-black text-slate-400 border border-slate-100 rounded-full">POINT</span>
                        <p className="text-xs text-slate-500 leading-relaxed pt-1">{commentText}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* シェアエリア */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-emerald-100 p-6 space-y-4">
          <div className="text-center">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Share</h3>
            <p className="text-xs text-slate-400">友達にもシェアしよう</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleShare}
              className="flex-1 bg-slate-900 hover:bg-black text-white font-bold py-3 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
            >
              <span className="text-lg">𝕏</span>
              <span className="text-sm">でシェア</span>
            </button>
            <button
              onClick={() => {
                const text = encodeURIComponent("伝えたいことをいい感じの敬語に変換してくれるAIツール「イイ感じ敬語くん」が便利すぎる✨\n");
                const url = encodeURIComponent(window.location.href);
                window.open(`https://social-plugins.line.me/lineit/share?url=${url}&text=${text}`, "_blank");
              }}
              style={{ backgroundColor: "#06C755" }}
              className="flex-1 text-white font-bold py-3 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 hover:opacity-90"
            >
              <span className="text-lg">LINE</span>
              <span className="text-sm">で送る</span>
            </button>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("URLをコピーしました！");
            }}
            className="w-full py-2 text-xs text-slate-400 hover:text-emerald-500 transition-colors font-medium flex items-center justify-center gap-1"
          >
            🔗 URLをコピーする
          </button>
        </div>

        <footer className="text-slate-400 text-xs text-center pb-4 space-y-2">
          <div>
            <a
              href="https://twitter.com/bobzabeth012"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-500 transition-colors"
            >
              お問い合わせ・ご要望は 𝕏 @bobzabeth012 へ
            </a>
          </div>
          <div>© 2026 イイ感じ敬語くん</div>

          {/* 管理者ログイン（隠し機能） */}
          {!isAdmin ? (
            <div className="pt-2">
              {!showAdminPanel ? (
                <button
                  onClick={() => setShowAdminPanel(true)}
                  className="text-slate-200 hover:text-slate-300 text-[10px] transition-colors"
                >
                  ·
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 mt-1">
                  <input
                    type="password"
                    value={adminInput}
                    onChange={(e) => setAdminInput(e.target.value)}
                    placeholder="password"
                    className="text-[10px] border border-slate-200 rounded-lg px-2 py-1 w-28 focus:outline-none focus:border-emerald-300 text-slate-500"
                  />
                  <button
                    onClick={() => {
                      if (adminInput === ADMIN_PASSWORD) {
                        setIsAdmin(true);
                        setShowAdminPanel(false);
                        setError("");
                      } else {
                        setAdminInput("");
                      }
                    }}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-500 px-2 py-1 rounded-lg transition-colors"
                  >
                    enter
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="pt-1 flex items-center justify-center gap-2">
              <span className="text-emerald-500 text-[10px] font-bold">✓ 管理者モード中（制限なし）</span>
              <button
                onClick={() => setIsAdmin(false)}
                className="text-[10px] text-slate-300 hover:text-slate-400 transition-colors underline"
              >
                解除
              </button>
            </div>
          )}
        </footer>
      </div>
    </main>
  );
}