# Design Document

## Overview

エモパズ！の機能強化を行い、10歳以下の子どもたちがより楽しめるゲームに改善する。既存のJavaScriptベースのアーキテクチャを維持しながら、段階的にTypeScriptに移行し、新機能を追加する。

## Architecture

### 現在のアーキテクチャ分析

**既存の構成:**
- `index.html` - メインUI構造
- `game.js` - ゲームロジック（約1000行）
- `emotion-detector.js` - 表情認識エンジン
- `face-hand-detection.js` - MediaPipe統合とカメラ処理
- `styles.css` - スタイリング

**技術スタック:**
- MediaPipe (Face Mesh, Hands)
- Canvas API (ゲーム描画)
- Web Audio API (今回追加予定)
- LocalStorage (データ永続化)

### 新しいアーキテクチャ設計

```
src/
├── types/           # TypeScript型定義
├── core/           # コアシステム
│   ├── emotion/    # 表情認識システム
│   ├── effects/    # エフェクトシステム
│   ├── audio/      # 音響システム
│   └── storage/    # データ管理システム
├── game/           # ゲームロジック
├── ui/             # UI コンポーネント
├── themes/         # テーマシステム
└── utils/          # ユーティリティ
```

## Components and Interfaces

### 1. 表情認識精度向上システム

**EmotionDetectionEngine (強化版)**
```typescript
interface EmotionDetectionConfig {
  sensitivity: Record<EmotionType, number>;
  stabilityThreshold: number;
  calibrationMode: boolean;
}

interface EmotionResult {
  emotion: EmotionType;
  confidence: number;
  stability: number;
  timestamp: number;
}

class EnhancedEmotionDetector {
  // 機械学習ベースの補正機能
  calibrateForUser(samples: EmotionSample[]): void;
  
  // リアルタイム精度監視
  getAccuracyMetrics(): AccuracyMetrics;
  
  // 個人差対応
  adaptToUser(userId: string): void;
}
```

**精度向上手法:**
- ユーザー固有の表情キャリブレーション機能
- 複数フレームでの安定性チェック強化
- 環境光補正アルゴリズム
- 年齢層別の表情パターン最適化

### 2. 子ども向けエフェクトシステム

**VisualEffectsEngine**
```typescript
interface EffectConfig {
  type: 'particle' | 'animation' | 'shader';
  intensity: number;
  duration: number;
  colors: string[];
}

class EffectsManager {
  // パーティクルエフェクト
  createParticleEffect(type: ParticleType, position: Vector2): void;
  
  // 連鎖エフェクト
  playChainEffect(chainCount: number): void;
  
  // 表情連動エフェクト
  playEmotionEffect(emotion: EmotionType): void;
  
  // 背景アニメーション
  updateBackgroundAnimation(theme: ThemeType): void;
}
```

**エフェクト種類:**
- **ブロック消去**: キラキラ、星、ハート、虹色パーティクル
- **連鎖**: 虹のライン、花火、魔法陣
- **高得点**: 紙吹雪、金貨、宝石の雨
- **表情連動**: 笑顔→ハート、怒り→稲妻、驚き→星、悲しみ→雨粒

### 3. 表情写真自動保存システム

**PhotoCaptureSystem**
```typescript
interface GamePhoto {
  id: string;
  timestamp: number;
  emotion: EmotionType;
  imageData: string;
  gameContext: GameContext;
  expiresAt: number; // 15分後
}

class PhotoManager {
  // 自動キャプチャ
  startAutoCapture(sessionId: string): void;
  
  // 特徴的瞬間の検出
  detectSignificantMoment(emotion: EmotionType, context: GameContext): boolean;
  
  // 写真選択UI
  showPhotoSelectionModal(photos: GamePhoto[]): Promise<string[]>;
  
  // 永続保存
  saveSelectedPhotos(photoIds: string[]): void;
  
  // 自動削除
  cleanupExpiredPhotos(): void;
}
```

**キャプチャトリガー:**
- 表情の大きな変化（笑顔→驚き等）
- 高得点獲得時の表情
- 連鎖成功時の表情
- ゲームオーバー時の表情
- 新記録達成時の表情

### 4. 音響・エフェクト強化システム

