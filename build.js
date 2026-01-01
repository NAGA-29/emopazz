#!/usr/bin/env node

/**
 * ビルドスクリプト - TypeScriptコンパイルとファイル配置
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 TypeScriptプロジェクトをビルド中...');

try {
  // TypeScriptコンパイル
  console.log('📦 TypeScriptをコンパイル中...');
  execSync('npx tsc', { stdio: 'inherit' });

  // distディレクトリが存在することを確認
  if (!fs.existsSync('./dist')) {
    throw new Error('distディレクトリが作成されませんでした');
  }

  console.log('✅ TypeScriptコンパイル完了');

  // 既存のJavaScriptファイルをバックアップ
  const jsFiles = ['game.js', 'emotion-detector.js', 'face-hand-detection.js'];
  const backupDir = './js-backup';
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  jsFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(backupDir, file));
      console.log(`📁 ${file} をバックアップしました`);
    }
  });

  // 型定義ファイルをコピー（開発時の参照用）
  if (fs.existsSync('./dist/types')) {
    console.log('📋 型定義ファイルを配置中...');
    // 必要に応じて型定義ファイルを適切な場所にコピー
  }

  console.log('🎉 ビルド完了！');
  console.log('');
  console.log('次のステップ:');
  console.log('1. npm run dev でライブサーバーを起動');
  console.log('2. ブラウザで http://localhost:3000 を開く');
  console.log('3. 既存のJSファイルは js-backup/ にバックアップされています');

} catch (error) {
  console.error('❌ ビルドエラー:', error.message);
  process.exit(1);
}