import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

function getPost(slug: string) {
  const filePath = path.join(process.cwd(), "content/posts", `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return { data, content };
}

// MarkdownをシンプルなHTMLに変換（外部ライブラリなし）
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-slate-800 mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-black text-slate-800 mt-10 mb-4">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-black text-slate-800 mt-10 mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-slate-800">$1</strong>')
    .replace(/^\- (.+)$/gm, '<li class="ml-4 list-disc text-slate-600">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-slate-600">$2</li>')
    .replace(/(<li[\s\S]+?<\/li>)/g, '<ul class="space-y-1 my-4">$1</ul>')
    .replace(/^(?!<[h|u|l]).+$/gm, (line) =>
      line.trim() ? `<p class="text-slate-600 leading-relaxed my-4">${line}</p>` : ""
    )
    .replace(/\n{2,}/g, "\n");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: `${post.data.title} | ボブザベスの「これ便利じゃね？」`,
    description: post.data.description,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const html = markdownToHtml(post.content);

  return (
    <main className="min-h-screen bg-[#FFFBF5] font-sans text-slate-800">
      <div className="max-w-2xl mx-auto px-4 py-16">

        <a href="/blog" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-10">
          ← ブログ一覧へ戻る
        </a>

        {/* ヘッダー */}
        <div className="mb-10">
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(post.data.tags ?? []).map((tag: string) => (
              <span key={tag} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                #{tag}
              </span>
            ))}
          </div>
          <h1 className="text-2xl md:text-3xl font-black leading-snug mb-3">
            {post.data.title}
          </h1>
          <p className="text-xs text-slate-400">{post.data.date}</p>
        </div>

        {/* 本文 */}
        <article
          className="text-sm md:text-base"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* ツールへの導線 */}
        <div className="mt-16 bg-emerald-50 border-2 border-emerald-100 rounded-3xl p-6 text-center space-y-3">
          <p className="text-sm font-bold text-slate-700">✨ 敬語に困ったらこのツールが便利！</p>
          <p className="text-xs text-slate-500">伝えたいことを入力するだけで、いい感じの言葉に変換してくれます。</p>
          <a
            href="/keigo"
            className="inline-block bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-3 px-6 rounded-2xl text-sm shadow-lg shadow-emerald-100 hover:opacity-90 transition-all active:scale-95"
          >
            イイ感じ敬語くんを使ってみる →
          </a>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-100 text-center text-xs text-slate-400">
          © 2026 ボブザベスの「これ便利じゃね？」
        </div>
      </div>
    </main>
  );
}