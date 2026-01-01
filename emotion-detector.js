// 表情判定モジュール
// 表情検出に関するロジックとパラメータを管理するためのファイル
// 微調整が必要なパラメータを一元管理することで、調整を容易にします

// 感度設定の初期値
const sensitivitySettings = {
  "😊": 3,  // 笑顔 - 初期値は普通(3)
  "😡": 3,  // 怒り
  "😢": 3,  // 悲しみ
  "😲": 3   // 驚き
};

// 感度によるスコア倍率調整テーブル
const sensitivityMultipliers = {
  1: 0.5,   // とても低い: 0.5倍
  2: 0.75,  // 低い: 0.75倍
  3: 1.0,   // 普通: 1.0倍
  4: 1.5,   // 高い: 1.5倍
  5: 2.0    // とても高い: 2.0倍
};

// 表情判定のしきい値 - 調整用
const EmotionThresholds = {
  // 驚きの表情検出閾値
  surprise: {
    mouthOpenness: 0.04,    // 口の開き具合（0.03から0.04に増加）
    eyeOpenness: 0.02       // 目の開き具合（0.018から0.02に増加）
  },
  // 怒りの表情検出閾値
  anger: {
    eyebrowY: 0.22,         // 眉の高さ
    eyebrowAngle: -0.02,    // 眉の角度
    mouthOpenness: 0.01,    // 口の閉じ具合
    eyebrowDistance: 0.06,  // 眉間の距離
    eyebrowDistanceMild: 0.08, // 眉間の距離
    mouthCurvature: -0.009   // 口角の下がり具合
  },
  // 悲しみの表情検出閾値 - より厳しく調整
  sadness: {
    mouthOpennessMin: 0.018,  // 口の開き具合（最小）
    mouthOpennessMax: 0.035,   // 口の開き具合（最大）
    eyebrowY: 0.31,           // 眉の高さ（0.29から0.31にさらに引き上げてより厳しく）
    mouthCurvatureMin: -0.018  // 口角の下がり具合の閾値（より明確に下がっている必要がある）
  },
  // 笑顔の表情検出閾値 - 感度向上のために全体的に閾値を下げる
  happiness: {
    mouthWidth: 0.19,       // 口の横幅（0.21から0.19に緩和）
    mouthCornerLift: 0.008,  // 口角の上がり具合（弱）（0.011から0.008に緩和）
    mouthCornerLiftStrong: 0.014, // 口角の上がり具合（強）（0.018から0.014に緩和）
    eyeOpenness: 0.018,     // 笑顔時の目の細まり（値を大きくして条件を緩和）
    mouthCurvature: 0.004    // 口の形状の上向き具合（0.006から0.004に緩和）
  },
  // 表情判定の最小スコア - 値を下げて反応をよくする
  minDetectionScore: 3.5
};

// 表情の安定化処理用の変数
let lastDetectedEmotion = null;
let emotionStabilityCounter = 0;
const EMOTION_STABILITY_THRESHOLD = 2; // この回数連続で同じ表情が検出されたら表情を切り替える

/**
 * 感度設定を更新する関数
 * @param {string} emotion 表情の種類（"😊", "😡", "😢", "😲"）
 * @param {number} level 感度レベル（1-5）
 */
function updateSensitivity(emotion, level) {
  if (level >= 1 && level <= 5) {
    sensitivitySettings[emotion] = level;
  }
}

// ローカルストレージからの感度設定の読み込み
function loadSensitivitySettings() {
  const saved = localStorage.getItem('emopazz_sensitivity');
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      for (const [emotion, level] of Object.entries(settings)) {
        if (sensitivitySettings.hasOwnProperty(emotion) && level >= 1 && level <= 5) {
          sensitivitySettings[emotion] = level;
        }
      }
    } catch (e) {
      console.error('感度設定の読み込みに失敗しました', e);
    }
  }
}

// ローカルストレージへの感度設定の保存
function saveSensitivitySettings() {
  try {
    localStorage.setItem('emopazz_sensitivity', JSON.stringify(sensitivitySettings));
  } catch (e) {
    console.error('感度設定の保存に失敗しました', e);
  }
}

