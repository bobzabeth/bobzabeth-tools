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

    // AIへの指示（プロンプト）を「お断りの達人」仕様に強化！
    const prompt = `
あなたは日本で最も「角を立てずに断るのが上手い」秘書です。
以下の状況と指定されたトーンを踏まえ、**「フォーマル」「標準」「カジュアル」の3段階の柔らかさ**で返信案を作成してください。

${situation}

【出力ルール（絶対守ってください）】
・前置きは一切書かず、以下の形式で3案出力してください。案の間は「---」で区切ってください。

【レベル】フォーマル（非常に丁寧・謙譲語）
【本文】（ここに返信文）
【解説】（アドバイス）
---
【レベル】標準（丁寧で角がない・ですます調）
【本文】（ここに返信文）
【解説】（アドバイス）
---
【レベル】カジュアル（親しみやすい・クッション言葉多め）
【本文】（ここに返信文）
【解説】（アドバイス）
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // あなたの環境で成功したモデル名
      contents: prompt,
    });

    return NextResponse.json({ result: response.text });

  } catch (error: unknown) {
    console.error("=== API ERROR ===");
    console.error(error);
    
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `AI通信エラー: ${message}` },
      { status: 500 }
    );
  }
}