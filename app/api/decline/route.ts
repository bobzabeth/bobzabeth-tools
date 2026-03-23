import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "APIキーが設定されていません。環境変数を確認してください。" },
      { status: 500 }
    );
  }

  try {
    const { situation } = await req.json();

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
あなたは日本語の敬語と対人コミュニケーションの専門家です。
ユーザーが「伝えたいこと」と「相手との関係性」を入力します。
その内容を、角が立たず、相手への配慮が感じられる自然な日本語に変換してください。

${situation}

【出力ルール（絶対守ってください）】
・前置きは一切書かず、以下の形式で3案出力してください。案の間は「---」で区切ってください。
・「伝えたいこと」の意味・意図は必ず保ちつつ、言葉を柔らかく丁寧に変換してください。
・相手との関係性に合わせた適切な敬語レベルにしてください。

【レベル】フォーマル（かなり丁寧・謙譲語を使用）
【本文】（ここに変換後の文章）
【解説】（なぜこの表現が効果的か、ポイントを1〜2文で）
---
【レベル】標準（丁寧で自然・ですます調）
【本文】（ここに変換後の文章）
【解説】（なぜこの表現が効果的か、ポイントを1〜2文で）
---
【レベル】カジュアル（親しみやすく・やわらかく）
【本文】（ここに変換後の文章）
【解説】（なぜこの表現が効果的か、ポイントを1〜2文で）
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
    });

    return NextResponse.json({ result: response.text });

  } catch (error: unknown) {
    console.error("=== API ERROR ===");
    console.error(error);

    const message = error instanceof Error ? error.message : String(error);

    // API上限切れ・アクセス集中時のエラーを親切なメッセージに変換
    const isQuotaError = message.includes("429") || message.includes("RESOURCE_EXHAUSTED") || message.includes("quota");
    const userMessage = isQuotaError
      ? "現在アクセスが集中しています。しばらく時間をおいてから再度お試しください🙏"
      : `AI通信エラー: ${message}`;

    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    );
  }
}