import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth-server";

/**
 * ChatGPT APIを使用して英語を日本語に翻訳（高精度、イギリス英語対応）
 * 管理者専用機能として使用
 */
export async function POST(request: NextRequest) {
  try {
    const { text, adminPassword, sessionData } = await request.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "翻訳するテキストが無効です。" },
        { status: 400 }
      );
    }

    // セッション認証を優先（sessionDataが提供されている場合）
    if (sessionData) {
      if (!verifyAdminSession(sessionData)) {
        console.warn("管理者セッション認証失敗（ChatGPT翻訳）");
        return NextResponse.json(
          { error: "UNAUTHORIZED", message: "管理者セッションが無効または期限切れです。再度ログインしてください。" },
          { status: 401 }
        );
      }
    } else {
      // 後方互換性のため、パスワード認証もサポート
      if (!adminPassword || typeof adminPassword !== "string" || adminPassword.trim().length === 0) {
        return NextResponse.json(
          { error: "UNAUTHORIZED", message: "管理者パスワードまたはセッションデータが提供されていません。" },
          { status: 401 }
        );
      }

      // 管理者パスワードを取得
      // 環境変数が設定されていない場合はデフォルト値を使用（後方互換性のため）
      // ただし、Vercelで環境変数を設定した場合は、必ずADMIN_PASSWORDも設定してください
      const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";

      // パスワードを比較（トリムして比較）
      if (adminPassword.trim() !== expectedPassword.trim()) {
        console.warn("管理者パスワード認証失敗");
        return NextResponse.json(
          { error: "UNAUTHORIZED", message: "管理者パスワードが正しくありません。" },
          { status: 401 }
        );
      }
    }

    // OpenAI APIキー確認
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "CONFIG_ERROR", message: "OpenAI APIキーが設定されていません。" },
        { status: 500 }
      );
    }

    // ChatGPT APIを使用して翻訳
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
            content: `You are a professional translator specializing in translating English (including British English) to Japanese. 
Your task is to provide accurate, natural Japanese translations that preserve the meaning and nuance of the original English text.

Guidelines:
1. Translate accurately, preserving the original meaning
2. Use natural Japanese expressions
3. Handle British English vocabulary and expressions appropriately
4. Maintain the tone and style of the original text
5. For educational/academic texts, use appropriate formal language
6. Return only the translated text, without any explanations or additional text`,
          },
          {
            role: "user",
            content: `Translate the following English text to Japanese:\n\n${text}`,
          },
        ],
        temperature: 0.3, // より一貫性のある翻訳のため低めに設定
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error:", errorData);
      return NextResponse.json(
        {
          error: "TRANSLATION_API_ERROR",
          message: `翻訳APIの呼び出しに失敗しました: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json(
        {
          error: "TRANSLATION_FAILED",
          message: "翻訳結果が取得できませんでした。",
        },
        { status: 500 }
      );
    }

    const translatedText = data.choices[0].message.content.trim();

    if (!translatedText || translatedText.length === 0) {
      return NextResponse.json(
        {
          error: "TRANSLATION_FAILED",
          message: "翻訳結果が空です。",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      translatedText,
      match: 100, // ChatGPT翻訳は高品質とみなす
    });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message:
          error instanceof Error ? error.message : "翻訳処理中にエラーが発生しました。",
      },
      { status: 500 }
    );
  }
}

