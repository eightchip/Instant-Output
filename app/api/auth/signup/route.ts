import { NextRequest, NextResponse } from "next/server";
import { hashPassword, generateToken } from "@/lib/auth-server";
import { storage } from "@/lib/storage";

/**
 * ユーザー登録API
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

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "INVALID_EMAIL", message: "有効なメールアドレスを入力してください。" },
        { status: 400 }
      );
    }

    // パスワードの長さチェック
    if (password.length < 8) {
      return NextResponse.json(
        { error: "WEAK_PASSWORD", message: "パスワードは8文字以上である必要があります。" },
        { status: 400 }
      );
    }

    // TODO: データベースから既存ユーザーをチェック
    // 現在はIndexedDBを使用（後でサーバーDBに移行）
    await storage.init();
    
    // 既存ユーザーのチェック（簡易実装）
    // 本番環境ではサーバーDBでチェック
    const existingUser = null; // TODO: データベースから取得
    
    if (existingUser) {
      return NextResponse.json(
        { error: "USER_EXISTS", message: "このメールアドレスは既に登録されています。" },
        { status: 409 }
      );
    }

    // パスワードをハッシュ化
    const passwordHash = await hashPassword(password);

    // ユーザーを作成
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user = {
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // TODO: データベースに保存
    // 現在はIndexedDBを使用（後でサーバーDBに移行）

    // JWTトークンを生成
    const token = generateToken(userId, email);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "ユーザー登録処理中にエラーが発生しました。",
      },
      { status: 500 }
    );
  }
}
