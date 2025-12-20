import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth-server";

/**
 * 現在のユーザー情報を取得
 */
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    
    if (!auth) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "認証が必要です。" },
        { status: 401 }
      );
    }

    // TODO: データベースからユーザー情報を取得
    const user = {
      id: auth.userId,
      email: auth.email,
    };

    // TODO: サブスクリプション情報を取得
    const subscription = null; // TODO: データベースから取得

    // TODO: 使用量統計を取得
    const usageStats = null; // TODO: データベースから取得

    return NextResponse.json({
      user,
      subscription: subscription || null,
      usageStats: usageStats || null,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "ユーザー情報の取得中にエラーが発生しました。",
      },
      { status: 500 }
    );
  }
}
