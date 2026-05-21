import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BGGベスト人数フィルタ | ボブザベスの「これ便利じゃね？」",
  description:
    "BoardGameGeekのHot 50を、コミュニティ投票のベストプレイヤー人数やGeek/Average Ratingで絞り込み・並び替えできるツール。",
};

export default function BggLayout({ children }: { children: React.ReactNode }) {
  return children;
}
