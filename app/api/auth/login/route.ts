import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, generateToken } from "@/lib/auth-server";
import { storage } from "@/lib/storage";
import { User } from "@/types/models";

/**
 * ユーザーログインAPI
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "メールアドレスとパスワードが必要です。" },
        { status: 400 }
      );
    }

    // TODO: データベースからユーザーを取得
    // 現在はIndexedDBを使用（後でサーバーDBに移行）
    await storage.init();
    
    // ユーザーを取得（簡易実装）
    // 本番環境ではサーバーDBから取得
    // TODO: データベースから取得
    const user: User | null = null;
    
    if (!user) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS", message: "メールアドレスまたはパスワードが正しくありません。" },
        { status: 401 }
      );
    }

    // この時点でuserはUser型であることが保証されている
    const validUser: User = user;

    // パスワードを検証
    const isValid = await verifyPassword(password, validUser.passwordHash);
    
    if (!isValid) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS", message: "メールアドレスまたはパスワードが正しくありません。" },
        { status: 401 }
      );
    }

    // TODO: サブスクリプション情報を取得
    const subscription = null; // TODO: データベースから取得

    // JWTトークンを生成
    const token = generateToken(validUser.id, validUser.email);

    return NextResponse.json({
      success: true,
      user: {
        id: validUser.id,
        email: validUser.email,
      },
      token,
      subscription: subscription || null,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "ログイン処理中にエラーが発生しました。",
      },
      { status: 500 }
    );
  }
}
