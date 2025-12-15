import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, password } = await request.json();

    // 管理者パスワードチェック
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

    // ChatGPT Vision APIを使用してOCR実行
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
            role: "user",
            content: [
              {
                type: "text",
                text: `この画像から英語のテキストを抽出してください。以下のルールに従ってください：

1. 余分な装飾、記号、ノイズは完全に無視してください
2. 純粋な英文のみを抽出してください
3. 文単位で整理してください（1文 = 1行）
4. 各文はピリオド、感嘆符、疑問符で終わるようにしてください
5. 不完全な文や断片は除外してください
6. 番号や箇条書きの記号は除外してください
7. 出力は文単位で改行区切りにしてください

出力例：
This is the first sentence.
This is the second sentence.
This is the third sentence.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `OpenAI API error: ${response.statusText}`
      );
    }

    const data = await response.json();
    let extractedText = data.choices[0]?.message?.content || "";

    if (!extractedText) {
      throw new Error("テキストが抽出できませんでした。");
    }

    // 余分な説明やフォーマット指示を除去
    // "出力例："以降のテキストを削除
    const exampleIndex = extractedText.indexOf("出力例：");
    if (exampleIndex !== -1) {
      extractedText = extractedText.substring(0, exampleIndex).trim();
    }

    // 文単位に整理（改行で分割し、空行を除去）
    const sentences = extractedText
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0 && !line.match(/^[0-9]+\./)) // 番号付きリストを除外
      .filter((line: string) => !line.match(/^[-•*]\s/)) // 箇条書き記号を除外
      .map((line: string) => {
        // 文末記号がない場合は追加
        if (!line.match(/[.!?]$/)) {
          return line + ".";
        }
        return line;
      });

    // 文を結合（改行区切り）
    const formattedText = sentences.join("\n");

    return NextResponse.json({
      text: formattedText || extractedText, // フォーマット後のテキスト、失敗時は元のテキスト
      confidence: 1.0, // ChatGPTは信頼度を返さないため、1.0を返す
    });
  } catch (error) {
    console.error("AI-OCR error:", error);
    return NextResponse.json(
      {
        error: "OCRエラー",
        message:
          error instanceof Error
            ? error.message
            : "OCR処理に失敗しました。",
      },
      { status: 500 }
    );
  }
}

