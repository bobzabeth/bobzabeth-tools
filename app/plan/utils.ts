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

export function sortItemsByTime(items: import("./types").Item[]): import("./types").Item[] {
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

export const TRANSPORT_ICONS: Record<string, string> = {
  walk: "🚶",
  train: "🚃",
  car: "🚗",
  bus: "🚌",
  plane: "✈️",
  bike: "🚲",
  motorcycle: "🏍️",
  taxi: "🚕",
  other: "🔄",
};

export function extractGoogleMapsName(url: string): string | null {
  try {
    // /maps/place/[NAME]/ 形式
    const placeMatch = url.match(/\/maps\/place\/([^/@?#]+)/);
    if (placeMatch) {
      const name = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
      // 英数字のみ（座標など）は除外
      if (/[^\x00-\x7F]/.test(name) || /[a-zA-Z]/.test(name.slice(0, 3))) return name;
    }
    // ?q= 形式
    const u = new URL(url);
    const q = u.searchParams.get("q");
    if (q && q.trim()) return q.trim();
  } catch {
    // 無効なURL
  }
  return null;
}

// ---- DB (API Route 経由) ----

export async function savePlanToDb(
  itinerary: Itinerary,
  editPassword?: string
): Promise<string> {
  const res = await fetch("/api/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: itinerary, editPassword: editPassword || null }),
  });
  if (!res.ok) throw new Error("Failed to save plan");
  const json = await res.json();
  return json.shortCode as string;
}

export async function loadPlanFromDb(
  code: string
): Promise<{ data: Itinerary; hasPassword: boolean } | null> {
  const res = await fetch(`/api/plans/${code}`);
  if (!res.ok) return null;
  return res.json();
}

export async function updatePlanInDb(
  code: string,
  itinerary: Itinerary,
  editPassword?: string
): Promise<boolean> {
  const res = await fetch(`/api/plans/${code}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: itinerary, editPassword: editPassword || null }),
  });
  return res.ok;
}

export async function updateTodosInDb(
  code: string,
  todos: import("./types").TodoItem[]
): Promise<boolean> {
  const res = await fetch(`/api/plans/${code}/todos`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ todos }),
  });
  return res.ok;
}

export async function deletePlanFromDb(code: string): Promise<boolean> {
  const res = await fetch(`/api/plans/${code}`, { method: "DELETE" });
  return res.ok;
}

export async function changePassword(
  code: string,
  currentPassword: string | undefined,
  newPassword: string | null // null = 削除
): Promise<boolean> {
  const res = await fetch(`/api/plans/${code}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      editPassword: currentPassword || null,
      newEditPassword: newPassword ?? "",
    }),
  });
  return res.ok;
}

export async function verifyPlanPassword(
  code: string,
  password: string
): Promise<boolean> {
  const res = await fetch(`/api/plans/${code}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ editPassword: password }),
  });
  return res.ok;
}

// ---- マイプラン (localStorage) ----

const MY_PLANS_KEY = "my_plans";

export type MyPlanMeta = { code: string; title: string; date: string; isOwner?: boolean };

export function getMyPlans(): MyPlanMeta[] {
  try {
    const raw = localStorage.getItem(MY_PLANS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // 旧形式 (string[]) からの移行
    if (Array.isArray(parsed) && typeof parsed[0] === "string") return [];
    return parsed as MyPlanMeta[];
  } catch {
    return [];
  }
}

export function addMyPlan(code: string, title: string, date: string, isOwner = false): void {
  try {
    const plans = getMyPlans().filter((p) => p.code !== code);
    localStorage.setItem(MY_PLANS_KEY, JSON.stringify([{ code, title, date, isOwner }, ...plans]));
  } catch {
    // localStorage unavailable
  }
}

export function updateMyPlanMeta(code: string, title: string, date: string): void {
  try {
    const plans = getMyPlans().map((p) =>
      p.code === code ? { ...p, title, date } : p
    );
    localStorage.setItem(MY_PLANS_KEY, JSON.stringify(plans));
  } catch {
    // localStorage unavailable
  }
}

export function removeMyPlanCode(code: string): void {
  try {
    const plans = getMyPlans().filter((p) => p.code !== code);
    localStorage.setItem(MY_PLANS_KEY, JSON.stringify(plans));
  } catch {
    // localStorage unavailable
  }
}

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
    const parsed = JSON.parse(raw);
    // 新形式チェック
    if (!parsed.title || !Array.isArray(parsed.days)) return null;
    return parsed as Itinerary;
  } catch {
    return null;
  }
}
