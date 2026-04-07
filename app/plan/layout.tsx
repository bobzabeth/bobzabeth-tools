import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "イイ感じ旅のしおりくん | 旅行・日帰りのスケジュールをかんたんにまとめてシェア",
  description: "日帰りから旅行・イベントまで、おでかけのスケジュールをかんたんに作成してシェアできる旅のしおりアプリです。",
};

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
