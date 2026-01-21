# エモパズ！(EmoPazz)

表情認識を使った革新的なパズルゲーム。カメラを使って表情を検出し、ブロックを操作します。

## 特徴

- 🎮 **表情操作**: カメラで顔を認識し、表情や頭の動きでゲームを操作
- 🧩 **パズルゲーム**: テトリス風のブロック落下パズル
- 🎯 **スマート制御**: プレイヤーのスキルレベルに応じた自動調整機能
- 📊 **個人適応システム**: プレイヤーごとの操作習慣を学習
- 💪 **TypeScript**: 型安全で保守性の高いコードベース

## 技術スタック

- **言語**: TypeScript
- **ビルドツール**: esbuild
- **表情認識**: MediaPipe Face Mesh
- **コード品質**: ESLint, Prettier

## セットアップ

### 必要要件

- Node.js 16.x以上
- Webカメラ

### インストール

```bash
# 依存関係のインストール
npm install

# TypeScriptのビルド
npm run build

# 開発サーバーの起動（ライブリロード付き）
npm run dev
```

### ビルド

```bash
# プロダクションビルド
npm run build

# 監視モード（開発用）
npm run build:watch
```

## プロジェクト構造

```
emopazz/
├── src/                      # TypeScriptソースコード
│   ├── core/                 # コア機能
│   │   ├── emotion/          # 表情検出エンジン
│   │   └── operation/        # 操作制御システム
│   ├── compat/               # レガシーコードとの互換性レイヤー
│   ├── types/                # 型定義
│   ├── utils/                # ユーティリティ
│   └── main.ts               # エントリーポイント
├── assets/                   # 画像・音声などのアセット
├── *.html                    # HTMLファイル
├── *.js                      # レガシーJavaScriptファイル
├── tsconfig.json             # TypeScript設定
├── .eslintrc.json            # ESLint設定
└── .prettierrc               # Prettier設定
```

## 主要機能

### 表情検出システム

`EmotionDetector`クラスは以下の表情を検出します:

- 😊 **笑顔**: 口角が上がっている
- 😡 **怒り**: 眉が下がり、眉間が狭い
- 😢 **悲しみ**: 口角が下がっている
- 😲 **驚き**: 口と目が大きく開いている

### スマート操作制御

`SmartControlSystem`は以下の機能を提供します:

- **回転クールダウン**: 誤操作を防ぐためのクールダウン時間
- **移動安定性チェック**: 意図的な動きのみを採用
- **個人適応**: プレイヤーの操作パターンを学習

### 操作方法

- **ブロック回転**: 驚き顔（😲）を作る
- **左右移動**: 頭を左右に傾ける
- **高速落下**: 悲しい顔（😢）を作る

## 開発ガイド

### コーディング規約

- TypeScriptの厳格モード（`strict: true`）を使用
- ESLintとPrettierによる自動フォーマット
- すべての関数にJSDocコメントを記述

### 型定義

型定義は`src/types/`ディレクトリに集約されています:

- `game.ts`: ゲーム関連の型
- `emotion.ts`: 表情検出関連の型
- `mediapipe.ts`: MediaPipe関連の型

### ロギング

`src/utils/logger.ts`を使用してログを出力します:

```typescript
import { logger } from './utils/logger.js';

logger.info('情報メッセージ');
logger.warn('警告メッセージ');
logger.error('エラーメッセージ');
logger.debug('デバッグメッセージ');
```

開発環境でのみログが出力されます。

## テスト

```bash
# Jest を使ったユニットテストの実行
npm test
```

## ライセンス

このプロジェクトのライセンスについては、`LICENSE`ファイルを参照してください。

## クレジット

- アイコン: [Reshot](https://www.reshot.com/free-svg-icons/item/angry-89V6AQK7MW/)
- 表情検出: MediaPipe by Google

## コントリビューション

プルリクエストを歓迎します。大きな変更を加える場合は、まずissueを開いて変更内容を議論してください。
