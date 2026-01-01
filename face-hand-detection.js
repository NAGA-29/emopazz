const video = document.getElementById("camera");
const preview = document.getElementById("face-preview");
const previewCtx = preview.getContext("2d");
const statusText = document.getElementById("status");
// トップ画面の表情表示要素を取得
const currentEmotionDisplay = document.getElementById("current-emotion-display");
const emotionParameters = document.getElementById("emotion-parameters");

let faceTiltDown = false;
let faceLean = "center";
let isFistPrev = false;
let lastHandDetectionTime = 0;
const handDetectionInterval = 200; // 50ミリ秒から200ミリ秒に延長して誤検出を減らす
let lastHandDetectionState = false; // 前回の手の検出状態を保存
let cameraStream = null; // グローバルでカメラストリームを保持
let currentEmotion = "😊"; // 現在の表情（デフォルトは笑顔）

// 検出結果を保存する変数を追加
let lastHandResults = null; // 最後に検出された手のランドマーク
let lastFaceResults = null; // 最後に検出された顔のランドマーク

// 前回の手のジェスチャー状態を保持するための変数を追加
let lastHandGesture = {
  timestamp: 0,
  isFist: false
};

// グーの検出に使用するクールダウン時間
const gestureDetectionCooldown = 500; // ミリ秒単位でのクールダウン時間、回転を連続して行いづらくする

// トップページ表示時にカメラを初期化
async function setupCameraOnTopPage() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = cameraStream;
    video.play(); // 明示的に再生
    
    // トップページ用のFaceMeshとHandsの初期化
    setupMediaPipeForTopPage();
  } catch (e) {
    alert('カメラの使用が許可されませんでした');
    // エラーメッセージを表示
    if (emotionParameters) {
      emotionParameters.textContent = "カメラが許可されていません：表情検出には許可が必要です";
    }
  }
}

// トップページ用のMediaPipe初期化
function setupMediaPipeForTopPage() {
  const faceMesh = new FaceMesh({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  });
  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  
  // 顔の検出ハンドラ - トップページ用
  faceMesh.onResults((results) => {
    // 検出結果を保存
    lastFaceResults = results;
    
    // 表情の検出と表示
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const lm = results.multiFaceLandmarks[0];
      
      // 表情検出パラメータの計算
      const params = window.EmotionDetector.calculateParams(lm);
      const emotionResult = window.EmotionDetector.detectEmotion(params);
      
      // 検出スコアが一定以上の場合のみ表情を更新 - 安定性も考慮
      if (emotionResult.isValid && emotionResult.isStable) {
        currentEmotion = emotionResult.emotion;
        
        // トップページの表情表示を更新
        if (currentEmotionDisplay) {
          currentEmotionDisplay.textContent = currentEmotion;
          // 安定度によって色を変更
          currentEmotionDisplay.style.backgroundColor = 
            emotionResult.isStable ? 'rgba(220, 255, 220, 0.85)' : 'rgba(255, 255, 255, 0.85)';
        }
      }
      
      // パラメータ情報を表示（常に最新の数値を表示）
      if (emotionParameters) {
        const formatNum = (num) => num.toFixed(3);
        emotionParameters.innerHTML = `
          <span class="param-item">口開き: ${formatNum(params.mouthOpenness)}</span>
          <span class="param-item">口角: ${formatNum(params.mouthCornerLift)}</span>
          <span class="param-item">左口角: ${formatNum(params.leftCornerLift)}</span>
          <span class="param-item">右口角: ${formatNum(params.rightCornerLift)}</span>
          <span class="param-item">曲線: ${formatNum(params.mouthCurvature)}</span>
        `;
        
        // 検出スコアも表示
        const scoresHtml = Object.entries(emotionResult.scores)
          .map(([emoji, score]) => `<span class="score-item">${emoji}:${score.toFixed(1)}</span>`)
          .join(' ');
        
        // 既存の内容に追加
        emotionParameters.innerHTML += `<div class="scores">${scoresHtml}</div>`;
        
        // 安定性カウンターも表示
        const stabilityText = emotionResult.isStable ? "安定" : "不安定";
        const stabilityClass = emotionResult.isStable ? "stable" : "unstable";
        emotionParameters.innerHTML += 
          `<div class="stability ${stabilityClass}">(${stabilityText}: ${emotionResult.stabilityCounter}/2)</div>`;
      }
    }
  });
  
  // カメラループの設定
  const camera = new Camera(video, {
    onFrame: async () => {
      await faceMesh.send({ image: video });
    },
    width: 320,
    height: 240,
  });
  
  camera.start();
}

