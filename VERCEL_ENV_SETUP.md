# Vercelでの環境変数設定手順

## 設定する環境変数

以下の2つの環境変数を設定してください：

1. **`ADMIN_PASSWORD`**（サーバーサイド専用）
2. **`NEXT_PUBLIC_ADMIN_PASSWORD`**（クライアントサイド用）

## ステップバイステップ手順

### 1. Vercelダッシュボードにアクセス

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. プロジェクト「Instant-Output」を選択

### 2. 環境変数設定画面を開く

1. プロジェクトページで「**Settings**」タブをクリック
2. 左側のメニューから「**Environment Variables**」を選択

### 3. 環境変数を追加

#### ① `ADMIN_PASSWORD`を追加

1. 「**Add New**」ボタンをクリック
2. 以下の情報を入力：
   - **Key**: `ADMIN_PASSWORD`
   - **Value**: 任意の安全なパスワード（例: `my_secure_password_123`）
   - **Environment**: すべての環境にチェック（Production, Preview, Development）
3. 「**Save**」をクリック
   - ⚠️ 警告は表示されません（サーバーサイド専用のため）

#### ② `NEXT_PUBLIC_ADMIN_PASSWORD`を追加

1. 「**Add New**」ボタンをクリック
2. 以下の情報を入力：
   - **Key**: `NEXT_PUBLIC_ADMIN_PASSWORD`
   - **Value**: **`ADMIN_PASSWORD`と同じ値**を入力
   - **Environment**: すべての環境にチェック（Production, Preview, Development）
3. 「**Save**」をクリック
   - ⚠️ **警告が表示されます**: 「この環境変数はブラウザに公開されます」
   - ✅ **これは正常です**。この警告は無視して「**Save**」をクリックしてください

### 4. 設定の確認

設定後、以下のように表示されます：

```
ADMIN_PASSWORD              [Production, Preview, Development]
NEXT_PUBLIC_ADMIN_PASSWORD  [Production, Preview, Development] ⚠️
```

⚠️ マークが表示されていても問題ありません。

### 5. デプロイの再実行（必要に応じて）

環境変数を追加した後、変更を反映するために再デプロイが必要な場合があります：

1. 「**Deployments**」タブを開く
2. 最新のデプロイメントの「**...**」メニューから「**Redeploy**」を選択
3. または、GitHubにプッシュして自動デプロイを待つ

## パスワードの推奨事項

### 安全なパスワードの例

- ✅ `my_secure_password_2024`
- ✅ `admin_instant_output_123`
- ✅ `instant_output_admin_key`

### 避けるべきパスワード

- ❌ `admin123`（デフォルト値）
- ❌ `password`
- ❌ `123456`
- ❌ 短すぎるパスワード（8文字未満）

## トラブルシューティング

### 警告が表示される

**Q**: `NEXT_PUBLIC_ADMIN_PASSWORD`を設定すると警告が表示されます。問題ありませんか？

**A**: はい、問題ありません。`NEXT_PUBLIC_`で始まる環境変数はブラウザに公開されるため、Vercelが警告を表示しています。これは正常な動作です。警告を無視して「Save」をクリックしてください。

### 環境変数が反映されない

**Q**: 環境変数を設定したのに、アプリで反映されません。

**A**: 以下の手順を試してください：
1. 再デプロイを実行（上記の手順5を参照）
2. ブラウザのキャッシュをクリア
3. 環境変数の値が正しいか確認（スペースや特殊文字が含まれていないか）

### ログインできない

**Q**: 環境変数を設定した後、ログインできません。

**A**: 以下の点を確認してください：
1. `ADMIN_PASSWORD`と`NEXT_PUBLIC_ADMIN_PASSWORD`の値が**完全に同じ**であることを確認
2. スペースや改行が含まれていないか確認
3. デフォルトパスワード`admin123`で試す（環境変数が正しく設定されていない場合）

## 設定後の動作確認

環境変数を設定した後、以下の手順で動作確認してください：

1. アプリにアクセス
2. 「管理者ログイン」ボタンをクリック
3. 設定したパスワードでログイン
4. ログインできることを確認

## ⚠️ 重要な注意事項

### 環境変数を設定する場合は、必ず両方設定してください

**問題**: 片方だけ設定すると、ログインに失敗します。

- ❌ `ADMIN_PASSWORD`だけ設定 → クライアント側でデフォルト値`admin123`が使用され、不一致でログイン失敗
- ❌ `NEXT_PUBLIC_ADMIN_PASSWORD`だけ設定 → サーバー側でデフォルト値`admin123`が使用され、不一致でAPI呼び出し失敗
- ✅ **両方設定** → 正常に動作

### 推奨される設定方法

1. まず`ADMIN_PASSWORD`を設定
2. 次に`NEXT_PUBLIC_ADMIN_PASSWORD`を設定（**同じ値**）
3. 両方ともすべての環境（Production, Preview, Development）に設定

## まとめ

- ✅ `ADMIN_PASSWORD`を設定（警告なし）
- ✅ `NEXT_PUBLIC_ADMIN_PASSWORD`を設定（警告あり、正常）
- ✅ **両方の値は必ず同じにする**
- ✅ **両方とも設定する**（片方だけでは動作しません）
- ✅ すべての環境（Production, Preview, Development）に設定

設定が完了したら、再デプロイを実行して変更を反映してください。
