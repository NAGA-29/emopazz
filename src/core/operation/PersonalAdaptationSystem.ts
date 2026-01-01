/**
 * 個人適応システム
 * プレイヤーの操作パターンを学習し、個人に最適化された設定を提供
 */

import { OperationControl, OperationHistory, SensitivitySuggestion } from './SmartControlSystem.js';
import { SkillLevel } from '../../types/game.js';

export interface PlayerProfile {
  playerId: string;
  age?: number;
  skillLevel: SkillLevel;
  totalPlayTime: number;
  gamesPlayed: number;
  averageScore: number;
  preferredSettings: OperationControl;
  lastUpdated: number;
}

export interface OperationPattern {
  rotationFrequency: number;      // 回転操作の頻度（回/分）
  movementAccuracy: number;       // 移動操作の精度（0-1）
  reactionTime: number;           // 平均反応時間（ミリ秒）
  preferredCooldown: number;      // 好みのクールダウン時間
  stabilityPreference: number;    // 安定性の好み（1-5）
}

export interface LearningData {
  sessionId: string;
  timestamp: number;
  operations: OperationHistory[];
  gameScore: number;
  playDuration: number;
  playerSatisfaction?: number;    // プレイヤーの満足度（1-5、オプション）
}

/**
 * 個人適応システムのメインクラス
 */
export class PersonalAdaptationSystem {
  private playerProfiles: Map<string, PlayerProfile> = new Map();
  private learningData: LearningData[] = [];
  private currentPlayerId: string | null = null;
  private maxLearningDataSize: number = 50;

  constructor() {
    this.loadPlayerProfiles();
    this.loadLearningData();
  }

  /**
   * プレイヤーの操作パターンを学習
   * @param playerId プレイヤーID
   * @param operations 操作履歴
   */
  public learnPlayerPattern(playerId: string, operations: OperationHistory[]): void {
    this.getOrCreatePlayerProfile(playerId);
    
    // 操作パターンを分析
    const pattern = this.analyzeOperationPattern(operations);
    
    // プロファイルを更新
    this.updatePlayerProfile(playerId, pattern, operations);
    
    // 学習データを保存
    this.storeLearningData({
      sessionId: this.generateSessionId(),
      timestamp: Date.now(),
      operations: [...operations],
      gameScore: 0, // ゲームスコアは別途設定
      playDuration: this.calculatePlayDuration(operations)
    });
  }

  /**
   * 個人に最適化された感度設定を取得
   * @param playerId プレイヤーID
   * @returns 最適化された操作制御設定
   */
  public getOptimalSensitivity(playerId: string): OperationControl {
    const profile = this.playerProfiles.get(playerId);
    
    if (!profile) {
      // 新規プレイヤーの場合はデフォルト設定
      return this.getDefaultSettings();
    }
    
    // 学習データに基づいて最適化された設定を計算
    const optimizedSettings = this.calculateOptimalSettings(profile);
    
    return optimizedSettings;
  }

  /**
   * 操作の成功率を追跡
   * @param operation 操作タイプ
   * @param success 成功したかどうか
   */
  public trackOperationSuccess(operation: 'rotation' | 'movement', success: boolean): void {
    if (!this.currentPlayerId) return;
    
    const profile = this.getOrCreatePlayerProfile(this.currentPlayerId);
    
    // 成功率の統計を更新
    if (operation === 'rotation') {
      profile.preferredSettings.intentionConfidence = this.adjustConfidence(
        profile.preferredSettings.intentionConfidence,
        success
      );
    } else if (operation === 'movement') {
      profile.preferredSettings.stabilityRequired = this.adjustStability(
        profile.preferredSettings.stabilityRequired,
        success
      );
    }
    
    profile.lastUpdated = Date.now();
    this.savePlayerProfiles();
  }

  /**
   * 自動調整提案を生成
   * @param playerId プレイヤーID
   * @returns 調整提案
   */
  public suggestSensitivityAdjustment(playerId?: string): SensitivitySuggestion {
    const targetPlayerId = playerId || this.currentPlayerId;
    
    if (!targetPlayerId) {
      return {
        rotationCooldown: 800,
        movementStability: 3,
        reason: 'プレイヤーが特定されていません'
      };
    }
    
    const profile = this.playerProfiles.get(targetPlayerId);
    
    if (!profile || profile.gamesPlayed < 3) {
      return {
        rotationCooldown: 800,
        movementStability: 3,
        reason: 'データが不足しています。もう少しプレイしてください'
      };
    }
    
    return this.generatePersonalizedSuggestion(profile);
  }

