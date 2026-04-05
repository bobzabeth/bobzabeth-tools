"use client";

import { useState } from "react";
import type { Item } from "../types";

type ViewProps = {
  item: Item;
  isEditing?: false;
};

type EditProps = {
  item: Item;
  isEditing: true;
  onUpdate: (updated: Item) => void;
  onDelete: () => void;
  onClose: () => void;
};

type Props = ViewProps | EditProps;

export default function TimelineCard(props: Props) {
  const { item } = props;
  const isEditing = props.isEditing === true;
  if (isEditing && props.isEditing) {
    return (
      <EditCard
        item={item}
        onUpdate={props.onUpdate}
        onDelete={props.onDelete}
        onClose={props.onClose}
      />
    );
  }

  return <ViewCard item={item} />;
}

function ViewCard({ item }: { item: Item }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm border-2 border-sky-100 rounded-3xl overflow-hidden shadow-sm">
      <div className="flex items-start gap-3 p-5">
        {/* 時間 */}
        <div className="flex-shrink-0 text-right min-w-[52px]">
          <p className="text-sm font-black text-sky-500">{item.startTime}</p>
          {item.endTime && (
            <p className="text-[10px] text-slate-400 font-medium">{item.endTime}</p>
          )}
        </div>
        {/* 縦線 */}
        <div className="flex-shrink-0 flex flex-col items-center pt-1">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-400 ring-2 ring-sky-100" />
          <div className="w-0.5 flex-1 bg-sky-100 mt-1" />
        </div>
        {/* 内容 */}
        <div className="flex-1 min-w-0 pb-2 space-y-2">
          <p className="font-black text-slate-800 leading-tight">{item.name}</p>
          {item.memo && (
            <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">
              {item.memo}
            </p>
          )}
          {item.mapUrl && (
            <a
              href={item.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-sky-500 hover:text-sky-700 font-medium"
            >
              📍 地図を開く
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function EditCard({
  item,
  onUpdate,
  onDelete,
  onClose,
}: {
  item: Item;
  onUpdate: (updated: Item) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Item>(item);
  const [showOptional, setShowOptional] = useState(!!(item.memo || item.mapUrl));

  const update = (patch: Partial<Item>) => {
    const updated = { ...draft, ...patch };
    setDraft(updated);
    onUpdate(updated);
  };

  return (
    <div className="bg-white border-2 border-sky-300 rounded-3xl p-5 shadow-lg space-y-3">
      {/* 完了ボタン */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="text-xs bg-sky-500 hover:bg-sky-600 text-white font-bold px-4 py-1.5 rounded-full transition-all active:scale-95"
        >
          完了
        </button>
      </div>

      {/* 時間 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">開始</label>
          <input
            type="time"
            value={draft.startTime}
            onChange={(e) => update({ startTime: e.target.value })}
            className="border-2 border-slate-100 rounded-xl px-2 py-1 text-sm font-bold text-slate-700 focus:outline-none focus:border-sky-300 bg-slate-50"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">終了</label>
          <input
            type="text"
            value={draft.endTime ?? ""}
            onChange={(e) => update({ endTime: e.target.value || undefined })}
            placeholder="例：11:30"
            maxLength={5}
            className="border-2 border-slate-100 rounded-xl px-2 py-1 text-sm text-slate-700 focus:outline-none focus:border-sky-300 bg-slate-50 w-24"
          />
          {draft.endTime && (
            <button
              type="button"
              onClick={() => update({ endTime: undefined })}
              className="text-slate-300 hover:text-slate-500 transition-colors text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* イベント名 */}
      <input
        type="text"
        value={draft.name}
        onChange={(e) => update({ name: e.target.value })}
        placeholder="イベント名（例：清水寺を観光）"
        className="w-full border-2 border-slate-100 rounded-2xl px-4 py-2.5 text-slate-700 font-bold focus:outline-none focus:border-sky-300 bg-slate-50"
      />

      {/* オプション展開 */}
      <button
        type="button"
        onClick={() => setShowOptional((v) => !v)}
        className="text-[11px] text-slate-400 hover:text-sky-500 transition-colors font-medium"
      >
        {showOptional ? "▲ オプションを閉じる" : "▼ メモ・地図URLを追加"}
      </button>

      {showOptional && (
        <div className="space-y-3 pt-1">
          {/* メモ */}
          <textarea
            value={draft.memo ?? ""}
            onChange={(e) => update({ memo: e.target.value || undefined })}
            placeholder="メモ（任意）"
            rows={2}
            className="w-full border-2 border-slate-100 rounded-2xl px-4 py-2.5 text-sm text-slate-700 resize-none focus:outline-none focus:border-sky-300 bg-slate-50"
          />
          {/* 地図URL */}
          <input
            type="url"
            value={draft.mapUrl ?? ""}
            onChange={(e) => update({ mapUrl: e.target.value || undefined })}
            placeholder="地図URL（Google Maps等、任意）"
            className="w-full border-2 border-slate-100 rounded-2xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-sky-300 bg-slate-50"
          />
        </div>
      )}

      {/* 削除 */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onDelete}
          className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium"
        >
          このコマを削除
        </button>
      </div>
    </div>
  );
}
