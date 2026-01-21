/**
 * 表情検出エンジン - TypeScript版
 * 既存のemotion-detector.jsをTypeScriptに移行
 */

import {
  EmotionType,
  EmotionParams,
  EmotionResult,
  EmotionThresholds,
  SensitivitySettings,
} from '../../types/emotion.js';
import { Landmark } from '../../types/mediapipe.js';
import { logger } from '../../utils/logger.js';

export class EmotionDetector {
  private static instance: EmotionDetector;
  
  // 感度設定の初期値
  private _sensitivitySettings: SensitivitySettings = {
    '😊': 3, // 笑顔 - 初期値は普通(3)
    '😡': 3, // 怒り
    '😢': 3, // 悲しみ
    '😲': 3, // 驚き
  };

  // 感度によるスコア倍率調整テーブル
  private readonly sensitivityMultipliers: Record<number, number> = {
    1: 0.5, // とても低い: 0.5倍
    2: 0.75, // 低い: 0.75倍
    3: 1.0, // 普通: 1.0倍
    4: 1.5, // 高い: 1.5倍
    5: 2.0, // とても高い: 2.0倍
  };

  // 表情判定のしきい値
  private readonly _thresholds: EmotionThresholds = {
    surprise: {
      mouthOpenness: 0.04,
      eyeOpenness: 0.02,
    },
    anger: {
      eyebrowY: 0.22,
      eyebrowAngle: -0.02,
      mouthOpenness: 0.01,
      eyebrowDistance: 0.06,
      eyebrowDistanceMild: 0.08,
      mouthCurvature: -0.009,
    },
    sadness: {
      mouthOpennessMin: 0.018,
      mouthOpennessMax: 0.035,
      eyebrowY: 0.31,
      mouthCurvatureMin: -0.018,
    },
    happiness: {
      mouthWidth: 0.19,
      mouthCornerLift: 0.008,
      mouthCornerLiftStrong: 0.014,
      eyeOpenness: 0.018,
      mouthCurvature: 0.004,
    },
    minDetectionScore: 3.5,
  };

  // 表情の安定化処理用の変数
  private lastDetectedEmotion: EmotionType | null = null;
  private emotionStabilityCounter = 0;
  private readonly EMOTION_STABILITY_THRESHOLD = 2;

  private constructor() {
    this.loadSensitivitySettings();
  }

  public static getInstance(): EmotionDetector {
    if (!EmotionDetector.instance) {
      EmotionDetector.instance = new EmotionDetector();
    }
    return EmotionDetector.instance;
  }

  /**
   * 感度設定を更新する
   */
  public updateSensitivity(emotion: EmotionType, level: number): void {
    if (level >= 1 && level <= 5) {
      this._sensitivitySettings[emotion] = level;
    }
  }

  /**
   * ローカルストレージから感度設定を読み込む
   */
  private loadSensitivitySettings(): void {
    const saved = localStorage.getItem('emopazz_sensitivity');
    if (saved) {
      try {
        const settings = JSON.parse(saved) as SensitivitySettings;
        for (const [emotion, level] of Object.entries(settings)) {
          if (
            Object.hasOwn(this._sensitivitySettings, emotion) &&
            level >= 1 &&
            level <= 5
          ) {
            this._sensitivitySettings[emotion] = level;
          }
        }
      } catch (e) {
        logger.error('感度設定の読み込みに失敗しました', e);
      }
    }
  }

  /**
   * ローカルストレージに感度設定を保存する
   */
  public saveSensitivitySettings(): void {
    try {
      localStorage.setItem(
        'emopazz_sensitivity',
        JSON.stringify(this._sensitivitySettings)
      );
    } catch (e) {
      logger.error('感度設定の保存に失敗しました', e);
    }
  }

  /**
   * ランドマークを安全に取得するヘルパーメソッド
   */
  private getLandmark(landmarks: Landmark[], index: number): Landmark {
    const landmark = landmarks[index];
    if (!landmark) {
      throw new Error(`ランドマークインデックス ${index} が存在しません`);
    }
    return landmark;
  }

