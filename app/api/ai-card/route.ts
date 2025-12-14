// 自動分割・自動翻訳API（クライアントサイド処理のため、このAPIは使用しない）
// クライアントサイドで直接 text-processing.ts を使用してください

import { NextRequest, NextResponse } from "next/server";
import { AICardResponse, AIErrorResponse } from "@/types/ai-card";

// このAPIは非推奨です。クライアントサイドで直接処理してください。
export async function POST(request: NextRequest) {
  return NextResponse.json<AIErrorResponse>(
    {
      error: "DEPRECATED",
      message: "このAPIは非推奨です。クライアントサイドで直接処理してください。",
    },
    { status: 410 }
  );
}

