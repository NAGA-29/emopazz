/**
 * 操作システム互換性ブリッジ
 * 新しいTypeScript操作システムと既存のJavaScriptコードを接続
 */

import { initializeOperationManager, getOperationManager } from '../core/operation/OperationManager.js';
import { EmotionType } from '../types/game.js';

/**
 * 操作システムを初期化し、既存のゲームシステムと統合
 */
export function initializeOperationBridge(): void {
  console.log('🎮 操作システムブリッジを初期化中...');

  // デフォルト設定で操作管理システムを初期化
  const operationManager = initializeOperationManager({
    enableSmartControl: true,
    enableFeedback: true,
    enablePersonalAdaptation: true,
    playerId: 'default_player',
    skillLevel: 'beginner'
  });

  // 既存のゲーム関数との接続を設定
  setupGameIntegration(operationManager);
  
  // 既存のグローバル関数を拡張
  enhanceExistingFunctions();
  
  console.log('✅ 操作システムブリッジの初期化完了');
}

/**
 * ゲームシステムとの統合を設定
 */
function setupGameIntegration(operationManager: any): void {
  // 既存のrotate関数をラップ
  const originalRotate = (window as any).rotate;
  if (originalRotate) {
    operationManager.setGameCallbacks(
      () => originalRotate('right'), // 回転コールバック
      (direction: 'left' | 'right') => {
        // 移動コールバック - 既存のmove関数を呼び出し
        if ((window as any).move) {
          (window as any).move(direction);
        }
      }
    );
  }

  // 表情検出システムとの統合
  integrateWithEmotionDetection(operationManager);
  
  // 顔の傾き検出システムとの統合
  integrateWithFaceTiltDetection(operationManager);
}

/**
 * 表情検出システムとの統合
 */
function integrateWithEmotionDetection(operationManager: any): void {
  // 既存のEmotionDetectorを拡張
  const originalEmotionDetector = (window as any).EmotionDetector;
  
  if (originalEmotionDetector && originalEmotionDetector.detectEmotion) {
    const originalDetectEmotion = originalEmotionDetector.detectEmotion;
    
    // detectEmotion関数を拡張して操作制御を統合
    originalEmotionDetector.detectEmotion = function(params: any) {
      const result = originalDetectEmotion.call(this, params);
      
      // 驚き表情が検出された場合、新しい操作システムで処理
      if (result.emotion === '😲' && result.isValid) {
        const rotationExecuted = operationManager.handleEmotionRotation(
          result.emotion as EmotionType,
          result.maxScore / 10 // スコアを0-1の範囲に正規化
        );
        
        // 結果をログに記録
        if (rotationExecuted) {
          console.log('🔄 スマート回転制御: 回転実行');
        } else {
          console.log('⏳ スマート回転制御: クールダウン中またはスコア不足');
        }
      }
      
      return result;
    };
  }
}

/**
 * 顔の傾き検出システムとの統合
 */
function integrateWithFaceTiltDetection(operationManager: any): void {
  // 既存のfaceLean変数を監視し、新しいシステムで処理
  let lastFaceLean = 'center';
  let faceLeanCheckInterval: number;
  
  // 定期的にfaceLeanの状態をチェック
  faceLeanCheckInterval = window.setInterval(() => {
    const currentFaceLean = (window as any).faceLean;
    
    if (currentFaceLean && currentFaceLean !== lastFaceLean) {
      // 傾き角度を推定（既存システムから新システムへの変換）
      let estimatedAngle = 0;
      
      switch (currentFaceLean) {
        case 'left':
          estimatedAngle = -0.1; // 左に傾いている
          break;
        case 'right':
          estimatedAngle = 0.1; // 右に傾いている
          break;
        case 'center':
          estimatedAngle = 0; // 中央
          break;
      }
      
      // 新しい操作システムで処理
      const moveDirection = operationManager.handleHeadTiltMovement(estimatedAngle);
      
      if (moveDirection && moveDirection !== 'center') {
        console.log(`➡️ スマート移動制御: ${moveDirection}方向への移動`);
      }
      
      lastFaceLean = currentFaceLean;
    }
  }, 100); // 100msごとにチェック

  // クリーンアップ関数を保存
  (window as any).cleanupOperationBridge = () => {
    if (faceLeanCheckInterval) {
      clearInterval(faceLeanCheckInterval);
    }
  };
}

