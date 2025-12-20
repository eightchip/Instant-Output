# サブスクリプション認証システム設計

## 現状の問題点

現在の管理者認証システムは：
- パスワードベースの単純な認証
- ローカルストレージのみでセッション管理
- ユーザーアカウント管理なし
- サブスクリプション管理なし
- 使用量トラッキングなし

**→ 有料プランの契約ユーザー管理には不十分**

---

## 必要な機能

### 1. ユーザー認証システム
- サインアップ（メールアドレス + パスワード）
- ログイン / ログアウト
- パスワードリセット
- セッション管理（JWT またはセッショントークン）

### 2. サブスクリプション管理
- プラン選択（ベーシック、スタンダード、プロフェッショナル）
- 支払い処理（Stripe統合）
- 有効期限管理
- 自動更新 / キャンセル

### 3. 使用量トラッキング
- 各機能の使用回数/時間を記録
- プラン制限との比較
- 使用量グラフ表示

### 4. プラン制限の適用
- API呼び出し時にプラン制限をチェック
- 制限超過時のエラーハンドリング
- アップグレード促進

---

## アーキテクチャ設計

```
┌─────────────────┐
│   Client App    │
│  (Next.js PWA)  │
└────────┬────────┘
         │
         │ 1. 認証・API呼び出し
         ▼
┌─────────────────┐
│  Next.js API    │
│  Routes         │
└────────┬────────┘
         │
         │ 2. 認証・プラン制限チェック
         ▼
┌─────────────────┐
│  Auth Middleware│
│  - JWT検証      │
│  - プラン確認   │
│  - 使用量チェック│
└────────┬────────┘
         │
         │ 3. データ保存・取得
         ▼
┌─────────────────┐
│   Database      │
│  - Users        │
│  - Subscriptions│
│  - Usage Stats  │
└─────────────────┘
```

---

## データモデル

### User（ユーザー）
```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string; // bcryptでハッシュ化
  createdAt: Date;
  updatedAt: Date;
}
```

