import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "おでかけプランナー | 旅の流れをかんたんにまとめてシェア",
  description: "日帰りから旅行まで、おでかけのスケジュールをかんたんに作成してシェアできるツールです。",
};

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
