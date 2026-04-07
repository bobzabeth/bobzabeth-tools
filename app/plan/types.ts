export type TransportMode = "walk" | "train" | "car" | "bus" | "plane" | "bike" | "motorcycle" | "taxi" | "other";

export type Transport = {
  mode: TransportMode;
  durationMin?: string;
  durationMax?: string;
  memo?: string;
  /** @deprecated 旧フォーマット、後方互換用 */
  duration?: string;
};

export type Item = {
  id: string;
  startTime: string;
  name: string;
  memo?: string;
  mapUrl?: string;
  endTime?: string;
  endMemo?: string;
  transport?: Transport;
};

export type Day = {
  date: string;
  items: Item[];
};

export type Itinerary = {
  title: string;
  days: Day[];
};
