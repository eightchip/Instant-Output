import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth-server";

/**
 * ChatGPT APIを使用してカードの品質をチェック
 * 管理者専用機能
 */
export async function POST(request: NextRequest) {
  try {
    const { card, sessionData } = await request.json();

    if (!card || !card.target_en || !card.prompt_jp) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "カードデータが無効です。" },
        { status: 400 }
      );
    }

    // セッション認証
    if (!verifyAdminSession(sessionData)) {
      console.warn("管理者セッション認証失敗（カード品質チェック）");
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

    // ChatGPT APIを使用して品質チェック
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
            content: `You are a language learning card quality checker. Analyze the provided card and check:
1. English sentence length (not too long/short)
2. Japanese translation appropriateness
3. Missing important words extraction
4. Overall quality for language learning

Return the result as a JSON object in the following format:
{
  "score": 85,
  "issues": ["英語文が少し長いです", "重要単語の抽出が不足しています"],
  "suggestions": ["英語文を2つに分割することを検討してください", "重要単語を追加してください"]
}

Return only the JSON object, without any additional text or explanations.`,
          },
          {
            role: "user",
            content: `Check the quality of this card:\n\nEnglish: ${card.target_en}\nJapanese: ${card.prompt_jp}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error:", errorData);
      return NextResponse.json(
        {
          error: "QUALITY_CHECK_API_ERROR",
          message: `品質チェックAPIの呼び出しに失敗しました: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json(
        {
          error: "QUALITY_CHECK_FAILED",
          message: "品質チェック結果が取得できませんでした。",
        },
        { status: 500 }
      );
    }

    const content = data.choices[0].message.content.trim();
    
    // JSONをパース
    let qualityCheck: { score: number; issues: string[]; suggestions: string[] };
    try {
      // JSONコードブロックを除去
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        qualityCheck = JSON.parse(jsonMatch[0]);
      } else {
        qualityCheck = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("Failed to parse quality check JSON:", parseError);
      return NextResponse.json(
        {
          error: "QUALITY_CHECK_FAILED",
          message: "品質チェック結果の解析に失敗しました。",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      qualityCheck,
    });
  } catch (error) {
    console.error("Card quality check error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message:
          error instanceof Error ? error.message : "カード品質チェック処理中にエラーが発生しました。",
      },
      { status: 500 }
    );
  }
}