/**
 * 既存のグローバル関数を拡張
 */
function enhanceExistingFunctions(): void {
  // 設定モーダルに操作設定を追加
  enhanceSettingsModal();
  
  // ゲーム開始時の初期化を拡張
  enhanceGameStart();
  
  // ゲーム終了時の処理を拡張
  enhanceGameEnd();
}

/**
 * 設定モーダルを拡張して操作設定を追加
 */
function enhanceSettingsModal(): void {
  // DOM読み込み完了後に実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addOperationSettings);
  } else {
    addOperationSettings();
  }
}

/**
 * 操作設定をモーダルに追加
 */
function addOperationSettings(): void {
  const settingModal = document.getElementById('setting-modal');
  if (!settingModal) return;

  // 操作設定セクションを作成
  const operationSection = document.createElement('div');
  operationSection.className = 'operation-settings-section';
  operationSection.innerHTML = `
    <h3>操作設定</h3>
    <div class="setting-group">
      <label for="smart-control-enabled">
        <input type="checkbox" id="smart-control-enabled" checked>
        スマート操作制御を有効にする
      </label>
      <small>回転のクールダウンと移動の安定性チェックを行います</small>
    </div>
    
    <div class="setting-group">
      <label for="operation-feedback-enabled">
        <input type="checkbox" id="operation-feedback-enabled" checked>
        操作フィードバックを表示する
      </label>
      <small>操作の成功・失敗や待機状態を視覚的に表示します</small>
    </div>
    
    <div class="setting-group">
      <label for="personal-adaptation-enabled">
        <input type="checkbox" id="personal-adaptation-enabled" checked>
        個人適応機能を有効にする
      </label>
      <small>プレイスタイルに合わせて操作感度を自動調整します</small>
    </div>
    
    <div class="setting-group">
      <label for="rotation-cooldown">
        回転クールダウン時間: <span id="rotation-cooldown-value">800ms</span>
      </label>
      <input type="range" id="rotation-cooldown" min="400" max="1500" value="800" step="100">
    </div>
    
    <div class="setting-group">
      <label for="movement-stability">
        移動安定性要件: <span id="movement-stability-value">3</span>
      </label>
      <input type="range" id="movement-stability" min="2" max="5" value="3" step="1">
    </div>
  `;

  // 既存の設定の後に追加
  const existingContent = settingModal.querySelector('.modal-content');
  if (existingContent) {
    existingContent.appendChild(operationSection);
  }

  // イベントリスナーを設定
  setupOperationSettingsListeners();
  
  // スタイルを追加
  addOperationSettingsStyles();
}

/**
 * 操作設定のイベントリスナーを設定
 */
function setupOperationSettingsListeners(): void {
  const operationManager = getOperationManager();
  if (!operationManager) return;

  // スマート制御の有効/無効
  const smartControlCheckbox = document.getElementById('smart-control-enabled') as HTMLInputElement;
  if (smartControlCheckbox) {
    smartControlCheckbox.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      operationManager.updateConfig({ enableSmartControl: enabled });
    });
  }

  // フィードバックの有効/無効
  const feedbackCheckbox = document.getElementById('operation-feedback-enabled') as HTMLInputElement;
  if (feedbackCheckbox) {
    feedbackCheckbox.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      operationManager.setFeedbackEnabled(enabled);
    });
  }

  // 個人適応の有効/無効
  const adaptationCheckbox = document.getElementById('personal-adaptation-enabled') as HTMLInputElement;
  if (adaptationCheckbox) {
    adaptationCheckbox.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      operationManager.setPersonalAdaptationEnabled(enabled);
    });
  }

  // 回転クールダウン時間
  const rotationCooldownSlider = document.getElementById('rotation-cooldown') as HTMLInputElement;
  const rotationCooldownValue = document.getElementById('rotation-cooldown-value');
  if (rotationCooldownSlider && rotationCooldownValue) {
    rotationCooldownSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      rotationCooldownValue.textContent = `${value}ms`;
      operationManager.updateOperationSettings({ rotationCooldown: value });
    });
  }

  // 移動安定性要件
  const movementStabilitySlider = document.getElementById('movement-stability') as HTMLInputElement;
  const movementStabilityValue = document.getElementById('movement-stability-value');
  if (movementStabilitySlider && movementStabilityValue) {
    movementStabilitySlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      movementStabilityValue.textContent = value.toString();
      operationManager.updateOperationSettings({ stabilityRequired: value });
    });
  }
}

