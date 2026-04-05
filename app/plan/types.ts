export type TransportMode = "walk" | "train" | "car" | "bus" | "other";

export type Transport = {
  mode: TransportMode;
  duration?: string;
};

export type Item = {
  id: string;
  startTime: string;
  endTime?: string;
  name: string;
  memo?: string;
  photoUrl?: string;
  mapUrl?: string;
  transport?: Transport;
};

export type Itinerary = {
  title: string;
  date: string;
  items: Item[];
};
