"use client";

import { forwardRef, useState } from "react";
import type { Itinerary, Item, TransportMode } from "../types";
import TimelineCard from "./TimelineCard";
import TransportBadge from "./TransportBadge";
import { formatDate, sortItemsByTime, TRANSPORT_ICONS } from "../utils";

type Props = {
  itinerary: Itinerary;
  editingId?: string | null;
  onUpdate?: (updated: Item) => void;
  onDelete?: (id: string) => void;
  onCardClick?: (id: string) => void;
  onClose?: () => void;
};

const TimelineView = forwardRef<HTMLDivElement, Props>(function TimelineView(
  { itinerary, editingId, onUpdate, onDelete, onCardClick, onClose },
  ref
) {
  const sorted = sortItemsByTime(itinerary.items);
  const isEditable = !!onUpdate;
  // どのカード間の移動情報を編集中か（上側のカードのid）
  const [editingTransportId, setEditingTransportId] = useState<string | null>(null);

  const handleTransportSave = (item: Item, mode: TransportMode | "", durationMin: string, durationMax: string) => {
    onUpdate?.({
      ...item,
      transport: mode
        ? { mode, durationMin: durationMin || undefined, durationMax: durationMax || undefined }
        : undefined,
    });
    setEditingTransportId(null);
  };

  return (
    <div ref={ref} className="space-y-0">
      {/* ヘッダー */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-black text-slate-800 leading-tight">
          {itinerary.title || "タイトル未設定"}
        </h2>
        {itinerary.date && (
          <p className="text-sm text-slate-400 font-medium mt-1">
            {formatDate(itinerary.date)}
          </p>
        )}
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-12 text-slate-300">
          <p className="text-4xl mb-3">✈️</p>
          <p className="text-sm font-medium">コマを追加して旅程を作ろう</p>
        </div>
      )}

      {sorted.map((item, index) => {
        const isEditing = isEditable && editingId === item.id;
        const isLastItem = index === sorted.length - 1;
        const isEditingTransport = editingTransportId === item.id;

        return (
          <div key={item.id}>
            {/* カード */}
            <div
              onClick={() => !isEditing && onCardClick?.(item.id)}
              className={isEditable && !isEditing ? "cursor-pointer" : ""}
            >
              {isEditing && onUpdate != null && onDelete != null ? (
                <TimelineCard
                  item={item}
                  isEditing={true}
                  onUpdate={onUpdate}
                  onDelete={() => onDelete(item.id)}
                  onClose={() => onClose?.()}
                />
              ) : (
                <TimelineCard item={item} />
              )}
            </div>

            {/* カード間エリア（最後のカードには不要） */}
            {!isLastItem && (
              <div className="py-1">
                {isEditingTransport ? (
                  <TransportEditor
                    item={item}
                    onSave={(mode, min, max) => handleTransportSave(item, mode, min, max)}
                    onCancel={() => setEditingTransportId(null)}
                  />
                ) : item.transport && isEditable ? (
                  // 既存バッジ → クリックで再編集
                  <button
                    onClick={() => setEditingTransportId(item.id)}
                    className="w-full"
                  >
                    <TransportBadge transport={item.transport} />
                  </button>
                ) : item.transport ? (
                  // 閲覧モードのバッジ（クリック不可）
                  <TransportBadge transport={item.transport} />
                ) : isEditable ? (
                  // 移動情報なし → 「+」ボタン
                  <div className="flex items-center gap-2 py-1 px-4">
                    <div className="flex-1 h-px bg-sky-100" />
                    <button
                      onClick={() => setEditingTransportId(item.id)}
                      className="w-6 h-6 rounded-full border-2 border-sky-200 text-sky-300 hover:border-sky-400 hover:text-sky-500 hover:bg-sky-50 transition-all flex items-center justify-center text-sm leading-none"
                    >
                      +
                    </button>
                    <div className="flex-1 h-px bg-sky-100" />
                  </div>
                ) : (
                  <div className="h-3" />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

function parseAmount(s?: string): string {
  if (!s) return "";
  const m = s.match(/(\d+)/);
  return m ? m[1] : "";
}

function parseUnit(s?: string): "分" | "時間" {
  if (!s) return "分";
  return s.includes("時間") ? "時間" : "分";
}

function TransportEditor({
  item,
  onSave,
  onCancel,
}: {
  item: Item;
  onSave: (mode: TransportMode | "", durationMin: string, durationMax: string) => void;
  onCancel: () => void;
}) {
  const t = item.transport;
  const [mode, setMode] = useState<TransportMode | "">(t?.mode ?? "");
  const [minAmount, setMinAmount] = useState(parseAmount(t?.durationMin ?? t?.duration));
  const [maxAmount, setMaxAmount] = useState(parseAmount(t?.durationMax));
  const [unit, setUnit] = useState<"分" | "時間">(
    parseUnit(t?.durationMin ?? t?.durationMax ?? t?.duration)
  );
  const hasExisting = !!t;

  const buildDuration = (amount: string) => (amount ? `${amount}${unit}` : "");

  return (
    <div className="mx-2 bg-sky-50 border-2 border-sky-200 rounded-2xl px-4 py-3 space-y-3">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">移動情報</p>
      {/* 1行目：移動手段アイコンラジオ */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(TRANSPORT_ICONS).map(([k, icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMode(mode === k ? "" : k as TransportMode)}
            className={`w-10 h-10 rounded-full text-xl flex items-center justify-center border-2 transition-all ${
              mode === k
                ? "border-sky-400 bg-sky-100"
                : "border-slate-100 bg-white hover:border-sky-200 hover:bg-sky-50"
            }`}
          >
            {icon}
          </button>
        ))}
      </div>
      {/* 2行目：最速 ～ 最遅 ＋ 単位スイッチ */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={minAmount}
          onChange={(e) => setMinAmount(e.target.value)}
          placeholder="最短"
          min={1}
          className="w-16 border-2 border-slate-100 rounded-xl px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-sky-300 bg-white text-center"
        />
        <span className="text-slate-400 text-sm font-bold">〜</span>
        <input
          type="number"
          value={maxAmount}
          onChange={(e) => setMaxAmount(e.target.value)}
          placeholder="最長"
          min={1}
          className="w-16 border-2 border-slate-100 rounded-xl px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-sky-300 bg-white text-center"
        />
        <div className="flex rounded-xl overflow-hidden border-2 border-slate-100">
          {(["分", "時間"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              className={`px-3 py-1.5 text-sm font-bold transition-colors ${
                unit === u
                  ? "bg-sky-500 text-white"
                  : "bg-white text-slate-400 hover:bg-sky-50"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        {hasExisting ? (
          <button
            onClick={() => onSave("", "", "")}
            className="text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            移動情報を削除
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-3 py-1.5"
          >
            キャンセル
          </button>
          <button
            onClick={() => onSave(mode, buildDuration(minAmount), buildDuration(maxAmount))}
            className="text-xs bg-sky-500 hover:bg-sky-600 text-white font-bold px-4 py-1.5 rounded-full transition-all active:scale-95"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export default TimelineView;