// 初期ロード
loadSensitivitySettings();

/**
 * ランドマークから表情パラメータを計算する関数
 * @param {Array} lm MediaPipeのFaceMeshランドマーク
 * @returns {Object} 表情パラメータオブジェクト
 */
function calculateEmotionParams(lm) {
  // 口の開き具合
  const upperLip = lm[13];
  const lowerLip = lm[14];
  const mouthOpenness = lowerLip.y - upperLip.y;
  
  // 眉毛の位置
  const leftEyebrowInnerY = lm[336].y;
  const leftEyebrowOuterY = lm[296].y;
  const rightEyebrowInnerY = lm[107].y;
  const rightEyebrowOuterY = lm[67].y;
  const eyebrowY = (leftEyebrowInnerY + leftEyebrowOuterY + rightEyebrowInnerY + rightEyebrowOuterY) / 4;
  
  // 眉の角度
  const leftEyebrowAngle = leftEyebrowOuterY - leftEyebrowInnerY;
  const rightEyebrowAngle = rightEyebrowOuterY - rightEyebrowInnerY;
  const eyebrowAngle = (leftEyebrowAngle + rightEyebrowAngle) / 2;
  
  // 目の開き具合
  const leftEyeUpperY = lm[159].y;
  const leftEyeLowerY = lm[145].y;
  const rightEyeUpperY = lm[386].y;
  const rightEyeLowerY = lm[374].y;
  const leftEyeOpenness = leftEyeLowerY - leftEyeUpperY;
  const rightEyeOpenness = rightEyeLowerY - rightEyeUpperY;
  const eyeOpenness = (leftEyeOpenness + rightEyeOpenness) / 2;
  
  // 口の横幅
  const mouthLeftX = lm[61].x;
  const mouthRightX = lm[291].x;
  const mouthWidth = mouthRightX - mouthLeftX;
  
  // 口の形状 - 改善: より多くのポイントを使って口の形状を正確に測定
  const mouthLeftY = lm[61].y;
  const mouthRightY = lm[291].y;
  const mouthTopY = lm[0].y;
  const mouthBottomY = lm[17].y; // 口の下部ポイントを追加
  const mouthCurvature = ((mouthLeftY + mouthRightY) / 2) - ((mouthTopY + mouthBottomY) / 2);
  
  // 口角の位置の計算を改善 - より正確に
  const mouthCornerLeft = lm[61];
  const mouthCornerRight = lm[291];
  const mouthTopPoint = lm[13]; // 上唇の中央点を使用
  const mouthBottomPoint = lm[14]; // 下唇の中央点を使用
  
  // 口の中心を上下の唇の中央に基づいて計算
  const mouthCenter = {
    x: (mouthCornerLeft.x + mouthCornerRight.x) / 2,
    y: (mouthTopPoint.y + mouthBottomPoint.y) / 2
  };
  
  // 口角の上がり具合の計算を改善
  // 左右の口角が中心線より上にあるほど大きな正の値になる
  const leftCornerLift = mouthCenter.y - mouthCornerLeft.y;
  const rightCornerLift = mouthCenter.y - mouthCornerRight.y;
  // 左右の平均に加えて、より小さい方を重視して笑顔をより確実に検出
  const mouthCornerLift = Math.min(leftCornerLift, rightCornerLift) * 0.7 + 
                         ((leftCornerLift + rightCornerLift) / 2) * 0.3;
  
  // 眉間の距離
  const leftEyebrowInner = lm[336];
  const rightEyebrowInner = lm[107];
  const eyebrowDistance = Math.abs(rightEyebrowInner.x - leftEyebrowInner.x);
  
  // デバッグのために追加のパラメータを返す
  return {
    mouthOpenness,
    eyebrowY,
    eyebrowAngle,
    eyeOpenness,
    mouthWidth,
    mouthCurvature,
    mouthCornerLift,
    leftCornerLift,    // 左口角の上がりを追加
    rightCornerLift,   // 右口角の上がりを追加
    eyebrowDistance,
    mouthCenter,
    mouthCornerLeft,
    mouthCornerRight,
    leftEyebrowInner,
    rightEyebrowInner
  };
}

