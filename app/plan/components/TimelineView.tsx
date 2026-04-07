"use client";

import { forwardRef, useState } from "react";
import type { Item, TransportMode } from "../types";
import TimelineCard from "./TimelineCard";
import TransportBadge from "./TransportBadge";
import { formatDate, TRANSPORT_ICONS } from "../utils";

type Props = {
  itinerary: { title: string; date: string; items: Item[] };
  hideHeader?: boolean;
  exportMode?: boolean;
  editingId?: string | null;
  newItemId?: string | null;
  onUpdate?: (updated: Item) => void;
  onDelete?: (id: string) => void;
  onReorder?: (items: Item[]) => void;
  onCardClick?: (id: string) => void;
  onClose?: () => void;
};

const TimelineView = forwardRef<HTMLDivElement, Props>(function TimelineView(
  { itinerary, hideHeader, exportMode, editingId, newItemId, onUpdate, onDelete, onReorder, onCardClick, onClose },
  ref
) {
  const items = itinerary.items;
  const isEditable = !!onUpdate;

  // どのカード間の移動情報を編集中か（上側のカードのid）
  const [editingTransportId, setEditingTransportId] = useState<string | null>(null);

  // DnD state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
    setEditingTransportId(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) setDragOverIndex(index);
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null) return;
    if (dragIndex !== targetIndex) {
      const newItems = [...items];
      const [moved] = newItems.splice(dragIndex, 1);
      const insertAt = dragIndex < targetIndex ? targetIndex - 1 : targetIndex;
      newItems.splice(insertAt, 0, moved);
      onReorder?.(newItems);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleTransportSave = (item: Item, mode: TransportMode | "", durationMin: string, durationMax: string, memo: string) => {
    onUpdate?.({
      ...item,
      transport: mode
        ? { mode, durationMin: durationMin || undefined, durationMax: durationMax || undefined, memo: memo || undefined }
        : undefined,
    });
    setEditingTransportId(null);
  };

  return (
    <div ref={ref} className="space-y-0">
      {/* ヘッダー */}
      {!hideHeader && (
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
      )}

      {items.length === 0 && (
        <div className="text-center py-12 text-slate-300">
          <p className="text-4xl mb-3">✈️</p>
          <p className="text-sm font-medium">コマを追加して旅程を作ろう</p>
        </div>
      )}

      {items.map((item, index) => {
        const isEditing = isEditable && editingId === item.id;
        const isLastItem = index === items.length - 1;
        const isEditingTransport = editingTransportId === item.id;
        const isDragging = dragIndex === index;
        const isDropTarget = dragOverIndex === index && dragIndex !== null && dragIndex !== index;

        return (
          <div
            key={item.id}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
          >
            {/* ドロップインジケーター */}
            {isDropTarget && (
              <div className="h-0.5 bg-sky-400 rounded-full mx-3 mb-1" />
            )}

            {/* カード行 */}
            <div
              className={`flex items-start gap-1 transition-opacity ${isDragging ? "opacity-30" : ""}`}
              draggable={isEditable && !isEditing}
              onDragStart={() => handleDragStart(index)}
              onDragEnd={handleDragEnd}
            >
              {/* ドラッグハンドル（編集モードのみ） */}
              {isEditable && (
                <div
                  className={`flex-shrink-0 flex items-center pt-[18px] ${
                    isEditing
                      ? "invisible"
                      : "cursor-grab active:cursor-grabbing text-slate-200 hover:text-slate-400 transition-colors"
                  }`}
                >
                  <svg width="10" height="18" viewBox="0 0 10 18" fill="currentColor">
                    <circle cx="3" cy="3" r="1.5" />
                    <circle cx="7" cy="3" r="1.5" />
                    <circle cx="3" cy="9" r="1.5" />
                    <circle cx="7" cy="9" r="1.5" />
                    <circle cx="3" cy="15" r="1.5" />
                    <circle cx="7" cy="15" r="1.5" />
                  </svg>
                </div>
              )}

              {/* カード本体 */}
              <div
                className={`flex-1 min-w-0 ${isEditable && !isEditing ? "cursor-pointer" : ""}`}
                onClick={() => !isEditing && onCardClick?.(item.id)}
              >
                {isEditing && onUpdate != null && onDelete != null ? (
                  <TimelineCard
                    item={item}
                    isEditing={true}
                    autoFocus={item.id === newItemId}
                    onUpdate={onUpdate}
                    onDelete={() => onDelete(item.id)}
                    onClose={() => onClose?.()}
                  />
                ) : (
                  <TimelineCard item={item} exportMode={exportMode} />
                )}
              </div>
            </div>

            {/* カード間エリア（最後のカードには不要） */}
            {!isLastItem && (
              <div className="py-1">
                {isEditingTransport ? (
                  <TransportEditor
                    item={item}
                    onSave={(mode, min, max, memo) => handleTransportSave(item, mode, min, max, memo)}
                    onCancel={() => setEditingTransportId(null)}
                  />
                ) : item.transport && isEditable ? (
                  <button
                    onClick={() => setEditingTransportId(item.id)}
                    className="w-full"
                  >
                    <TransportBadge transport={item.transport} />
                  </button>
                ) : item.transport ? (
                  <TransportBadge transport={item.transport} />
                ) : isEditable ? (
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

      {/* 末尾ドロップゾーン */}
      {isEditable && dragIndex !== null && (
        <div
          className="h-8 flex items-center"
          onDragOver={(e) => { e.preventDefault(); setDragOverIndex(items.length); }}
          onDrop={() => handleDrop(items.length)}
        >
          {dragOverIndex === items.length && (
            <div className="w-full h-0.5 bg-sky-400 rounded-full mx-3" />
          )}
        </div>
      )}
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
  onSave: (mode: TransportMode | "", durationMin: string, durationMax: string, memo: string) => void;
  onCancel: () => void;
}) {
  const t = item.transport;
  const [mode, setMode] = useState<TransportMode | "">(t?.mode ?? "");
  const [minAmount, setMinAmount] = useState(parseAmount(t?.durationMin ?? t?.duration));
  const [maxAmount, setMaxAmount] = useState(parseAmount(t?.durationMax));
  const [unit, setUnit] = useState<"分" | "時間">(
    parseUnit(t?.durationMin ?? t?.durationMax ?? t?.duration)
  );
  const [memo, setMemo] = useState(t?.memo ?? "");
  const hasExisting = !!t;

  const buildDuration = (amount: string) => (amount ? `${amount}${unit}` : "");

  return (
    <div className="mx-2 bg-sky-50 border-2 border-sky-200 rounded-2xl px-4 py-3 space-y-3">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">移動情報</p>
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
      <input
        type="text"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="メモ（例：混雑注意、乗り換え1回）"
        className="w-full border-2 border-slate-100 rounded-xl px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-sky-300 bg-white"
      />
      <div className="flex items-center justify-between">
        {hasExisting ? (
          <button
            onClick={() => onSave("", "", "", "")}
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
            onClick={() => onSave(mode, buildDuration(minAmount), buildDuration(maxAmount), memo)}
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
