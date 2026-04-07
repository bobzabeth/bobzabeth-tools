"use client";

import { useEffect, useRef, useState } from "react";
import type { Item } from "../types";
import { extractGoogleMapsName } from "../utils";

type ViewProps = {
  item: Item;
  isEditing?: false;
  exportMode?: boolean;
};

type EditProps = {
  item: Item;
  isEditing: true;
  autoFocus?: boolean;
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
        autoFocus={props.autoFocus}
        onUpdate={props.onUpdate}
        onDelete={props.onDelete}
        onClose={props.onClose}
      />
    );
  }
  return <ViewCard item={item} exportMode={(props as ViewProps).exportMode} />;
}

function ViewCard({ item, exportMode }: { item: Item; exportMode?: boolean }) {
  const hasEnd = item.endTime || item.endMemo;
  return (
    <div className={`${exportMode ? "bg-white" : "bg-white/80 backdrop-blur-sm"} border-2 border-sky-100 rounded-3xl overflow-hidden shadow-sm`}>
      <div className="p-5 space-y-0">
        {/* 開始行 */}
        <div className="flex items-start gap-3">
          {/* 時間列 */}
          <div className="flex-shrink-0 text-right min-w-[52px]">
            <p className="text-sm font-black text-sky-500">{item.startTime}</p>
          </div>
          {/* ドット＋縦線列 */}
          <div className="flex-shrink-0 flex flex-col items-center pt-1">
            <div className="w-[18px] h-[18px] rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            </div>
            {hasEnd && <div className="w-0.5 flex-1 bg-sky-100 mt-1 min-h-[1.5rem]" />}
          </div>
          {/* 内容列 */}
          <div className={`flex-1 min-w-0 space-y-2 ${hasEnd ? "pb-2" : "pb-1"}`}>
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
                📍 {extractGoogleMapsName(item.mapUrl) ?? "地図を開く"}
              </a>
            )}
          </div>
        </div>

        {/* 終了行 */}
        {hasEnd && (
          <div className="flex items-start gap-3">
            {/* 終了時間列 */}
            <div className="flex-shrink-0 text-right min-w-[52px]">
              {item.endTime && (
                <p className="text-sm font-black text-sky-500">{item.endTime}</p>
              )}
            </div>
            {/* ドット列 */}
            <div className="flex-shrink-0 flex flex-col items-center pt-1">
              <div className="w-[18px] h-[18px] rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            </div>
            </div>
            {/* 終了メモ列 */}
            <div className="flex-1 min-w-0 pb-1">
              {item.endMemo && (
                <p className="font-black text-slate-800 leading-tight">{item.endMemo}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditCard({
  item,
  autoFocus,
  onUpdate,
  onDelete,
  onClose,
}: {
  item: Item;
  autoFocus?: boolean;
  onUpdate: (updated: Item) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Item>(item);
  const [showOptional, setShowOptional] = useState(!!(item.memo || item.mapUrl));
  const [showEnd, setShowEnd] = useState(!!(item.endTime || item.endMemo));
  const startTimeRef = useRef<HTMLInputElement>(null);

  // 新規コマのときだけ開始時間にauto-focus（一度だけ）
  useEffect(() => {
    if (autoFocus) {
      startTimeRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (patch: Partial<Item>) => {
    const updated = { ...draft, ...patch };
    setDraft(updated);
    onUpdate(updated);
  };

  return (
    <div className="bg-white border-2 border-sky-300 rounded-3xl p-5 shadow-lg space-y-3">
      {/* 1行目：開始時間 */}
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide w-14">開始時間</label>
        <input
          ref={startTimeRef}
          type="time"
          value={draft.startTime}
          onChange={(e) => update({ startTime: e.target.value })}
          className="border-2 border-slate-100 rounded-xl px-2 py-1 text-sm font-bold text-slate-700 focus:outline-none focus:border-sky-300 bg-slate-50"
        />
      </div>

      {/* 2行目：イベント名 */}
      <input
        type="text"
        value={draft.name}
        onChange={(e) => update({ name: e.target.value })}
        placeholder="イベント名（例：清水寺を観光）"
        className="w-full border-2 border-slate-100 rounded-2xl px-4 py-2.5 text-slate-700 font-bold focus:outline-none focus:border-sky-300 bg-slate-50"
      />

      {/* 3行目：メモ・地図URL（任意） */}
      <button
        type="button"
        onClick={() => setShowOptional((v) => !v)}
        className="text-[11px] text-slate-400 hover:text-sky-500 transition-colors font-medium"
      >
        {showOptional ? "▲ メモ・地図URLを閉じる" : "▼ メモ・地図URLを追加"}
      </button>
      {showOptional && (
        <div className="space-y-3 pt-1">
          <textarea
            value={draft.memo ?? ""}
            onChange={(e) => update({ memo: e.target.value || undefined })}
            placeholder="メモ（任意）"
            rows={2}
            className="w-full border-2 border-slate-100 rounded-2xl px-4 py-2.5 text-sm text-slate-700 resize-none focus:outline-none focus:border-sky-300 bg-slate-50"
          />
          <input
            type="url"
            value={draft.mapUrl ?? ""}
            onChange={(e) => update({ mapUrl: e.target.value || undefined })}
            placeholder="地図URL（Google Maps等、任意）"
            className="w-full border-2 border-slate-100 rounded-2xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-sky-300 bg-slate-50"
          />
        </div>
      )}

      {/* 4〜5行目：終了時間・終了メモ（任意） */}
      <button
        type="button"
        onClick={() => {
          const opening = !showEnd;
          setShowEnd(opening);
          // 開くタイミングで終了時間が空なら開始+1時間をセット
          if (opening && !draft.endTime && draft.startTime) {
            const [h, m] = draft.startTime.split(":").map(Number);
            const nextH = Math.min(h + 1, 23);
            update({ endTime: `${String(nextH).padStart(2, "0")}:${String(m).padStart(2, "0")}` });
          }
        }}
        className="text-[11px] text-slate-400 hover:text-sky-500 transition-colors font-medium"
      >
        {showEnd ? "▲ 終了情報を閉じる" : "▼ 終了時間・終了メモを追加"}
      </button>
      {showEnd && (
        <div className="space-y-3 pt-1">
          {/* 4行目：終了時間 */}
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide w-14">終了時間</label>
            <input
              type="time"
              value={draft.endTime ?? ""}
              onChange={(e) => update({ endTime: e.target.value || undefined })}
              className="border-2 border-slate-100 rounded-xl px-2 py-1 text-sm font-bold text-slate-700 focus:outline-none focus:border-sky-300 bg-slate-50"
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
          {/* 5行目：終了メモ */}
          <input
            type="text"
            value={draft.endMemo ?? ""}
            onChange={(e) => update({ endMemo: e.target.value || undefined })}
            placeholder="終了メモ（例：清水寺を出発）"
            className="w-full border-2 border-slate-100 rounded-2xl px-4 py-2.5 text-slate-700 font-bold focus:outline-none focus:border-sky-300 bg-slate-50"
          />
        </div>
      )}

      {/* 下部ボタン行：左に削除、右に完了 */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onDelete}
          className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium"
        >
          このコマを削除
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs bg-sky-500 hover:bg-sky-600 text-white font-bold px-4 py-1.5 rounded-full transition-all active:scale-95"
        >
          完了
        </button>
      </div>
    </div>
  );
}