window.addEventListener('DOMContentLoaded', () => {
  setupCameraOnTopPage();
  showTopPage();
  
  // CSSスタイルを動的に追加（表情パラメータ表示用）
  const style = document.createElement('style');
  style.textContent = `
    .emotion-display {
      font-size: 2.5em;
      background-color: rgba(255, 255, 255, 0.85);
      padding: 0.1em 0.3em;
      border-radius: 0.2em;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      position: relative;
      z-index: 10;
      transition: background-color 0.3s ease;
    }
    
    .emotion-parameter {
      background-color: rgba(255, 255, 255, 0.85);
      padding: 0.5em;
      border-radius: 0.5em;
      margin-top: 0.5em;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      font-size: 0.9em;
      position: relative;
      z-index: 10;
    }
    
    .param-item {
      background-color: rgba(240, 240, 255, 0.8);
      padding: 0.2em 0.4em;
      border-radius: 0.3em;
      margin: 0 0.2em;
      display: inline-block;
    }
    
    .scores {
      margin-top: 0.5em;
    }
    
    .score-item {
      background-color: rgba(255, 240, 240, 0.8);
      padding: 0.2em 0.4em;
      border-radius: 0.3em;
      margin: 0 0.2em;
      display: inline-block;
    }
    
    .stability {
      font-size: 0.8em;
      margin-top: 0.3em;
      color: #666;
    }
    
    .stable {
      color: green;
      font-weight: bold;
    }
    
    .unstable {
      color: #888;
    }
  `;
  document.head.appendChild(style);
});

// 画面切り替え用関数
function showTopPage() {
  document.getElementById('top-screen').style.display = 'flex';
  document.getElementById('game-container').style.display = 'none';
  document.getElementById('status').style.display = 'none';
}
function showGamePage() {
  document.getElementById('top-screen').style.display = 'none';
  document.getElementById('game-container').style.display = 'flex';
  document.getElementById('status').style.display = 'block';
}
function showCountdownAndStartGame(startCallback) {
  const countdownDiv = document.getElementById('countdown');
  const countdownNum = document.getElementById('countdown-number');
  countdownDiv.style.display = 'flex';
  let count = 3;
  countdownNum.textContent = count;
  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      countdownNum.textContent = count;
    } else {
      clearInterval(timer);
      countdownDiv.style.display = 'none';
      startCallback();
    }
  }, 1000);
}

function isFist(landmarks) {
  const palm = landmarks[0];
  const fingers = [8, 12, 16, 20]; // 指先のインデックス
  let bentCount = 0;
  
  // 指が曲がっているかどうかの判定を厳しくする
  fingers.forEach((i) => {
    const dx = landmarks[i].x - palm.x;
    const dy = landmarks[i].y - palm.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // 距離の閾値を0.15から0.12に厳しくして誤検出を減らす
    if (dist < 0.12) bentCount++;
  });
  
  // 必要な曲がった指の数を1本から3本に増やして、より明確なグーの形のみを検出
  return bentCount >= 3;
}

