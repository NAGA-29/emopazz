---
inclusion: always
---

# プロジェクト概要とコンテキスト

## プロジェクト名
**エモパズ！** - 表情認識パズルゲーム

## プロジェクトの目的
- 既存のJavaScriptベースのゲームをTypeScriptに段階的に移行
- 表情認識技術を活用したユニークなパズルゲーム体験の提供
- コードの保守性と拡張性の向上

## 技術スタック
- **フロントエンド**: HTML5, CSS3, JavaScript/TypeScript
- **表情認識**: MediaPipe Face Mesh
- **手の検出**: MediaPipe Hands
- **ビルドツール**: TypeScript Compiler, npm
- **開発ツール**: ESLint, Prettier

## 主要機能
1. **表情認識**: カメラを使用してリアルタイムで表情を検出
2. **パズルゲーム**: 表情に応じてブロックの種類が変化するテトリス風ゲーム
3. **手ジェスチャー**: 手の動きでブロックを回転
4. **ランキング機能**: スコアと顔写真を保存

## 開発方針
- **段階的移行**: 既存のJavaScriptコードを段階的にTypeScriptに移行
- **後方互換性**: 既存機能を壊さずに新機能を追加
- **型安全性**: TypeScriptの型システムを活用してバグを防止
- **保守性**: モジュラー設計で将来の拡張を容易に

## ファイル構成の理解
- `game.js`: メインゲームロジック
- `emotion-detector.js`: 表情検出エンジン
- `face-hand-detection.js`: カメラと手の検出処理
- `src/`: TypeScript版のソースコード
- `dist/`: コンパイル済みJavaScript

## 注意事項
- MediaPipeはCDNから読み込んでいるため、インターネット接続が必要
- カメラアクセス許可が必要
- 既存のJavaScriptファイルとの互換性を常に考慮する