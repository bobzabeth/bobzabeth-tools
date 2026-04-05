export type TransportMode = "walk" | "train" | "car" | "bus" | "other";

export type Transport = {
  mode: TransportMode;
  durationMin?: string; // 例: "30分"
  durationMax?: string; // 例: "45分"
  /** @deprecated 旧フォーマット、後方互換用 */
  duration?: string;
};

export type Item = {
  id: string;
  startTime: string;
  endTime?: string;
  name: string;
  memo?: string;
  mapUrl?: string;
  transport?: Transport;
};

export type Itinerary = {
  title: string;
  date: string;
  items: Item[];
};