// ゲーム開始時はカメラ取得処理を絶対に呼ばない
async function setupCameraAndStartGame() {
  // MediaPipeセットアップ
  const faceMesh = new FaceMesh({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  });
  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  const hands = new Hands({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });
  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  // 手の検出ハンドラ - 検出結果を保存するだけにする
  hands.onResults((results) => {
    const now = Date.now();
    if (now - lastHandDetectionTime < handDetectionInterval) {
      return; // 前回の検出から一定時間経過していない場合はスキップ
    }
    lastHandDetectionTime = now;

    // 手の検出状態を確認
    const hasHands = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
    
    // 検出状態が変化した場合のみログを出力
    if (hasHands !== lastHandDetectionState) {
      if (hasHands) {
        console.log("手のランドマーク検出:", results.multiHandLandmarks.length);
        statusText.textContent = `手の検出: ${results.multiHandLandmarks.length}個`;
      } else {
        console.log("手のランドマーク未検出");
        statusText.textContent = "手の検出: なし";
      }
      lastHandDetectionState = hasHands;
    }

    // 検出結果を保存
    lastHandResults = results;

    // ジェスチャー認識処理
    if (hasHands) {
      const lm = results.multiHandLandmarks[0];
      const isNowFist = isFist(lm);

      // 新しいジェスチャー検出ロジック
      // 前回の状態と時間差を考慮
      const timeSinceLastGesture = now - lastHandGesture.timestamp;
      
      // グーパー（拳の状態変化）の検出とクールダウン時間設定
      // クールダウン時間以上経過していて、グーになった瞬間を検出
      if (timeSinceLastGesture > gestureDetectionCooldown && isNowFist && !lastHandGesture.isFist) {
        console.log("手のジェスチャー検出: グーになった");
        window.rotate("right");
        lastHandGesture = {
          timestamp: now,
          isFist: true
        };
      }
      // パーになった瞬間も記録（次のグーの検出のため）
      else if (!isNowFist && lastHandGesture.isFist) {
        lastHandGesture = {
          timestamp: now,
          isFist: false
        };
      }
      
      isFistPrev = isNowFist;
    } else {
      isFistPrev = false;
      // 手が検出されない場合も状態をリセット
      if (lastHandGesture.isFist) {
        lastHandGesture = {
          timestamp: now,
          isFist: false
        };
      }
    }
    
    // 描画は総合描画関数で行う
    drawDetectionResults();
  });

  // 顔の検出ハンドラ - 検出結果を保存するだけにする
  faceMesh.onResults((results) => {
    // 検出結果を保存
    lastFaceResults = results;
    
    // 顔の検出処理
    if (results.multiFaceLandmarks.length > 0) {
      const lm = results.multiFaceLandmarks[0];
      const leftCheekY = lm[234].y;
      const rightCheekY = lm[454].y;
      const tilt = rightCheekY - leftCheekY;

      // 顔の傾きの感度を調整（0.03から0.08に変更）
      if (tilt > 0.08) faceLean = "right";
      else if (tilt < -0.08) faceLean = "left";
      else faceLean = "center";

      // 表情検出パラメータの計算 - EmotionDetectorを使用
      const params = window.EmotionDetector.calculateParams(lm);
      
      // 口の開閉判定 - 明示的な閾値で判定
      faceTiltDown = params.mouthOpenness > 0.04; // 口を開けているかどうかの判定を明確に
      
      // 表情判定の実行
      const emotionResult = window.EmotionDetector.detectEmotion(params);
      
      // デバッグ情報をコンソールに出力
      console.log({
        mouthOpenness: params.mouthOpenness.toFixed(4),
        eyebrowY: params.eyebrowY.toFixed(4),
        mouthCornerLift: params.mouthCornerLift.toFixed(4),
        leftCornerLift: params.leftCornerLift.toFixed(4),
        rightCornerLift: params.rightCornerLift.toFixed(4),
        mouthCurvature: params.mouthCurvature.toFixed(4),
        currentEmotion
      });
      
      // デバッグ用に各表情スコアを記録
      console.log({
        surpriseScore: emotionResult.scores["😲"],
        angerScore: emotionResult.scores["😡"],
        sadnessScore: emotionResult.scores["😢"],
        happinessScore: emotionResult.scores["😊"],
        maxScore: emotionResult.maxScore,
        detectedEmotion: emotionResult.emotion,
        stabilityCounter: emotionResult.stabilityCounter,
        isStable: emotionResult.isStable
      });
      
      // 検出スコアが一定以上かつ安定している場合のみ表情を更新
      if (emotionResult.isValid && emotionResult.isStable) {
        currentEmotion = emotionResult.emotion;
      }
      
      // ステータス表示に現在の表情と各パラメータを追加（簡潔に）
      window.updateDropSpeed(faceTiltDown);
      const dropSpeedStatus = faceTiltDown ? "【早落下ON】" : "【通常速度】";
      statusText.textContent = `表情:${currentEmotion} ${dropSpeedStatus}
      口角:(${params.leftCornerLift.toFixed(3)}, ${params.rightCornerLift.toFixed(3)}) 曲線:${params.mouthCurvature.toFixed(3)}`;
    }
    
    // 描画は総合描画関数で行う
    drawDetectionResults();
  });

  // 描画用の統合関数 - 手と顔の検出結果を合成して描画
  function drawDetectionResults() {
    // キャンバスをクリア
    previewCtx.clearRect(0, 0, preview.width, preview.height);
    
    // カメラ映像を描画
    previewCtx.save();
    previewCtx.translate(preview.width, 0);
    previewCtx.scale(-1, 1);
    previewCtx.drawImage(video, 0, 0, preview.width, preview.height);
    previewCtx.restore();
    
    // 顔のメッシュを描画
    if (lastFaceResults && lastFaceResults.multiFaceLandmarks.length > 0) {
      const lm = lastFaceResults.multiFaceLandmarks[0];
      
      previewCtx.save();
      previewCtx.translate(preview.width, 0);
      previewCtx.scale(-1, 1);
      
      // 薄い顔メッシュを背景に表示
      drawConnectors(previewCtx, lm, FACEMESH_TESSELATION, {
        color: "#C0C0C080",
        lineWidth: 0.5,
      });
      
      // 主要な顔のパーツを強調表示
      drawConnectors(previewCtx, lm, FACEMESH_FACE_OVAL, {
        color: "#E0E0E0",
        lineWidth: 2,
      });
      
      // 口を赤色で強調表示（笑顔と驚きの検出用）
      drawConnectors(previewCtx, lm, FACEMESH_LIPS, {
        color: "#FF6060",
        lineWidth: 3,
      });
      
      // 目を青色で強調表示（驚きの検出用）
      drawConnectors(previewCtx, lm, FACEMESH_LEFT_EYE, {
        color: "#6060FF",
        lineWidth: 2,
      });
      drawConnectors(previewCtx, lm, FACEMESH_RIGHT_EYE, {
        color: "#6060FF",
        lineWidth: 2,
      });
      
      // 眉を緑色で強調表示（怒りと悲しみの検出用）
      drawConnectors(previewCtx, lm, FACEMESH_LEFT_EYEBROW, {
        color: "#60FF60",
        lineWidth: 3,
      });
      drawConnectors(previewCtx, lm, FACEMESH_RIGHT_EYEBROW, {
        color: "#60FF60",
        lineWidth: 3,
      });
      
      // 重要なポイントをマーク
      // 眉毛
      previewCtx.fillStyle = 'green';
      previewCtx.beginPath();
      previewCtx.arc(lm[285].x * preview.width, lm[285].y * preview.height, 4, 0, 2 * Math.PI);
      previewCtx.fill();
      previewCtx.beginPath();
      previewCtx.arc(lm[55].x * preview.width, lm[55].y * preview.height, 4, 0, 2 * Math.PI);
      previewCtx.fill();
      
      // 口
      previewCtx.fillStyle = 'red';
      previewCtx.beginPath();
      previewCtx.arc(lm[13].x * preview.width, lm[13].y * preview.height, 4, 0, 2 * Math.PI);
      previewCtx.fill();
      previewCtx.beginPath();
      previewCtx.arc(lm[14].x * preview.width, lm[14].y * preview.height, 4, 0, 2 * Math.PI);
      previewCtx.fill();
      
      // 笑顔検出用の口角マーカーを追加
      previewCtx.fillStyle = 'orange';
      // 左口角
      previewCtx.beginPath();
      previewCtx.arc(lm[61].x * preview.width, lm[61].y * preview.height, 4, 0, 2 * Math.PI);
      previewCtx.fill();
      // 右口角
      previewCtx.beginPath();
      previewCtx.arc(lm[291].x * preview.width, lm[291].y * preview.height, 4, 0, 2 * Math.PI);
      previewCtx.fill();
      
      // 口の中心を表示
      previewCtx.fillStyle = 'yellow';
      const params = window.EmotionDetector.calculateParams(lm);
      const mouthCenterX = (params.mouthCornerLeft.x + params.mouthCornerRight.x) / 2;
      const mouthCenterY = (params.mouthCornerLeft.y + params.mouthCornerRight.y) / 2;
      previewCtx.beginPath();
      previewCtx.arc(mouthCenterX * preview.width, mouthCenterY * preview.height, 3, 0, 2 * Math.PI);
      previewCtx.fill();
      
      // 表情のビジュアル化を実行
      window.EmotionDetector.visualize(previewCtx, lm, params, 
        window.EmotionDetector.detectEmotion(params), 
        preview.width, preview.height);
      
      previewCtx.restore();
    }
    
    // 手のボーンとランドマークを描画
    if (lastHandResults && lastHandResults.multiHandLandmarks && lastHandResults.multiHandLandmarks.length > 0) {
      previewCtx.save();
      previewCtx.translate(preview.width, 0);
      previewCtx.scale(-1, 1);
      
      for (const landmarks of lastHandResults.multiHandLandmarks) {
        // 手のボーン（接続線）を描画 - 色と太さを調整
        drawConnectors(previewCtx, landmarks, HAND_CONNECTIONS, {
          color: "#00FF00", // 緑色
          lineWidth: 2,
        });
        
        // 手のランドマーク（点）を描画
        drawLandmarks(previewCtx, landmarks, {
          color: "#FF0000", // 赤色
          lineWidth: 1,
          radius: 3 // ポイントのサイズを大きくして見やすく
        });
      }
      previewCtx.restore();
    }
  }

  // 自前ループ
  async function processFrame() {
    try {
      await hands.send({ image: video });
      await faceMesh.send({ image: video });
    } catch (error) {
      console.error("フレーム処理エラー:", error);
    }
    requestAnimationFrame(processFrame);
  }

  showGamePage();
  requestAnimationFrame(processFrame);
}

document.getElementById("start-button").onclick = () => {
  showCountdownAndStartGame(() => {
    setupCameraAndStartGame();
    startGame();
  });
};

// ゲームオーバー時にトップページへ戻る用の関数をグローバル化
document.showTopPage = showTopPage;

// 現在の表情を外部から取得できるようにグローバル化
window.getCurrentEmotion = function() {
  return currentEmotion;
};