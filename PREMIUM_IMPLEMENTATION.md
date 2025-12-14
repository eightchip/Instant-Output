# プレミアム機能（アプリ内課金）実装方針

## 現状

現在、プレミアム機能はローカルストレージベースの仮実装となっています。

### 実装済み機能
- `lib/premium.ts`: プレミアム機能管理ライブラリ
- AI OCR機能へのアクセス制限
- 開発・テスト用の一時有効化機能

## 実装方針

### 1. プラットフォーム別の実装

#### Webアプリ（PWA）
- **推奨**: Stripe Checkout / Stripe Payment Element
- **理由**: 
  - 最も一般的で信頼性が高い
  - サブスクリプション管理が容易
  - 国際的な決済に対応
  - セキュリティが高い

#### iOSアプリ（将来実装時）
- **必須**: Apple In-App Purchase (IAP)
- **理由**: App Store審査要件
- **実装**: StoreKit 2を使用

#### Androidアプリ（将来実装時）
- **推奨**: Google Play Billing
- **理由**: Google Play審査要件
- **実装**: Google Play Billing Library 5.0+

### 2. アーキテクチャ設計

```
┌─────────────────┐
│   Client App    │
│  (Next.js PWA)  │
└────────┬────────┘
         │
         │ 1. 購入リクエスト
         ▼
┌─────────────────┐
│  Payment API    │
│  (Stripe/Store) │
└────────┬────────┘
         │
         │ 2. 決済処理
         ▼
┌─────────────────┐
│  Backend API    │
│  (Next.js API)  │
└────────┬────────┘
         │
         │ 3. 購入検証・保存
         ▼
┌─────────────────┐
│   Database      │
│  (IndexedDB +   │
│   Server DB)    │
└─────────────────┘
```

### 3. 実装ステップ

#### Phase 1: Stripe統合（Web版）

1. **Stripeアカウント作成**
   - テストモードと本番モードの設定
   - Webhookエンドポイントの設定

2. **バックエンドAPI実装**
   - `/api/premium/checkout`: チェックアウトセッション作成
   - `/api/premium/webhook`: Stripe Webhook受信
   - `/api/premium/status`: 購入状態確認

3. **フロントエンド実装**
   - 購入ボタンとUI
   - Stripe Checkout統合
   - 購入状態の同期

4. **データベース設計**
   - ユーザーIDと購入情報の紐付け
   - サブスクリプション状態の管理

#### Phase 2: セキュリティ強化

1. **サーバーサイド検証**
   - Stripe Webhookからの購入検証
   - ローカルストレージのみに依存しない設計

2. **認証システム**
   - ユーザー認証（オプション）
   - デバイス間での購入状態同期

#### Phase 3: プラットフォーム拡張

1. **iOS実装**
   - StoreKit 2統合
   - レシート検証

2. **Android実装**
   - Google Play Billing統合
   - 購入トークン検証

### 4. データモデル

```typescript
interface PremiumPurchase {
  id: string;
  userId?: string; // 認証システム導入時
  deviceId: string; // デバイス識別子
  feature: PremiumFeature;
  purchaseId: string; // Stripe/StoreKit/Google Playの購入ID
  purchaseDate: Date;
  expiresAt?: Date; // サブスクリプションの場合
  status: "active" | "expired" | "cancelled";
  platform: "web" | "ios" | "android";
}
```

### 5. セキュリティ考慮事項

1. **サーバーサイド検証**
   - クライアント側の検証のみでは不十分
   - 必ずサーバーで購入を検証

2. **Webhook署名検証**
   - Stripe Webhookの署名を検証
   - 不正なリクエストを拒否

3. **レート制限**
   - API呼び出しのレート制限
   - 不正利用の防止

### 6. 現在の仮実装からの移行

#### 移行手順

1. **既存ユーザーの保護**
   - ローカルストレージのデータを保持
   - 段階的な移行

2. **後方互換性**
   - 開発・テスト用の機能は残す
   - 本番環境では無効化

3. **データ移行**
   - 既存の購入データをサーバーに移行（認証システム導入時）

### 7. 推奨実装順序

1. ✅ **Phase 0**: ローカルストレージベースの仮実装（完了）
2. ⏳ **Phase 1**: Stripe統合（Web版）
3. ⏳ **Phase 2**: セキュリティ強化
4. ⏳ **Phase 3**: プラットフォーム拡張（iOS/Android）

### 8. コスト考慮

- **Stripe**: 手数料 3.6% + 40円（日本）
- **Apple IAP**: 30%の手数料
- **Google Play**: 15-30%の手数料（段階的）

### 9. テスト戦略

1. **Stripeテストモード**
   - テストカードでの決済テスト
   - Webhookのテスト

2. **Sandbox環境**
   - iOS: Sandbox Tester
   - Android: License Testing

3. **統合テスト**
   - エンドツーエンドのテスト
   - エラーケースのテスト

## 次のステップ

1. Stripeアカウントの作成
2. バックエンドAPIの実装開始
3. フロントエンドの購入UI実装
4. テスト環境での検証

## 参考資料

- [Stripe Documentation](https://stripe.com/docs)
- [Apple In-App Purchase](https://developer.apple.com/in-app-purchase/)
- [Google Play Billing](https://developer.android.com/google/play/billing)

