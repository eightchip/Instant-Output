import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth-server";

/**
 * ChatGPT APIを使用して英語文章を改善
 * 管理者専用機能
 */
export async function POST(request: NextRequest) {
  try {
    const { text, sessionData } = await request.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "改善するテキストが無効です。" },
        { status: 400 }
      );
    }

    // セッション認証
    if (!verifyAdminSession(sessionData)) {
      console.warn("管理者セッション認証失敗（文章改善）");
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "管理者セッションが無効または期限切れです。再度ログインしてください。" },
        { status: 401 }
      );
    }

    // OpenAI APIキー確認
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "CONFIG_ERROR", message: "OpenAI APIキーが設定されていません。" },
        { status: 500 }
      );
    }

    // ChatGPT APIを使用して文章を改善
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an English language expert specializing in improving sentences for language learning purposes.
Your task is to improve English sentences to make them more natural and appropriate for language learning while keeping the same meaning.

Guidelines:
1. Improve grammar and naturalness
2. Keep the same meaning
3. Make it suitable for language learning
4. If the sentence is already good, return it as is
5. Return only the improved sentence, without any explanations or additional text`,
          },
          {
            role: "user",
            content: `Improve this English sentence for language learning, making it more natural while keeping the same meaning:\n\n${text}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error:", errorData);
      return NextResponse.json(
        {
          error: "IMPROVEMENT_API_ERROR",
          message: `文章改善APIの呼び出しに失敗しました: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json(
        {
          error: "IMPROVEMENT_FAILED",
          message: "改善結果が取得できませんでした。",
        },
        { status: 500 }
      );
    }

    const improvedText = data.choices[0].message.content.trim();

    if (!improvedText || improvedText.length === 0) {
      return NextResponse.json(
        {
          error: "IMPROVEMENT_FAILED",
          message: "改善結果が空です。",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      improvedText,
    });
  } catch (error) {
    console.error("Text improvement error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message:
          error instanceof Error ? error.message : "文章改善処理中にエラーが発生しました。",
      },
      { status: 500 }
    );
  }
}
