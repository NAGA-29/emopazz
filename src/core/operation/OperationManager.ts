/**
 * 操作管理システム
 * SmartControlSystemとOperationFeedbackSystemを統合し、
 * 既存のゲームシステムとの橋渡しを行う
 */

import { SmartControlSystem, OperationControl, MovementDirection } from './SmartControlSystem.js';
import { OperationFeedbackSystem, MovementGuideState } from './OperationFeedbackSystem.js';
import { PersonalAdaptationSystem } from './PersonalAdaptationSystem.js';
import { EmotionType, SkillLevel } from '../../types/game.js';

export interface OperationManagerConfig {
  enableSmartControl: boolean;
  enableFeedback: boolean;
  enablePersonalAdaptation: boolean;
  playerId?: string;
  playerAge?: number;
  skillLevel?: SkillLevel;
}

/**
 * 操作管理システムのメインクラス
 * 既存のゲームシステムと新しい操作制御システムを統合
 */
export class OperationManager {
  private smartControl: SmartControlSystem;
  private feedbackSystem: OperationFeedbackSystem;
  private adaptationSystem: PersonalAdaptationSystem;
  private config: OperationManagerConfig;
  
  // 既存システムとの互換性のための変数
  private lastRotationCallback: (() => void) | null = null;
  private lastMoveCallback: ((direction: 'left' | 'right') => void) | null = null;

  constructor(config: OperationManagerConfig) {
    this.config = {
      skillLevel: 'beginner',
      ...config,
      enableSmartControl: config.enableSmartControl ?? true,
      enableFeedback: config.enableFeedback ?? true,
      enablePersonalAdaptation: config.enablePersonalAdaptation ?? true
    };

    // システムを初期化
    this.smartControl = new SmartControlSystem();
    this.feedbackSystem = new OperationFeedbackSystem();
    this.adaptationSystem = new PersonalAdaptationSystem();

    // プレイヤー設定を適用
    if (this.config.playerId) {
      this.adaptationSystem.setCurrentPlayer(this.config.playerId);
      
      if (this.config.playerAge || this.config.skillLevel) {
        this.adaptationSystem.setPlayerProfile(
          this.config.playerId,
          this.config.playerAge,
          this.config.skillLevel
        );
      }
      
      // 個人適応設定を適用
      if (this.config.enablePersonalAdaptation) {
        const optimalSettings = this.adaptationSystem.getOptimalSensitivity(this.config.playerId);
        this.smartControl.updateConfig(optimalSettings);
      }
    }

    // 年齢とスキルレベルに基づく調整
    if (this.config.playerAge && this.config.skillLevel) {
      this.smartControl.adjustSensitivity(this.config.playerAge, this.config.skillLevel);
    }
  }

  /**
   * 表情による回転操作を処理
   * 既存のwindow.rotate関数の代替
   * @param emotion 検出された表情
   * @param confidence 表情の信頼度
   * @returns 回転が実行されたかどうか
   */
  public handleEmotionRotation(emotion: EmotionType, confidence: number): boolean {
    if (!this.config.enableSmartControl) {
      // スマート制御が無効の場合は従来通り実行
      if (emotion === '😲' && this.lastRotationCallback) {
        this.lastRotationCallback();
        return true;
      }
      return false;
    }

    // クールダウン状態をチェック
    const cooldownStatus = this.smartControl.getRotationCooldownStatus();
    
    if (cooldownStatus.inCooldown) {
      // クールダウン中の場合はフィードバックを表示
      if (this.config.enableFeedback) {
        this.feedbackSystem.showOperationStatus('rotation_cooldown', {
          remainingTime: cooldownStatus.remainingTime
        });
      }
      return false;
    }

    // スマート制御による回転判定
    const shouldRotate = this.smartControl.handleSurpriseRotation(emotion, confidence);
    
    if (shouldRotate) {
      // 回転実行
      if (this.lastRotationCallback) {
        this.lastRotationCallback();
      }
      
      // 成功フィードバック
      if (this.config.enableFeedback) {
        this.feedbackSystem.showOperationStatus('operation_success', {
          operationType: 'rotation'
        });
      }
      
      // 個人適応システムに記録
      if (this.config.enablePersonalAdaptation) {
        this.adaptationSystem.trackOperationSuccess('rotation', true);
      }
      
      return true;
    } else {
      // 回転失敗（信頼度不足など）
      if (emotion === '😲' && this.config.enableFeedback) {
        this.feedbackSystem.showOperationStatus('operation_failed', {
          operationType: 'rotation',
          reason: confidence < 0.8 ? '表情が不明確です' : 'クールダウン中です'
        });
      }
      
      // 個人適応システムに記録
      if (this.config.enablePersonalAdaptation && emotion === '😲') {
        this.adaptationSystem.trackOperationSuccess('rotation', false);
      }
      
      return false;
    }
  }