  /**
   * ランドマークから表情パラメータを計算する
   */
  public calculateParams(landmarks: Landmark[]): EmotionParams {
    // 必要なランドマークの存在チェック
    if (landmarks.length < 468) {
      throw new Error('不十分なランドマークデータです');
    }

    // 口の開き具合
    const upperLip = this.getLandmark(landmarks, 13);
    const lowerLip = this.getLandmark(landmarks, 14);
    const mouthOpenness = lowerLip.y - upperLip.y;

    // 眉毛の位置
    const leftEyebrowInnerY = this.getLandmark(landmarks, 336).y;
    const leftEyebrowOuterY = this.getLandmark(landmarks, 296).y;
    const rightEyebrowInnerY = this.getLandmark(landmarks, 107).y;
    const rightEyebrowOuterY = this.getLandmark(landmarks, 67).y;
    const eyebrowY =
      (leftEyebrowInnerY + leftEyebrowOuterY + rightEyebrowInnerY + rightEyebrowOuterY) / 4;

    // 眉の角度
    const leftEyebrowAngle = leftEyebrowOuterY - leftEyebrowInnerY;
    const rightEyebrowAngle = rightEyebrowOuterY - rightEyebrowInnerY;
    const eyebrowAngle = (leftEyebrowAngle + rightEyebrowAngle) / 2;

    // 目の開き具合
    const leftEyeUpperY = this.getLandmark(landmarks, 159).y;
    const leftEyeLowerY = this.getLandmark(landmarks, 145).y;
    const rightEyeUpperY = this.getLandmark(landmarks, 386).y;
    const rightEyeLowerY = this.getLandmark(landmarks, 374).y;
    const leftEyeOpenness = leftEyeLowerY - leftEyeUpperY;
    const rightEyeOpenness = rightEyeLowerY - rightEyeUpperY;
    const eyeOpenness = (leftEyeOpenness + rightEyeOpenness) / 2;

    // 口の横幅
    const mouthLeftX = this.getLandmark(landmarks, 61).x;
    const mouthRightX = this.getLandmark(landmarks, 291).x;
    const mouthWidth = mouthRightX - mouthLeftX;

    // 口の形状
    const mouthLeftY = this.getLandmark(landmarks, 61).y;
    const mouthRightY = this.getLandmark(landmarks, 291).y;
    const mouthTopY = this.getLandmark(landmarks, 0).y;
    const mouthBottomY = this.getLandmark(landmarks, 17).y;
    const mouthCurvature =
      (mouthLeftY + mouthRightY) / 2 - (mouthTopY + mouthBottomY) / 2;

    // 口角の位置の計算
    const mouthCornerLeft = this.getLandmark(landmarks, 61);
    const mouthCornerRight = this.getLandmark(landmarks, 291);
    const mouthTopPoint = this.getLandmark(landmarks, 13);
    const mouthBottomPoint = this.getLandmark(landmarks, 14);

    // 口の中心を計算
    const mouthCenter = {
      x: (mouthCornerLeft.x + mouthCornerRight.x) / 2,
      y: (mouthTopPoint.y + mouthBottomPoint.y) / 2,
    };

    // 口角の上がり具合の計算
    const leftCornerLift = mouthCenter.y - mouthCornerLeft.y;
    const rightCornerLift = mouthCenter.y - mouthCornerRight.y;
    const mouthCornerLift =
      Math.min(leftCornerLift, rightCornerLift) * 0.7 +
      ((leftCornerLift + rightCornerLift) / 2) * 0.3;

    // 眉間の距離
    const leftEyebrowInner = this.getLandmark(landmarks, 336);
    const rightEyebrowInner = this.getLandmark(landmarks, 107);
    const eyebrowDistance = Math.abs(rightEyebrowInner.x - leftEyebrowInner.x);

    return {
      mouthOpenness,
      eyebrowY,
      eyebrowAngle,
      eyeOpenness,
      mouthWidth,
      mouthCurvature,
      mouthCornerLift,
      leftCornerLift,
      rightCornerLift,
      eyebrowDistance,
      mouthCenter,
      mouthCornerLeft,
      mouthCornerRight,
      leftEyebrowInner,
      rightEyebrowInner,
    };
  }

