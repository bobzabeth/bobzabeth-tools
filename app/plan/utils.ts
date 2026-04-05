import LZString from "lz-string";
import type { Itinerary } from "./types";

export function encodeItinerary(itinerary: Itinerary): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(itinerary));
}

export function decodeItinerary(str: string): Itinerary | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(str);
    if (!json) return null;
    const data = JSON.parse(json);
    if (!data.title || !data.date || !Array.isArray(data.items)) return null;
    return data as Itinerary;
  } catch {
    return null;
  }
}

export function generateShareUrl(itinerary: Itinerary): string {
  const encoded = encodeItinerary(itinerary);
  const base =
    typeof window !== "undefined"
      ? `${window.location.origin}/plan/view`
      : "/plan/view";
  return `${base}?d=${encoded}`;
}

export function sortItemsByTime(items: Itinerary["items"]): Itinerary["items"] {
  return [...items].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export const TRANSPORT_LABELS: Record<string, string> = {
  walk: "🚶 徒歩",
  train: "🚃 電車",
  car: "🚗 車",
  bus: "🚌 バス",
  other: "🔄 移動",
};

const STORAGE_KEY = "itinerary_draft";

export function saveDraft(itinerary: Itinerary): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(itinerary));
  } catch {
    // localStorage unavailable
  }
}

export function loadDraft(): Itinerary | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Itinerary;
  } catch {
    return null;
  }
}