  /**
   * 頭の傾きによる移動操作を処理
   * 既存のfaceLean変数の代替
   * @param tiltAngle 頭の傾き角度
   * @returns 移動方向（null の場合は移動しない）
   */
  public handleHeadTiltMovement(tiltAngle: number): MovementDirection | null {
    if (!this.config.enableSmartControl) {
      // スマート制御が無効の場合は従来の判定
      const threshold = 0.08;
      if (tiltAngle > threshold) return 'right';
      if (tiltAngle < -threshold) return 'left';
      return 'center';
    }

    // 移動バッファの状態を取得
    const bufferStatus = this.smartControl.getMovementBufferStatus();
    
    // 移動ガイドの状態を作成
    const guideState: MovementGuideState = {
      currentDirection: bufferStatus.dominantDirection,
      targetDirection: this.calculateTargetDirection(tiltAngle),
      stability: bufferStatus.stability,
      confidence: Math.min(Math.abs(tiltAngle) / 0.15, 1.0)
    };

    // フィードバック表示
    if (this.config.enableFeedback) {
      this.feedbackSystem.showOperationStatus('movement_detecting', { guideState });
    }

    // スマート制御による移動判定
    const moveDirection = this.smartControl.handleHeadTiltMovement(tiltAngle);
    
    if (moveDirection && moveDirection !== 'center') {
      // 移動実行
      const gameDirection = moveDirection === 'left' ? 'right' : 'left'; // ゲーム内では左右が反転
      if (this.lastMoveCallback) {
        this.lastMoveCallback(gameDirection);
      }
      
      // 成功フィードバック
      if (this.config.enableFeedback) {
        this.feedbackSystem.showOperationStatus('operation_success', {
          operationType: 'movement'
        });
      }
      
      // 個人適応システムに記録
      if (this.config.enablePersonalAdaptation) {
        this.adaptationSystem.trackOperationSuccess('movement', true);
      }
      
      return moveDirection;
    }
    
    return null;
  }

  /**
   * 既存のゲームシステムとの互換性のためのコールバック設定
   * @param rotationCallback 回転実行時のコールバック
   * @param moveCallback 移動実行時のコールバック
   */
  public setGameCallbacks(
    rotationCallback: () => void,
    moveCallback: (direction: 'left' | 'right') => void
  ): void {
    this.lastRotationCallback = rotationCallback;
    this.lastMoveCallback = moveCallback;
  }

  /**
   * 設定を更新
   * @param newConfig 新しい設定
   */
  public updateConfig(newConfig: Partial<OperationManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // プレイヤー設定の更新
    if (newConfig.playerId && newConfig.playerId !== this.config.playerId) {
      this.adaptationSystem.setCurrentPlayer(newConfig.playerId);
    }
    
    // 個人適応設定の再適用
    if (this.config.enablePersonalAdaptation && this.config.playerId) {
      const optimalSettings = this.adaptationSystem.getOptimalSensitivity(this.config.playerId);
      this.smartControl.updateConfig(optimalSettings);
    }
  }

  /**
   * 操作制御設定を手動で更新
   * @param settings 新しい操作制御設定
   */
  public updateOperationSettings(settings: Partial<OperationControl>): void {
    this.smartControl.updateConfig(settings);
    this.smartControl.savePersonalSettings();
  }

