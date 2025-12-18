# 環境変数の設定ガイド

## 結論：環境変数は設定しなくても動作します

現在の実装では、すべての環境変数に**デフォルト値**が設定されているため、環境変数を設定しなくても動作します。

### デフォルト値

- **`ADMIN_PASSWORD`**: `"admin123"`（設定されていない場合）
- **`NEXT_PUBLIC_ADMIN_PASSWORD`**: `"admin123"`（設定されていない場合）

## 動作確認

### ローカル開発環境

環境変数を設定しなくても、以下のパスワードでログインできます：
- **管理者パスワード**: `admin123`

### 本番環境（Vercel）

環境変数を設定しなくても動作しますが、**セキュリティ上の理由から設定を推奨**します。

## 環境変数を設定する場合

### 推奨される設定（本番環境）

セキュリティを向上させるために、本番環境では環境変数を設定することを推奨します。

#### Vercelでの設定方法

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. 「Settings」→「Environment Variables」を開く
4. 以下の環境変数を追加：

```
Key: ADMIN_PASSWORD
Value: 任意の安全なパスワード（例: my_secure_password_123）

Key: NEXT_PUBLIC_ADMIN_PASSWORD
Value: ADMIN_PASSWORDと同じ値
⚠️ 警告が表示されますが、これは正常です
```

#### ローカル開発環境（.env.local）

`.env.local`ファイルを作成（プロジェクトルートに）：

```env
# サーバーサイド用（APIルートで使用）
ADMIN_PASSWORD=your_secure_password_here

# クライアントサイド用（ログイン画面で使用）
NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_password_here

# OpenAI API Key（既に設定済みの場合）
OPENAI_API_KEY=sk-...
```

**注意**: `.env.local`は`.gitignore`に含まれているため、Gitにはコミットされません。

## 現在の実装状況

### セッションベースの認証（パスワード不要）

以下のAPIは、セッションベースの認証を使用しているため、パスワードを送信する必要がありません：
- ✅ `app/api/whisper-transcribe/route.ts` - セッションデータを検証

### パスワードベースの認証（デフォルト値あり）

以下のAPIは、パスワードベースの認証を使用していますが、デフォルト値が設定されているため、環境変数がなくても動作します：
- `app/api/ai-ocr/route.ts` - デフォルト: `"admin123"`
- `app/api/translate-chatgpt/route.ts` - デフォルト: `"admin123"`
- `app/api/ai-ocr-translate/route.ts` - デフォルト: `"admin123"`

### ログイン機能

- `lib/admin-auth.ts` - デフォルト: `"admin123"`

## まとめ

| 項目 | 設定必須 | デフォルト値 |
|------|---------|------------|
| `ADMIN_PASSWORD` | ❌ 不要 | `"admin123"` |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | ❌ 不要 | `"admin123"` |
| `OPENAI_API_KEY` | ✅ 必須 | なし |

**結論**: 環境変数を設定しなくても、デフォルトパスワード`admin123`で動作します。ただし、本番環境ではセキュリティのため、環境変数を設定することを推奨します。
