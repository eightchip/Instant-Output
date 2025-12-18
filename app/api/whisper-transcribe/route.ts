import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth-server";

/**
 * OpenAI Whisper APIを使用した高精度音声認識
 * 管理者専用機能
 */
export async function POST(request: NextRequest) {
  try {
    const { audioBase64, sessionData, language = "en" } = await request.json();

    if (!audioBase64 || typeof audioBase64 !== "string") {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "音声データが無効です。" },
        { status: 400 }
      );
    }

    // セッション認証
    if (!verifyAdminSession(sessionData)) {
      console.warn("管理者セッション認証失敗（Whisper API）");
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

    // base64データからdata:audio/...;base64,の部分を除去
    const base64Data = audioBase64.includes(",") 
      ? audioBase64.split(",")[1] 
      : audioBase64;

    // base64をBufferに変換
    const audioBuffer = Buffer.from(base64Data, "base64");

    // Whisper APIを呼び出し（FormDataを使用）
    // Node.js環境では、FormDataにBufferを直接追加できる
    const formData = new FormData();
    // BufferをBlobとして扱う（Node.js環境ではFileは利用できないため）
    const audioBlob = new Blob([audioBuffer], { type: "audio/webm" });
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("language", language === "en" ? "en" : "ja");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Whisper API error:", errorData);
      return NextResponse.json(
        {
          error: "TRANSCRIPTION_API_ERROR",
          message: `音声認識APIの呼び出しに失敗しました: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.text || data.text.trim().length === 0) {
      return NextResponse.json(
        {
          error: "TRANSCRIPTION_FAILED",
          message: "音声認識結果が空です。",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      text: data.text.trim(),
    });
  } catch (error) {
    console.error("Whisper transcription error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message:
          error instanceof Error ? error.message : "音声認識処理中にエラーが発生しました。",
      },
      { status: 500 }
    );
  }
}
