"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type BggGame = {
  id: string;
  hotRank: number;
  name: string;
  yearPublished?: number;
  thumbnail?: string;
  minPlayers?: number;
  maxPlayers?: number;
  averageRating: number;
  geekRating: number;
  usersRated: number;
  bggRank?: number;
  bestPlayers: string[];
  recommendedPlayers: string[];
};

type SortKey = "hot" | "geek" | "average";
type PlayerMode = "best" | "recommended";

const PLAYER_BUTTONS = ["1", "2", "3", "4", "5", "6", "7+"];

function matchesPlayerCount(list: string[], target: string): boolean {
  if (target === "7+") {
    return list.some((c) => {
      if (c.endsWith("+")) return parseInt(c) <= 7;
      const n = parseInt(c);
      return !isNaN(n) && n >= 7;
    });
  }
  return list.some((c) => c === target);
}

export default function BggPage() {
  const [games, setGames] = useState<BggGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorDebug, setErrorDebug] = useState<unknown>(null);
  const [selectedCounts, setSelectedCounts] = useState<string[]>([]);
  const [playerMode, setPlayerMode] = useState<PlayerMode>("best");
  const [sortKey, setSortKey] = useState<SortKey>("geek");
  const [fetchedAt, setFetchedAt] = useState<string>("");
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<unknown>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDebugMode(new URLSearchParams(window.location.search).get("debug") === "1");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const qs = debugMode ? "?debug=1" : "";
        const t0 = performance.now();
        const res = await fetch(`/api/bgg/hot${qs}`);
        const data = await res.json();
        const elapsed = Math.round(performance.now() - t0);
        if (cancelled) return;
        if (debugMode) {
          console.log("[bgg page] /api/bgg/hot response", {
            status: res.status,
            elapsedMs: elapsed,
            data,
          });
        }
        if (!res.ok) {
          setErrorDebug(data?.debug ?? null);
          throw new Error(data.error || `取得に失敗しました (HTTP ${res.status})`);
        }
        setGames(data.games ?? []);
        setFetchedAt(data.fetchedAt ?? "");
        if (debugMode) setDebugInfo(data.debug ?? null);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "予期しないエラー";
          setError(msg);
          console.error("[bgg page] fetch error", e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debugMode]);

  const togglePlayerCount = (c: string) => {
    setSelectedCounts((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const filteredSorted = useMemo(() => {
    const filtered = games.filter((g) => {
      if (selectedCounts.length === 0) return true;
      const list = playerMode === "best" ? g.bestPlayers : g.recommendedPlayers;
      return selectedCounts.every((c) => matchesPlayerCount(list, c));
    });
    const sorted = [...filtered];
    if (sortKey === "geek") {
      sorted.sort((a, b) => b.geekRating - a.geekRating);
    } else if (sortKey === "average") {
      sorted.sort((a, b) => b.averageRating - a.averageRating);
    } else {
      sorted.sort((a, b) => a.hotRank - b.hotRank);
    }
    return sorted;
  }, [games, selectedCounts, playerMode, sortKey]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 font-sans text-slate-800">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div
          className="absolute bottom-20 right-10 w-72 h-72 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="relative max-w-3xl mx-auto px-4 py-10 md:py-14">
        <header className="mb-8">
          <Link
            href="/"
            className="inline-block text-xs text-slate-400 hover:text-slate-600 mb-4"
          >
            ← ボブザベスのツール一覧
          </Link>
          <div className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full mb-3">
            🎲 ボードゲーム好き向け
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mb-3">
            BGGホット
            <span className="relative inline-block">
              <span className="relative z-10">「ベスト人数」</span>
              <span className="absolute -bottom-1 left-0 w-full h-2.5 bg-orange-200 -z-0 rounded"></span>
            </span>
            で絞り込み
          </h1>
          <p className="text-slate-500 text-sm md:text-base leading-relaxed">
            BoardGameGeekのHot 50を、コミュニティ投票の「ベスト人数」やレートで並び替えできます🎲
          </p>
        </header>

        {/* フィルタ */}
        <section className="bg-white/70 backdrop-blur border-2 border-orange-100 rounded-3xl p-5 md:p-6 mb-6 shadow-sm space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              何人で遊ぶ？（複数選択OK）
            </label>
            <div className="flex flex-wrap gap-2">
              {PLAYER_BUTTONS.map((c) => {
                const active = selectedCounts.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => togglePlayerCount(c)}
                    className={`px-4 py-2 rounded-2xl text-sm font-bold border-2 transition-all ${
                      active
                        ? "bg-orange-500 border-orange-500 text-white shadow-md"
                        : "bg-white border-slate-200 text-slate-600 hover:border-orange-300"
                    }`}
                  >
                    {c}人
                  </button>
                );
              })}
              {selectedCounts.length > 0 && (
                <button
                  onClick={() => setSelectedCounts([])}
                  className="px-3 py-2 rounded-2xl text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  クリア
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              判定モード
            </label>
            <div className="inline-flex bg-slate-100 rounded-2xl p-1">
              <button
                onClick={() => setPlayerMode("best")}
                className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${
                  playerMode === "best"
                    ? "bg-white text-slate-800 shadow"
                    : "text-slate-500"
                }`}
              >
                Bestのみ
              </button>
              <button
                onClick={() => setPlayerMode("recommended")}
                className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${
                  playerMode === "recommended"
                    ? "bg-white text-slate-800 shadow"
                    : "text-slate-500"
                }`}
              >
                Best + Recommended
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              並び順
            </label>
            <div className="inline-flex bg-slate-100 rounded-2xl p-1 flex-wrap">
              <button
                onClick={() => setSortKey("hot")}
                className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${
                  sortKey === "hot"
                    ? "bg-white text-slate-800 shadow"
                    : "text-slate-500"
                }`}
              >
                🔥 Hot順
              </button>
              <button
                onClick={() => setSortKey("geek")}
                className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${
                  sortKey === "geek"
                    ? "bg-white text-slate-800 shadow"
                    : "text-slate-500"
                }`}
              >
                ⭐ Geek Rating
              </button>
              <button
                onClick={() => setSortKey("average")}
                className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${
                  sortKey === "average"
                    ? "bg-white text-slate-800 shadow"
                    : "text-slate-500"
                }`}
              >
                ✨ Avg Rating
              </button>
            </div>
          </div>
        </section>

        {/* 結果 */}
        <section>
          {loading && (
            <div className="text-center py-16">
              <div className="inline-block w-10 h-10 border-4 border-orange-300 border-t-orange-500 rounded-full animate-spin"></div>
              <p className="mt-4 text-sm text-slate-500">
                BGGから取得中… 数秒かかります
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 text-sm text-rose-700">
              <p className="font-bold mb-1">エラー</p>
              <p className="break-all">{error}</p>
              <p className="mt-2 text-xs text-rose-500">
                ヒント: URLに <code className="bg-rose-100 px-1 rounded">?debug=1</code>{" "}
                を付けると詳細が表示されます。サーバー側ログも{" "}
                <code className="bg-rose-100 px-1 rounded">[bgg/hot]</code>{" "}
                プレフィックスで出力中。
              </p>
              {errorDebug !== null && errorDebug !== undefined ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-bold">
                    デバッグ詳細を表示
                  </summary>
                  <pre className="mt-2 text-[10px] bg-white border border-rose-100 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(errorDebug, null, 2)}
                  </pre>
                </details>
              ) : null}
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {filteredSorted.length}件 / 全{games.length}件
                </p>
                {fetchedAt && (
                  <p className="text-[10px] text-slate-400">
                    更新: {new Date(fetchedAt).toLocaleString("ja-JP")}
                  </p>
                )}
              </div>

              {filteredSorted.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  条件に合うゲームがありません🥲
                </div>
              ) : (
                <ul className="space-y-3">
                  {filteredSorted.map((g) => (
                    <li
                      key={g.id}
                      className="bg-white border-2 border-slate-100 rounded-2xl p-4 hover:border-orange-200 hover:shadow-md transition-all"
                    >
                      <div className="flex gap-4">
                        {g.thumbnail && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={g.thumbnail}
                            alt={g.name}
                            className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover flex-shrink-0 bg-slate-100"
                            loading="lazy"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-black text-base md:text-lg leading-tight">
                              <a
                                href={`https://boardgamegeek.com/boardgame/${g.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-orange-600"
                              >
                                {g.name}
                              </a>
                              {g.yearPublished && (
                                <span className="text-slate-400 font-normal text-sm ml-1">
                                  ({g.yearPublished})
                                </span>
                              )}
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400 flex-shrink-0">
                              🔥{g.hotRank}
                              {g.bggRank ? ` · #${g.bggRank}` : ""}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mb-2">
                            <span className="text-slate-600">
                              <span className="font-bold text-orange-600">
                                ⭐ Geek
                              </span>{" "}
                              {g.geekRating.toFixed(2)}
                            </span>
                            <span className="text-slate-600">
                              <span className="font-bold text-amber-600">
                                ✨ Avg
                              </span>{" "}
                              {g.averageRating.toFixed(2)}
                            </span>
                            <span className="text-slate-400">
                              ({g.usersRated.toLocaleString()}人評価)
                            </span>
                            {g.minPlayers && g.maxPlayers && (
                              <span className="text-slate-500">
                                👥 {g.minPlayers}–{g.maxPlayers}人
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {g.bestPlayers.length > 0 && (
                              <span className="text-[11px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                Best: {g.bestPlayers.join(", ")}
                              </span>
                            )}
                            {g.recommendedPlayers.filter(
                              (c) => !g.bestPlayers.includes(c)
                            ).length > 0 && (
                              <span className="text-[11px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                                Rec:{" "}
                                {g.recommendedPlayers
                                  .filter((c) => !g.bestPlayers.includes(c))
                                  .join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {debugMode && debugInfo !== null && debugInfo !== undefined ? (
            <details className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs">
              <summary className="cursor-pointer font-bold text-slate-600">
                🐛 デバッグ情報（?debug=1）
              </summary>
              <pre className="mt-2 text-[10px] bg-white border border-slate-100 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          ) : null}
        </section>

        <footer className="mt-12 pt-6 border-t border-slate-200 text-xs text-slate-400 text-center space-y-1">
          <p>
            データ提供:{" "}
            <a
              href="https://boardgamegeek.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-600"
            >
              BoardGameGeek
            </a>
          </p>
          <p>© 2026 ボブザベスの「これ便利じゃね？」</p>
        </footer>
      </div>
    </main>
  );
}