**AudioEffectsEngine**
```typescript
interface SoundEffect {
  id: string;
  url: string;
  volume: number;
  loop: boolean;
  category: 'sfx' | 'bgm' | 'voice';
}

class AudioManager {
  // 効果音再生
  playSFX(soundId: string, volume?: number): void;
  
  // BGM管理
  playBGM(trackId: string, fadeIn?: boolean): void;
  
  // ランキング演出音
  playRankingFanfare(rank: number): void;
  
  // 表情連動音
  playEmotionSound(emotion: EmotionType): void;
}
```

**音響設計:**
- **ブロック消去**: ポップ、キラキラ音
- **連鎖**: 上昇音階、ベル音
- **ランキング**: ファンファーレ、拍手
- **表情**: 笑顔→チャイム、驚き→ホイッスル
- **BGM**: 楽しい子ども向けメロディー

### 5. テーマ・カスタマイズシステム

**ThemeManager**
```typescript
interface Theme {
  id: string;
  name: string;
  colors: ColorPalette;
  backgrounds: BackgroundSet;
  blockStyles: BlockStyleSet;
  effects: EffectSet;
  sounds: SoundSet;
}

class ThemeSystem {
  // テーマ切り替え
  applyTheme(themeId: string): void;
  
  // 季節テーマ自動切り替え
  autoSwitchSeasonalTheme(): void;
  
  // カスタムテーマ作成
  createCustomTheme(config: ThemeConfig): Theme;
}
```

**テーマ種類:**
- **デフォルト**: 現在のデザイン
- **ハロウィン**: オレンジ・黒、カボチャ、お化け
- **クリスマス**: 赤・緑・金、雪、ツリー
- **春**: ピンク・緑、桜、花びら
- **夏**: 青・黄、海、太陽
- **誕生日**: カラフル、ケーキ、風船

### 6. TypeScript移行システム

**段階的移行戦略:**

**Phase 1: 型定義とインターフェース**
```typescript
// types/game.ts
export interface GameState {
  score: number;
  board: BlockType[][];
  fallingPair: BlockPair | null;
  currentEmotion: EmotionType;
}

// types/emotion.ts
export type EmotionType = '😊' | '😡' | '😢' | '😲';
export interface EmotionParams {
  mouthOpenness: number;
  mouthCornerLift: number;
  eyebrowY: number;
  // ...
}
```

**Phase 2: コアモジュールの移行**
- emotion-detector.js → emotion/EmotionDetector.ts
- 新機能は最初からTypeScriptで実装

**Phase 3: ゲームロジックの移行**
- game.js → game/GameEngine.ts
- 段階的にクラス化・モジュール化

## Data Models

### 表情写真データモデル
```typescript
interface GameSession {
  id: string;
  startTime: number;
  endTime?: number;
  photos: GamePhoto[];
  finalScore: number;
  maxChain: number;
}

interface GamePhoto {
  id: string;
  sessionId: string;
  timestamp: number;
  emotion: EmotionType;
  confidence: number;
  imageData: string; // base64
  gameContext: {
    score: number;
    chain: number;
    event: 'chain' | 'highscore' | 'gameover' | 'emotion_change';
  };
  expiresAt: number;
  isPermanent: boolean;
}
```

### テーマデータモデル
```typescript
interface ThemeData {
  id: string;
  name: string;
  displayName: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    accent: string;
  };
  assets: {
    backgrounds: string[];
    blockTextures: Record<EmotionType, string>;
    particles: string[];
  };
  effects: {
    blockDestroy: EffectConfig;
    chain: EffectConfig;
    background: EffectConfig;
  };
  sounds: {
    bgm: string;
    sfx: Record<string, string>;
  };
}
```

## Error Handling

### 表情認識エラー処理
```typescript
class EmotionDetectionErrorHandler {
  // カメラアクセスエラー
  handleCameraError(error: MediaError): void;
  
  // MediaPipeエラー
  handleMediaPipeError(error: MediaPipeError): void;
  
  // 低精度警告
  handleLowAccuracyWarning(accuracy: number): void;
  
  // フォールバック処理
  enableFallbackMode(): void;
}
```

### ファイル保存エラー処理
```typescript
class StorageErrorHandler {
  // 容量不足エラー
  handleStorageQuotaError(): void;
  
  // 写真保存失敗
  handlePhotoSaveError(photo: GamePhoto): void;
  
  // 自動クリーンアップ
  performEmergencyCleanup(): void;
}
```

## Testing Strategy

