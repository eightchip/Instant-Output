import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, password } = await request.json();

    // 管理者パスワードチェック
    // 環境変数が設定されていない場合はデフォルト値を使用（後方互換性のため）
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    if (password !== adminPassword) {
      return NextResponse.json(
        { error: "認証エラー", message: "管理者パスワードが正しくありません。" },
        { status: 401 }
      );
    }

    // OpenAI API Keyのチェック
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "設定エラー", message: "OpenAI API Keyが設定されていません。" },
        { status: 500 }
      );
    }

    // 画像のbase64データからdata:image/...;base64,の部分を除去
    const base64Data = imageBase64.includes(",") 
      ? imageBase64.split(",")[1] 
      : imageBase64;

    // ChatGPT Vision APIを使用してOCR + 文分割 + 翻訳を1リクエストで実行
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
            content: "You are an expert OCR and translation system. Extract English text from images, split into sentences, and translate to Japanese. Always respond with valid JSON only.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please extract English text from the provided image, split it into sentences, and translate each sentence to Japanese.

Instructions:
1. Extract only English text from the image
2. Ignore decorative elements, symbols, or noise
3. Split the text into sentences (sentences end with period, exclamation mark, or question mark)
4. Exclude incomplete sentences or fragments
5. Remove numbering or bullet point symbols
6. Translate each sentence to natural Japanese
7. Return the result as a JSON object with a "cards" array:

{
  "cards": [
    {
      "en": "First English sentence.",
      "jp": "最初の英文の日本語訳。"
    },
    {
      "en": "Second English sentence.",
      "jp": "2番目の英文の日本語訳。"
    }
  ]
}

Important:
- Return ONLY valid JSON object, no additional text or explanations
- The JSON must have a "cards" key containing an array
- Each sentence should be a separate object in the array
- English sentences should preserve original punctuation
- Japanese translations should be natural and accurate
- If the image contains no English text, return: {"cards": []}

This is for educational purposes. Please process the image and return the JSON object.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`,
                  detail: "high", // 高解像度で処理
                },
              },
            ],
          },
        ],
        max_tokens: 4000,
        response_format: { type: "json_object" }, // JSON形式で返すことを強制
      }),
    });

    if (!response.ok) {
      let errorMessage = `OpenAI API error: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || errorMessage;
      } catch (e) {
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch (textError) {
          errorMessage = `OpenAI API error: ${response.status} ${response.statusText}`;
        }
      }
      throw new Error(errorMessage);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      const responseText = await response.text();
      throw new Error(`Invalid JSON response from OpenAI API: ${responseText.substring(0, 200)}`);
    }

    const content = data.choices[0]?.message?.content || "";
    if (!content) {
      throw new Error("テキストが抽出できませんでした。");
    }

    // JSONをパース
    let parsedData;
    try {
      parsedData = JSON.parse(content);
    } catch (parseError) {
      // JSONパースに失敗した場合、配列形式を試す
      try {
        // もし配列形式で返ってきた場合
        if (content.trim().startsWith("[")) {
          parsedData = JSON.parse(content);
        } else {
          // オブジェクト形式の場合、cardsキーを探す
          const obj = JSON.parse(content);
          parsedData = obj.cards || obj.items || obj.sentences || [];
        }
      } catch (secondParseError) {
        throw new Error(`JSONパースエラー: ${content.substring(0, 200)}`);
      }
    }

    // 配列形式に統一
    let cards: Array<{ en: string; jp: string }> = [];
    if (Array.isArray(parsedData)) {
      cards = parsedData;
    } else if (parsedData.cards && Array.isArray(parsedData.cards)) {
      cards = parsedData.cards;
    } else if (parsedData.items && Array.isArray(parsedData.items)) {
      cards = parsedData.items;
    } else if (parsedData.sentences && Array.isArray(parsedData.sentences)) {
      cards = parsedData.sentences;
    }

    // OCRエラー修正（| -> I）を適用
    const { cleanOcrText } = await import("@/lib/text-processing");
    
    // データの検証とクリーニング
    cards = cards
      .filter((card) => card.en && card.jp && card.en.trim().length > 0 && card.jp.trim().length > 0)
      .map((card) => ({
        en: cleanOcrText(card.en.trim()), // OCRエラー修正を適用
        jp: card.jp.trim(),
      }));

    return NextResponse.json({
      cards,
      confidence: 1.0,
    });
  } catch (error) {
    console.error("AI-OCR-Translate error:", error);
    return NextResponse.json(
      {
        error: "処理エラー",
        message:
          error instanceof Error
            ? error.message
            : "OCR・翻訳処理に失敗しました。",
      },
      { status: 500 }
    );
  }
}