/**
 * 表情スコアを計算する関数
 * @param {Object} params calculateEmotionParamsで計算された表情パラメータ
 * @returns {Object} 各表情のスコア
 */
function calculateEmotionScores(params) {
  const { 
    mouthOpenness, eyebrowY, eyebrowAngle, eyeOpenness, 
    mouthWidth, mouthCurvature, mouthCornerLift, eyebrowDistance,
    leftCornerLift, rightCornerLift // 左右の口角も個別に使用
  } = params;
  
  // 各感情のスコア初期化
  let emotionScores = {
    "😲": 0, // 驚き
    "😡": 0, // 怒り
    "😢": 0, // 悲しみ
    "😊": 0  // 笑顔
  };
  
  // 驚き: 口が大きく開いて、目も開いている
  if (mouthOpenness > EmotionThresholds.surprise.mouthOpenness) emotionScores["😲"] += 2;
  if (eyeOpenness > EmotionThresholds.surprise.eyeOpenness) emotionScores["😲"] += 2;
  // 驚きの追加条件: 口が大きく開いていると強い驚き
  if (mouthOpenness > EmotionThresholds.surprise.mouthOpenness * 1.5) emotionScores["😲"] += 2;
  
  // 怒り: 眉が下がっていて、眉が内側に下がる角度がある
  if (eyebrowY < EmotionThresholds.anger.eyebrowY) emotionScores["😡"] += 2;
  if (eyebrowAngle < EmotionThresholds.anger.eyebrowAngle) emotionScores["😡"] += 2;
  if (mouthOpenness < EmotionThresholds.anger.mouthOpenness) emotionScores["😡"] += 1;
  
  // 眉間の距離（眉が近いほど怒りの可能性が高い）
  if (eyebrowDistance < EmotionThresholds.anger.eyebrowDistance) emotionScores["😡"] += 2;
  if (eyebrowDistance < EmotionThresholds.anger.eyebrowDistanceMild) emotionScores["😡"] += 1;
  
  // 口を結んでいる（口角が下がっている）場合も怒りの特徴
  if (mouthCurvature < EmotionThresholds.anger.mouthCurvature) emotionScores["😡"] += 1;
  
  // 悲しみ判定: 口角の下がりを最も重視するよう変更
  const sadThresholds = EmotionThresholds.sadness;
  
  // 口角が明確に下がっている場合のみスコア加算（必須条件）
  if (mouthCurvature < sadThresholds.mouthCurvatureMin) {
    emotionScores["😢"] += 3; // 口角が明確に下がっていることを最重視
    
    // 口の開き具合も考慮
    if (mouthOpenness > sadThresholds.mouthOpennessMin && 
        mouthOpenness < sadThresholds.mouthOpennessMax) {
      emotionScores["😢"] += 1;
    }
    
    // 眉の高さはボーナス要素として追加（必須条件ではなく補助的な要素に変更）
    if (eyebrowY > sadThresholds.eyebrowY) {
      emotionScores["😢"] += 1;
    }
  } 
  // 口角が下がっていない場合は悲しみスコアに加点しない
  else {
    emotionScores["😢"] = 0; // 口角が下がっていなければ悲しみではない
  }
  
  // 笑顔判定強化: 口角の上がりを最も重視
  const happyThresholds = EmotionThresholds.happiness;
  
  // 口角の上がりを左右両方チェックして、片方でも明確に上がっているケースを検出
  const maxCornerLift = Math.max(leftCornerLift, rightCornerLift);
  
  // 口角が強く上がっているケース（どちらかの口角が強く上がっている）
  if (maxCornerLift > happyThresholds.mouthCornerLiftStrong) {
    emotionScores["😊"] += 3;
    // 両方の口角が上がっている場合はさらに加点
    if (leftCornerLift > happyThresholds.mouthCornerLift && 
        rightCornerLift > happyThresholds.mouthCornerLift) {
      emotionScores["😊"] += 2;
    }
  }
  // 平均した口角の上がりを検出
  else if (mouthCornerLift > happyThresholds.mouthCornerLiftStrong) {
    // 口角がしっかり上がっている場合は笑顔の可能性が高い
    emotionScores["😊"] += 4;
    
    // 口が上向きの曲線を描いている場合（笑顔の重要な特徴）
    if (mouthCurvature > happyThresholds.mouthCurvature) {
      emotionScores["😊"] += 2;
    }
  }
  // 口角が少し上がっているケース
  else if (mouthCornerLift > happyThresholds.mouthCornerLift) {
    emotionScores["😊"] += 2;
    
    // 口が横に広がっている場合は笑顔の可能性が高まる
    if (mouthWidth > happyThresholds.mouthWidth) {
      emotionScores["😊"] += 2;
    }
    
    // 口の形状が上向きなら加点
    if (mouthCurvature > happyThresholds.mouthCurvature) {
      emotionScores["😊"] += 1;
    }
  }
  // 口が横に広がっている場合も笑顔の可能性あり
  else if (mouthWidth > happyThresholds.mouthWidth) {
    emotionScores["😊"] += 2;
    
    // 口の形状が上向きなら加点
    if (mouthCurvature > 0) {
      emotionScores["😊"] += 1;
    }
  }
  
  // 笑顔時は通常目も少し細くなる - 口の形状と組み合わせて判定
  if (eyeOpenness < happyThresholds.eyeOpenness && mouthCurvature > 0) {
    emotionScores["😊"] += 1;
  }
  
  // 重要な競合解決: 口角が上がっている場合は悲しみを抑制
  if (mouthCornerLift > 0 && mouthCurvature >= 0) {
    // 口角が上がっていて口が上向きの場合、悲しみではない
    emotionScores["😢"] = 0;
  }
  
  // 感度設定に基づいてスコアを調整
  for (const [emotion, score] of Object.entries(emotionScores)) {
    const multiplier = sensitivityMultipliers[sensitivitySettings[emotion] || 3];
    emotionScores[emotion] = score * multiplier;
  }
  
  return emotionScores;
}

