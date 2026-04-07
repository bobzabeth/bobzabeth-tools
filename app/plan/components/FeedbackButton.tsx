"use client";

import { useRouter } from "next/navigation";

export default function FeedbackButton({ page }: { page?: string }) {
  const router = useRouter();
  const href = `/plan/feedback${page ? `?from=${encodeURIComponent(page)}` : ""}`;

  return (
    <button
      onClick={() => router.push(href)}
      className="fixed bottom-5 right-5 z-40 bg-white border-2 border-sky-200 hover:border-sky-400 shadow-lg hover:shadow-sky-100 text-sky-500 font-bold text-xs px-4 py-2.5 rounded-full transition-all active:scale-95 flex items-center gap-1.5"
    >
      💬 ご意見
    </button>
  );
}
