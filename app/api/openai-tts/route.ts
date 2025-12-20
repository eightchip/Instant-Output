import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth-server";

/**
 * OpenAI TTS APIを使用した音声生成
 * 管理者専用機能
 */
export async function POST(request: NextRequest) {
  try {
    const { text, voice = "alloy", sessionData } = await request.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "テキストが無効です。" },
        { status: 400 }
      );
    }

    // セッション認証
    if (!verifyAdminSession(sessionData)) {
      console.warn("管理者セッション認証失敗（OpenAI TTS API）");
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

    // 音声オプションの検証
    const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
    const selectedVoice = validVoices.includes(voice) ? voice : "alloy";

    // OpenAI TTS APIを呼び出し
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: selectedVoice,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI TTS API error:", errorData);
      return NextResponse.json(
        {
          error: "TTS_API_ERROR",
          message: `音声生成APIの呼び出しに失敗しました: ${response.status}`,
        },
        { status: response.status }
      );
    }

    // 音声データを取得（バイナリ）
    const audioBuffer = await response.arrayBuffer();

    // base64エンコードして返す
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    return NextResponse.json({
      audio: base64Audio,
      format: "mp3",
    });
  } catch (error) {
    console.error("OpenAI TTS error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message:
          error instanceof Error ? error.message : "音声生成処理中にエラーが発生しました。",
      },
      { status: 500 }
    );
  }
}
