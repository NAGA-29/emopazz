/**
 * 操作フィードバックシステム
 * クールダウン状態の視覚表示、移動ガイド表示、操作成功・失敗のフィードバックを提供
 */

import { OperationStatus, MovementDirection } from './SmartControlSystem.js';

export interface FeedbackConfig {
  showCooldownIndicator: boolean;
  showMovementGuide: boolean;
  showSuccessEffects: boolean;
  showFailureEffects: boolean;
  feedbackDuration: number; // ミリ秒
  animationEnabled: boolean;
}

export interface FeedbackElement {
  id: string;
  type: 'cooldown' | 'movement' | 'success' | 'failure';
  element: HTMLElement;
  startTime: number;
  duration: number;
}

export interface MovementGuideState {
  currentDirection: MovementDirection;
  targetDirection: MovementDirection;
  stability: number; // 0-1の範囲
  confidence: number; // 0-1の範囲
}

/**
 * 操作フィードバックシステムのメインクラス
 */
export class OperationFeedbackSystem {
  private config: FeedbackConfig = {
    showCooldownIndicator: true,
    showMovementGuide: true,
    showSuccessEffects: true,
    showFailureEffects: true,
    feedbackDuration: 2000,
    animationEnabled: true
  };

  private activeFeedbacks: Map<string, FeedbackElement> = new Map();
  private feedbackContainer: HTMLElement | null = null;
  private cooldownIndicator: HTMLElement | null = null;
  private movementGuide: HTMLElement | null = null;
  private animationFrameId: number | null = null;

  constructor(containerSelector: string = '#game-container', config?: Partial<FeedbackConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.initializeFeedbackContainer(containerSelector);
    this.createFeedbackElements();
    this.startAnimationLoop();
  }

  /**
   * 操作受付状態の視覚表示
   * @param status 操作ステータス
   * @param data 追加データ
   */
  public showOperationStatus(status: OperationStatus, data?: any): void {
    switch (status) {
      case 'rotation_cooldown':
        this.showCooldownIndicator('回転', data?.remainingTime || 0);
        break;
      case 'movement_detecting':
        this.showMovementGuide(data?.guideState);
        break;
      case 'operation_success':
        this.showSuccessEffect(data?.operationType || 'unknown');
        break;
      case 'operation_failed':
        this.showFailureEffect(data?.operationType || 'unknown', data?.reason);
        break;
    }
  }