/**
 * 操作設定用のスタイルを追加
 */
function addOperationSettingsStyles(): void {
  const styleId = 'operation-settings-styles';
  
  // 既存のスタイルがある場合は削除
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .operation-settings-section {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }

    .operation-settings-section h3 {
      margin-bottom: 15px;
      color: #333;
      font-size: 16px;
    }

    .setting-group {
      margin-bottom: 15px;
    }

    .setting-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
      color: #555;
    }

    .setting-group small {
      display: block;
      color: #777;
      font-size: 12px;
      margin-top: 3px;
    }

    .setting-group input[type="checkbox"] {
      margin-right: 8px;
    }

    .setting-group input[type="range"] {
      width: 100%;
      margin-top: 5px;
    }

    .setting-group span {
      font-weight: normal;
      color: #666;
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * ゲーム開始時の処理を拡張
 */
function enhanceGameStart(): void {
  const originalStartGame = (window as any).startGame;
  
  if (originalStartGame) {
    (window as any).startGame = function() {
      console.log('🎮 ゲーム開始 - 操作システム準備中...');
      
      // 操作管理システムを初期化（プレイヤー情報があれば設定）
      const operationManager = getOperationManager();
      if (operationManager) {
        // ゲームコールバックを再設定
        operationManager.setGameCallbacks(
          () => {
            if ((window as any).rotate) {
              (window as any).rotate('right');
            }
          },
          (direction: 'left' | 'right') => {
            if ((window as any).move) {
              (window as any).move(direction);
            }
          }
        );
      }
      
      // 元のstartGame関数を実行
      return originalStartGame.apply(this, arguments);
    };
  }
}

/**
 * ゲーム終了時の処理を拡張
 */
function enhanceGameEnd(): void {
  const originalGameOver = (window as any).gameOver;
  
  if (originalGameOver) {
    (window as any).gameOver = function() {
      console.log('🏁 ゲーム終了 - 操作統計を記録中...');
      
      // 操作統計を記録
      const operationManager = getOperationManager();
      if (operationManager) {
        const score = (window as any).score || 0;
        const playDuration = Date.now() - ((window as any).gameStartTime || Date.now());
        
        operationManager.onGameEnd(score, playDuration);
        
        // 統計情報をコンソールに出力
        const stats = operationManager.getOperationStatistics();
        console.log('📊 操作統計:', stats);
      }
      
      // 元のgameOver関数を実行
      return originalGameOver.apply(this, arguments);
    };
  }
}

/**
 * 操作システムブリッジをクリーンアップ
 */
export function cleanupOperationBridge(): void {
  // クリーンアップ関数が存在する場合は実行
  if ((window as any).cleanupOperationBridge) {
    (window as any).cleanupOperationBridge();
  }
  
  // 操作管理システムを破棄
  const operationManager = getOperationManager();
  if (operationManager) {
    operationManager.destroy();
  }
  
  console.log('🧹 操作システムブリッジをクリーンアップしました');
}

// DOM読み込み完了時に自動初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOperationBridge);
} else {
  initializeOperationBridge();
}