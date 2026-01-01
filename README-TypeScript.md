# エモパズ！TypeScript環境構築

## 概要

このプロジェクトは既存のJavaScriptベースのエモパズ！ゲームをTypeScriptに段階的に移行するための環境を提供します。

## 完了した作業

### 1. TypeScript環境構築 ✅

- **TypeScriptコンパイラ設定**: `tsconfig.json`で厳密な型チェックを有効化
- **ビルドシステム**: npm scriptsによる自動ビルド
- **開発環境整備**: ESLint、Prettier設定完了

### 2. 既存JavaScriptファイルの型定義作成 ✅

以下の型定義ファイルを作成:

- `src/types/game.ts` - ゲーム関連の型定義
- `src/types/emotion.ts` - 表情認識関連の型定義  
- `src/types/mediapipe.ts` - MediaPipe関連の型定義

### 3. コア機能のTypeScript化 ✅

- `src/core/emotion/EmotionDetector.ts` - 表情検出エンジンをTypeScript化
- `src/compat/legacy-bridge.ts` - 既存JSコードとの互換性レイヤー
- `src/main.ts` - TypeScriptアプリケーションのエントリーポイント

## ファイル構造

```
├── src/                          # TypeScriptソースコード
│   ├── types/                    # 型定義
│   │   ├── game.ts              # ゲーム関連型
│   │   ├── emotion.ts           # 表情認識型
│   │   └── mediapipe.ts         # MediaPipe型
│   ├── core/                    # コア機能
│   │   └── emotion/
│   │       └── EmotionDetector.ts
│   ├── compat/                  # 互換性レイヤー
│   │   └── legacy-bridge.ts
│   └── main.ts                  # エントリーポイント
├── dist/                        # コンパイル済みJavaScript
├── js-backup/                   # 既存JSファイルのバックアップ
├── tsconfig.json               # TypeScript設定
├── .eslintrc.json             # ESLint設定
├── .prettierrc                # Prettier設定
├── package.json               # npm設定
└── index-ts.html              # TypeScript版HTML
```

## 使用方法

### 開発環境の起動

```bash
# 依存関係のインストール
npm install

# TypeScriptのコンパイル
npm run build

# 開発サーバーの起動（ファイル監視付き）
npm run dev
```

### 利用可能なコマンド

```bash
npm run build         # TypeScriptコンパイル
npm run build:watch   # ファイル監視付きコンパイル
npm run dev          # 開発サーバー起動
npm run lint         # ESLintによるコードチェック
npm run format       # Prettierによるコード整形
npm run type-check   # 型チェックのみ実行
```

## 技術仕様

### TypeScript設定

- **ターゲット**: ES2020
- **モジュール**: ES2020 modules
- **厳密モード**: 有効
- **ソースマップ**: 有効
- **型宣言ファイル**: 自動生成

### 開発ツール

- **ESLint**: コード品質チェック
- **Prettier**: コード整形
- **Live Server**: 開発用サーバー

### 互換性

- 既存のJavaScriptコードとの完全互換性を維持
- 段階的な移行が可能
- MediaPipe CDNとの連携

## 既存コードとの統合

TypeScript版は既存のJavaScriptコードと並行して動作します：

1. `index-ts.html` - TypeScript統合版
2. `index.html` - 既存JavaScript版（そのまま利用可能）

### 移行戦略

1. **段階1**: 型定義とコア機能のTypeScript化 ✅
2. **段階2**: ゲームロジックの段階的移行
3. **段階3**: UI/UXコンポーネントの移行
4. **段階4**: 完全TypeScript化

## 開発者向け情報

### 型安全性

- 厳密な型チェックにより実行時エラーを防止
- MediaPipe APIの型定義により開発効率向上
- 表情認識パラメータの型安全性確保

### パフォーマンス

- TypeScriptコンパイル時の最適化
- ソースマップによるデバッグ支援
- 既存コードとの互換性維持によるパフォーマンス影響最小化

### 拡張性

- モジュラー設計による機能追加の容易性
- 型定義による API の明確化
- 既存機能への影響を最小限に抑えた拡張

## トラブルシューティング

### よくある問題

1. **コンパイルエラー**: `npm run type-check` で型エラーを確認
2. **実行時エラー**: ブラウザの開発者ツールでソースマップを確認
3. **互換性問題**: `legacy-bridge.ts` の設定を確認

### サポート

- TypeScript公式ドキュメント: https://www.typescriptlang.org/
- MediaPipe JavaScript API: https://google.github.io/mediapipe/

## 今後の予定

- [ ] ゲームロジック（game.js）のTypeScript化
- [ ] カメラ・手検出（face-hand-detection.js）のTypeScript化
- [ ] UIコンポーネントのモジュール化
- [ ] テストフレームワークの導入
- [ ] パフォーマンス最適化