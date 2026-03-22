import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ボブザベスの「これ便利じゃね？」| 無料AIツール集",
  description: "bobzabethが「これ便利じゃね？」と思って作った無料AIツールを集めました。日常のちょっと困ったをAIが解決します。",
};

const TOOLS = [
  {
    id: "keigo",
    emoji: "✨",
    name: "イイ感じ敬語くん",
    desc: "伝えたいことをざっくり入力するだけで、相手に合わせたいい感じの言葉に変換してくれるよ。",
    tags: ["敬語", "コミュニケーション", "文章"],
    url: "https://iikanjikeigo-kun.vercel.app/",
    color: "from-emerald-400 to-teal-500",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    tagColor: "bg-emerald-100 text-emerald-700",
  },
  // 今後のツールはここに追加してね👇
  // {
  //   id: "tool2",
  //   emoji: "🔧",
  //   name: "ツール名",
  //   desc: "説明文",
  //   tags: ["タグ"],
  //   url: "/",
  //   color: "from-blue-400 to-indigo-500",
  //   bg: "bg-blue-50",
  //   border: "border-blue-100",
  //   tagColor: "bg-blue-100 text-blue-700",
  // },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#FFFBF5] font-sans text-slate-800">

      {/* 背景装飾 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-yellow-100 rounded-full opacity-60 blur-3xl"></div>
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-pink-100 rounded-full opacity-50 blur-3xl"></div>
        <div className="absolute -bottom-20 right-1/3 w-72 h-72 bg-emerald-100 rounded-full opacity-50 blur-3xl"></div>
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-16 md:py-24">

        {/* ヘッダー */}
        <header className="mb-16 md:mb-20">
          <div className="inline-block bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full mb-4 tracking-wide">
            by bobzabeth 🐟
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4">
            ボブザベスの<br />
            <span className="relative inline-block">
              <span className="relative z-10">「これ便利じゃね？」</span>
              <span className="absolute -bottom-1 left-0 w-full h-3 bg-yellow-200 -z-0 rounded"></span>
            </span>
          </h1>
          <p className="text-slate-500 text-base md:text-lg leading-relaxed">
            日常のちょっと困ったをAIで解決する、<br className="hidden md:block" />
            bobzabethの自作ツール置き場です🧰
          </p>
        </header>

        {/* ツール一覧 */}
        <section>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
            Tools — {TOOLS.length}個公開中
          </h2>

          <div className="space-y-4">
            {TOOLS.map((tool) => (
              <a
                key={tool.id}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group block ${tool.bg} border-2 ${tool.border} rounded-3xl p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 bg-gradient-to-br ${tool.color} rounded-2xl flex items-center justify-center text-xl shadow-sm`}>
                    {tool.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-black text-lg text-slate-800 group-hover:text-slate-900">
                        {tool.name}
                      </h3>
                      <span className="flex-shrink-0 text-slate-300 group-hover:text-slate-400 transition-colors text-lg">→</span>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed mb-3">
                      {tool.desc}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {tool.tags.map((tag) => (
                        <span key={tag} className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${tool.tagColor}`}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </a>
            ))}

            {/* 近日公開予定カード */}
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-6 text-center">
              <p className="text-2xl mb-2">🔨</p>
              <p className="text-sm font-bold text-slate-400">次のツールを絶賛開発中...</p>
              <p className="text-xs text-slate-300 mt-1">お楽しみに！</p>
            </div>
          </div>
        </section>

        {/* フッター */}
        <footer className="mt-20 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 ボブザベスの「これ便利じゃね？」</p>
          <a
            href="https://twitter.com/bobzabeth012"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-slate-600 transition-colors font-medium"
          >
            <span className="font-bold">𝕏</span>
            <span>@bobzabeth012</span>
          </a>
        </footer>

      </div>
    </main>
  );
}
