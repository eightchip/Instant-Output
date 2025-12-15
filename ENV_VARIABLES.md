# 環境変数の設定について

## 環境変数の種類と違い

### 1. `ADMIN_PASSWORD`（サーバーサイド専用）
- **使用場所**: APIルート（`app/api/translate-chatgpt/route.ts`、`app/api/ai-ocr/route.ts`）
- **特徴**: 
  - サーバーサイドでのみ使用可能
  - ブラウザに公開されない（セキュア）
  - Next.jsのビルド時にサーバー側でのみ利用可能

### 2. `NEXT_PUBLIC_ADMIN_PASSWORD`（クライアントサイドでも使用可能）
- **使用場所**: クライアントコンポーネント（`lib/admin-auth.ts`）
- **特徴**:
  - クライアントサイド（ブラウザ）でも使用可能
  - **⚠️ 注意**: ブラウザに公開されるため、誰でも見ることができる
  - ログイン画面でのパスワード検証に使用

## Vercelでの設定方法

### 必須設定（両方設定してください）

Vercelのダッシュボードで以下の2つを設定してください：

1. **`ADMIN_PASSWORD`**（サーバーサイド）
   - 値: 任意の安全なパスワード（例: `my_secure_password_123`）
   - 用途: APIルートでの認証

2. **`NEXT_PUBLIC_ADMIN_PASSWORD`**（クライアントサイド）
   - 値: **`ADMIN_PASSWORD`と同じ値**を設定してください
   - 用途: ログイン画面でのパスワード検証

### 設定手順

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. 「Settings」→「Environment Variables」を開く
4. 以下の2つを追加：

```
Key: ADMIN_PASSWORD
Value: your_secure_password_here

Key: NEXT_PUBLIC_ADMIN_PASSWORD
Value: your_secure_password_here  （ADMIN_PASSWORDと同じ値）
```

### 重要事項

⚠️ **セキュリティ上の注意**:
- `NEXT_PUBLIC_ADMIN_PASSWORD`はブラウザに公開されるため、完全なセキュリティは保証されません
- 本番環境では、より強力な認証方法（JWT、セッション管理など）の使用を推奨します
- 現在の実装は簡易的な認証のため、開発・テスト環境での使用を想定しています

### 既に設定済み

✅ **`OPENAI_API_KEY`** - 設定済み（問題なし）

## ローカル開発環境（.env.local）

`.env.local`ファイルに以下を追加：

```env
# サーバーサイド用（APIルートで使用）
ADMIN_PASSWORD=your_secure_password_here

# クライアントサイド用（ログイン画面で使用）
NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_password_here

# OpenAI API Key（既に設定済み）
OPENAI_API_KEY=sk-...
```

**注意**: `.env.local`は`.gitignore`に含まれているため、Gitにはコミットされません。