  /**
   * プレイヤープロファイルを設定
   * @param playerId プレイヤーID
   * @param age 年齢（オプション）
   * @param skillLevel スキルレベル
   */
  public setPlayerProfile(playerId: string, age?: number, skillLevel?: SkillLevel): void {
    this.currentPlayerId = playerId;
    
    const profile = this.getOrCreatePlayerProfile(playerId);
    
    if (age !== undefined) {
      profile.age = age;
    }
    
    if (skillLevel !== undefined) {
      profile.skillLevel = skillLevel;
    }
    
    // 年齢とスキルレベルに基づいて初期設定を調整
    profile.preferredSettings = this.getAgeAndSkillBasedSettings(age, skillLevel || 'beginner');
    
    profile.lastUpdated = Date.now();
    this.savePlayerProfiles();
  }

  /**
   * 現在のプレイヤーIDを設定
   */
  public setCurrentPlayer(playerId: string): void {
    this.currentPlayerId = playerId;
  }

  /**
   * プレイヤープロファイルを取得または作成
   */
  private getOrCreatePlayerProfile(playerId: string): PlayerProfile {
    let profile = this.playerProfiles.get(playerId);
    
    if (!profile) {
      profile = {
        playerId,
        skillLevel: 'beginner',
        totalPlayTime: 0,
        gamesPlayed: 0,
        averageScore: 0,
        preferredSettings: this.getDefaultSettings(),
        lastUpdated: Date.now()
      };
      
      this.playerProfiles.set(playerId, profile);
    }
    
    return profile;
  }

  /**
   * 操作パターンを分析
   */
  private analyzeOperationPattern(operations: OperationHistory[]): OperationPattern {
    const rotationOps = operations.filter(op => op.type === 'rotation');
    const movementOps = operations.filter(op => op.type === 'movement');
    
    // 時間範囲を計算
    const timeSpan = operations.length > 0 ? 
      (operations[operations.length - 1]!.timestamp - operations[0]!.timestamp) / 1000 / 60 : 1; // 分
    
    // 回転頻度（回/分）
    const rotationFrequency = rotationOps.length / Math.max(timeSpan, 1);
    
    // 移動操作の精度
    const movementAccuracy = movementOps.length > 0 ? 
      movementOps.filter(op => op.success).length / movementOps.length : 0.5;
    
    // 平均反応時間（操作間隔から推定）
    const intervals = operations.slice(1).map((op, i) => 
      op.timestamp - operations[i]!.timestamp
    );
    const reactionTime = intervals.length > 0 ? 
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length : 1000;
    
    // 好みのクールダウン時間（回転操作の間隔から推定）
    const rotationIntervals = rotationOps.slice(1).map((op, i) => 
      op.timestamp - rotationOps[i]!.timestamp
    );
    const preferredCooldown = rotationIntervals.length > 0 ?
      Math.max(rotationIntervals.reduce((sum, interval) => sum + interval, 0) / rotationIntervals.length, 400) : 800;
    
    // 安定性の好み（移動操作の成功率から推定）
    const stabilityPreference = Math.ceil(movementAccuracy * 5);
    
    return {
      rotationFrequency,
      movementAccuracy,
      reactionTime,
      preferredCooldown,
      stabilityPreference
    };
  }

  /**
   * プレイヤープロファイルを更新
   */
  private updatePlayerProfile(playerId: string, pattern: OperationPattern, operations: OperationHistory[]): void {
    const profile = this.getOrCreatePlayerProfile(playerId);
    
    // ゲーム数を増加
    profile.gamesPlayed++;
    
    // プレイ時間を更新
    const sessionDuration = this.calculatePlayDuration(operations);
    profile.totalPlayTime += sessionDuration;
    
    // 設定を学習データに基づいて調整
    profile.preferredSettings.rotationCooldown = Math.round(
      (profile.preferredSettings.rotationCooldown + pattern.preferredCooldown) / 2
    );
    
    profile.preferredSettings.stabilityRequired = Math.round(
      (profile.preferredSettings.stabilityRequired + pattern.stabilityPreference) / 2
    );
    
    // 移動感度を調整
    profile.preferredSettings.movementSensitivity = 
      pattern.movementAccuracy > 0.8 ? 1.2 : 
      pattern.movementAccuracy < 0.5 ? 0.8 : 1.0;
    
    // 信頼度を調整
    profile.preferredSettings.intentionConfidence = Math.max(0.6, Math.min(0.9, 
      pattern.movementAccuracy * 0.8 + 0.2
    ));
    
    profile.lastUpdated = Date.now();
    this.savePlayerProfiles();
  }

