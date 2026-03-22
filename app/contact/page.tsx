import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "お問い合わせ | ボブザベスの「これ便利じゃね？」",
  description: "ボブザベスの「これ便利じゃね？」へのお問い合わせはXのDMからどうぞ。",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#FFFBF5] font-sans text-slate-800">
      <div className="max-w-2xl mx-auto px-4 py-16">

        {/* 戻るリンク */}
        <a href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-10">
          ← トップへ戻る
        </a>

        <h1 className="text-3xl font-black mb-2">お問い合わせ</h1>
        <p className="text-sm text-slate-400 mb-10">ご意見・ご要望・不具合報告などお気軽にどうぞ</p>

        {/* メインカード */}
        <div className="bg-white border-2 border-slate-100 rounded-3xl p-8 text-center space-y-6">
          <div className="text-5xl">💬</div>
          <div>
            <p className="font-bold text-slate-700 mb-1">X（旧Twitter）のDMからどうぞ</p>
            <p className="text-sm text-slate-400">基本的に返信します。お気軽に！</p>
          </div>
          <a
            href="https://twitter.com/bobzabeth012"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white font-bold py-4 px-8 rounded-2xl transition-all active:scale-95 shadow-lg"
          >
            <span className="text-lg font-bold">𝕏</span>
            <span>@bobzabeth012 にDMする</span>
          </a>
        </div>

        {/* よくある問い合わせ */}
        <div className="mt-10 space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">よくあるお問い合わせ</h2>
          {[
            { q: "もっとたくさん使いたい！", a: "現在無料版は1日3回までです。ご要望はDMでお知らせください。ニーズが多ければ回数増加を検討します！" },
            { q: "ツールが動かない・エラーが出る", a: "お手数ですが、どのツールでどんなエラーが出たかをDMで教えていただけると助かります。" },
            { q: "こんなツールを作ってほしい", a: "リクエスト大歓迎です！「これ便利じゃね？」と思ったアイデアをぜひDMで教えてください。" },
          ].map((item, i) => (
            <div key={i} className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-2">
              <p className="font-bold text-sm text-slate-700">Q. {item.q}</p>
              <p className="text-sm text-slate-500 leading-relaxed">A. {item.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-slate-100 text-center text-xs text-slate-400">
          © 2026 ボブザベスの「これ便利じゃね？」
        </div>
      </div>
    </main>
  );
}
