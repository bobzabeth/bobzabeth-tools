import { NextResponse } from "next/server";

const SPLA3_API = "https://spla3.yuu26.com/api/bankara-open/schedule";
const LINE_BROADCAST_API = "https://api.line.me/v2/bot/message/broadcast";

type Spla3Result = {
  start_time: string;
  end_time: string;
  rule: { name: string };
  stages: { name: string }[];
  is_fest: boolean;
};

type Spla3Response = {
  results: Spla3Result[];
};

function formatTimeRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo",
    });
  return `${fmt(start)}〜${fmt(end)}`;
}

function buildMessage(results: Spla3Result[]): string {
  const today = new Date().toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
  });

  const todays = results.filter((r) => {
    const d = new Date(r.start_time).toLocaleDateString("ja-JP", {
      timeZone: "Asia/Tokyo",
    });
    return d === today;
  });

  const target = todays.length > 0 ? todays : results.slice(0, 6);

  const lines = target.map((r) => {
    const time = formatTimeRange(r.start_time, r.end_time);
    const stageNames = r.stages.map((s) => s.name).join(" / ");
    const festMark = r.is_fest ? "🎉フェス " : "";
    return `${time} ${festMark}[${r.rule.name}]\n${stageNames}`;
  });

  return `【バンカラマッチ(オープン) 本日の予定】\n\n${lines.join("\n\n")}`;
}

async function sendLineBroadcast(message: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  }

  const res = await fetch(LINE_BROADCAST_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages: [{ type: "text", text: message }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LINE broadcast failed: ${res.status} ${body}`);
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    console.error("[notify-splatoon] unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[notify-splatoon] fetching schedule from", SPLA3_API);
    const scheduleRes = await fetch(SPLA3_API, {
      headers: { "user-agent": "bobzabeth-tools/1.0" },
      cache: "no-store",
    });

    if (!scheduleRes.ok) {
      throw new Error(`Spla3 API failed: ${scheduleRes.status}`);
    }

    const data: Spla3Response = await scheduleRes.json();
    console.log("[notify-splatoon] schedule count:", data.results?.length ?? 0);

    const message = buildMessage(data.results);
    console.log("[notify-splatoon] built message:\n", message);

    await sendLineBroadcast(message);
    console.log("[notify-splatoon] LINE broadcast sent");

    return NextResponse.json({ ok: true, message });
  } catch (err) {
    console.error("[notify-splatoon] failed:", err);
    return NextResponse.json(
      {
        ok: false,
        error: String(err),
        detail: err instanceof Error ? { message: err.message, stack: err.stack } : null,
      },
      { status: 500 }
    );
  }
}
