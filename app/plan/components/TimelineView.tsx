import { forwardRef } from "react";
import type { Itinerary, Item } from "../types";
import TimelineCard from "./TimelineCard";
import TransportBadge from "./TransportBadge";
import { formatDate, sortItemsByTime } from "../utils";

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
        return (
          <div key={item.id}>
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
            {/* 移動バッジ */}
            {item.transport && index < sorted.length - 1 && (
              <TransportBadge transport={item.transport} />
            )}
            {!item.transport && index < sorted.length - 1 && (
              <div className="h-3" />
            )}
          </div>
        );
      })}
    </div>
  );
});

export default TimelineView;