  /**
   * フィードバック設定を更新
   * @param enabled フィードバックを有効にするかどうか
   */
  public setFeedbackEnabled(enabled: boolean): void {
    this.config.enableFeedback = enabled;
    
    if (enabled) {
      this.feedbackSystem.enable();
    } else {
      this.feedbackSystem.disable();
    }
  }

  /**
   * 個人適応システムを有効/無効にする
   * @param enabled 個人適応を有効にするかどうか
   */
  public setPersonalAdaptationEnabled(enabled: boolean): void {
    this.config.enablePersonalAdaptation = enabled;
  }

  /**
   * 現在の操作統計を取得
   */
  public getOperationStatistics(): {
    successRates: { rotation: number; movement: number };
    currentSettings: OperationControl;
    suggestions: any;
  } {
    const successRates = this.smartControl.getOperationSuccessRate();
    const currentSettings = this.smartControl.getCurrentConfig();
    const suggestions = this.config.playerId ? 
      this.adaptationSystem.suggestSensitivityAdjustment(this.config.playerId) : null;
    
    return {
      successRates,
      currentSettings,
      suggestions
    };
  }

  /**
   * ゲーム終了時の処理
   * @param gameScore ゲームスコア（将来的な分析のための予約パラメータ）
   * @param playDuration プレイ時間（将来的な分析のための予約パラメータ）
   */
  public onGameEnd(gameScore: number, playDuration: number): void {
    if (this.config.enablePersonalAdaptation && this.config.playerId) {
      // 操作履歴を取得して学習データに追加
      const operationHistory = this.smartControl.getOperationHistory();
      this.adaptationSystem.learnPlayerPattern(this.config.playerId, operationHistory);

      // 将来的にはスコアやプレイ時間も分析に使用予定
      // TODO: スコアとプレイ時間を基にした適応アルゴリズムの実装
      void gameScore; // 現在未使用
      void playDuration; // 現在未使用
    }
  }

  /**
   * 目標方向を計算
   */
  private calculateTargetDirection(tiltAngle: number): MovementDirection {
    const threshold = 0.08;
    if (tiltAngle > threshold) return 'right';
    if (tiltAngle < -threshold) return 'left';
    return 'center';
  }

  /**
   * システムを破棄
   */
  public destroy(): void {
    this.feedbackSystem.destroy();
  }
}

// グローバルインスタンス（既存システムとの互換性のため）
let globalOperationManager: OperationManager | null = null;

/**
 * グローバル操作管理システムを初期化
 * @param config 設定
 */
export function initializeOperationManager(config: OperationManagerConfig): OperationManager {
  if (globalOperationManager) {
    globalOperationManager.destroy();
  }
  
  globalOperationManager = new OperationManager(config);
  return globalOperationManager;
}

/**
 * グローバル操作管理システムを取得
 */
export function getOperationManager(): OperationManager | null {
  return globalOperationManager;
}

/**
 * 既存システムとの互換性のためのグローバル関数
 */
declare global {
  interface Window {
    OperationManager: {
      handleEmotionRotation: (emotion: EmotionType, confidence: number) => boolean;
      handleHeadTiltMovement: (tiltAngle: number) => MovementDirection | null;
      setGameCallbacks: (rotationCallback: () => void, moveCallback: (direction: 'left' | 'right') => void) => void;
      getStatistics: () => any;
    };
  }
}

// グローバル関数をウィンドウオブジェクトに追加
if (typeof window !== 'undefined') {
  window.OperationManager = {
    handleEmotionRotation: (emotion: EmotionType, confidence: number) => {
      return globalOperationManager?.handleEmotionRotation(emotion, confidence) || false;
    },
    handleHeadTiltMovement: (tiltAngle: number) => {
      return globalOperationManager?.handleHeadTiltMovement(tiltAngle) || null;
    },
    setGameCallbacks: (rotationCallback: () => void, moveCallback: (direction: 'left' | 'right') => void) => {
      globalOperationManager?.setGameCallbacks(rotationCallback, moveCallback);
    },
    getStatistics: () => {
      return globalOperationManager?.getOperationStatistics() || null;
    }
  };
}