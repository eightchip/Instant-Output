import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth-server";

/**
 * ChatGPT APIを使用してカードから重要単語を抽出し、意味を取得
 * 管理者専用機能
 */
export async function POST(request: NextRequest) {
  try {
    const { text, sessionData } = await request.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "テキストが無効です。" },
        { status: 400 }
      );
    }

    // セッション認証
    if (!verifyAdminSession(sessionData)) {
      console.warn("管理者セッション認証失敗（語彙抽出）");
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

    // ChatGPT APIを使用して語彙を抽出
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
            content: `You are an English vocabulary expert. Extract 3-5 important words or phrases from the given English text that are useful for language learning.
For each word/phrase, provide:
1. The word/phrase itself
2. Its meaning in Japanese (brief, suitable for flashcards)

Return the result as a JSON array in the following format:
[
  {"word": "example", "meaning": "例、実例"},
  {"word": "another word", "meaning": "別の意味"}
]

Return only the JSON array, without any additional text or explanations.`,
          },
          {
            role: "user",
            content: `Extract important words from this English text:\n\n${text}`,
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
          error: "EXTRACTION_API_ERROR",
          message: `語彙抽出APIの呼び出しに失敗しました: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json(
        {
          error: "EXTRACTION_FAILED",
          message: "語彙抽出結果が取得できませんでした。",
        },
        { status: 500 }
      );
    }

    const content = data.choices[0].message.content.trim();
    
    // JSONをパース
    let vocabulary: { word: string; meaning: string }[] = [];
    try {
      // JSONコードブロックを除去
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        vocabulary = JSON.parse(jsonMatch[0]);
      } else {
        vocabulary = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("Failed to parse vocabulary JSON:", parseError);
      return NextResponse.json(
        {
          error: "EXTRACTION_FAILED",
          message: "語彙抽出結果の解析に失敗しました。",
        },
        { status: 500 }
      );
    }

    if (!Array.isArray(vocabulary) || vocabulary.length === 0) {
      return NextResponse.json(
        {
          error: "EXTRACTION_FAILED",
          message: "抽出された語彙がありません。",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      vocabulary,
    });
  } catch (error) {
    console.error("Vocabulary extraction error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message:
          error instanceof Error ? error.message : "語彙抽出処理中にエラーが発生しました。",
      },
      { status: 500 }
    );
  }
}
