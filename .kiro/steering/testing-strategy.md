---
inclusion: always
---

# テスト戦略とガイドライン

## 基本方針
- **品質保証**: ユーザー体験を重視したテスト設計
- **自動化**: 継続的インテグレーションでの自動テスト実行
- **実用性**: 実際のユーザー操作に近いテストシナリオ
- **保守性**: メンテナンスしやすいテストコード

## テスト構成

### 1. 単体テスト (Unit Tests)
**対象**: TypeScriptモジュール、ユーティリティ関数
**ツール**: Jest + TypeScript
**カバレッジ**: コア機能の80%以上

```typescript
// 例: 表情検出ロジックのテスト
describe('EmotionDetector', () => {
  it('正常なランドマークから笑顔を検出できる', () => {
    const mockLandmarks = createHappyFaceLandmarks();
    const result = detector.detectEmotion(mockLandmarks);
    expect(result.emotion).toBe('😊');
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});
```

### 2. E2Eテスト (End-to-End Tests)
**対象**: ユーザーフロー全体
**ツール**: Playwright
**重点**: 実際のブラウザでの動作確認

#### 主要テストシナリオ

##### ゲーム基本フロー
```typescript
test('ゲーム開始から終了までの基本フロー', async ({ page }) => {
  // 1. トップページアクセス
  await page.goto('/');
  await expect(page.locator('.title')).toContainText('エモパズ！');
  
  // 2. カメラ許可（モック）
  await page.context().grantPermissions(['camera']);
  
  // 3. ゲーム開始
  await page.click('#start-button');
  await expect(page.locator('#countdown')).toBeVisible();
  
  // 4. ゲームプレイ
  await page.waitForSelector('#game-canvas');
  await expect(page.locator('#game-score')).toContainText('スコア: 0');
  
  // 5. ゲーム終了確認
  // （実際のゲームオーバー条件をシミュレート）
});
```

##### 表情認識機能
```typescript
test('表情認識とブロック生成', async ({ page }) => {
  await page.goto('/test-typescript.html');
  
  // カメラモックの設定
  await page.addInitScript(() => {
    // MediaPipeのモック実装
    window.mockEmotionDetection = true;
  });
  
  // 表情変化のシミュレーション
  await page.evaluate(() => {
    window.simulateEmotion('😊'); // 笑顔をシミュレート
  });
  
  await expect(page.locator('#current-emotion-display')).toContainText('😊');
});
```

##### 設定機能
```typescript
test('感度設定の変更と保存', async ({ page }) => {
  await page.goto('/');
  
  // 設定モーダルを開く
  await page.click('#setting-button');
  await expect(page.locator('#setting-modal')).toBeVisible();
  
  // 感度スライダーを変更
  await page.locator('#sensitivity-happy').fill('5');
  await page.click('#setting-ok');
  
  // 設定が保存されることを確認
  await page.reload();
  await page.click('#setting-button');
  await expect(page.locator('#sensitivity-happy')).toHaveValue('5');
});
```

##### ランキング機能
```typescript
test('ランキング表示と削除機能', async ({ page }) => {
  // テストデータの準備
  await page.addInitScript(() => {
    localStorage.setItem('emopazz_ranking', JSON.stringify([
      { score: 1000, faceImage: 'data:image/png;base64,...', date: '2024-01-01' }
    ]));
  });
  
  await page.goto('/');
  
  // ゲーム終了後のランキング表示をシミュレート
  await page.evaluate(() => {
    window.gameOver(); // ゲームオーバー関数を直接呼び出し
  });
  
  await expect(page.locator('#ranking-container')).toBeVisible();
  await expect(page.locator('.ranking-item')).toHaveCount(1);
  
  // 削除機能のテスト
  await page.click('#ranking-delete-btn');
  await page.click('button:has-text("OK")'); // 確認ダイアログ
  await expect(page.locator('.ranking-item')).toHaveCount(0);
});
```

### 3. 視覚回帰テスト (Visual Regression Tests)
**対象**: UI要素の見た目
**ツール**: Playwright Screenshots

