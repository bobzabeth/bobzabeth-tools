import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "イイ感じ旅のしおりくん",
    short_name: "旅のしおり",
    description:
      "旅行・日帰りのスケジュールをかんたんに作ってシェアできる旅のしおりアプリ",
    start_url: "/plan",
    display: "standalone",
    background_color: "#FFFBF5",
    theme_color: "#0ea5e9",
    orientation: "portrait",
    icons: [
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
    ],
  };
}