### 表情認識テスト
```typescript
describe('EmotionDetection', () => {
  test('should detect smile with 90% accuracy', async () => {
    const detector = new EnhancedEmotionDetector();
    const testImages = loadTestImages('smile');
    const results = await detector.batchDetect(testImages);
    expect(results.accuracy).toBeGreaterThan(0.9);
  });
  
  test('should handle low light conditions', async () => {
    // 低照度環境でのテスト
  });
  
  test('should adapt to child facial features', async () => {
    // 子どもの顔特徴に対するテスト
  });
});
```

### エフェクトシステムテスト
```typescript
describe('EffectsSystem', () => {
  test('should render particle effects without performance drop', () => {
    const effectsManager = new EffectsManager();
    const startTime = performance.now();
    effectsManager.createParticleEffect('sparkle', {x: 100, y: 100});
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(16); // 60fps維持
  });
});
```

### 写真保存システムテスト
```typescript
describe('PhotoManager', () => {
  test('should auto-delete photos after 15 minutes', async () => {
    const photoManager = new PhotoManager();
    const photo = createTestPhoto();
    photoManager.saveTemporaryPhoto(photo);
    
    // 15分後をシミュレート
    jest.advanceTimersByTime(15 * 60 * 1000);
    await photoManager.cleanupExpiredPhotos();
    
    expect(photoManager.getTemporaryPhotos()).toHaveLength(0);
  });
});
```

## Performance Considerations

### 表情認識最適化
- MediaPipeの処理頻度調整（30fps → 15fps）
- 不要なランドマーク計算の削減
- WebWorkerでの並列処理検討

### エフェクト最適化
- パーティクル数の動的調整
- オフスクリーンキャンバス活用
- GPU加速の活用（WebGL）

### メモリ管理
- 写真データの適切なクリーンアップ
- 未使用テーマアセットの遅延読み込み
- 音声ファイルのプリロード最適化

## Game Mechanics Improvements

### 現在のゲームシステム分析
**既存の良い点:**
- 表情でブロック操作する独創的なシステム
- ぷよぷよ風の連鎖システム
- 手のジェスチャーでの回転操作

**改善が必要な点:**
- ゲームバランス（難易度調整）
- プレイヤーのモチベーション維持
- 長時間プレイでの飽きの防止
- 子ども向けの配慮不足

### 新しいゲーム要素の設計

#### 1. 難易度調整システム
```typescript
interface DifficultyConfig {
  level: number;
  dropSpeed: number;
  emotionSensitivity: number;
  specialBlockRate: number;
  chainBonusMultiplier: number;
}

class AdaptiveDifficulty {
  // プレイヤーのスキルレベルを自動判定
  analyzePlayerSkill(gameHistory: GameSession[]): SkillLevel;
  
  // 動的難易度調整
  adjustDifficulty(currentPerformance: PerformanceMetrics): void;
  
  // 子ども向けアシスト機能
  enableChildFriendlyMode(): void;
}
```

**難易度調整要素:**
- **表情認識の感度**: 初心者は緩く、上級者は厳密に
- **落下速度**: 段階的な速度調整
- **特殊ブロック出現率**: スキルに応じて調整
- **連鎖ボーナス**: 初心者により多くのボーナス

#### 2. 新しいゲームモード
```typescript
enum GameMode {
  CLASSIC = 'classic',           // 従来のエンドレスモード
  TIME_ATTACK = 'time_attack',   // 制限時間内でハイスコア
  EMOTION_CHALLENGE = 'emotion', // 特定の表情のみでプレイ
  STORY_MODE = 'story',          // ステージクリア型
  DAILY_CHALLENGE = 'daily'      // 日替わりチャレンジ
}

class GameModeManager {
  // タイムアタックモード（2分間）
  startTimeAttackMode(): void;
  
  // 表情チャレンジ（笑顔のみ、など）
  startEmotionChallengeMode(emotion: EmotionType): void;
  
  // ストーリーモード（段階的な目標設定）
  startStoryMode(chapter: number): void;
  
  // デイリーチャレンジ
  generateDailyChallenge(): Challenge;
}
```