```typescript
test('UIコンポーネントの視覚確認', async ({ page }) => {
  await page.goto('/');
  
  // トップページのスクリーンショット
  await expect(page).toHaveScreenshot('top-page.png');
  
  // ゲーム画面のスクリーンショット
  await page.click('#start-button');
  await page.waitForSelector('#game-canvas');
  await expect(page.locator('#game-container')).toHaveScreenshot('game-screen.png');
  
  // 設定モーダルのスクリーンショット
  await page.click('#setting-button');
  await expect(page.locator('#setting-modal')).toHaveScreenshot('settings-modal.png');
});
```

## テスト環境設定

### Playwright設定
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // モバイルテスト
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Jest設定（単体テスト用）
```json
// jest.config.js
{
  "preset": "ts-jest",
  "testEnvironment": "jsdom",
  "setupFilesAfterEnv": ["<rootDir>/tests/setup.ts"],
  "moduleNameMapping": {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  "collectCoverageFrom": [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/main.ts"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 70,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

## モック戦略

### MediaPipeモック
```typescript
// tests/mocks/mediapipe.ts
export class MockFaceMesh {
  private callback: ((results: any) => void) | null = null;
  
  setOptions(options: any): void {
    // モック実装
  }
  
  onResults(callback: (results: any) => void): void {
    this.callback = callback;
  }
  
  async send(input: { image: HTMLVideoElement }): Promise<void> {
    // モックランドマークデータを生成
    const mockResults = {
      multiFaceLandmarks: [this.generateMockLandmarks()]
    };
    
    if (this.callback) {
      this.callback(mockResults);
    }
  }
  
  private generateMockLandmarks() {
    // 表情に応じたモックランドマークを生成
    return Array.from({ length: 468 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random()
    }));
  }
}
```

### カメラモック
```typescript
// tests/mocks/camera.ts
export function mockGetUserMedia(): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [
          {
            stop: jest.fn(),
            getSettings: () => ({ width: 640, height: 480 })
          }
        ]
      })
    }
  });
}
```

## テスト実行戦略

### 開発時
```bash
# 単体テスト（ウォッチモード）
npm run test:watch

# E2Eテスト（開発サーバー起動付き）
npm run test:e2e

# 特定のテストファイルのみ実行
npx playwright test emotion-detection.spec.ts
```

### CI/CD時
```bash
# 全テスト実行
npm run test:all

# カバレッジレポート生成
npm run test:coverage

# 視覚回帰テスト
npm run test:visual
```

## テストデータ管理

### 表情認識テストデータ
```typescript
// tests/fixtures/emotion-data.ts
export const emotionTestCases = {
  happy: {
    landmarks: [...], // 笑顔のランドマークデータ
    expectedEmotion: '😊',
    expectedConfidence: 0.8
  },
  sad: {
    landmarks: [...], // 悲しみのランドマークデータ
    expectedEmotion: '😢',
    expectedConfidence: 0.7
  }
  // 他の表情パターン...
};
```

### ゲーム状態テストデータ
```typescript
// tests/fixtures/game-data.ts
export const gameStateFixtures = {
  initialState: {
    score: 0,
    board: Array(14).fill(null).map(() => Array(8).fill(null)),
    currentEmotion: '😊'
  },
  nearGameOver: {
    score: 5000,
    board: generateNearFullBoard(),
    currentEmotion: '😲'
  }
};
```

## 品質ゲート

### 必須条件
- [ ] 全E2Eテストがパス
- [ ] 単体テストカバレッジ80%以上
- [ ] 視覚回帰テストで差分なし
- [ ] パフォーマンステストで基準値クリア

### 推奨条件
- [ ] クロスブラウザテストでの互換性確認
- [ ] モバイルデバイスでの動作確認
- [ ] アクセシビリティテストでの基準クリア

## 継続的改善

### テストメトリクス監視
- テスト実行時間の推移
- フレーキーテストの特定と修正
- カバレッジの継続的向上

### テストケース拡充
- ユーザーフィードバックに基づく新規テストケース追加
- エッジケースの継続的発見と対応
- パフォーマンス劣化の早期検出