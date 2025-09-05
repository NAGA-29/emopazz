/**
 * MediaPipe関連の型定義
 */

export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

export interface FaceMeshResults {
  multiFaceLandmarks: Landmark[][];
  image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
}

export interface HandsResults {
  multiHandLandmarks: Landmark[][];
  multiHandedness: Array<{
    index: number;
    score: number;
    label: string;
  }>;
  image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
}

export interface MediaPipeConfig {
  maxNumFaces?: number;
  maxNumHands?: number;
  refineLandmarks?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
  modelComplexity?: number;
}

export interface DrawingOptions {
  color?: string;
  lineWidth?: number;
  radius?: number;
}

// MediaPipeのグローバル関数の型定義
declare global {
  const FaceMesh: new (config: { locateFile: (file: string) => string }) => {
    setOptions: (options: MediaPipeConfig) => void;
    onResults: (callback: (results: FaceMeshResults) => void) => void;
    send: (input: {
      image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
    }) => Promise<void>;
  };

  const Hands: new (config: { locateFile: (file: string) => string }) => {
    setOptions: (options: MediaPipeConfig) => void;
    onResults: (callback: (results: HandsResults) => void) => void;
    send: (input: {
      image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
    }) => Promise<void>;
  };

  const Camera: new (
    video: HTMLVideoElement,
    config: {
      onFrame: () => Promise<void>;
      width: number;
      height: number;
    }
  ) => {
    start: () => void;
    stop: () => void;
  };

  function drawConnectors(
    ctx: CanvasRenderingContext2D,
    landmarks: Landmark[],
    connections: number[][],
    options?: DrawingOptions
  ): void;

  function drawLandmarks(
    ctx: CanvasRenderingContext2D,
    landmarks: Landmark[],
    options?: DrawingOptions
  ): void;

  // MediaPipeの定数
  const FACEMESH_TESSELATION: number[][];
  const FACEMESH_FACE_OVAL: number[][];
  const FACEMESH_LIPS: number[][];
  const FACEMESH_LEFT_EYE: number[][];
  const FACEMESH_RIGHT_EYE: number[][];
  const FACEMESH_LEFT_EYEBROW: number[][];
  const FACEMESH_RIGHT_EYEBROW: number[][];
  const HAND_CONNECTIONS: number[][];
}
