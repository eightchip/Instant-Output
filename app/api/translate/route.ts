import { NextRequest, NextResponse } from "next/server";

interface TranslationResponse {
  translatedText: string;
  match: number;
}

interface MyMemoryResponse {
  responseData: TranslationResponse;
  quotaFinished: boolean;
  mtLangSupported: boolean;
  responseDetails: string;
  responseStatus: number;
  responderId: string;
  exception_code?: string;
}

/**
 * MyMemory Translation APIを使用して英語を日本語に翻訳
 * 無料枠: 1日10,000文字まで
 */
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "翻訳するテキストが無効です。" },
        { status: 400 }
      );
    }

    // 文字数制限チェック（1日10,000文字まで）
    if (text.length > 10000) {
      return NextResponse.json(
        {
          error: "QUOTA_EXCEEDED",
          message: "1日の翻訳文字数制限（10,000文字）を超えています。",
        },
        { status: 400 }
      );
    }

    // MyMemory Translation APIを呼び出し
    // テキストをクリーンアップ（改行や余分な空白を除去）
    const cleanText = text.trim().replace(/\s+/g, " ");
    
    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      cleanText
    )}&langpair=en|ja`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "TRANSLATION_API_ERROR",
          message: "翻訳APIの呼び出しに失敗しました。",
        },
        { status: response.status }
      );
    }

    const data: MyMemoryResponse = await response.json();

    if (data.quotaFinished) {
      return NextResponse.json(
        {
          error: "QUOTA_FINISHED",
          message: "1日の翻訳文字数制限に達しました。",
        },
        { status: 429 }
      );
    }

    if (data.responseStatus !== 200 || !data.responseData?.translatedText) {
      return NextResponse.json(
        {
          error: "TRANSLATION_FAILED",
          message: data.responseDetails || "翻訳に失敗しました。",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      translatedText: data.responseData.translatedText,
      match: data.responseData.match || 0,
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