#### 3. 子ども向けアシスト機能
```typescript
interface ChildAssistConfig {
  showNextBlockHint: boolean;     // 次のブロック配置ヒント
  slowMotionOnChain: boolean;     // 連鎖時のスローモーション
  emotionGuide: boolean;          // 表情ガイド表示
  encouragementMessages: boolean;  // 励ましメッセージ
}

class ChildAssistSystem {
  // 配置ヒント表示
  showPlacementHint(board: GameBoard, fallingPair: BlockPair): void;
  
  // 表情ガイド
  showEmotionGuide(targetEmotion: EmotionType): void;
  
  // 励ましシステム
  showEncouragement(context: GameContext): void;
  
  // 失敗時のサポート
  handleGameOverSupport(): void;
}
```

#### 4. 報酬・達成システム
```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: AchievementCondition;
  reward: Reward;
}

class AchievementSystem {
  // 基本的な達成項目
  achievements: Achievement[] = [
    { id: 'first_chain', name: '初めての連鎖', description: '3連鎖を達成しよう！' },
    { id: 'smile_master', name: '笑顔マスター', description: '笑顔ブロックで100個消そう！' },
    { id: 'emotion_rainbow', name: '感情の虹', description: '1ゲームで全ての表情を使おう！' },
    { id: 'speed_demon', name: 'スピードデーモン', description: '1分間で1000点獲得！' },
    { id: 'chain_master', name: '連鎖マスター', description: '7連鎖を達成しよう！' }
  ];
  
  // 進捗追跡
  trackProgress(gameEvent: GameEvent): void;
  
  // 達成通知
  showAchievementUnlocked(achievement: Achievement): void;
}
```

#### 5. ソーシャル要素
```typescript
interface FamilyScore {
  playerId: string;
  playerName: string;
  relationship: 'parent' | 'child' | 'sibling';
  bestScore: number;
  totalPlayTime: number;
  favoriteEmotion: EmotionType;
}

class FamilySystem {
  // 家族内ランキング
  getFamilyRanking(): FamilyScore[];
  
  // 親子協力モード
  startCooperativeMode(): void;
  
  // 成長記録
  trackChildProgress(childId: string): ProgressReport;
  
  // 家族チャレンジ
  createFamilyChallenge(): FamilyChallenge;
}
```

### 操作性改善システム

#### 現在の操作問題分析
**既存の問題:**
- **回転操作**: 驚き顔で回転しすぎる（連続回転）
- **左右移動**: 頭の傾きで移動しすぎる（過敏反応）
- **意図しない操作**: 表情の微細な変化での誤操作
- **操作遅延**: 表情認識から操作実行までのタイムラグ

#### スマート操作制御システム
```typescript
interface OperationControl {
  rotationCooldown: number;      // 回転操作のクールダウン時間
  movementSensitivity: number;   // 移動操作の感度
  stabilityRequired: number;     // 操作実行に必要な安定度
  intentionConfidence: number;   // 意図的操作の信頼度
}

class SmartControlSystem {
  // 回転操作の制御
  private rotationCooldown: number = 800; // ミリ秒
  private lastRotationTime: number = 0;
  
  // 移動操作の制御
  private movementBuffer: MovementState[] = [];
  private movementStabilityThreshold: number = 3; // 連続3フレーム同じ方向
  
  // 驚き顔回転の改善
  handleSurpriseRotation(emotion: EmotionType, confidence: number): boolean {
    const now = Date.now();
    
    // クールダウン中は回転しない
    if (now - this.lastRotationTime < this.rotationCooldown) {
      return false;
    }
    
    // 高い信頼度でのみ回転実行
    if (emotion === '😲' && confidence > 0.8) {
      this.lastRotationTime = now;
      return true;
    }
    
    return false;
  }
  
  // 頭の傾き移動の改善
  handleHeadTiltMovement(tiltAngle: number): MovementDirection | null {
    const currentDirection = this.calculateDirection(tiltAngle);
    
    // 移動バッファに追加
    this.movementBuffer.push({
      direction: currentDirection,
      timestamp: Date.now(),
      angle: tiltAngle
    });
    
    // 古いデータを削除（500ms以内のデータのみ保持）
    this.cleanupMovementBuffer();
    
    // 安定した方向のみ採用
    if (this.isMovementStable(currentDirection)) {
      return currentDirection;
    }
    
    return null;
  }
  
  // 移動の安定性チェック
  private isMovementStable(direction: MovementDirection): boolean {
    const recentMovements = this.movementBuffer.slice(-this.movementStabilityThreshold);
    
    // 最近の動きが全て同じ方向かチェック
    return recentMovements.length >= this.movementStabilityThreshold &&
           recentMovements.every(m => m.direction === direction);
  }
  
  // 感度調整機能
  adjustSensitivity(playerAge: number, skillLevel: SkillLevel): void {
    if (playerAge <= 10) {
      // 子ども向け調整
      this.rotationCooldown = 1200; // より長いクールダウン
      this.movementStabilityThreshold = 4; // より安定性を要求
    } else if (skillLevel === 'beginner') {
      // 初心者向け調整
      this.rotationCooldown = 1000;
      this.movementStabilityThreshold = 3;
    } else {
      // 上級者向け調整
      this.rotationCooldown = 600;
      this.movementStabilityThreshold = 2;
    }
  }
}
```

