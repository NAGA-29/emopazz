/**
 * EmotionDetector のユニットテスト
 */

import { EmotionDetector } from '../src/core/emotion/EmotionDetector';
import { Landmark } from '../src/types/mediapipe';

describe('EmotionDetector', () => {
  let detector: EmotionDetector;

  beforeEach(() => {
    detector = EmotionDetector.getInstance();
  });

  describe('getInstance', () => {
    it('シングルトンインスタンスを返す', () => {
      const instance1 = EmotionDetector.getInstance();
      const instance2 = EmotionDetector.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('updateSensitivity', () => {
    it('有効な感度レベルで設定を更新する', () => {
      detector.updateSensitivity('😊', 5);
      const settings = detector.sensitivitySettings;
      expect(settings['😊']).toBe(5);
    });

    it('無効な感度レベルでは更新しない', () => {
      const originalSettings = detector.sensitivitySettings;
      detector.updateSensitivity('😊', 10); // 無効な値
      const newSettings = detector.sensitivitySettings;
      expect(newSettings['😊']).toBe(originalSettings['😊']);
    });
  });

  describe('calculateParams', () => {
    it('不十分なランドマークでエラーをスローする', () => {
      const landmarks: Landmark[] = [];
      expect(() => detector.calculateParams(landmarks)).toThrow(
        '不十分なランドマークデータです'
      );
    });

    it('有効なランドマークでパラメータを計算する', () => {
      // 468個のダミーランドマークを作成
      const landmarks: Landmark[] = Array.from({ length: 468 }, (_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0,
      }));

      const params = detector.calculateParams(landmarks);
      expect(params).toHaveProperty('mouthOpenness');
      expect(params).toHaveProperty('eyebrowY');
      expect(params).toHaveProperty('eyeOpenness');
    });
  });

  describe('detectEmotion', () => {
    it('無効なスコアの場合isValidがfalse', () => {
      const params = {
        mouthOpenness: 0.01,
        eyebrowY: 0.25,
        eyebrowAngle: 0,
        eyeOpenness: 0.01,
        mouthWidth: 0.15,
        mouthCurvature: 0,
        mouthCornerLift: 0,
        leftCornerLift: 0,
        rightCornerLift: 0,
        eyebrowDistance: 0.1,
        mouthCenter: { x: 0.5, y: 0.5 },
        mouthCornerLeft: { x: 0.4, y: 0.5 },
        mouthCornerRight: { x: 0.6, y: 0.5 },
        leftEyebrowInner: { x: 0.4, y: 0.3 },
        rightEyebrowInner: { x: 0.6, y: 0.3 },
      };

      const result = detector.detectEmotion(params);
      expect(result.isValid).toBe(false);
    });

    it('十分なスコアの場合isValidがtrue', () => {
      const params = {
        mouthOpenness: 0.08, // 大きく開いた口
        eyebrowY: 0.25,
        eyebrowAngle: 0,
        eyeOpenness: 0.03, // 大きく開いた目
        mouthWidth: 0.15,
        mouthCurvature: 0,
        mouthCornerLift: 0,
        leftCornerLift: 0,
        rightCornerLift: 0,
        eyebrowDistance: 0.1,
        mouthCenter: { x: 0.5, y: 0.5 },
        mouthCornerLeft: { x: 0.4, y: 0.5 },
        mouthCornerRight: { x: 0.6, y: 0.5 },
        leftEyebrowInner: { x: 0.4, y: 0.3 },
        rightEyebrowInner: { x: 0.6, y: 0.3 },
      };

      const result = detector.detectEmotion(params);
      expect(result.isValid).toBe(true);
      expect(result.emotion).toBe('😲'); // 驚き顔
    });
  });
});
