const video = document.getElementById("camera");
const preview = document.getElementById("face-preview");
const previewCtx = preview.getContext("2d");
const statusText = document.getElementById("status");

let faceTiltDown = false;
let faceLean = "center";
let isFistPrev = false;
let lastHandDetectionTime = 0;
const handDetectionInterval = 100; // 100ミリ秒ごとに状態を更新
let lastHandDetectionState = false; // 前回の手の検出状態を保存
let cameraStream = null; // グローバルでカメラストリームを保持

// トップページ表示時にカメラを初期化
async function setupCameraOnTopPage() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = cameraStream;
    video.play(); // 明示的に再生
  } catch (e) {
    alert('カメラの使用が許可されませんでした');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  setupCameraOnTopPage();
  showTopPage();
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
  const fingers = [8, 12, 16, 20];
  let bentCount = 0;
  fingers.forEach((i) => {
    const dx = landmarks[i].x - palm.x;
    const dy = landmarks[i].y - palm.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.12) bentCount++;
  });
  return bentCount >= 2;
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

  hands.onResults((results) => {
    const now = Date.now();
    if (now - lastHandDetectionTime < handDetectionInterval) {
      return; // 前回の検出から一定時間経過していない場合はスキップ
    }
    lastHandDetectionTime = now;

    // カメラ映像を描画
    previewCtx.clearRect(0, 0, preview.width, preview.height);
    previewCtx.save();
    previewCtx.translate(preview.width, 0);
    previewCtx.scale(-1, 1);
    previewCtx.drawImage(video, 0, 0, preview.width, preview.height);
    previewCtx.restore();

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

    if (hasHands) {
      const lm = results.multiHandLandmarks[0];
      const isNowFist = isFist(lm);

      if (isNowFist && !isFistPrev) {
        window.rotate("right");
      }
      isFistPrev = isNowFist;
    } else {
      isFistPrev = false;
    }

    // 手のボーンを描画
    if (hasHands) {
      previewCtx.save();
      previewCtx.translate(preview.width, 0);
      previewCtx.scale(-1, 1);
      for (const landmarks of results.multiHandLandmarks) {
        // 手のボーンを描画
        drawConnectors(previewCtx, landmarks, HAND_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 2,
        });
        // 手のランドマークを描画
        drawLandmarks(previewCtx, landmarks, {
          color: "#FF0000",
          lineWidth: 1,
        });
      }
      previewCtx.restore();
    }
  });

  faceMesh.onResults((results) => {
    // カメラ映像を描画
    previewCtx.clearRect(0, 0, preview.width, preview.height);
    previewCtx.save();
    previewCtx.translate(preview.width, 0);
    previewCtx.scale(-1, 1);
    previewCtx.drawImage(video, 0, 0, preview.width, preview.height);
    previewCtx.restore();

    if (results.multiFaceLandmarks.length > 0) {
      const lm = results.multiFaceLandmarks[0];
      const leftCheekY = lm[234].y;
      const rightCheekY = lm[454].y;
      const tilt = rightCheekY - leftCheekY;

      // 顔の傾きの感度を調整（0.03から0.08に変更）
      if (tilt > 0.08) faceLean = "right";
      else if (tilt < -0.08) faceLean = "left";
      else faceLean = "center";

      const upperLip = lm[13];
      const lowerLip = lm[14];
      faceTiltDown = lowerLip.y - upperLip.y > 0.04;

      window.updateDropSpeed(faceTiltDown);
      statusText.textContent = `認識中: ${faceLean}${
        faceTiltDown ? " + 口開け(早落下)" : ""
      }`;

      // 顔メッシュを描画
      previewCtx.save();
      previewCtx.translate(preview.width, 0);
      previewCtx.scale(-1, 1);
      drawConnectors(previewCtx, lm, FACEMESH_TESSELATION, {
        color: "#C0C0C0",
        lineWidth: 1,
      });
      drawConnectors(previewCtx, lm, FACEMESH_FACE_OVAL, {
        color: "#E0E0E0",
        lineWidth: 2,
      });
      drawConnectors(previewCtx, lm, FACEMESH_LIPS, {
        color: "#E0E0E0",
        lineWidth: 2,
      });
      drawConnectors(previewCtx, lm, FACEMESH_LEFT_EYE, {
        color: "#E0E0E0",
        lineWidth: 2,
      });
      drawConnectors(previewCtx, lm, FACEMESH_RIGHT_EYE, {
        color: "#E0E0E0",
        lineWidth: 2,
      });
      drawConnectors(previewCtx, lm, FACEMESH_LEFT_EYEBROW, {
        color: "#E0E0E0",
        lineWidth: 2,
      });
      drawConnectors(previewCtx, lm, FACEMESH_RIGHT_EYEBROW, {
        color: "#E0E0E0",
        lineWidth: 2,
      });
      previewCtx.restore();
    }
  });

  // 自前ループ
  async function processFrame() {
    await hands.send({ image: video });
    await faceMesh.send({ image: video });
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