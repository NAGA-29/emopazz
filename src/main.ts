/**
 * メインエントリーポイント - TypeScript版エモパズ！
 */

import './compat/legacy-bridge.js';
import { checkCompatibility } from './compat/legacy-bridge.js';

/**
 * アプリケーションの初期化
 */
function initializeApp(): void {
  console.log('🎮 エモパズ！TypeScript版を初期化中...');
  
  // 互換性チェック
  if (!checkCompatibility()) {
    console.error('❌ 互換性チェックに失敗しました');
    return;
  }
  
  // DOM読み込み完了を待つ
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
  } else {
    onDOMContentLoaded();
  }
}

/**
 * DOM読み込み完了時の処理
 */
function onDOMContentLoaded(): void {
  console.log('📄 DOM読み込み完了');
  
  // TypeScript環境の準備完了を通知
  const event = new CustomEvent('typescriptReady', {
    detail: {
      version: '1.0.0',
      modules: ['EmotionDetector'],
      timestamp: Date.now()
    }
  });
  
  document.dispatchEvent(event);
  console.log('✅ TypeScript環境の準備完了');
}

// アプリケーション初期化を実行
initializeApp();