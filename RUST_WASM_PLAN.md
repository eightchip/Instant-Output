# Rust/WASMによる複数画像読み込み機能の設計

## 概要

スクリーンショットから複数の画像を一括で読み込み、OCR処理を行う機能をRust/WASMで実装する計画。

## 目的

- 複数画像の一括処理による高速化
- メモリ効率の向上
- 画像の前処理（リサイズ、最適化）の高速化

## 技術スタック

- **Rust**: 画像処理とOCR前処理
- **wasm-pack**: RustからWASMへのコンパイル
- **wasm-bindgen**: JavaScriptとの相互運用

## 実装計画

### Phase 1: 基本セットアップ

1. **Rustプロジェクトの作成**
   ```bash
   cd C:\project\instant_output
   cargo new --lib wasm-image-processor
   cd wasm-image-processor
   ```

2. **依存関係の追加** (`Cargo.toml`)
   ```toml
   [package]
   name = "wasm-image-processor"
   version = "0.1.0"
   edition = "2021"

   [lib]
   crate-type = ["cdylib", "rlib"]

   [dependencies]
   wasm-bindgen = "0.2"
   wasm-bindgen-futures = "0.4"
   image = "0.24"
   js-sys = "0.3"
   web-sys = { version = "0.3", features = ["File", "FileReader", "Blob", "ImageData"] }
   ```

3. **WASMビルド設定**
   - `wasm-pack`のインストール
   - ビルドスクリプトの作成

### Phase 2: 画像処理機能

1. **複数画像の読み込み**
   - JavaScriptからFile配列を受け取る
   - 各画像をRust側で処理

2. **画像の最適化**
   - リサイズ（最大1600x1600px）
   - JPEG圧縮（品質85%）
   - メモリ効率的な処理

3. **バッチ処理**
   - 複数画像を並列処理
   - 進捗の報告

### Phase 3: Next.js統合

1. **WASMモジュールの読み込み**
   ```typescript
   import init, { process_images } from '../wasm-image-processor/pkg/wasm_image_processor';
   ```

2. **UI実装**
   - 複数ファイル選択
   - 進捗表示
   - 結果の一括表示

## ファイル構造

```
instant_output/
├── wasm-image-processor/        # Rustプロジェクト
│   ├── src/
│   │   └── lib.rs              # メインロジック
│   ├── Cargo.toml
│   └── pkg/                    # wasm-packの出力
├── lib/
│   └── wasm-processor.ts       # WASMラッパー
└── app/
    └── cards/
        └── batch-screenshot/   # 複数画像処理画面
            └── page.tsx
```

## 実装の優先順位

1. ✅ カード編集・削除機能（完了）
2. ⏳ Rust/WASM基本セットアップ
3. ⏳ 単一画像処理のWASM実装
4. ⏳ 複数画像処理の実装
5. ⏳ Next.js統合

## 注意点

- WASMモジュールのサイズを最小化
- ブラウザ互換性の確保
- エラーハンドリングの実装
- 進捗報告の仕組み