/**
 * 表情を判定する関数
 * @param {Object} params calculateEmotionParamsで計算された表情パラメータ
 * @returns {Object} 検出された表情と各表情のスコア
 */
function detectEmotion(params) {
  const emotionScores = calculateEmotionScores(params);
  
  // 最も点数の高い表情を選択
  let maxScore = 0;
  let detectedEmotion = "😊"; // デフォルトは笑顔
  
  for (const [emotion, score] of Object.entries(emotionScores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedEmotion = emotion;
    }
  }
  
  // 検出スコアが基準値以上の場合のみ有効
  const isValid = maxScore >= EmotionThresholds.minDetectionScore;
  
  // 表情の安定化処理 - 一時的な変動を防ぐ
  if (isValid) {
    if (detectedEmotion === lastDetectedEmotion) {
      emotionStabilityCounter++;
    } else {
      emotionStabilityCounter = 0;
      lastDetectedEmotion = detectedEmotion;
    }
  }
  
  // 安定した表情かどうかのフラグを追加
  const isStable = emotionStabilityCounter >= EMOTION_STABILITY_THRESHOLD;
  
  // デバッグ用にパラメータを追加
  return {
    emotion: detectedEmotion,
    scores: emotionScores,
    maxScore,
    isValid,
    isStable,
    stabilityCounter: emotionStabilityCounter
  };
}

/**
 * 表情をビジュアル化する関数
 * @param {CanvasRenderingContext2D} ctx キャンバスコンテキスト
 * @param {Array} lm MediaPipeのFaceMeshランドマーク
 * @param {Object} params 表情パラメータ
 * @param {Object} emotionResult 表情検出結果
 * @param {number} width キャンバスの幅
 * @param {number} height キャンバスの高さ
 */
