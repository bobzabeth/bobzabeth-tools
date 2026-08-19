import { NextResponse } from "next/server";
import { fetchScheduleMessage } from "./lib";

const LINE_BROADCAST_API = "https://api.line.me/v2/bot/message/broadcast";

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
    const message = await fetchScheduleMessage();

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
