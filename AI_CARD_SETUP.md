# AIカード化機能のセットアップ

## 概要

英文教材の画像からOCRでテキストを抽出し、AIで整形してカード候補を生成する機能です。

## 環境変数の設定

`.env.local`ファイルに以下の環境変数を追加してください：

```env
# OpenAI API Key（必須）
OPENAI_API_KEY=sk-...

# AIモデル（オプション、デフォルト: gpt-4o-mini）
AI_MODEL=gpt-4o-mini
```

## 使い方

1. **画像をアップロード**
   - 「AIでカード化」メニューから画像を選択
   - カメラ撮影またはライブラリから選択

2. **OCR実行**
   - 「OCRを実行」ボタンをクリック
   - OCR結果が表示されます（rawOcrTextとして保存）

3. **AIでカード化**
   - 「AIでカード化」ボタンをクリック
   - AIが以下を実行：
     - OCRノイズ除去
     - 英文の文分割（1文 = 1カード）
     - 自然な日本語訳の生成

4. **カード候補のレビュー**
   - 生成されたカード候補を確認
   - `needsReview`フラグでフィルタリング可能
   - 各カードを編集可能
   - 採用するカードを選択
   - レッスンを選択して保存

## データ構造

### Source（元画像とOCR結果）
- `id`: ソースID
- `imageId`: 画像データ（base64）
- `rawOcrText`: OCR生テキスト（一切加工なし）
- `createdAt`: 作成日時

### Draft（AI生成のカード候補）
- `id`: ドラフトID
- `sourceId`: ソースID
- `cards[]`: カード候補配列
  - `en`: 英語文
  - `jp`: 日本語訳
  - `confidence`: 信頼度（0-1）
  - `needsReview`: レビュー必要フラグ
  - `flags[]`: フラグ（ocr_noise, split_suspect等）
  - `sourceSentence`: 元のOCR文
  - `notes`: メモ
- `warnings[]`: 警告メッセージ
- `detected`: 検出情報
  - `sentenceCount`: 文数
  - `language`: 言語

## AI API仕様

### エンドポイント
`POST /api/ai-card`

### リクエスト
```json
{
  "rawOcrText": "OCRで取得した生テキスト"
}
```

### レスポンス
```json
{
  "cards": [
    {
      "en": "English sentence",
      "jp": "日本語訳",
      "confidence": 0.95,
      "needsReview": false,
      "flags": [],
      "sourceSentence": "Original OCR text",
      "notes": ""
    }
  ],
  "warnings": [],
  "detected": {
    "sentenceCount": 10,
    "language": "en"
  }
}
```

### エラーレスポンス
```json
{
  "error": "AI_FORMAT_FAILED",
  "message": "AI整形に失敗しました。再試行してください。"
}
```

## 注意事項

- APIキーはサーバーサイドでのみ使用（クライアントに露出しない）
- AI出力はJSON固定（Structured Outputs使用）
- 最終決定はユーザーが行う（AIは下書き生成のみ）
- OCRノイズが混ざった場合は`needsReview=true`で判別可能

## トラブルシューティング

### AI API呼び出しエラー
- `OPENAI_API_KEY`が正しく設定されているか確認
- APIキーの有効期限を確認
- ネットワーク接続を確認

### OCRエラー
- 画像の解像度が低い場合は再試行
- 画像が歪んでいる場合は補正を試す

### AI出力が不正
- `needsReview=true`のカードを確認
- 手動で編集して修正

