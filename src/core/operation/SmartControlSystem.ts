/**
 * スマート操作制御システム
 * 回転操作のクールダウン、移動操作の安定性チェック、個人適応機能を提供
 */

import { EmotionType, MovementDirection, SkillLevel } from '../../types/game.js';

// Re-export types for other modules
export type { MovementDirection, SkillLevel } from '../../types/game.js';

export interface OperationControl {
  rotationCooldown: number;      // 回転操作のクールダウン時間（ミリ秒）
  movementSensitivity: number;   // 移動操作の感度
  stabilityRequired: number;     // 操作実行に必要な安定度
  intentionConfidence: number;   // 意図的操作の信頼度
}

export interface MovementState {
  direction: MovementDirection;
  timestamp: number;
  angle: number;
  confidence: number;
}

export interface OperationHistory {
  type: 'rotation' | 'movement';
  success: boolean;
  timestamp: number;
  confidence: number;
}

export interface SensitivitySuggestion {
  rotationCooldown: number;
  movementStability: number;
  reason: string;
}

export type OperationStatus = 
  | 'rotation_cooldown' 
  | 'movement_detecting' 
  | 'operation_success' 
  | 'operation_failed';

/**
 * スマート操作制御システムのメインクラス
 */
export class SmartControlSystem {
  private rotationCooldown: number = 800; // ミリ秒
  private lastRotationTime: number = 0;
  
  // 移動操作の制御
  private movementBuffer: MovementState[] = [];
  private movementStabilityThreshold: number = 3; // 連続3フレーム同じ方向
  private movementBufferTimeout: number = 500; // ミリ秒
  
  // 個人適応システム
  private operationHistory: OperationHistory[] = [];
  private maxHistorySize: number = 100;
  
  // 操作成功率の追跡
  private rotationSuccessRate: number = 0.8;
  private movementSuccessRate: number = 0.8;
  
  // 設定可能なパラメータ
  private config: OperationControl = {
    rotationCooldown: 800,
    movementSensitivity: 1.0,
    stabilityRequired: 3,
    intentionConfidence: 0.8
  };

  constructor(initialConfig?: Partial<OperationControl>) {
    if (initialConfig) {
      this.updateConfig(initialConfig);
    }
    this.loadPersonalSettings();
  }

  /**
   * 驚き顔回転の改善された制御
   * @param emotion 検出された表情
   * @param confidence 表情の信頼度
   * @returns 回転を実行するかどうか
   */
  public handleSurpriseRotation(emotion: EmotionType, confidence: number): boolean {
    const now = Date.now();
    
    // クールダウン中は回転しない
    if (now - this.lastRotationTime < this.rotationCooldown) {
      return false;
    }
    
    // 高い信頼度でのみ回転実行
    if (emotion === '😲' && confidence > this.config.intentionConfidence) {
      this.lastRotationTime = now;
      this.recordOperation('rotation', true, confidence);
      return true;
    }
    
    // 回転が実行されなかった場合も記録
    if (emotion === '😲') {
      this.recordOperation('rotation', false, confidence);
    }
    
    return false;
  }

  /**
   * 頭の傾き移動の改善された制御
   * @param tiltAngle 頭の傾き角度
   * @returns 移動方向（null の場合は移動しない）
   */
  public handleHeadTiltMovement(tiltAngle: number): MovementDirection | null {
    const currentDirection = this.calculateDirection(tiltAngle);
    const confidence = this.calculateMovementConfidence(tiltAngle);
    
    // 移動バッファに追加
    this.movementBuffer.push({
      direction: currentDirection,
      timestamp: Date.now(),
      angle: tiltAngle,
      confidence: confidence
    });
    
    // 古いデータを削除
    this.cleanupMovementBuffer();
    
    // 安定した方向のみ採用
    if (this.isMovementStable(currentDirection)) {
      this.recordOperation('movement', true, confidence);
      return currentDirection;
    }
    
    return null;
  }