  /**
   * 最適化された設定を計算
   */
  private calculateOptimalSettings(profile: PlayerProfile): OperationControl {
    const settings = { ...profile.preferredSettings };
    
    // 年齢による調整
    if (profile.age && profile.age <= 10) {
      settings.rotationCooldown = Math.max(settings.rotationCooldown, 1000);
      settings.stabilityRequired = Math.max(settings.stabilityRequired, 3);
      settings.intentionConfidence = Math.max(settings.intentionConfidence, 0.7);
    }
    
    // スキルレベルによる調整
    switch (profile.skillLevel) {
      case 'beginner':
        settings.rotationCooldown = Math.max(settings.rotationCooldown, 900);
        settings.stabilityRequired = Math.max(settings.stabilityRequired, 3);
        break;
      case 'advanced':
        settings.rotationCooldown = Math.min(settings.rotationCooldown, 600);
        settings.stabilityRequired = Math.min(settings.stabilityRequired, 2);
        settings.intentionConfidence = Math.min(settings.intentionConfidence, 0.85);
        break;
    }
    
    // 経験による調整
    if (profile.gamesPlayed > 10) {
      // 経験豊富なプレイヤーはより敏感な設定
      settings.rotationCooldown *= 0.9;
      settings.movementSensitivity *= 1.1;
    }
    
    return settings;
  }

  /**
   * 年齢とスキルレベルに基づく初期設定
   */
  private getAgeAndSkillBasedSettings(age?: number, skillLevel: SkillLevel = 'beginner'): OperationControl {
    let settings = this.getDefaultSettings();
    
    // 年齢による調整
    if (age && age <= 10) {
      settings.rotationCooldown = 1200;
      settings.stabilityRequired = 4;
      settings.movementSensitivity = 0.8;
      settings.intentionConfidence = 0.7;
    } else if (age && age <= 16) {
      settings.rotationCooldown = 1000;
      settings.stabilityRequired = 3;
      settings.movementSensitivity = 0.9;
      settings.intentionConfidence = 0.75;
    }
    
    // スキルレベルによる調整
    switch (skillLevel) {
      case 'beginner':
        settings.rotationCooldown = Math.max(settings.rotationCooldown, 1000);
        settings.stabilityRequired = Math.max(settings.stabilityRequired, 3);
        break;
      case 'intermediate':
        // デフォルト設定を使用
        break;
      case 'advanced':
        settings.rotationCooldown = Math.min(settings.rotationCooldown, 600);
        settings.stabilityRequired = Math.min(settings.stabilityRequired, 2);
        settings.movementSensitivity = Math.min(settings.movementSensitivity * 1.2, 1.5);
        settings.intentionConfidence = 0.85;
        break;
    }
    
    return settings;
  }

  /**
   * デフォルト設定を取得
   */
  private getDefaultSettings(): OperationControl {
    return {
      rotationCooldown: 800,
      movementSensitivity: 1.0,
      stabilityRequired: 3,
      intentionConfidence: 0.8
    };
  }

