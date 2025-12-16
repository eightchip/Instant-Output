import { NextRequest, NextResponse } from "next/server";

/**
 * LLMを使ってイディオムかどうかを判別するAPI
 */
export async function POST(request: NextRequest) {
  try {
    const { phrases } = await request.json();

    if (!Array.isArray(phrases) || phrases.length === 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // OpenAI API Keyのチェック
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "設定エラー", message: "OpenAI API Keyが設定されていません。" },
        { status: 500 }
      );
    }

    // バッチでLLMに送信（最大20個ずつ）
    const batchSize = 20;
    const results: Map<string, boolean> = new Map();

    for (let i = 0; i < phrases.length; i += batchSize) {
      const batch = phrases.slice(i, i + batchSize);

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
              content: "You are an English language expert. Determine if each given phrase is a genuine English idiom (a fixed expression with a meaning that cannot be deduced from its individual words). Return only valid JSON.",
            },
            {
              role: "user",
              content: `Please determine if each of the following phrases is a genuine English idiom (like "break the ice", "piece of cake", "hit the nail on the head") or just a regular phrase (like "difficulty and their", "themselves and their", "painting and just").

Return a JSON object where each key is the phrase and the value is true if it's an idiom, false otherwise.

Phrases to check:
${batch.map((p: string, idx: number) => `${idx + 1}. "${p}"`).join("\n")}

Return format:
{
  "phrase1": true/false,
  "phrase2": true/false,
  ...
}

Important: Only return valid JSON, no additional text.`,
            },
          ],
          max_tokens: 1000,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        console.error("OpenAI API error:", response.statusText);
        // エラーの場合はすべてfalseとして扱う
        for (const phrase of batch) {
          results.set(phrase, false);
        }
        continue;
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || "{}";

      try {
        const parsed = JSON.parse(content);
        for (const phrase of batch) {
          // キーが完全一致するか、部分一致を探す
          const isIdiom = parsed[phrase] === true || 
                         Object.keys(parsed).some(key => 
                           key.toLowerCase().includes(phrase.toLowerCase()) && parsed[key] === true
                         );
          results.set(phrase, isIdiom === true);
        }
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        // パースエラーの場合はすべてfalseとして扱う
        for (const phrase of batch) {
          results.set(phrase, false);
        }
      }

      // APIレート制限を考慮して少し待機
      if (i + batchSize < phrases.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Mapをオブジェクトに変換
    const resultObj: Record<string, boolean> = {};
    for (const [phrase, isIdiom] of results.entries()) {
      resultObj[phrase] = isIdiom;
    }

    return NextResponse.json({ results: resultObj });
  } catch (error) {
    console.error("Check idiom error:", error);
    return NextResponse.json(
      {
        error: "処理エラー",
        message: error instanceof Error ? error.message : "イディオム判別に失敗しました。",
      },
      { status: 500 }
    );
  }
}