  /**
   * 傾き角度から移動方向を計算
   */
  private calculateDirection(tiltAngle: number): MovementDirection {
    const threshold = 0.08 * this.config.movementSensitivity;
    
    if (tiltAngle > threshold) {
      return 'right';
    } else if (tiltAngle < -threshold) {
      return 'left';
    } else {
      return 'center';
    }
  }

  /**
   * 移動の信頼度を計算
   */
  private calculateMovementConfidence(tiltAngle: number): number {
    const absAngle = Math.abs(tiltAngle);
    const maxAngle = 0.3; // 最大想定角度
    return Math.min(absAngle / maxAngle, 1.0);
  }

  /**
   * 移動の安定性をチェック
   */
  private isMovementStable(direction: MovementDirection): boolean {
    const recentMovements = this.movementBuffer.slice(-this.config.stabilityRequired);
    
    // 最近の動きが全て同じ方向かチェック
    return recentMovements.length >= this.config.stabilityRequired &&
           recentMovements.every(m => m.direction === direction) &&
           recentMovements.every(m => m.confidence > 0.5);
  }

  /**
   * 古い移動データをクリーンアップ
   */
  private cleanupMovementBuffer(): void {
    const now = Date.now();
    this.movementBuffer = this.movementBuffer.filter(
      m => now - m.timestamp < this.movementBufferTimeout
    );
  }

  /**
   * 操作履歴を記録
   */
  private recordOperation(type: 'rotation' | 'movement', success: boolean, confidence: number): void {
    this.operationHistory.push({
      type,
      success,
      timestamp: Date.now(),
      confidence
    });
    
    // 履歴サイズを制限
    if (this.operationHistory.length > this.maxHistorySize) {
      this.operationHistory = this.operationHistory.slice(-this.maxHistorySize);
    }
    
    // 成功率を更新
    this.updateSuccessRates();
  }

  /**
   * 操作成功率を更新
   */
  private updateSuccessRates(): void {
    const recentHistory = this.operationHistory.slice(-20); // 最近20回の操作
    
    const rotationOps = recentHistory.filter(op => op.type === 'rotation');
    const movementOps = recentHistory.filter(op => op.type === 'movement');
    
    if (rotationOps.length > 0) {
      this.rotationSuccessRate = rotationOps.filter(op => op.success).length / rotationOps.length;
    }
    
    if (movementOps.length > 0) {
      this.movementSuccessRate = movementOps.filter(op => op.success).length / movementOps.length;
    }
  }

  /**
   * プレイヤーの年齢とスキルレベルに基づいて感度を調整
   */
  public adjustSensitivity(playerAge: number, skillLevel: SkillLevel): void {
    if (playerAge <= 10) {
      // 子ども向け調整
      this.rotationCooldown = 1200; // より長いクールダウン
      this.movementStabilityThreshold = 4; // より安定性を要求
      this.config.intentionConfidence = 0.7; // 信頼度を少し下げる
    } else if (skillLevel === 'beginner') {
      // 初心者向け調整
      this.rotationCooldown = 1000;
      this.movementStabilityThreshold = 3;
      this.config.intentionConfidence = 0.75;
    } else if (skillLevel === 'advanced') {
      // 上級者向け調整
      this.rotationCooldown = 600;
      this.movementStabilityThreshold = 2;
      this.config.intentionConfidence = 0.85;
    } else {
      // 中級者向け調整（デフォルト）
      this.rotationCooldown = 800;
      this.movementStabilityThreshold = 3;
      this.config.intentionConfidence = 0.8;
    }
    
    // 設定を更新
    this.config.rotationCooldown = this.rotationCooldown;
    this.config.stabilityRequired = this.movementStabilityThreshold;
  }

  /**
   * 設定を更新
   */
  public updateConfig(newConfig: Partial<OperationControl>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 内部変数も更新
    this.rotationCooldown = this.config.rotationCooldown;
    this.movementStabilityThreshold = this.config.stabilityRequired;
  }

  /**
   * 現在の操作成功率を取得
   */
  public getOperationSuccessRate(): { rotation: number; movement: number } {
    return {
      rotation: this.rotationSuccessRate,
      movement: this.movementSuccessRate
    };
  }