  /**
   * クールダウン表示
   * @param operation 操作名
   * @param remainingTime 残り時間（ミリ秒）
   */
  public showCooldownIndicator(operation: string, remainingTime: number): void {
    if (!this.config.showCooldownIndicator || !this.cooldownIndicator) return;

    const indicator = this.cooldownIndicator;
    const progressBar = indicator.querySelector('.cooldown-progress') as HTMLElement;
    const label = indicator.querySelector('.cooldown-label') as HTMLElement;

    if (remainingTime > 0) {
      // クールダウン中
      indicator.style.display = 'block';
      indicator.classList.add('active');
      
      if (label) {
        label.textContent = `${operation}準備中...`;
      }
      
      if (progressBar) {
        const maxTime = 1200; // 最大クールダウン時間を想定
        const progress = Math.max(0, (maxTime - remainingTime) / maxTime * 100);
        progressBar.style.width = `${progress}%`;
        
        // 色を時間に応じて変更
        if (progress < 30) {
          progressBar.style.backgroundColor = '#ff4444';
        } else if (progress < 70) {
          progressBar.style.backgroundColor = '#ffaa44';
        } else {
          progressBar.style.backgroundColor = '#44ff44';
        }
      }
    } else {
      // クールダウン完了
      indicator.classList.remove('active');
      indicator.classList.add('ready');
      
      if (label) {
        label.textContent = `${operation}準備完了！`;
      }
      
      if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.style.backgroundColor = '#44ff44';
      }
      
      // 少し遅れて非表示にする
      setTimeout(() => {
        indicator.style.display = 'none';
        indicator.classList.remove('ready');
      }, 1000);
    }
  }

  /**
   * 移動ガイド表示
   * @param guideState 移動ガイドの状態
   */
  public showMovementGuide(guideState?: MovementGuideState): void {
    if (!this.config.showMovementGuide || !this.movementGuide || !guideState) return;

    const guide = this.movementGuide;
    const arrow = guide.querySelector('.movement-arrow') as HTMLElement;
    const stabilityBar = guide.querySelector('.stability-bar') as HTMLElement;
    const instruction = guide.querySelector('.movement-instruction') as HTMLElement;

    guide.style.display = 'block';

    // 方向矢印の表示
    if (arrow) {
      arrow.className = 'movement-arrow';
      
      if (guideState.targetDirection !== 'center') {
        arrow.classList.add(`direction-${guideState.targetDirection}`);
        arrow.style.opacity = Math.min(guideState.confidence, 1).toString();
      } else {
        arrow.style.opacity = '0.3';
      }
    }

    // 安定性バーの表示
    if (stabilityBar) {
      const stabilityProgress = stabilityBar.querySelector('.stability-progress') as HTMLElement;
      if (stabilityProgress) {
        const stabilityPercent = guideState.stability * 100;
        stabilityProgress.style.width = `${stabilityPercent}%`;
        
        // 安定性に応じて色を変更
        if (stabilityPercent < 30) {
          stabilityProgress.style.backgroundColor = '#ff4444';
        } else if (stabilityPercent < 70) {
          stabilityProgress.style.backgroundColor = '#ffaa44';
        } else {
          stabilityProgress.style.backgroundColor = '#44ff44';
        }
      }
    }

    // 指示テキストの表示
    if (instruction) {
      if (guideState.stability < 0.5) {
        instruction.textContent = '頭をもう少し傾けてください';
        instruction.className = 'movement-instruction warning';
      } else if (guideState.stability < 0.8) {
        instruction.textContent = 'もう少しで移動します...';
        instruction.className = 'movement-instruction progress';
      } else {
        instruction.textContent = '移動準備完了！';
        instruction.className = 'movement-instruction ready';
      }
    }

    // 安定性が低い場合は一定時間後に非表示
    if (guideState.stability < 0.3) {
      setTimeout(() => {
        if (guide.style.display !== 'none') {
          guide.style.display = 'none';
        }
      }, 3000);
    }
  }

  /**
   * 成功エフェクトの表示
   * @param operationType 操作タイプ
   */
  public showSuccessEffect(operationType: string): void {
    if (!this.config.showSuccessEffects) return;

    const effectId = `success-${Date.now()}`;
    const effect = this.createSuccessEffect(operationType);
    
    this.addFeedbackElement({
      id: effectId,
      type: 'success',
      element: effect,
      startTime: Date.now(),
      duration: this.config.feedbackDuration
    });

    // アニメーション効果
    if (this.config.animationEnabled) {
      effect.classList.add('success-animation');
    }
  }

  /**
   * 失敗エフェクトの表示
   * @param operationType 操作タイプ
   * @param reason 失敗理由
   */
  public showFailureEffect(operationType: string, reason?: string): void {
    if (!this.config.showFailureEffects) return;

    const effectId = `failure-${Date.now()}`;
    const effect = this.createFailureEffect(operationType, reason);
    
    this.addFeedbackElement({
      id: effectId,
      type: 'failure',
      element: effect,
      startTime: Date.now(),
      duration: this.config.feedbackDuration
    });

    // アニメーション効果
    if (this.config.animationEnabled) {
      effect.classList.add('failure-animation');
    }
  }

  /**
   * フィードバック設定を更新
   * @param newConfig 新しい設定
   */
  public updateConfig(newConfig: Partial<FeedbackConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * フィードバックシステムを無効化
   */
  public disable(): void {
    this.config.showCooldownIndicator = false;
    this.config.showMovementGuide = false;
    this.config.showSuccessEffects = false;
    this.config.showFailureEffects = false;
    
    this.clearAllFeedbacks();
  }

  /**
   * フィードバックシステムを有効化
   */
  public enable(): void {
    this.config.showCooldownIndicator = true;
    this.config.showMovementGuide = true;
    this.config.showSuccessEffects = true;
    this.config.showFailureEffects = true;
  }

  /**
   * フィードバックコンテナを初期化
   */
  private initializeFeedbackContainer(containerSelector: string): void {
    const container = document.querySelector(containerSelector);
    if (!container) {
      console.error(`フィードバックコンテナが見つかりません: ${containerSelector}`);
      return;
    }

    // フィードバック専用コンテナを作成
    this.feedbackContainer = document.createElement('div');
    this.feedbackContainer.id = 'operation-feedback-container';
    this.feedbackContainer.className = 'operation-feedback-container';
    
    container.appendChild(this.feedbackContainer);
  }

  /**
   * フィードバック要素を作成
   */
  private createFeedbackElements(): void {
    if (!this.feedbackContainer) return;

    // クールダウンインジケーター
    this.cooldownIndicator = this.createCooldownIndicator();
    this.feedbackContainer.appendChild(this.cooldownIndicator);

    // 移動ガイド
    this.movementGuide = this.createMovementGuide();
    this.feedbackContainer.appendChild(this.movementGuide);

    // CSSスタイルを追加
    this.addFeedbackStyles();
  }

  /**
   * クールダウンインジケーターを作成
   */
  private createCooldownIndicator(): HTMLElement {
    const indicator = document.createElement('div');
    indicator.className = 'cooldown-indicator';
    indicator.style.display = 'none';
    
    indicator.innerHTML = `
      <div class="cooldown-content">
        <div class="cooldown-label">準備中...</div>
        <div class="cooldown-bar">
          <div class="cooldown-progress"></div>
        </div>
      </div>
    `;
    
    return indicator;
  }

  /**
   * 移動ガイドを作成
   */
  private createMovementGuide(): HTMLElement {
    const guide = document.createElement('div');
    guide.className = 'movement-guide';
    guide.style.display = 'none';
    
    guide.innerHTML = `
      <div class="movement-content">
        <div class="movement-arrow">→</div>
        <div class="movement-instruction">頭を傾けてください</div>
        <div class="stability-bar">
          <div class="stability-progress"></div>
        </div>
      </div>
    `;
    
    return guide;
  }

  /**
   * 成功エフェクトを作成
   */
  private createSuccessEffect(operationType: string): HTMLElement {
    const effect = document.createElement('div');
    effect.className = 'feedback-effect success-effect';
    
    const icon = operationType === 'rotation' ? '🔄' : '➡️';
    const message = operationType === 'rotation' ? '回転成功！' : '移動成功！';
    
    effect.innerHTML = `
      <div class="effect-content">
        <div class="effect-icon">${icon}</div>
        <div class="effect-message">${message}</div>
      </div>
    `;
    
    return effect;
  }

  /**
   * 失敗エフェクトを作成
   */
  private createFailureEffect(operationType: string, reason?: string): HTMLElement {
    const effect = document.createElement('div');
    effect.className = 'feedback-effect failure-effect';
    
    const icon = '❌';
    const baseMessage = operationType === 'rotation' ? '回転失敗' : '移動失敗';
    const message = reason ? `${baseMessage}: ${reason}` : baseMessage;
    
    effect.innerHTML = `
      <div class="effect-content">
        <div class="effect-icon">${icon}</div>
        <div class="effect-message">${message}</div>
      </div>
    `;
    
    return effect;
  }

  /**
   * フィードバック要素を追加
   */
  private addFeedbackElement(feedback: FeedbackElement): void {
    if (!this.feedbackContainer) return;

    this.activeFeedbacks.set(feedback.id, feedback);
    this.feedbackContainer.appendChild(feedback.element);
  }

  /**
   * アニメーションループを開始
   */
  private startAnimationLoop(): void {
    const animate = () => {
      this.updateFeedbacks();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  /**
   * フィードバックを更新
   */
  private updateFeedbacks(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    this.activeFeedbacks.forEach((feedback, id) => {
      const elapsed = now - feedback.startTime;
      
      if (elapsed >= feedback.duration) {
        // 期限切れのフィードバックを削除
        toRemove.push(id);
      } else {
        // フェードアウト効果
        const remaining = feedback.duration - elapsed;
        const fadeThreshold = feedback.duration * 0.2; // 最後の20%でフェードアウト
        
        if (remaining < fadeThreshold) {
          const opacity = remaining / fadeThreshold;
          feedback.element.style.opacity = opacity.toString();
        }
      }
    });

    // 期限切れのフィードバックを削除
    toRemove.forEach(id => {
      const feedback = this.activeFeedbacks.get(id);
      if (feedback) {
        feedback.element.remove();
        this.activeFeedbacks.delete(id);
      }
    });
  }

  /**
   * 全てのフィードバックをクリア
   */
  private clearAllFeedbacks(): void {
    this.activeFeedbacks.forEach(feedback => {
      feedback.element.remove();
    });
    this.activeFeedbacks.clear();

    if (this.cooldownIndicator) {
      this.cooldownIndicator.style.display = 'none';
    }
    
    if (this.movementGuide) {
      this.movementGuide.style.display = 'none';
    }
  }

  /**
   * フィードバック用CSSスタイルを追加
   */
  private addFeedbackStyles(): void {
    const styleId = 'operation-feedback-styles';
    
    // 既存のスタイルがある場合は削除
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .operation-feedback-container {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 1000;
      }

      .cooldown-indicator {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 15px;
        border-radius: 8px;
        font-size: 14px;
        min-width: 150px;
        transition: all 0.3s ease;
      }

      .cooldown-indicator.active {
        background: rgba(255, 68, 68, 0.9);
      }

      .cooldown-indicator.ready {
        background: rgba(68, 255, 68, 0.9);
      }

      .cooldown-bar {
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
        margin-top: 5px;
        overflow: hidden;
      }

      .cooldown-progress {
        height: 100%;
        background: #44ff44;
        transition: width 0.1s ease;
        border-radius: 2px;
      }

      .movement-guide {
        position: absolute;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 15px 20px;
        border-radius: 12px;
        text-align: center;
        min-width: 200px;
        transition: all 0.3s ease;
      }

      .movement-arrow {
        font-size: 24px;
        margin-bottom: 8px;
        transition: all 0.3s ease;
      }

      .movement-arrow.direction-left {
        transform: rotate(180deg);
      }

      .movement-arrow.direction-right {
        transform: rotate(0deg);
      }

      .movement-instruction {
        font-size: 14px;
        margin-bottom: 8px;
      }

      .movement-instruction.warning {
        color: #ffaa44;
      }

      .movement-instruction.progress {
        color: #44aaff;
      }

      .movement-instruction.ready {
        color: #44ff44;
      }

      .stability-bar {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 3px;
        overflow: hidden;
      }

      .stability-progress {
        height: 100%;
        background: #44ff44;
        transition: width 0.2s ease;
        border-radius: 3px;
      }

      .feedback-effect {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 20px 30px;
        border-radius: 15px;
        text-align: center;
        font-size: 16px;
        font-weight: bold;
        z-index: 1001;
      }

      .success-effect {
        background: rgba(68, 255, 68, 0.9);
        color: #000;
      }

      .failure-effect {
        background: rgba(255, 68, 68, 0.9);
        color: #fff;
      }

      .effect-icon {
        font-size: 32px;
        margin-bottom: 10px;
      }

      .effect-message {
        font-size: 18px;
      }

      .success-animation {
        animation: successPulse 0.6s ease-out;
      }

      .failure-animation {
        animation: failureShake 0.6s ease-out;
      }

      @keyframes successPulse {
        0% {
          transform: translate(-50%, -50%) scale(0.8);
          opacity: 0;
        }
        50% {
          transform: translate(-50%, -50%) scale(1.1);
          opacity: 1;
        }
        100% {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
      }

      @keyframes failureShake {
        0%, 100% {
          transform: translate(-50%, -50%);
        }
        10%, 30%, 50%, 70%, 90% {
          transform: translate(-48%, -50%);
        }
        20%, 40%, 60%, 80% {
          transform: translate(-52%, -50%);
        }
      }

      /* レスポンシブ対応 */
      @media (max-width: 768px) {
        .cooldown-indicator {
          top: 10px;
          right: 10px;
          font-size: 12px;
          min-width: 120px;
          padding: 8px 12px;
        }

        .movement-guide {
          bottom: 80px;
          min-width: 180px;
          padding: 12px 16px;
        }

        .feedback-effect {
          padding: 15px 20px;
          font-size: 14px;
        }

        .effect-icon {
          font-size: 24px;
        }

        .effect-message {
          font-size: 16px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * リソースをクリーンアップ
   */
  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.clearAllFeedbacks();
    
    if (this.feedbackContainer) {
      this.feedbackContainer.remove();
    }
    
    // スタイルも削除
    const style = document.getElementById('operation-feedback-styles');
    if (style) {
      style.remove();
    }
  }
}