#### 操作フィードバックシステム
```typescript
class OperationFeedbackSystem {
  // 操作受付状態の視覚表示
  showOperationStatus(status: OperationStatus): void {
    switch (status) {
      case 'rotation_cooldown':
        this.showCooldownIndicator('回転');
        break;
      case 'movement_detecting':
        this.showMovementGuide();
        break;
      case 'operation_success':
        this.showSuccessEffect();
        break;
    }
  }
  
  // クールダウン表示
  private showCooldownIndicator(operation: string): void {
    // 回転ボタンにクールダウンバーを表示
    // 「回転準備中...」のような表示
  }
  
  // 移動ガイド表示
  private showMovementGuide(): void {
    // 「頭をもう少し右に傾けて」のようなガイド
  }
}
```

#### 個人適応システム
```typescript
class PersonalAdaptationSystem {
  // プレイヤーの操作パターン学習
  learnPlayerPattern(playerId: string, operations: OperationHistory[]): void;
  
  // 個人に最適化された感度設定
  getOptimalSensitivity(playerId: string): OperationControl;
  
  // 操作の成功率追跡
  trackOperationSuccess(operation: OperationType, success: boolean): void;
  
  // 自動調整提案
  suggestSensitivityAdjustment(): SensitivitySuggestion;
}
```

### ゲームバランス改善

#### 操作性重視の調整
- **操作成功率の向上**: 意図した操作の成功率を80%以上に
- **誤操作の削減**: 意図しない操作を50%以下に削減
- **操作学習曲線**: 段階的に操作精度を向上させる仕組み
- **フラストレーション軽減**: 失敗時のサポート機能

#### 連鎖システムの調整
- **連鎖ボーナス**: より大きな報酬で達成感向上
- **連鎖予告**: 次の連鎖可能性をビジュアル表示
- **連鎖アシスト**: 子どもモードでは連鎖しやすい配置をサポート

#### スコアシステムの改善
- **表情ボーナス**: 難しい表情ほど高得点
- **コンボボーナス**: 同じ表情を連続で使用
- **タイムボーナス**: 素早い判断に報酬
- **チャレンジボーナス**: 日替わりチャレンジクリア
- **操作精度ボーナス**: 正確な操作に追加得点

#### プレイ体験の向上
- **操作練習モード**: 操作に慣れるための専用モード
- **リアルタイム調整**: プレイ中の感度調整機能
- **操作ガイド**: 初回プレイ時の詳細な操作説明
- **休憩提案**: 長時間プレイ時の適切な休憩提案
- **成長実感**: プレイヤーの上達を可視化
- **カスタマイズ**: 個人の好みに合わせた調整

## Implementation Phases

### Phase 1: 基盤強化 (Week 1-2)
- TypeScript環境構築
- 表情認識精度向上
- 基本エフェクトシステム
- **難易度調整システム実装**

### Phase 2: ゲーム改善 (Week 3)
- **新ゲームモード実装**
- **子ども向けアシスト機能**
- 自動写真キャプチャ
- 写真選択UI

### Phase 3: 音響・達成システム (Week 4)
- 音響システム実装
- **達成・報酬システム**
- ランキング演出強化
- 表情連動エフェクト

### Phase 4: ソーシャル・テーマ (Week 5)
- **家族・ソーシャル機能**
- テーマ切り替え機能
- 季節テーマ実装
- カスタマイズUI

### Phase 5: 統合・最適化 (Week 6)
- 全機能統合テスト
- **ゲームバランス調整**
- パフォーマンス最適化
- 子どもユーザビリティテスト