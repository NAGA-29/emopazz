/**
 * SmartControlSystem のユニットテスト
 */

import { SmartControlSystem } from '../src/core/operation/SmartControlSystem';

describe('SmartControlSystem', () => {
  let system: SmartControlSystem;

  beforeEach(() => {
    system = new SmartControlSystem();
  });

  describe('handleSurpriseRotation', () => {
    it('高い信頼度の驚き顔で回転を実行する', () => {
      const result = system.handleSurpriseRotation('😲', 0.9);
      expect(result).toBe(true);
    });

    it('低い信頼度の驚き顔では回転しない', () => {
      const result = system.handleSurpriseRotation('😲', 0.5);
      expect(result).toBe(false);
    });

    it('驚き顔以外では回転しない', () => {
      const result = system.handleSurpriseRotation('😊', 0.9);
      expect(result).toBe(false);
    });

    it('クールダウン中は回転しない', () => {
      system.handleSurpriseRotation('😲', 0.9);
      const result = system.handleSurpriseRotation('😲', 0.9);
      expect(result).toBe(false);
    });
  });

  describe('handleHeadTiltMovement', () => {
    it('右に傾けると右移動を返す', () => {
      // 複数回同じ方向に傾けて安定性を確保
      system.handleHeadTiltMovement(0.15);
      system.handleHeadTiltMovement(0.15);
      const result = system.handleHeadTiltMovement(0.15);
      expect(result).toBe('right');
    });

    it('左に傾けると左移動を返す', () => {
      system.handleHeadTiltMovement(-0.15);
      system.handleHeadTiltMovement(-0.15);
      const result = system.handleHeadTiltMovement(-0.15);
      expect(result).toBe('left');
    });

    it('小さい傾きでは移動しない', () => {
      const result = system.handleHeadTiltMovement(0.02);
      expect(result).toBeNull();
    });
  });

  describe('adjustSensitivity', () => {
    it('子ども向けに感度を調整する', () => {
      system.adjustSensitivity(8, 'beginner');
      const config = system.getCurrentConfig();
      expect(config.rotationCooldown).toBe(1200);
      expect(config.stabilityRequired).toBe(4);
    });

    it('上級者向けに感度を調整する', () => {
      system.adjustSensitivity(25, 'advanced');
      const config = system.getCurrentConfig();
      expect(config.rotationCooldown).toBe(600);
      expect(config.stabilityRequired).toBe(2);
    });
  });

  describe('getOperationSuccessRate', () => {
    it('初期状態で成功率を返す', () => {
      const rates = system.getOperationSuccessRate();
      expect(rates.rotation).toBeGreaterThanOrEqual(0);
      expect(rates.movement).toBeGreaterThanOrEqual(0);
    });
  });
});
