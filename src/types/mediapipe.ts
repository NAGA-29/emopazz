/**
 * MediaPipe関連の型定義
 */

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface FaceMeshResults {
  multiFaceLandmarks: Landmark[][];
  image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement;
}

export interface HandsResults {
  multiHandLandmarks: Landmark[][];
  multiHandedness: Array<{
    index: number;
    score: number;
    label: string;
  }>;
  image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement;
}

export interface MediaPipeConfig {
  maxNumFaces?: number;
  maxNumHands?: number;
  refineLandmarks?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
  modelComplexity?: number;
}

// MediaPipe接続定数（既存のJavaScriptコードとの互換性のため）
export declare const FACEMESH_TESSELATION: Array<[number, number]>;
export declare const FACEMESH_FACE_OVAL: Array<[number, number]>;
export declare const FACEMESH_LIPS: Array<[number, number]>;
export declare const FACEMESH_LEFT_EYE: Array<[number, number]>;
export declare const FACEMESH_RIGHT_EYE: Array<[number, number]>;
export declare const FACEMESH_LEFT_EYEBROW: Array<[number, number]>;
export declare const FACEMESH_RIGHT_EYEBROW: Array<[number, number]>;
export declare const HAND_CONNECTIONS: Array<[number, number]>;

// MediaPipe描画関数（既存のJavaScriptコードとの互換性のため）
export declare function drawConnectors(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  connections: Array<[number, number]>,
  options?: {
    color?: string;
    lineWidth?: number;
  }
): void;

export declare function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  options?: {
    color?: string;
    lineWidth?: number;
    radius?: number;
  }
): void;

// MediaPipeクラス（既存のJavaScriptコードとの互換性のため）
export declare class FaceMesh {
  constructor(config: { locateFile: (file: string) => string });
  setOptions(options: MediaPipeConfig): void;
  onResults(callback: (results: FaceMeshResults) => void): void;
  send(input: { image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement }): Promise<void>;
}

export declare class Hands {
  constructor(config: { locateFile: (file: string) => string });
  setOptions(options: MediaPipeConfig): void;
  onResults(callback: (results: HandsResults) => void): void;
  send(input: { image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement }): Promise<void>;
}

export declare class Camera {
  constructor(
    videoElement: HTMLVideoElement,
    config: {
      onFrame: () => Promise<void>;
      width: number;
      height: number;
    }
  );
  start(): void;
  stop(): void;
}