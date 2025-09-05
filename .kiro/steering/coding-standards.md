---
inclusion: always
---

# コーディング規約とスタイルガイド

## 基本方針
- **可読性**: コードは人が読むものであることを常に意識する
- **一貫性**: プロジェクト全体で統一されたスタイルを維持する
- **保守性**: 将来の変更や拡張を考慮した設計にする
- **型安全性**: TypeScriptの型システムを最大限活用する

## TypeScript/JavaScript規約

### 命名規則
- **変数・関数**: camelCase（例：`emotionDetector`, `calculateParams`）
- **クラス**: PascalCase（例：`EmotionDetector`, `GameEngine`）
- **定数**: UPPER_SNAKE_CASE（例：`MAX_SCORE`, `DEFAULT_SENSITIVITY`）
- **ファイル名**: kebab-case（例：`emotion-detector.ts`, `game-engine.ts`）
- **型定義**: PascalCase（例：`EmotionType`, `GameState`）

### 関数とメソッド
```typescript
// ✅ 良い例
/**
 * 表情パラメータを計算する
 * @param landmarks MediaPipeのランドマーク配列
 * @returns 計算された表情パラメータ
 */
public calculateEmotionParams(landmarks: Landmark[]): EmotionParams {
  // 実装...
}

// ❌ 悪い例
function calc(lm: any): any {
  // 実装...
}
```

### 変数宣言
```typescript
// ✅ 良い例
const emotionThreshold = 0.5;
let currentEmotion: EmotionType = '😊';

// ❌ 悪い例
var threshold = 0.5;
let emotion; // 型が不明
```

### エラーハンドリング
```typescript
// ✅ 良い例
try {
  const result = await processEmotion(landmarks);
  return result;
} catch (error) {
  console.error('表情処理中にエラーが発生しました:', error);
  throw new Error(`表情処理エラー: ${error.message}`);
}

// ❌ 悪い例
try {
  return processEmotion(landmarks);
} catch (e) {
  console.log(e);
}
```

## コメント規約

### JSDoc形式
```typescript
/**
 * 表情を検出して結果を返す
 * @param params 表情パラメータ
 * @returns 検出結果（表情タイプとスコア）
 * @throws {Error} パラメータが無効な場合
 */
public detectEmotion(params: EmotionParams): EmotionResult {
  // 実装...
}
```

### インラインコメント
```typescript
// 表情の安定性をチェック（連続2回同じ表情で安定とみなす）
if (this.emotionStabilityCounter >= this.EMOTION_STABILITY_THRESHOLD) {
  return true;
}

// TODO: 将来的にはAIによる表情認識精度向上を検討
// FIXME: 低照度環境での検出精度が低い問題を修正する必要がある
```

## ファイル構成規約

### ディレクトリ構造
```
src/
├── types/          # 型定義ファイル
├── core/           # コア機能
│   ├── emotion/    # 表情認識関連
│   ├── game/       # ゲームロジック
│   └── camera/     # カメラ・検出関連
├── utils/          # ユーティリティ関数
├── compat/         # 互換性レイヤー
└── main.ts         # エントリーポイント
```

### インポート順序
```typescript
// 1. 外部ライブラリ
import { MediaPipeAPI } from '@mediapipe/face_mesh';

// 2. 内部型定義
import { EmotionType, GameState } from '../types/game.js';

// 3. 内部モジュール
import { EmotionDetector } from './emotion/EmotionDetector.js';
```

## 型定義規約

### インターフェース定義
```typescript
// ✅ 良い例
interface EmotionParams {
  /** 口の開き具合（0.0-1.0） */
  mouthOpenness: number;
  /** 眉の高さ（0.0-1.0） */
  eyebrowY: number;
  /** 検出時刻 */
  timestamp: number;
}

// ❌ 悪い例
interface Params {
  mouth: number;
  eye: number;
  time: number;
}
```

### 型ガード
```typescript
// ✅ 良い例
function isValidEmotion(emotion: string): emotion is EmotionType {
  return ['😊', '😡', '😢', '😲'].includes(emotion);
}

// 使用例
if (isValidEmotion(userInput)) {
  // userInputはEmotionType型として扱われる
  processEmotion(userInput);
}
```

## パフォーマンス規約

### 非同期処理
```typescript
// ✅ 良い例
async function processFrame(): Promise<void> {
  try {
    await Promise.all([
      faceMesh.send({ image: video }),
      hands.send({ image: video })
    ]);
  } catch (error) {
    console.error('フレーム処理エラー:', error);
  }
}

// ❌ 悪い例
function processFrame() {
  faceMesh.send({ image: video });
  hands.send({ image: video }); // 並列処理されない
}
```

### メモリ管理
```typescript
// ✅ 良い例
class EmotionDetector {
  private cleanup(): void {
    // リソースの適切な解放
    this.eventListeners.forEach(listener => {
      document.removeEventListener(listener.type, listener.handler);
    });
    this.eventListeners = [];
  }
}
```

## テスト規約

### テストファイル命名
- `*.test.ts` - 単体テスト
- `*.spec.ts` - 統合テスト
- `*.e2e.ts` - E2Eテスト

### テスト構造
```typescript
describe('EmotionDetector', () => {
  describe('calculateParams', () => {
    it('正常なランドマークから表情パラメータを計算できる', () => {
      // Arrange
      const landmarks = createMockLandmarks();
      
      // Act
      const params = detector.calculateParams(landmarks);
      
      // Assert
      expect(params.mouthOpenness).toBeGreaterThanOrEqual(0);
      expect(params.mouthOpenness).toBeLessThanOrEqual(1);
    });
  });
});
```

## 既存コードとの互換性

### 段階的移行
```typescript
// 既存のJavaScriptコードとの互換性を保つ
declare global {
  interface Window {
    EmotionDetector: {
      // 既存APIの型定義
      calculateParams: (lm: any) => any;
      detectEmotion: (params: any) => any;
    };
  }
}
```

### レガシーコード対応
```typescript
// 既存コードで使用されている関数の型安全なラッパー
export function legacyEmotionDetect(landmarks: any): any {
  // 型チェックとバリデーション
  if (!Array.isArray(landmarks)) {
    throw new Error('ランドマークは配列である必要があります');
  }
  
  // 新しいTypeScript実装を呼び出し
  return modernEmotionDetector.detect(landmarks as Landmark[]);
}
```

## 品質チェック

### 必須チェック項目
- [ ] ESLintエラーがないこと
- [ ] Prettierでフォーマットされていること
- [ ] TypeScriptコンパイルエラーがないこと
- [ ] 日本語コメントが適切に記述されていること
- [ ] 既存機能との互換性が保たれていること

### 推奨チェック項目
- [ ] 単体テストが書かれていること
- [ ] JSDocコメントが記述されていること
- [ ] パフォーマンスへの影響が考慮されていること
- [ ] エラーハンドリングが適切に実装されていること