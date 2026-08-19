import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { fetchScheduleMessage } from "../notify-splatoon/lib";

export const runtime = "nodejs";

const LINE_REPLY_API = "https://api.line.me/v2/bot/message/reply";

type LineTextMessageEvent = {
  type: string;
  replyToken?: string;
  message?: { type: string; text: string };
};

type LineWebhookBody = {
  events: LineTextMessageEvent[];
};

function isValidSignature(rawBody: string, signature: string | null): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret || !signature) {
    return false;
  }

  const expected = createHmac("sha256", channelSecret).update(rawBody).digest("base64");

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, actualBuf);
}

async function sendLineReply(replyToken: string, message: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  }

  const res = await fetch(LINE_REPLY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text: message }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LINE reply failed: ${res.status} ${body}`);
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!isValidSignature(rawBody, signature)) {
    console.error("[line-webhook] invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const keyword = process.env.LINE_TRIGGER_KEYWORD;
  if (!keyword) {
    console.error("[line-webhook] LINE_TRIGGER_KEYWORD is not set, ignoring events");
    return NextResponse.json({ ok: true });
  }

  let body: LineWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch (err) {
    console.error("[line-webhook] failed to parse body:", err);
    return NextResponse.json({ ok: true });
  }

  for (const event of body.events ?? []) {
    console.log("[line-webhook] received event:", event.type, event.message?.text);

    if (event.type !== "message" || event.message?.type !== "text") {
      continue;
    }
    if (event.message.text.trim() !== keyword) {
      continue;
    }
    if (!event.replyToken) {
      continue;
    }

    try {
      const message = await fetchScheduleMessage();
      await sendLineReply(event.replyToken, message);
      console.log("[line-webhook] replied with schedule");
    } catch (err) {
      console.error("[line-webhook] failed to reply:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
