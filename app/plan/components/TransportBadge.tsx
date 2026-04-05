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
    <div className="flex items-center gap-2 py-1 px-4">
      <div className="w-0.5 h-4 bg-sky-200" />
      <div className="flex items-center gap-1.5 bg-sky-50 border border-sky-100 rounded-full px-3 py-1 text-xs text-sky-600 font-medium">
        <span>{icon}</span>
        {durationText && (
          <>
            <span className="text-sky-300">·</span>
            <span>{durationText}</span>
          </>
        )}
      </div>
    </div>
  );
}