  /**
   * 個人化された提案を生成
   */
  private generatePersonalizedSuggestion(profile: PlayerProfile): SensitivitySuggestion {
    const recentData = this.learningData
      .filter(data => data.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000) // 過去1週間
      .slice(-10); // 最新10セッション
    
    if (recentData.length === 0) {
      return {
        rotationCooldown: profile.preferredSettings.rotationCooldown,
        movementStability: profile.preferredSettings.stabilityRequired,
        reason: '最近のデータがありません'
      };
    }
    
    // 成功率を分析
    const allOperations = recentData.flatMap(data => data.operations);
    const rotationSuccess = allOperations.filter(op => op.type === 'rotation' && op.success).length /
                           Math.max(allOperations.filter(op => op.type === 'rotation').length, 1);
    const movementSuccess = allOperations.filter(op => op.type === 'movement' && op.success).length /
                           Math.max(allOperations.filter(op => op.type === 'movement').length, 1);
    
    let suggestion: SensitivitySuggestion = {
      rotationCooldown: profile.preferredSettings.rotationCooldown,
      movementStability: profile.preferredSettings.stabilityRequired,
      reason: '現在の設定が最適です'
    };
    
    // 回転操作の調整提案
    if (rotationSuccess < 0.6) {
      suggestion.rotationCooldown = Math.min(profile.preferredSettings.rotationCooldown + 200, 1500);
      suggestion.reason = '回転操作の成功率向上のため、クールダウン時間を延長することをお勧めします';
    } else if (rotationSuccess > 0.9 && profile.gamesPlayed > 5) {
      suggestion.rotationCooldown = Math.max(profile.preferredSettings.rotationCooldown - 100, 400);
      suggestion.reason = '回転操作が安定しているため、より敏感な設定で快適性を向上できます';
    }
    
    // 移動操作の調整提案
    if (movementSuccess < 0.6) {
      suggestion.movementStability = Math.min(profile.preferredSettings.stabilityRequired + 1, 5);
      suggestion.reason = '移動操作の精度向上のため、安定性要件を厳しくすることをお勧めします';
    } else if (movementSuccess > 0.9 && profile.gamesPlayed > 5) {
      suggestion.movementStability = Math.max(profile.preferredSettings.stabilityRequired - 1, 2);
      suggestion.reason = '移動操作が安定しているため、より敏感な設定で快適性を向上できます';
    }
    
    return suggestion;
  }

  /**
   * 信頼度を調整
   */
  private adjustConfidence(current: number, success: boolean): number {
    const adjustment = success ? 0.02 : -0.02;
    return Math.max(0.5, Math.min(0.95, current + adjustment));
  }

  /**
   * 安定性要件を調整
   */
  private adjustStability(current: number, success: boolean): number {
    const adjustment = success ? -0.1 : 0.1;
    return Math.max(2, Math.min(5, Math.round(current + adjustment)));
  }

  /**
   * プレイ時間を計算
   */
  private calculatePlayDuration(operations: OperationHistory[]): number {
    if (operations.length < 2) return 0;
    return operations[operations.length - 1]!.timestamp - operations[0]!.timestamp;
  }

  /**
   * セッションIDを生成
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 学習データを保存
   */
  private storeLearningData(data: LearningData): void {
    this.learningData.push(data);
    
    // データサイズを制限
    if (this.learningData.length > this.maxLearningDataSize) {
      this.learningData = this.learningData.slice(-this.maxLearningDataSize);
    }
    
    this.saveLearningData();
  }

  /**
   * プレイヤープロファイルをローカルストレージから読み込み
   */
  private loadPlayerProfiles(): void {
    try {
      const saved = localStorage.getItem('emopazz_player_profiles');
      if (saved) {
        const profiles = JSON.parse(saved) as Array<[string, PlayerProfile]>;
        this.playerProfiles = new Map(profiles);
      }
    } catch (error) {
      console.error('プレイヤープロファイルの読み込みに失敗しました:', error);
    }
  }

  /**
   * プレイヤープロファイルをローカルストレージに保存
   */
  private savePlayerProfiles(): void {
    try {
      const profiles = Array.from(this.playerProfiles.entries());
      localStorage.setItem('emopazz_player_profiles', JSON.stringify(profiles));
    } catch (error) {
      console.error('プレイヤープロファイルの保存に失敗しました:', error);
    }
  }

  /**
   * 学習データをローカルストレージに保存
   */
  private saveLearningData(): void {
    try {
      localStorage.setItem('emopazz_learning_data', JSON.stringify(this.learningData));
    } catch (error) {
      console.error('学習データの保存に失敗しました:', error);
    }
  }

  /**
   * 学習データをローカルストレージから読み込み
   */
  private loadLearningData(): void {
    try {
      const saved = localStorage.getItem('emopazz_learning_data');
      if (saved) {
        this.learningData = JSON.parse(saved) as LearningData[];
      }
    } catch (error) {
      
    }
  }

  /**
   * 統計情報を取得
   */
  public getPlayerStatistics(playerId: string): PlayerProfile | null {
    return this.playerProfiles.get(playerId) || null;
  }

  /**
   * 全プレイヤーの統計を取得
   */
  public getAllPlayerStatistics(): PlayerProfile[] {
    return Array.from(this.playerProfiles.values());
  }
}