### Subscription（サブスクリプション）
```typescript
type SubscriptionPlan = "basic" | "standard" | "professional";

interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: "active" | "expired" | "cancelled";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd?: boolean;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### UsageStats（使用量統計）
```typescript
interface UsageStats {
  id: string;
  userId: string;
  month: string; // "2024-01"
  whisperMinutes: number;
  aiFeatureCalls: number; // 再翻訳、改善、語彙抽出、品質チェックの合計
  ttsCharacters: number;
  ocrCalls: number;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## API設計

### 認証API

#### POST /api/auth/signup
```typescript
Request: {
  email: string;
  password: string;
}

Response: {
  success: boolean;
  user?: {
    id: string;
    email: string;
  };
  token?: string; // JWT
  error?: string;
}
```

#### POST /api/auth/login
```typescript
Request: {
  email: string;
  password: string;
}

Response: {
  success: boolean;
  user?: {
    id: string;
    email: string;
  };
  token?: string; // JWT
  subscription?: Subscription;
  error?: string;
}
```

#### POST /api/auth/logout
```typescript
Request: {
  token: string;
}

Response: {
  success: boolean;
}
```

#### GET /api/auth/me
```typescript
Request Headers: {
  Authorization: "Bearer <token>"
}

Response: {
  user: {
    id: string;
    email: string;
  };
  subscription: Subscription | null;
  usageStats: UsageStats | null;
}
```

### サブスクリプションAPI

#### GET /api/subscription/plans
```typescript
Response: {
  plans: [
    {
      id: "basic";
      name: "ベーシック";
      price: 980;
      limits: {
        whisperMinutes: 100;
        aiFeatureCalls: 200;
        ttsCharacters: 50000;
        ocrCalls: 50;
      };
    },
    // ...
  ];
}
```

#### POST /api/subscription/checkout
```typescript
Request: {
  plan: SubscriptionPlan;
}

Response: {
  checkoutUrl: string; // Stripe Checkout URL
}
```

#### GET /api/subscription/status
```typescript
Request Headers: {
  Authorization: "Bearer <token>"
}

Response: {
  subscription: Subscription | null;
  usageStats: UsageStats | null;
  limits: {
    whisperMinutes: number;
    aiFeatureCalls: number;
    ttsCharacters: number;
    ocrCalls: number;
  };
  remaining: {
    whisperMinutes: number;
    aiFeatureCalls: number;
    ttsCharacters: number;
    ocrCalls: number;
  };
}
```

### 使用量トラッキングAPI

#### POST /api/usage/track
```typescript
Request: {
  feature: "whisper" | "retranslate" | "improve" | "extract" | "quality" | "tts" | "ocr";
  amount: number; // 分、回数、文字数など
}

Response: {
  success: boolean;
  remaining: {
    whisperMinutes: number;
    aiFeatureCalls: number;
    ttsCharacters: number;
    ocrCalls: number;
  };
}
```

---

## ミドルウェア設計

### 認証ミドルウェア
```typescript
async function authenticateUser(request: NextRequest): Promise<User | null> {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  
  // JWT検証
  const decoded = verifyJWT(token);
  if (!decoded) return null;
  
  // ユーザー取得
  const user = await getUserById(decoded.userId);
  return user;
}
```

### プラン制限チェックミドルウェア
```typescript
async function checkPlanLimit(
  user: User,
  feature: string,
  amount: number
): Promise<{ allowed: boolean; reason?: string }> {
  const subscription = await getActiveSubscription(user.id);
  if (!subscription) {
    return { allowed: false, reason: "サブスクリプションが必要です" };
  }
  
  const usageStats = await getCurrentMonthUsage(user.id);
  const limits = getPlanLimits(subscription.plan);
  
  // 制限チェック
  switch (feature) {
    case "whisper":
      if (usageStats.whisperMinutes + amount > limits.whisperMinutes) {
        return { allowed: false, reason: "Whisperの使用制限に達しました" };
      }
      break;
    // ...
  }
  
  return { allowed: true };
}
```

---

## 実装ステップ

### Phase 1: 認証システム基盤
1. ✅ データモデル定義
2. ⏳ JWT認証実装
3. ⏳ サインアップ/ログインAPI
4. ⏳ クライアント側認証ライブラリ

### Phase 2: サブスクリプション管理
1. ⏳ サブスクリプションモデル実装
2. ⏳ Stripe統合
3. ⏳ プラン制限チェック

### Phase 3: 使用量トラッキング
1. ⏳ 使用量記録API
2. ⏳ 使用量表示UI
3. ⏳ 制限通知

### Phase 4: 既存APIの統合
1. ⏳ 各APIルートに認証・制限チェックを追加
2. ⏳ エラーハンドリング改善
3. ⏳ アップグレード促進UI

---

## セキュリティ考慮事項

1. **パスワードハッシュ化**: bcrypt使用
2. **JWT署名**: 秘密鍵で署名
3. **HTTPS必須**: 本番環境ではHTTPS必須
4. **レート制限**: API呼び出しのレート制限
5. **入力検証**: すべての入力値を検証
6. **SQLインジェクション対策**: パラメータ化クエリ使用

---

## データベース選択

### オプション1: IndexedDB + サーバーDB（推奨）
- **クライアント**: IndexedDB（オフライン対応）
- **サーバー**: PostgreSQL / MySQL（Vercel Postgres推奨）
- **メリット**: オフライン対応、高速、スケーラブル

### オプション2: サーバーDBのみ
- **サーバー**: PostgreSQL / MySQL
- **メリット**: シンプル、一元管理
- **デメリット**: オフライン不可

---

## 移行戦略

### 既存ユーザーへの影響
1. **段階的移行**: 既存の管理者認証は残す
2. **オプトイン**: ユーザーが自発的にアカウント作成
3. **データ移行**: 既存データをユーザーアカウントに紐付け

### 後方互換性
- 管理者認証は残す（開発・テスト用）
- 本番環境では有料プラン必須に段階的に移行
