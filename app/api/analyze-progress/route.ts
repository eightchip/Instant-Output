import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth-server";

/**
 * ChatGPT APIを使用して学習進捗を分析
 * 管理者専用機能
 */
export async function POST(request: NextRequest) {
  try {
    const { statistics, sessions, sessionData } = await request.json();

    if (!statistics || !sessions) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "統計データが無効です。" },
        { status: 400 }
      );
    }

    // セッション認証
    if (!verifyAdminSession(sessionData)) {
      console.warn("管理者セッション認証失敗（学習進捗分析）");
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

    // よく間違える単語を分析（sessionsから抽出）
    const analysisData = {
      totalSessions: statistics.totalSessions,
      totalCards: statistics.totalCards,
      averageAccuracy: statistics.averageAccuracy,
      totalStudyDays: statistics.totalStudyDays,
      currentStreak: statistics.currentStreak,
      recentSessions: sessions.slice(0, 10).map((s: any) => ({
        date: s.date,
        accuracy: s.cardCount > 0 ? ((s.correctCount + s.maybeCount * 0.5) / s.cardCount) * 100 : 0,
        cardCount: s.cardCount,
      })),
    };

    // ChatGPT APIを使用して分析
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
            content: `You are a language learning expert. Analyze the provided learning statistics and provide insights and recommendations in Japanese.

Focus on:
1. Learning pace and consistency
2. Accuracy trends
3. Areas for improvement
4. Recommendations for better learning

Return the analysis in Japanese, in a clear and encouraging format.`,
          },
          {
            role: "user",
            content: `以下の学習統計を分析してください:\n\n${JSON.stringify(analysisData, null, 2)}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error:", errorData);
      return NextResponse.json(
        {
          error: "ANALYSIS_API_ERROR",
          message: `分析APIの呼び出しに失敗しました: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json(
        {
          error: "ANALYSIS_FAILED",
          message: "分析結果が取得できませんでした。",
        },
        { status: 500 }
      );
    }

    const analysis = data.choices[0].message.content.trim();

    if (!analysis || analysis.length === 0) {
      return NextResponse.json(
        {
          error: "ANALYSIS_FAILED",
          message: "分析結果が空です。",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      analysis,
    });
  } catch (error) {
    console.error("Progress analysis error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message:
          error instanceof Error ? error.message : "学習進捗分析処理中にエラーが発生しました。",
      },
      { status: 500 }
    );
  }
}