  /**
   * 表情スコアを計算する
   */
  private calculateEmotionScores(params: EmotionParams): Record<EmotionType, number> {
    const {
      mouthOpenness,
      eyebrowY,
      eyebrowAngle,
      eyeOpenness,
      mouthWidth,
      mouthCurvature,
      mouthCornerLift,
      eyebrowDistance,
      leftCornerLift,
      rightCornerLift,
    } = params;

    // 各感情のスコア初期化
    const emotionScores = {
      '😲': 0, // 驚き
      '😡': 0, // 怒り
      '😢': 0, // 悲しみ
      '😊': 0, // 笑顔
      '❓': 0, // ?ブロック（使用しない）
    } as Record<EmotionType, number>;

    // 驚き: 口が大きく開いて、目も開いている
    if (mouthOpenness > this._thresholds.surprise.mouthOpenness) {
      emotionScores['😲'] += 2;
    }
    if (eyeOpenness > this._thresholds.surprise.eyeOpenness) {
      emotionScores['😲'] += 2;
    }
    if (mouthOpenness > this._thresholds.surprise.mouthOpenness * 1.5) {
      emotionScores['😲'] += 2;
    }

    // 怒り: 眉が下がっていて、眉が内側に下がる角度がある
    if (eyebrowY < this._thresholds.anger.eyebrowY) {
      emotionScores['😡'] += 2;
    }
    if (eyebrowAngle < this._thresholds.anger.eyebrowAngle) {
      emotionScores['😡'] += 2;
    }
    if (mouthOpenness < this._thresholds.anger.mouthOpenness) {
      emotionScores['😡'] += 1;
    }
    if (eyebrowDistance < this._thresholds.anger.eyebrowDistance) {
      emotionScores['😡'] += 2;
    }
    if (eyebrowDistance < this._thresholds.anger.eyebrowDistanceMild) {
      emotionScores['😡'] += 1;
    }
    if (mouthCurvature < this._thresholds.anger.mouthCurvature) {
      emotionScores['😡'] += 1;
    }

    // 悲しみ判定: 口角の下がりを最も重視
    if (mouthCurvature < this._thresholds.sadness.mouthCurvatureMin) {
      emotionScores['😢'] += 3;

      if (
        mouthOpenness > this._thresholds.sadness.mouthOpennessMin &&
        mouthOpenness < this._thresholds.sadness.mouthOpennessMax
      ) {
        emotionScores['😢'] += 1;
      }

      if (eyebrowY > this._thresholds.sadness.eyebrowY) {
        emotionScores['😢'] += 1;
      }
    } else {
      emotionScores['😢'] = 0;
    }

    // 笑顔判定強化: 口角の上がりを最も重視
    const maxCornerLift = Math.max(leftCornerLift, rightCornerLift);

    if (maxCornerLift > this._thresholds.happiness.mouthCornerLiftStrong) {
      emotionScores['😊'] += 3;
      if (
        leftCornerLift > this._thresholds.happiness.mouthCornerLift &&
        rightCornerLift > this._thresholds.happiness.mouthCornerLift
      ) {
        emotionScores['😊'] += 2;
      }
    } else if (mouthCornerLift > this._thresholds.happiness.mouthCornerLiftStrong) {
      emotionScores['😊'] += 4;
      if (mouthCurvature > this._thresholds.happiness.mouthCurvature) {
        emotionScores['😊'] += 2;
      }
    } else if (mouthCornerLift > this._thresholds.happiness.mouthCornerLift) {
      emotionScores['😊'] += 2;
      if (mouthWidth > this._thresholds.happiness.mouthWidth) {
        emotionScores['😊'] += 2;
      }
      if (mouthCurvature > this._thresholds.happiness.mouthCurvature) {
        emotionScores['😊'] += 1;
      }
    } else if (mouthWidth > this._thresholds.happiness.mouthWidth) {
      emotionScores['😊'] += 2;
      if (mouthCurvature > 0) {
        emotionScores['😊'] += 1;
      }
    }

    if (eyeOpenness < this._thresholds.happiness.eyeOpenness && mouthCurvature > 0) {
      emotionScores['😊'] += 1;
    }

    // 競合解決: 口角が上がっている場合は悲しみを抑制
    if (mouthCornerLift > 0 && mouthCurvature >= 0) {
      emotionScores['😢'] = 0;
    }

    // 感度設定に基づいてスコアを調整
    for (const [emotion, score] of Object.entries(emotionScores)) {
      const multiplier =
        this.sensitivityMultipliers[this._sensitivitySettings[emotion] || 3] || 1.0;
      emotionScores[emotion as EmotionType] = score * multiplier;
    }

    return emotionScores;
  }