function visualizeEmotions(ctx, lm, params, emotionResult, width, height) {
  const { 
    mouthCornerLift, mouthCenter, mouthCornerLeft, mouthCornerRight,
    leftEyebrowInner, rightEyebrowInner, eyebrowAngle,
    leftCornerLift, rightCornerLift
  } = params;
  
  const scores = emotionResult.scores;
  
  // 口角の上がり具合を可視化（笑顔の判定に重要）
  // 左右の口角を個別に視覚化して理解しやすく
  if (leftCornerLift > EmotionThresholds.happiness.mouthCornerLift || 
      rightCornerLift > EmotionThresholds.happiness.mouthCornerLift) {
    ctx.strokeStyle = '#FFFF00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mouthCornerLeft.x * width, mouthCornerLeft.y * height);
    ctx.lineTo(mouthCenter.x * width, mouthCenter.y * height);
    ctx.lineTo(mouthCornerRight.x * width, mouthCornerRight.y * height);
    ctx.stroke();
    
    // 左右の口角の上がり具合を数値で表示
    ctx.fillStyle = '#FFFF00';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${leftCornerLift.toFixed(3)}`, mouthCornerLeft.x * width - 20, mouthCornerLeft.y * height - 5);
    ctx.fillText(`${rightCornerLift.toFixed(3)}`, mouthCornerRight.x * width + 5, mouthCornerRight.y * height - 5);
  }
  
  // 怒りの表情を視覚化（眉間のしわと眉の角度を表示）
  if (scores["😡"] >= EmotionThresholds.minDetectionScore) {
    // 眉間を赤く強調
    ctx.strokeStyle = '#FF3333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(leftEyebrowInner.x * width, leftEyebrowInner.y * height);
    ctx.lineTo(rightEyebrowInner.x * width, rightEyebrowInner.y * height);
    ctx.stroke();
    
    // 眉の角度を可視化
    if (eyebrowAngle < EmotionThresholds.anger.eyebrowAngle) {
      ctx.strokeStyle = '#FF6666';
      ctx.lineWidth = 2;
      // 左眉
      ctx.beginPath();
      ctx.moveTo(lm[336].x * width, lm[336].y * height);
      ctx.lineTo(lm[296].x * width, lm[296].y * height);
      ctx.stroke();
      // 右眉
      ctx.beginPath();
      ctx.moveTo(lm[107].x * width, lm[107].y * height);
      ctx.lineTo(lm[67].x * width, lm[67].y * height);
      ctx.stroke();
    }
  }
  
  // 悲しみの表情を視覚化
  if (scores["😢"] >= EmotionThresholds.minDetectionScore) {
    // 眉を青く強調
    ctx.strokeStyle = '#6666FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lm[336].x * width, lm[336].y * height);
    ctx.lineTo(lm[296].x * width, lm[296].y * height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lm[107].x * width, lm[107].y * height);
    ctx.lineTo(lm[67].x * width, lm[67].y * height);
    ctx.stroke();
  }
  
  // 驚きの表情を視覚化
  if (scores["😲"] >= EmotionThresholds.minDetectionScore) {
    // 目を紫で強調
    ctx.strokeStyle = '#FF66FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lm[159].x * width, lm[159].y * height);
    ctx.lineTo(lm[145].x * width, lm[145].y * height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lm[386].x * width, lm[386].y * height);
    ctx.lineTo(lm[374].x * width, lm[374].y * height);
    ctx.stroke();
  }
  
  // 検出された表情を視覚的に表示
  if (emotionResult.isValid) {
    ctx.fillStyle = emotionResult.isStable ? '#00FF00' : '#FFFF00';
    ctx.font = '24px sans-serif';
    
    // キャンバスの左上に表情アイコンを表示
    ctx.fillText(emotionResult.emotion, 10, 30);
    
    // 安定性カウンターを表示
    ctx.font = '14px sans-serif';
    ctx.fillText(`安定度: ${emotionResult.stabilityCounter}/${EMOTION_STABILITY_THRESHOLD}`, 10, 50);
  }
}

// モジュールをエクスポート
window.EmotionDetector = {
  thresholds: EmotionThresholds,
  calculateParams: calculateEmotionParams,
  detectEmotion: detectEmotion,
  visualize: visualizeEmotions,
  updateSensitivity: updateSensitivity,
  sensitivitySettings: sensitivitySettings,
  saveSensitivitySettings: saveSensitivitySettings
};