  /**
   * 自動調整提案を生成
   */
  public suggestSensitivityAdjustment(): SensitivitySuggestion {
    let suggestion: SensitivitySuggestion = {
      rotationCooldown: this.rotationCooldown,
      movementStability: this.movementStabilityThreshold,
      reason: '現在の設定が適切です'
    };
    
    // 回転操作の成功率が低い場合
    if (this.rotationSuccessRate < 0.6) {
      suggestion.rotationCooldown = Math.min(this.rotationCooldown + 200, 1500);
      suggestion.reason = '回転操作の成功率が低いため、クールダウン時間を延長することをお勧めします';
    }
    
    // 移動操作の成功率が低い場合
    if (this.movementSuccessRate < 0.6) {
      suggestion.movementStability = Math.min(this.movementStabilityThreshold + 1, 5);
      suggestion.reason = '移動操作の成功率が低いため、安定性要件を厳しくすることをお勧めします';
    }
    
    // 両方の成功率が高い場合は感度を上げる提案
    if (this.rotationSuccessRate > 0.9 && this.movementSuccessRate > 0.9) {
      suggestion.rotationCooldown = Math.max(this.rotationCooldown - 100, 400);
      suggestion.movementStability = Math.max(this.movementStabilityThreshold - 1, 2);
      suggestion.reason = '操作が安定しているため、より敏感な設定にすることで快適性が向上します';
    }
    
    return suggestion;
  }

  /**
   * 個人設定をローカルストレージから読み込み
   */
  private loadPersonalSettings(): void {
    try {
      const saved = localStorage.getItem('emopazz_operation_settings');
      if (saved) {
        const settings = JSON.parse(saved) as Partial<OperationControl>;
        this.updateConfig(settings);
      }
    } catch (error) {
      console.error('個人設定の読み込みに失敗しました:', error);
    }
  }

  /**
   * 個人設定をローカルストレージに保存
   */
  public savePersonalSettings(): void {
    try {
      localStorage.setItem('emopazz_operation_settings', JSON.stringify(this.config));
    } catch (error) {
      
    }
  }

  /**
   * 現在の設定を取得
   */
  public getCurrentConfig(): OperationControl {
    return { ...this.config };
  }

  /**
   * 操作履歴を取得（デバッグ用）
   */
  public getOperationHistory(): OperationHistory[] {
    return [...this.operationHistory];
  }

  /**
   * 現在のクールダウン状態を取得
   */
  public getRotationCooldownStatus(): { inCooldown: boolean; remainingTime: number } {
    const now = Date.now();
    const timeSinceLastRotation = now - this.lastRotationTime;
    const inCooldown = timeSinceLastRotation < this.rotationCooldown;
    const remainingTime = inCooldown ? this.rotationCooldown - timeSinceLastRotation : 0;
    
    return { inCooldown, remainingTime };
  }

  /**
   * 移動バッファの現在の状態を取得
   */
  public getMovementBufferStatus(): { 
    bufferSize: number; 
    dominantDirection: MovementDirection; 
    stability: number 
  } {
    const recentMovements = this.movementBuffer.slice(-this.config.stabilityRequired);
    
    // 最も多い方向を計算
    const directionCounts = recentMovements.reduce((acc, movement) => {
      acc[movement.direction] = (acc[movement.direction] || 0) + 1;
      return acc;
    }, {} as Record<MovementDirection, number>);
    
    const dominantDirection = Object.entries(directionCounts)
      .reduce((a, b) => directionCounts[a[0] as MovementDirection] > directionCounts[b[0] as MovementDirection] ? a : b, ['center', 0])[0] as MovementDirection;
    
    // 安定性を計算（0-1の範囲）
    const maxCount = Math.max(...Object.values(directionCounts));
    const stability = recentMovements.length > 0 ? maxCount / recentMovements.length : 0;
    
    return {
      bufferSize: this.movementBuffer.length,
      dominantDirection,
      stability
    };
  }
}