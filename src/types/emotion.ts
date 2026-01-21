/**
 * 表情認識関連の型定義
 */

import type { EmotionType } from './game.js';
export type { EmotionType };

export interface EmotionParams {
  mouthOpenness: number;
  eyebrowY: number;
  eyebrowAngle: number;
  eyeOpenness: number;
  mouthWidth: number;
  mouthCurvature: number;
  mouthCornerLift: number;
  leftCornerLift: number;
  rightCornerLift: number;
  eyebrowDistance: number;
  mouthCenter: { x: number; y: number };
  mouthCornerLeft: { x: number; y: number };
  mouthCornerRight: { x: number; y: number };
  leftEyebrowInner: { x: number; y: number };
  rightEyebrowInner: { x: number; y: number };
}

export interface EmotionResult {
  emotion: EmotionType;
  scores: Record<EmotionType, number>;
  maxScore: number;
  isValid: boolean;
  isStable: boolean;
  stabilityCounter: number;
}

export interface EmotionThresholds {
  surprise: {
    mouthOpenness: number;
    eyeOpenness: number;
  };
  anger: {
    eyebrowY: number;
    eyebrowAngle: number;
    mouthOpenness: number;
    eyebrowDistance: number;
    eyebrowDistanceMild: number;
    mouthCurvature: number;
  };
  sadness: {
    mouthOpennessMin: number;
    mouthOpennessMax: number;
    eyebrowY: number;
    mouthCurvatureMin: number;
  };
  happiness: {
    mouthWidth: number;
    mouthCornerLift: number;
    mouthCornerLiftStrong: number;
    eyeOpenness: number;
    mouthCurvature: number;
  };
  minDetectionScore: number;
}

/**
 * 感度設定の型定義
 * 各感情タイプに対して1-5の感度レベルを設定
 */
export type SensitivitySettings = Record<EmotionType, number>;

export interface EmotionDetectionConfig {
  sensitivity: Record<EmotionType, number>;
  stabilityThreshold: number;
  calibrationMode: boolean;
}

export interface AccuracyMetrics {
  overallAccuracy: number;
  emotionAccuracy: Record<EmotionType, number>;
  falsePositiveRate: number;
  falseNegativeRate: number;
}

export interface EmotionSample {
  emotion: EmotionType;
  params: EmotionParams;
  timestamp: number;
  confidence: number;
}
