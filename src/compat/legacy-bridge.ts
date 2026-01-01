/**
 * 既存JavaScriptコードとの互換性レイヤー
 * 段階的移行のためのブリッジ機能
 */

import { EmotionDetector } from '../core/emotion/EmotionDetector.js';
import { EmotionType } from '../types/emotion.js';
import { Landmark } from '../types/mediapipe.js';

/**
 * グローバルなEmotionDetectorインスタンス
 */
const emotionDetectorInstance = EmotionDetector.getInstance();

/**
 * 既存のJavaScriptコードとの互換性のためのグローバルオブジェクト
 */
declare global {
  interface Window {
    EmotionDetector: {
      thresholds: any;
      calculateParams: (lm: Landmark[]) => any;
      detectEmotion: (params: any) => any;
      visualize: (
        ctx: CanvasRenderingContext2D,
        lm: Landmark[],
        params: any,
        emotionResult: any,
        width: number,
        height: number
      ) => void;
      updateSensitivity: (emotion: EmotionType, level: number) => void;
      sensitivitySettings: any;
      saveSensitivitySettings: () => void;
    };
    getCurrentEmotion?: () => EmotionType;
    rotate?: (direction?: string) => void;
    updateDropSpeed?: (isFast: boolean) => void;
  }
}

/**
 * 既存のJavaScriptコードで使用されているEmotionDetectorオブジェクトを作成
 */
window.EmotionDetector = {
  thresholds: emotionDetectorInstance.thresholds,

  calculateParams: (lm: Landmark[]) => {
    return emotionDetectorInstance.calculateParams(lm);
  },

  detectEmotion: (params: any) => {
    return emotionDetectorInstance.detectEmotion(params);
  },

  visualize: (
    ctx: CanvasRenderingContext2D,
    lm: Landmark[],
    params: any,
    emotionResult: any,
    width: number,
    height: number
  ) => {
    emotionDetectorInstance.visualizeEmotions(
      ctx,
      lm,
      params,
      emotionResult,
      width,
      height
    );
  },

  updateSensitivity: (emotion: EmotionType, level: number) => {
    emotionDetectorInstance.updateSensitivity(emotion, level);
  },

  get sensitivitySettings() {
    return emotionDetectorInstance.sensitivitySettings;
  },

  saveSensitivitySettings: () => {
    emotionDetectorInstance.saveSensitivitySettings();
  },
};

/**
 * TypeScript環境の初期化
 */
export function initializeTypeScriptEnvironment(): void {
  console.log('🚀 TypeScript環境が初期化されました');
  console.log('📊 EmotionDetector (TypeScript版) が利用可能です');

  // 開発モードでの追加情報
  if (process.env['NODE_ENV'] === 'development') {
    console.log('🔧 開発モード: 詳細なログが有効です');
  }
}

/**
 * 既存のJavaScriptコードとの互換性チェック
 */
export function checkCompatibility(): boolean {
  const requiredGlobals = ['EmotionDetector'];

  for (const global of requiredGlobals) {
    if (!(global in window)) {
      console.error(
        `❌ 必要なグローバルオブジェクト ${global} が見つかりません`
      );
      return false;
    }
  }

  console.log('✅ 既存JavaScriptコードとの互換性チェック完了');
  return true;
}

// 初期化を実行
initializeTypeScriptEnvironment();
