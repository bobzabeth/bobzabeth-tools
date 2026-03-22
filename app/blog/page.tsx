import type { Metadata } from "next";
import Link from "next/link";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

export const metadata: Metadata = {
  title: "ブログ | ボブザベスの「これ便利じゃね？」",
  description: "敬語・ビジネスメール・AIツール活用など、日常で使える情報を発信しています。",
};

type Post = {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
};

function getPosts(): Post[] {
  const postsDir = path.join(process.cwd(), "content/posts");
  if (!fs.existsSync(postsDir)) return [];
  const files = fs.readdirSync(postsDir).filter((f) => f.endsWith(".md"));
  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(postsDir, file), "utf-8");
      const { data } = matter(raw);
      return {
        slug: file.replace(".md", ""),
        title: data.title ?? "タイトルなし",
        date: data.date ?? "",
        description: data.description ?? "",
        tags: data.tags ?? [],
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export default function BlogPage() {
  const posts = getPosts();

  return (
    <main className="min-h-screen bg-[#FFFBF5] font-sans text-slate-800">
      <div className="max-w-2xl mx-auto px-4 py-16">

        <a href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-10">
          ← トップへ戻る
        </a>

        <h1 className="text-3xl font-black mb-2">ブログ</h1>
        <p className="text-sm text-slate-400 mb-10">敬語・メール・AIツール活用など、日常で使える情報を発信中</p>

        {posts.length === 0 ? (
          <p className="text-slate-400 text-sm">記事はまだありません。</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block bg-white border-2 border-slate-100 rounded-3xl p-6 hover:border-emerald-200 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 mb-1">{post.date}</p>
                    <h2 className="font-black text-base text-slate-800 group-hover:text-emerald-700 transition-colors mb-2 leading-snug">
                      {post.title}
                    </h2>
                    <p className="text-sm text-slate-500 leading-relaxed mb-3">{post.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {post.tags.map((tag) => (
                        <span key={tag} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="flex-shrink-0 text-slate-300 group-hover:text-emerald-400 transition-colors text-lg mt-1">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-16 pt-8 border-t border-slate-100 text-center text-xs text-slate-400">
          © 2026 ボブザベスの「これ便利じゃね？」
        </div>
      </div>
    </main>
  );
}
