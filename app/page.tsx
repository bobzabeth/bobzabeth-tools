"use client";

import { useState } from "react";

// キャラ設定（トーン）の定義
const TONES = [
  { id: "polite", label: "丁寧（上司・親戚）", prompt: "極めて丁寧で失礼のない、敬語を駆使した文章" },
  { id: "soft", label: "柔らかめ（ママ友・知人）", prompt: "角を立てず、かつ親しみやすさも残したクッション言葉の多い文章" },
  { id: "casual", label: "ゆるめ（友達）", prompt: "友達関係を壊さない、少しユーモアを交えた断り文" },
];

export default function DeclinePage() {
  const [situation, setSituation] = useState("");
  const [tone, setTone] = useState("polite");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (!situation.trim()) return;

    setLoading(true);
    setResult("");
    setError("");
    setCopied(false);

    try {
      const selectedTone = TONES.find(t => t.id === tone)?.prompt;

      const res = await fetch("/api/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          situation: `【状況】:${situation} \n【トーン】:${selectedTone} という条件で3つ案を出して。` 
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "エラーが発生しました");
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "予期しないエラーです");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    const text = encodeURIComponent("角を立てずに断れる神ツールを見つけた！ #お断りツール #AI");
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  return (
    <main className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center p-4 md:p-6 font-sans text-slate-800">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 md:p-10 space-y-8 border border-indigo-100">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-indigo-600 tracking-tight">
            🙏 角が立たないお断りくん
          </h1>
          <p className="text-slate-500 text-sm">あなたの代わりに「NO」を優しく伝えます</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              相手との関係性は？
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium transition-all border-2 ${
                    tone === t.id 
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" 
                    : "border-slate-100 text-slate-500 hover:border-slate-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              どんな状況で断りたい？
            </label>
            <textarea
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="例：義理の両親からの急な夕食の誘い..."
              className="w-full border-2 border-slate-100 rounded-2xl p-4 text-slate-700 h-32 resize-none focus:outline-none focus:border-indigo-300 transition-colors bg-slate-50"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !situation.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
              AIが必死に考えています...
            </>
          ) : "優しい断り文を作る"}
        </button>

        {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

        {/* 結果表示エリア */}
        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {result.split("---").filter(text => text.includes("【本文】")).map((plan, index) => {
              const levelMatch = plan.match(/【レベル】(.*)/);
              const bodyMatch = plan.match(/【本文】([\s\S]*?)【解説】/);
              const commentMatch = plan.match(/【解説】([\s\S]*)/);
              
              const level = levelMatch ? levelMatch[1].trim() : "案";
              const bodyText = bodyMatch ? bodyMatch[1].trim() : "";
              const commentText = commentMatch ? commentMatch[1].trim() : "";

              const levelColor = 
                level.includes("フォーマル") ? "bg-slate-700 text-white" :
                level.includes("標準") ? "bg-indigo-500 text-white" : "bg-teal-400 text-white";

              return (
                <div key={index} className="bg-white border-2 border-indigo-100 rounded-2xl overflow-hidden shadow-sm hover:border-indigo-200 transition-all">
                  <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${levelColor}`}>
                        {level}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(bodyText);
                        alert(`${level}の文章をコピーしました！`);
                      }}
                      className="text-xs bg-white border border-indigo-200 text-indigo-600 px-4 py-1.5 rounded-full hover:bg-indigo-600 hover:text-white transition-all font-bold shadow-sm active:scale-95"
                    >
                      本文をコピー
                    </button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="text-slate-700 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">
                      {bodyText}
                    </div>
                    {commentText && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 relative">
                        <span className="absolute -top-2 left-3 bg-white px-2 text-[9px] font-black text-slate-400 border border-slate-100 rounded-full">ADVICE</span>
                        <p className="text-xs text-slate-500 leading-relaxed pt-1">{commentText}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SNSシェアエリア (白いカードの内側に配置) */}
        <div className="mt-12 pt-8 border-t border-slate-100 space-y-4">
          <div className="text-center">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Share this tool</h3>
            <p className="text-xs text-slate-400">「断る勇気」をみんなにシェアしよう</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleShare}
              className="flex-1 bg-slate-900 hover:bg-black text-white font-bold py-3 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 active:scale-95"
            >
              <span className="text-lg">𝕏</span>
              <span className="text-sm">で教える</span>
            </button>

            <button
              onClick={() => {
                const text = encodeURIComponent("角を立てずに断れるAIツール「お断りくん」が神すぎる...😭✨\n");
                const url = encodeURIComponent(window.location.href);
                window.open(`https://social-plugins.line.me/lineit/share?url=${url}&text=${text}`, "_blank");
              }}
              className="flex-1 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold py-3 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100 active:scale-95"
            >
              <span className="text-lg">LINE</span>
              <span className="text-sm">で送る</span>
            </button>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("サイトのURLをコピーしました！");
            }}
            className="w-full py-2 text-xs text-slate-400 hover:text-indigo-500 transition-colors font-medium flex items-center justify-center gap-1"
          >
            🔗 サイトのURLをコピーする
          </button>
        </div>
      </div> {/* ここが白いカードの閉じタグ */}
      
      <footer className="mt-8 text-slate-400 text-xs">
        © 2026 あなたの優しいお断りメーカー
      </footer>
    </main>
  );
}