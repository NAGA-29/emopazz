/**
 * ゲーム関連の型定義
 */

export type EmotionType = '😊' | '😡' | '😢' | '😲' | '❓';

export interface BlockType {
  type: EmotionType;
  displayType?: EmotionType; // ?ブロック用の表示タイプ
  erasing?: boolean;
  eraseTimer?: number;
  justPlaced?: boolean;
}

export interface BlockPair {
  blocks: Array<{
    x: number;
    y: number;
    type: EmotionType;
    displayType?: EmotionType;
  }>;
}

export interface GameState {
  score: number;
  board: Array<Array<BlockType | null>>;
  fallingPair: BlockPair | null;
  nextPair: BlockPair | null;
  currentEmotion: EmotionType;
  dropInterval: number;
  lastDropTime: number;
  lastMoveTime: number;
  gameRunning: boolean;
}

export interface GameConfig {
  boardWidth: number;
  boardHeight: number;
  blockSize: number;
  moveDelay: number;
  enabledEmojis: EmotionType[];
}

export interface RankingEntry {
  score: number;
  faceImage: string;
  date: string;
}

export interface GameSession {
  id: string;
  startTime: number;
  endTime?: number;
  finalScore: number;
  maxChain: number;
}

export interface PerformanceMetrics {
  averageScore: number;
  maxChain: number;
  playTime: number;
  emotionAccuracy: Record<EmotionType, number>;
}

export type MovementDirection = 'left' | 'right' | 'center';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
