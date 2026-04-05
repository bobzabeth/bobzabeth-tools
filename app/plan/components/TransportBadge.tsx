import type { Transport } from "../types";
import { TRANSPORT_ICONS } from "../utils";

type Props = {
  transport: Transport;
};

function formatDurationRange(transport: Transport): string | null {
  const min = transport.durationMin;
  const max = transport.durationMax;
  const legacy = transport.duration;
  if (min && max) return `${min}〜${max}`;
  if (min) return `${min}〜`;
  if (max) return `〜${max}`;
  if (legacy) return legacy;
  return null;
}

export default function TransportBadge({ transport }: Props) {
  const icon = TRANSPORT_ICONS[transport.mode] ?? "🔄";
  const durationText = formatDurationRange(transport);

  return (
    <div className="flex items-start gap-2 py-1 px-4">
      <div className="w-0.5 self-stretch bg-sky-200 mt-1" />
      <div className="bg-sky-50 border border-sky-100 rounded-2xl px-3 py-2 text-xs text-sky-600 font-medium">
        {durationText ? (
          <>
            {/* 時間あり：1行目 アイコン+時間、2行目 メモ（インデント） */}
            <div className="flex items-center gap-1.5">
              <span className="flex-shrink-0">{icon}</span>
              <span>{durationText}</span>
            </div>
            {transport.memo && (
              <div className="flex items-start gap-1.5 mt-1">
                <span className="flex-shrink-0 opacity-0 select-none">{icon}</span>
                <p className="text-sky-500 leading-relaxed text-left">{transport.memo}</p>
              </div>
            )}
          </>
        ) : transport.memo ? (
          /* 時間なし・メモあり：1行目 アイコン+メモ */
          <div className="flex items-start gap-1.5">
            <span className="flex-shrink-0">{icon}</span>
            <p className="text-sky-500 leading-relaxed text-left">{transport.memo}</p>
          </div>
        ) : (
          /* アイコンのみ */
          <span>{icon}</span>
        )}
      </div>
    </div>
  );
}
