// AIカード化API（Server Action）

import { NextRequest, NextResponse } from "next/server";
import { AICardResponse, AIErrorResponse } from "@/types/ai-card";

const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    cards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          en: { type: "string" },
          jp: { type: "string" },
          confidence: { type: "number" },
          needsReview: { type: "boolean" },
          flags: { type: "array", items: { type: "string" } },
          sourceSentence: { type: "string" },
          notes: { type: "string" },
        },
        required: [
          "en",
          "jp",
          "confidence",
          "needsReview",
          "flags",
          "sourceSentence",
          "notes",
        ],
      },
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
    detected: {
      type: "object",
      additionalProperties: false,
      properties: {
        sentenceCount: { type: "number" },
        language: { type: "string" },
      },
      required: ["sentenceCount", "language"],
    },
  },
  required: ["cards", "warnings", "detected"],
};

const SYSTEM_PROMPT = `You are an assistant that converts OCR text from English learning handouts into flashcard candidates.

Goal:
- Clean OCR noise while preserving the original English meaning.
- Split text into sentences (default: 1 sentence = 1 card).
- For each English sentence, create a natural Japanese translation suitable for speaking practice.
- Prefer natural, idiomatic Japanese (light paraphrase) over literal translation.
- Do not add information that is not present in the original English.

Rules:
1) Preserve English meaning. You may correct obvious OCR errors
   (broken words, strange quotes, hyphenation, missing spaces).
   Do NOT rewrite stylistically beyond OCR correction.
2) Sentence splitting:
   - Default: one complete sentence per card.
   - If a fragment is incomplete, merge it or set needsReview=true.
3) Japanese translation:
   - Natural and easy to say aloud.
   - Slight paraphrasing is allowed for naturalness.
4) Quality control:
   - If unsure about sentence boundaries or meaning,
     set needsReview=true and add flags such as:
       "ocr_noise"
       "split_suspect"
       "incomplete_sentence"
       "ambiguous_meaning"
       "missing_context"
5) Output must strictly follow the provided JSON schema.
   No extra text.

Return:
- cards[]
- warnings[]
- detected { sentenceCount, language }`;

export async function POST(request: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json<AIErrorResponse>(
        {
          error: "AI_API_KEY_MISSING",
          message: "AI APIキーが設定されていません。",
        },
        { status: 500 }
      );
    }

    const { rawOcrText } = await request.json();

    if (!rawOcrText || typeof rawOcrText !== "string") {
      return NextResponse.json<AIErrorResponse>(
        {
          error: "INVALID_INPUT",
          message: "OCRテキストが無効です。",
        },
        { status: 400 }
      );
    }

    // OpenAI API呼び出し
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Convert this OCR text into flashcard candidates:\n\n${rawOcrText}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ai_card_response",
            strict: true,
            schema: JSON_SCHEMA,
          },
        },
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json<AIErrorResponse>(
        {
          error: "AI_API_ERROR",
          message: `AI API呼び出しに失敗しました: ${errorData.error?.message || response.statusText}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json<AIErrorResponse>(
        {
          error: "AI_FORMAT_FAILED",
          message: "AIからの応答が無効です。",
        },
        { status: 500 }
      );
    }

    let aiResponse: AICardResponse;
    try {
      aiResponse = JSON.parse(content);
    } catch (parseError) {
      return NextResponse.json<AIErrorResponse>(
        {
          error: "AI_FORMAT_FAILED",
          message: "AI出力のJSON解析に失敗しました。再試行してください。",
        },
        { status: 500 }
      );
    }

    // バリデーション
    if (!aiResponse.cards || !Array.isArray(aiResponse.cards)) {
      return NextResponse.json<AIErrorResponse>(
        {
          error: "AI_FORMAT_FAILED",
          message: "AI出力の形式が不正です。再試行してください。",
        },
        { status: 500 }
      );
    }

    return NextResponse.json<AICardResponse>(aiResponse);
  } catch (error) {
    console.error("AI card API error:", error);
    return NextResponse.json<AIErrorResponse>(
      {
        error: "AI_FORMAT_FAILED",
        message: "AI整形に失敗しました。再試行してください。",
      },
      { status: 500 }
    );
  }
}