  /**
   * 表情を判定する
   */
  public detectEmotion(params: EmotionParams): EmotionResult {
    const emotionScores = this.calculateEmotionScores(params);

    // 最も点数の高い表情を選択
    let maxScore = 0;
    let detectedEmotion: EmotionType = '😊'; // デフォルトは笑顔

    for (const [emotion, score] of Object.entries(emotionScores)) {
      if (emotion !== '❓' && score > maxScore) {
        maxScore = score;
        detectedEmotion = emotion as EmotionType;
      }
    }

    // 検出スコアが基準値以上の場合のみ有効
    const isValid = maxScore >= this._thresholds.minDetectionScore;

    // 表情の安定化処理
    if (isValid) {
      if (detectedEmotion === this.lastDetectedEmotion) {
        this.emotionStabilityCounter++;
      } else {
        this.emotionStabilityCounter = 0;
        this.lastDetectedEmotion = detectedEmotion;
      }
    }

    const isStable = this.emotionStabilityCounter >= this.EMOTION_STABILITY_THRESHOLD;

    return {
      emotion: detectedEmotion,
      scores: emotionScores,
      maxScore,
      isValid,
      isStable,
      stabilityCounter: this.emotionStabilityCounter,
    };
  }

  /**
   * 表情をビジュアル化する
   */
  public visualizeEmotions(
    ctx: CanvasRenderingContext2D,
    landmarks: Landmark[],
    params: EmotionParams,
    emotionResult: EmotionResult,
    width: number,
    height: number
  ): void {
    const {
      mouthCenter,
      mouthCornerLeft,
      mouthCornerRight,
      leftEyebrowInner,
      rightEyebrowInner,
      eyebrowAngle,
      leftCornerLift,
      rightCornerLift,
    } = params;

    const scores = emotionResult.scores;

    // 口角の上がり具合を可視化
    if (
      leftCornerLift > this._thresholds.happiness.mouthCornerLift ||
      rightCornerLift > this._thresholds.happiness.mouthCornerLift
    ) {
      ctx.strokeStyle = '#FFFF00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mouthCornerLeft.x * width, mouthCornerLeft.y * height);
      ctx.lineTo(mouthCenter.x * width, mouthCenter.y * height);
      ctx.lineTo(mouthCornerRight.x * width, mouthCornerRight.y * height);
      ctx.stroke();

      ctx.fillStyle = '#FFFF00';
      ctx.font = '12px sans-serif';
      ctx.fillText(
        `${leftCornerLift.toFixed(3)}`,
        mouthCornerLeft.x * width - 20,
        mouthCornerLeft.y * height - 5
      );
      ctx.fillText(
        `${rightCornerLift.toFixed(3)}`,
        mouthCornerRight.x * width + 5,
        mouthCornerRight.y * height - 5
      );
    }

    // 怒りの表情を視覚化
    if ((scores['😡'] ?? 0) >= this._thresholds.minDetectionScore) {
      ctx.strokeStyle = '#FF3333';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(leftEyebrowInner.x * width, leftEyebrowInner.y * height);
      ctx.lineTo(rightEyebrowInner.x * width, rightEyebrowInner.y * height);
      ctx.stroke();

      if (eyebrowAngle < this._thresholds.anger.eyebrowAngle) {
        ctx.strokeStyle = '#FF6666';
        ctx.lineWidth = 2;
        // 左眉
        const leftInner = this.getLandmark(landmarks, 336);
        const leftOuter = this.getLandmark(landmarks, 296);
        ctx.beginPath();
        ctx.moveTo(leftInner.x * width, leftInner.y * height);
        ctx.lineTo(leftOuter.x * width, leftOuter.y * height);
        ctx.stroke();
        // 右眉
        const rightInner = this.getLandmark(landmarks, 107);
        const rightOuter = this.getLandmark(landmarks, 67);
        ctx.beginPath();
        ctx.moveTo(rightInner.x * width, rightInner.y * height);
        ctx.lineTo(rightOuter.x * width, rightOuter.y * height);
        ctx.stroke();
      }
    }

    // 悲しみの表情を視覚化
    if ((scores['😢'] ?? 0) >= this._thresholds.minDetectionScore) {
      ctx.strokeStyle = '#6666FF';
      ctx.lineWidth = 2;
      const sadLeftInner = this.getLandmark(landmarks, 336);
      const sadLeftOuter = this.getLandmark(landmarks, 296);
      const sadRightInner = this.getLandmark(landmarks, 107);
      const sadRightOuter = this.getLandmark(landmarks, 67);
      ctx.beginPath();
      ctx.moveTo(sadLeftInner.x * width, sadLeftInner.y * height);
      ctx.lineTo(sadLeftOuter.x * width, sadLeftOuter.y * height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sadRightInner.x * width, sadRightInner.y * height);
      ctx.lineTo(sadRightOuter.x * width, sadRightOuter.y * height);
      ctx.stroke();
    }

    // 驚きの表情を視覚化
    if ((scores['😲'] ?? 0) >= this._thresholds.minDetectionScore) {
      ctx.strokeStyle = '#FF66FF';
      ctx.lineWidth = 2;
      const leftEyeUpper = this.getLandmark(landmarks, 159);
      const leftEyeLower = this.getLandmark(landmarks, 145);
      const rightEyeUpper = this.getLandmark(landmarks, 386);
      const rightEyeLower = this.getLandmark(landmarks, 374);
      ctx.beginPath();
      ctx.moveTo(leftEyeUpper.x * width, leftEyeUpper.y * height);
      ctx.lineTo(leftEyeLower.x * width, leftEyeLower.y * height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rightEyeUpper.x * width, rightEyeUpper.y * height);
      ctx.lineTo(rightEyeLower.x * width, rightEyeLower.y * height);
      ctx.stroke();
    }

    // 検出された表情を視覚的に表示
    if (emotionResult.isValid) {
      ctx.fillStyle = emotionResult.isStable ? '#00FF00' : '#FFFF00';
      ctx.font = '24px sans-serif';
      ctx.fillText(emotionResult.emotion, 10, 30);

      ctx.font = '14px sans-serif';
      ctx.fillText(
        `安定度: ${emotionResult.stabilityCounter}/${this.EMOTION_STABILITY_THRESHOLD}`,
        10,
        50
      );
    }
  }

  // ゲッター
  public get thresholds(): EmotionThresholds {
    return this._thresholds;
  }

  public get sensitivitySettings(): SensitivitySettings {
    return { ...this._sensitivitySettings };
  }
}