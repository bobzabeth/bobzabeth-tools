import type { Transport } from "../types";
import { TRANSPORT_LABELS } from "../utils";

type Props = {
  transport: Transport;
};

export default function TransportBadge({ transport }: Props) {
  const label = TRANSPORT_LABELS[transport.mode] ?? "🔄 移動";
  return (
    <div className="flex items-center gap-2 py-1 px-4">
      <div className="w-0.5 h-4 bg-sky-200 mx-auto" />
      <div className="flex items-center gap-1.5 bg-sky-50 border border-sky-100 rounded-full px-3 py-1 text-xs text-sky-600 font-medium">
        <span>{label}</span>
        {transport.duration && (
          <>
            <span className="text-sky-300">·</span>
            <span>{transport.duration}</span>
          </>
        )}
      </div>
      <div className="w-0.5 h-4 bg-sky-200 mx-auto" />
    </div>
  );
}
