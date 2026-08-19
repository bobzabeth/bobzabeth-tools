const SPLA3_API = "https://spla3.yuu26.com/api/bankara-open/schedule";

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

const TARGET_START_HOURS_JST = [21, 23];

function getJstHour(iso: string): number {
  const hourStr = new Date(iso).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Tokyo",
  });
  return parseInt(hourStr, 10);
}

function buildMessage(results: Spla3Result[]): string {
  const today = new Date().toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
  });

  const target = results.filter((r) => {
    const d = new Date(r.start_time).toLocaleDateString("ja-JP", {
      timeZone: "Asia/Tokyo",
    });
    return d === today && TARGET_START_HOURS_JST.includes(getJstHour(r.start_time));
  });

  if (target.length === 0) {
    return "【バンカラマッチ(オープン) 21:00〜01:00の予定】\n\n本日分の情報がまだ取得できませんでした。";
  }

  const lines = target.map((r) => {
    const time = formatTimeRange(r.start_time, r.end_time);
    const stageNames = r.stages.map((s) => s.name).join(" / ");
    const festMark = r.is_fest ? "🎉フェス " : "";
    return `${time} ${festMark}[${r.rule.name}]\n${stageNames}`;
  });

  return `【バンカラマッチ(オープン) 21:00〜01:00の予定】\n\n${lines.join("\n\n")}`;
}

export async function fetchScheduleMessage(): Promise<string> {
  console.log("[spla3] fetching schedule from", SPLA3_API);
  const scheduleRes = await fetch(SPLA3_API, {
    headers: { "user-agent": "bobzabeth-tools/1.0" },
    cache: "no-store",
  });

  if (!scheduleRes.ok) {
    throw new Error(`Spla3 API failed: ${scheduleRes.status}`);
  }

  const data: Spla3Response = await scheduleRes.json();
  console.log("[spla3] schedule count:", data.results?.length ?? 0);

  const message = buildMessage(data.results);
  console.log("[spla3] built message:\n", message);

  return message;
}
