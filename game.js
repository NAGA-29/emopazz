const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const nextBlockCanvas = document.getElementById("next-block");
const nextBlockCtx = nextBlockCanvas.getContext("2d");

let lastMoveTime = 0;
const moveDelay = 500;
let dropInterval = 1000;
let lastDropTime = 0;
let score = 0;

const blockSize = 60;
const boardWidth = 8;
const boardHeight = 14;
let board = Array.from({ length: boardHeight }, () =>
  Array(boardWidth).fill(null)
);
let fallingPair = null;
let nextPair = null;

let currentRankingIdx = 0; // 現在選択中のランキングインデックス

let enabledEmojis = ["😊", "😡", "😢", "😲"]; // 怒りの絵文字を復活

// SVG画像の読み込み
const faceImages = {
  "😊": new Image(),
  "😡": new Image(),
  "😢": new Image(),
  "😲": new Image(),
  "❓": new Image()  // 「?ブロック」用の画像を追加
};
faceImages["😊"].src = "assets/reshot-icon-happy-laugh-72WQS35RC4.svg";
faceImages["😡"].src = "assets/reshot-icon-angry-89V6AQK7MW.svg";
faceImages["😢"].src = "assets/reshot-icon-sad-C2S8PFHBXL.svg";
faceImages["😲"].src = "assets/reshot-icon-shocked-UBGW9ZYCX8.svg";

// 「?ブロック」用のSVGコンテンツを直接生成
const questionSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="45" fill="#e0e0e0" stroke="#333" stroke-width="2"/>
  <text x="50" y="70" font-size="70" text-anchor="middle" fill="#333" font-weight="bold">?</text>
</svg>
`;
const svgBlob = new Blob([questionSvg], {type: 'image/svg+xml'});
const svgUrl = URL.createObjectURL(svgBlob);
faceImages["❓"].src = svgUrl;

// トップページ背景エフェクト
const bgEmojis = ["😊", "😡", "😢", "😲"];
const bgCanvas = document.getElementById("bg-effect-canvas");
const bgCtx = bgCanvas.getContext("2d");
let bgIcons = [];

function resizeBgCanvas() {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeBgCanvas);
resizeBgCanvas();

function spawnBgIcon() {
  const type = bgEmojis[Math.floor(Math.random() * bgEmojis.length)];
  const size = 48 + Math.random() * 48;
  bgIcons.push({
    type,
    x: Math.random() * bgCanvas.width,
    y: -size,
    size,
    speed: 1 + Math.random() * 2,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.05
  });
}

function bgEffectLoop() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  if (Math.random() < 0.04) spawnBgIcon();
  for (const icon of bgIcons) {
    icon.y += icon.speed;
    icon.rot += icon.rotSpeed;
    const img = faceImages[icon.type];
    if (img && img.complete) {
      bgCtx.save();
      bgCtx.translate(icon.x, icon.y);
      bgCtx.rotate(icon.rot);
      bgCtx.drawImage(img, -icon.size/2, -icon.size/2, icon.size, icon.size);
      bgCtx.restore();
    }
  }
  bgIcons = bgIcons.filter(icon => icon.y < bgCanvas.height + icon.size);
  requestAnimationFrame(bgEffectLoop);
}
bgEffectLoop();

function createPair() {
  const x = Math.floor(boardWidth / 2);
  // 50%の確率で横向きのペアを生成
  const isHorizontal = Math.random() < 0.5;
  
  if (isHorizontal) {
    // 横向きのブロック配置（左右）- 画面からはみ出さないように調整
    const safeX = Math.min(Math.max(1, x), boardWidth - 2);
    return {
      blocks: [
        { x: safeX, y: 0, type: getRandomEmotion() },
        { x: safeX + 1, y: 0, type: getRandomEmotion() },
      ],
    };
  } else {
    // 縦向きのブロック配置（上下）- 従来通り
    return {
      blocks: [
        { x: x, y: 0, type: getRandomEmotion() },
        { x: x, y: 1, type: getRandomEmotion() },
      ],
    };
  }
}

function getRandomEmotion() {
  if (enabledEmojis.length === 0) enabledEmojis = ["😊", "😡", "😢", "😲"];
  
  // 25%の確率で「?ブロック」を生成
  if (Math.random() < 0.25) {
    return "❓";
  }
  
  return enabledEmojis[Math.floor(Math.random() * enabledEmojis.length)];
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // スコア表示をヘッダーに反映
  const scoreElem = document.getElementById("game-score");
  if (scoreElem) scoreElem.textContent = `スコア: ${score}`;
  
  // ボード上のブロックを描画
  for (let y = 0; y < boardHeight; y++) {
    for (let x = 0; x < boardWidth; x++) {
      if (board[y][x]) drawBlock(x, y, board[y][x]);
    }
  }
  
  // fallingPair（操作中のブロック）があれば描画
  if (fallingPair) {
    for (const b of fallingPair.blocks) {
      if (b) drawBlock(b.x, b.y, { type: b.type });
    }
  }
}

function drawBlock(x, y, cell) {
  // cellがオブジェクトでない場合は { type: cell } の形式に変換
  if (typeof cell !== 'object' || cell === null) {
    cell = { type: cell };
  }
  let alpha = 1;
  
  // 表示するemoji: 「?ブロック」で表示タイプがある場合はそれを使う
  let emoji = cell.type;
  if (cell.displayType && cell.type === "❓") {
    emoji = cell.displayType;
  }
  
  if (cell && cell.erasing) {
    alpha = 1 - cell.eraseTimer / 10;
  }
  ctx.save();
  ctx.globalAlpha = alpha;

  // 角丸＋影
  let r = 16;
  ctx.beginPath();
  ctx.moveTo(x * blockSize + r, y * blockSize);
  ctx.lineTo(x * blockSize + blockSize - r, y * blockSize);
  ctx.quadraticCurveTo(x * blockSize + blockSize, y * blockSize, x * blockSize + blockSize, y * blockSize + r);
  ctx.lineTo(x * blockSize + blockSize, y * blockSize + blockSize - r);
  ctx.quadraticCurveTo(x * blockSize + blockSize, y * blockSize + blockSize, x * blockSize + blockSize - r, y * blockSize + blockSize);
  ctx.lineTo(x * blockSize + r, y * blockSize + blockSize);
  ctx.quadraticCurveTo(x * blockSize, y * blockSize + blockSize, x * blockSize, y * blockSize + blockSize - r);
  ctx.lineTo(x * blockSize, y * blockSize + r);
  ctx.quadraticCurveTo(x * blockSize, y * blockSize, x * blockSize + r, y * blockSize);
  ctx.closePath();
  ctx.shadowColor = "#3338";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // SVG画像を描画
  const img = faceImages[emoji];
  if (img && img.complete) {
    ctx.drawImage(
      img,
      x * blockSize + 8, y * blockSize + 8,
      blockSize - 16, blockSize - 16
    );
  } else {
    // 読み込み前は絵文字で仮表示
    ctx.font = "40px serif";
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, x * blockSize + blockSize / 2, y * blockSize + blockSize / 2);
  }
  ctx.restore();
}

function drawNextBlock() {
  // キャンバス全体をベージュ色で塗りつぶす
  const bgColor = "#ffe0b2"; // ベージュ色
  nextBlockCtx.fillStyle = bgColor;
  nextBlockCtx.fillRect(0, 0, nextBlockCanvas.width, nextBlockCanvas.height);

  // 外枠を描画
  let r = 16;
  nextBlockCtx.save();
  nextBlockCtx.beginPath();
  nextBlockCtx.moveTo(r, 0);
  nextBlockCtx.lineTo(nextBlockCanvas.width - r, 0);
  nextBlockCtx.quadraticCurveTo(nextBlockCanvas.width, 0, nextBlockCanvas.width, r);
  nextBlockCtx.lineTo(nextBlockCanvas.width, nextBlockCanvas.height - r);
  nextBlockCtx.quadraticCurveTo(nextBlockCanvas.width, nextBlockCanvas.height, nextBlockCanvas.width - r, nextBlockCanvas.height);
  nextBlockCtx.lineTo(r, nextBlockCanvas.height);
  nextBlockCtx.quadraticCurveTo(0, nextBlockCanvas.height, 0, nextBlockCanvas.height - r);
  nextBlockCtx.lineTo(0, r);
  nextBlockCtx.quadraticCurveTo(0, 0, r, 0);
  nextBlockCtx.closePath();
  nextBlockCtx.fillStyle = bgColor; // ベージュ色
  nextBlockCtx.shadowColor = "#3338";
  nextBlockCtx.shadowBlur = 8;
  nextBlockCtx.fill();
  nextBlockCtx.shadowBlur = 0;
  nextBlockCtx.strokeStyle = "#b0bec5"; // 薄いグレー
  nextBlockCtx.lineWidth = 2;
  nextBlockCtx.stroke();
  nextBlockCtx.restore();

  // 次のブロックを描画（ゲームブロックと同じ見た目に）
  if (nextPair) {
    const blockSize = 50; // ブロックの大きさ（拡大）
    const padding = 12; // 間隔も広げる
    const startX = (nextBlockCanvas.width - blockSize) / 2;
    const startY = (nextBlockCanvas.height - (blockSize * 2 + padding)) / 2;
    
    // 縦に並べて表示
    for (let i = 0; i < nextPair.blocks.length; i++) {
      const blockY = startY + i * (blockSize + padding);
      
      // 白い背景と枠線（ゲームブロックと同じ）
      nextBlockCtx.save();
      
      // 角丸の四角形
      let br = blockSize / 4; // 角の丸み
      nextBlockCtx.beginPath();
      nextBlockCtx.moveTo(startX + br, blockY);
      nextBlockCtx.lineTo(startX + blockSize - br, blockY);
      nextBlockCtx.quadraticCurveTo(startX + blockSize, blockY, startX + blockSize, blockY + br);
      nextBlockCtx.lineTo(startX + blockSize, blockY + blockSize - br);
      nextBlockCtx.quadraticCurveTo(startX + blockSize, blockY + blockSize, startX + blockSize - br, blockY + blockSize);
      nextBlockCtx.lineTo(startX + br, blockY + blockSize);
      nextBlockCtx.quadraticCurveTo(startX, blockY + blockSize, startX, blockY + blockSize - br);
      nextBlockCtx.lineTo(startX, blockY + br);
      nextBlockCtx.quadraticCurveTo(startX, blockY, startX + br, blockY);
      nextBlockCtx.closePath();
      
      // 影と白背景
      nextBlockCtx.shadowColor = "#3338";
      nextBlockCtx.shadowBlur = 6; // 少し強めの影
      nextBlockCtx.fillStyle = "#fff";
      nextBlockCtx.fill();
      
      // 枠線
      nextBlockCtx.shadowBlur = 0;
      nextBlockCtx.strokeStyle = "#333";
      nextBlockCtx.lineWidth = 1.5;
      nextBlockCtx.stroke();
      
      // SVG画像を描画
      const emoji = nextPair.blocks[i].type;
      const img = faceImages[emoji];
      if (img && img.complete) {
        const iconPadding = 8;
        nextBlockCtx.drawImage(
          img, 
          startX + iconPadding, 
          blockY + iconPadding, 
          blockSize - iconPadding * 2, 
          blockSize - iconPadding * 2
        );
      } else {
        // 読み込み前は絵文字で仮表示
        nextBlockCtx.font = "32px serif"; // フォントサイズ拡大
        nextBlockCtx.fillStyle = "#000";
        nextBlockCtx.textAlign = "center";
        ctx.textBaseline = "middle";
        nextBlockCtx.fillText(
          emoji, 
          startX + blockSize / 2, 
          blockY + blockSize / 2
        );
      }
      
      nextBlockCtx.restore();
    }
  }
}

function gameOver() {
  // 顔写真のスクリーンショット取得
  const faceCanvas = document.getElementById("face-preview");
  const faceImage = faceCanvas.toDataURL("image/png");

  // スコアと顔画像をランキングに保存
  const ranking = JSON.parse(localStorage.getItem("emopazz_ranking") || "[]");
  ranking.push({ score, faceImage, date: new Date().toLocaleString() });
  ranking.sort((a, b) => b.score - a.score);
  
  // 最新プレイ記録のインデックスを特定
  const currentRecord = { score, faceImage };
  latestPlayedIndex = ranking.findIndex(r => 
    r.score === currentRecord.score && 
    r.faceImage === currentRecord.faceImage
  );
  
  localStorage.setItem("emopazz_ranking", JSON.stringify(ranking.slice(0, 10)));

  // ランキングページを表示
  showRankingPage();

  // 状態リセット
  score = 0;
  board = Array.from({ length: boardHeight }, () => Array(boardWidth).fill(null));
  fallingPair = null;
  nextPair = null;
  drawNextBlock();
}

function showRankingPage() {
  document.getElementById("game-container").style.display = "none";
  document.getElementById("ranking-container").style.display = "block";
  const ranking = JSON.parse(localStorage.getItem("emopazz_ranking") || "[]");
  
  // 同率順位の処理を追加
  let rankCounter = 1;
  const list = ranking.map((r, i) => {
    // 前のエントリと比較してスコアが同じかどうか確認
    let rankText = `${rankCounter}位`;
    
    // 最初のエントリでなく、前のエントリとスコアが同じなら同じ順位にする
    if (i > 0 && ranking[i-1].score === r.score) {
      // 同じ順位を使用（rankCounterを増やさない）
    } else {
      // 異なるスコアなので順位を更新
      rankCounter = i + 1;
    }
    
    return `
      <div class="ranking-item${latestPlayedIndex === i ? ' current' : ''}${i === latestPlayedIndex ? ' selected' : ''}" data-idx="${i}">
        <span class="rank-num">${rankText}</span>
        <img src="${r.faceImage}" class="face-thumb" />
        <span class="rank-score">${r.score}点</span>
        <span class="rank-date">${r.date}</span>
      </div>
    `;
  }).join("");
  
  document.getElementById("ranking-list").innerHTML = list;

  // 最新プレイの写真を優先的に表示
  if (latestPlayedIndex >= 0 && ranking[latestPlayedIndex]) {
    document.getElementById("ranking-large-photo").src = ranking[latestPlayedIndex].faceImage;
    currentRankingIdx = latestPlayedIndex;
  } 
  // 最新プレイのインデックスが無効な場合は1位を表示
  else if (ranking[0]) {
    document.getElementById("ranking-large-photo").src = ranking[0].faceImage;
    currentRankingIdx = 0;
  } else {
    document.getElementById("ranking-large-photo").src = "";
    currentRankingIdx = -1;
  }

  // サムネイルクリックで大きな写真を切り替え
  document.querySelectorAll(".ranking-item").forEach(item => {
    item.onclick = function() {
      document.querySelectorAll(".ranking-item").forEach(i => i.classList.remove("selected"));
      this.classList.add("selected");
      const idx = Number(this.getAttribute("data-idx"));
      document.getElementById("ranking-large-photo").src = ranking[idx].faceImage;
      currentRankingIdx = idx;
    };
  });
}

document.getElementById("back-to-title").onclick = () => {
  document.getElementById("ranking-container").style.display = "none";
  if (window.document.showTopPage) window.document.showTopPage();
};

// 小さな「タイトルへ」ボタンのイベントハンドラを追加
document.getElementById("back-to-title-small").onclick = () => {
  document.getElementById("ranking-container").style.display = "none";
  if (window.document.showTopPage) window.document.showTopPage();
};

document.getElementById("ranking-delete-btn").onclick = function() {
  const ranking = JSON.parse(localStorage.getItem("emopazz_ranking") || "[]");
  if (currentRankingIdx < 0 || !ranking[currentRankingIdx]) return;
  if (confirm("本当にこの記録を削除しますか？")) {
    ranking.splice(currentRankingIdx, 1);
    localStorage.setItem("emopazz_ranking", JSON.stringify(ranking));
    showRankingPage();
  }
};

async function drop() {
  if (!fallingPair || !fallingPair.blocks || fallingPair.blocks.length === 0) return;

  // 各ブロックの落下判定
  const canDrop = fallingPair.blocks.map(b => {
    if (!b) return false;
    return b.y + 1 < boardHeight && !board[b.y + 1][b.x];
  });

  // すべてのブロックが落下可能な場合
  if (canDrop.every(can => can)) {
    for (const b of fallingPair.blocks) {
      if (b) b.y++;
    }
    return;
  }

  // いずれかのブロックが底に到達した場合、すべてのブロックを設置
  for (const b of fallingPair.blocks) {
    if (!b) continue;
    if (b.y < 0) {
      // 画面外にブロックがある = ゲームオーバー
      gameOver();
      return;
    }
    
    // 「?ブロック」の場合は、現在の表情に変換して固定
    if (b.type === "❓" && window.getCurrentEmotion) {
      // 表情を取得して固定
      const currentEmotion = window.getCurrentEmotion();
      board[b.y][b.x] = { type: currentEmotion, justPlaced: true };
    } else {
      board[b.y][b.x] = { type: b.type, justPlaced: true };
    }
  }
  
  // fallingPairは空にしておく - 消去ロジックがboardのみを対象とするため
  const oldFallingPair = fallingPair;
  fallingPair = null;
  
  // この段階でdrawを呼び出して、すべてのブロックをboardに描画
  draw();

  // チェーン処理を実行
  await handleChain();
  
  // fallingPairがnullになっているため、新しいペアを生成
  const centerX = Math.floor(boardWidth / 2);
  // 新しいブロックの生成位置が埋まっている場合はゲームオーバー
  if (board[0][centerX] || board[1][centerX]) {
    gameOver();
    return;
  }
  
  fallingPair = nextPair || createPair();
  nextPair = createPair();
  drawNextBlock();
}

function move(dir) {
  const dx = dir === "left" ? -1 : 1;
  if (
    fallingPair &&
    fallingPair.blocks.every(
      (b) =>
        b.x + dx >= 0 && b.x + dx < boardWidth && !board[b.y][b.x + dx]
    )
  ) {
    for (const b of fallingPair.blocks) b.x += dx;
  }
}

window.rotate = function(direction = "right") {
  if (!fallingPair || fallingPair.blocks.length < 2) return;

  // 回転はブロックが2つ揃っていることを前提にしている
  const [a, b] = fallingPair.blocks;
  
  // 両方のブロックが存在することを確認
  if (!a || !b) return;

  // 基準ブロックを中心とした相対位置を計算
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  let newX, newY;
  
  // 回転方向に応じた新しい相対位置を計算
  // 時計回りの場合: (x, y) -> (y, -x)
  // 反時計回りの場合: (x, y) -> (-y, x)
  if (direction === "right") { // 時計回り
    newX = a.x + dy;
    newY = a.y - dx;
  } else { // 反時計回り
    newX = a.x - dy;
    newY = a.y + dx;
  }

  // 回転後の位置が有効かチェック
  if (
    newX >= 0 &&
    newX < boardWidth &&
    newY >= 0 &&
    newY < boardHeight &&
    !board[newY][newX]
  ) {
    // 回転可能な場合は位置を更新
    b.x = newX;
    b.y = newY;
  } else {
    // 回転できない場合は壁キック処理を試みる
    // 基準点からの位置をずらして回転を試みる
    const kicks = [
      {dx: -1, dy: 0}, // 左へ1マス
      {dx: 1, dy: 0},  // 右へ1マス
      {dx: 0, dy: -1}, // 上へ1マス
      {dx: 0, dy: 1}   // 下へ1マス
    ];
    
    for (const kick of kicks) {
      const kickedX = newX + kick.dx;
      const kickedY = newY + kick.dy;
      
      if (
        kickedX >= 0 &&
        kickedX < boardWidth &&
        kickedY >= 0 &&
        kickedY < boardHeight &&
        !board[kickedY][kickedX]
      ) {
        // 壁キックで回転可能な位置が見つかった
        b.x = kickedX;
        b.y = kickedY;
        break;
      }
    }
  }
};

window.updateDropSpeed = function(isFast) {
  // dropInterval = isFast ? 300 : 1000;
};

async function gameLoop(timestamp) {
  // 落下中の「?ブロック」を現在の表情で更新
  if (fallingPair && window.getCurrentEmotion) {
    const currentEmotion = window.getCurrentEmotion();
    fallingPair.blocks.forEach(block => {
      if (block && block.type === "❓") {
        // 落下中は「?ブロック」を表情で置き換える（一時的に）
        block.displayType = currentEmotion;
      }
    });
  }

  draw();
  if (timestamp - lastMoveTime > moveDelay) {
    if (faceLean === "left") move("right");
    else if (faceLean === "right") move("left");
    if (faceLean !== "center") lastMoveTime = timestamp;
  }
  if (timestamp - lastDropTime > dropInterval) {
    await drop();
    lastDropTime = timestamp;
  }
  requestAnimationFrame(gameLoop);
}

function findMatches() {
  const visited = Array.from({ length: boardHeight }, () =>
    Array(boardWidth).fill(false)
  );
  const groups = [];

  // justPlacedフラグがついたブロックを優先的に確認
  const justPlacedCoords = [];
  for (let y = 0; y < boardHeight; y++) {
    for (let x = 0; x < boardWidth; x++) {
      if (board[y][x] && board[y][x].justPlaced) {
        justPlacedCoords.push([x, y]);
      }
    }
  }

  // 新しく設置されたブロックから優先的に検索
  for (const [startX, startY] of justPlacedCoords) {
    if (visited[startY][startX] || !board[startY][startX]) continue;

    const type = board[startY][startX].type || board[startY][startX];
    const group = findConnectedGroup(startX, startY, type, visited);
    
    if (group.length >= 4) {
      groups.push(group);
    }
  }

  // 通常の全ボード検査
  for (let y = 0; y < boardHeight; y++) {
    for (let x = 0; x < boardWidth; x++) {
      if (!board[y][x] || visited[y][x]) continue;

      const type = board[y][x].type || board[y][x];
      const group = findConnectedGroup(x, y, type, visited);
      
      if (group.length >= 4) {
        groups.push(group);
      }
    }
  }

  return groups;
}

// 連結グループを探索する関数を分離
function findConnectedGroup(startX, startY, type, visited) {
  const queue = [[startX, startY]];
  const group = [];

  while (queue.length > 0) {
    const [cx, cy] = queue.pop();
    if (cx < 0 || cy < 0 || cx >= boardWidth || cy >= boardHeight)
      continue;
    if (
      visited[cy][cx] ||
      !board[cy][cx] ||
      (board[cy][cx].type || board[cy][cx]) !== type
    )
      continue;

    visited[cy][cx] = true;
    group.push([cx, cy]);

    queue.push(
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1]
    );
  }

  return group;
}

async function eraseBlocksWithEffect(matchList) {
  // 消去対象のブロックをマーク
  for (const [x, y] of matchList) {
    if (board[y][x]) {
      board[y][x] = { ...board[y][x], erasing: true, eraseTimer: 0 };
    }
  }

  // フェードアウトアニメーション
  for (let t = 0; t <= 10; t++) {
    for (const [x, y] of matchList) {
      if (board[y][x]) board[y][x].eraseTimer = t;
    }
    draw();
    await new Promise(res => setTimeout(res, 30));
  }

  // 最終的に消去
  for (const [x, y] of matchList) {
    board[y][x] = null;
  }

  draw();
}

async function handleChain() {
  let chain = 0;
  let groups;
  
  do {
    // 重力計算を適用
    applyGravity();
    
    // マッチング検索
    groups = findMatches();
    
    if (groups.length > 0) {
      chain++;
      let multiplier = 1 + (chain - 1) * 0.5; // 1, 1.5, 2, 2.5, ...
      
      // 各グループの処理
      for (const group of groups) {
        score += Math.floor(group.length * 100 * multiplier);
        await eraseBlocksWithEffect(group);
      }
      
      // 描画更新 - fallingPairを消したあとのボード状態を描画
      draw();
      await new Promise(res => setTimeout(res, 150));
    }
  } while (groups.length > 0);
  
  // 最終的な重力計算
  applyGravity();
  
  // 最後に一度描画更新
  draw();
}

function applyGravity() {
  let moved;
  do {
    moved = false;
    // 各列ごとに処理
    for (let x = 0; x < boardWidth; x++) {
      // 一番下の行から上に向かって処理
      for (let y = boardHeight - 2; y >= 0; y--) {
        if (board[y][x]) {
          // 現在のブロックが存在する場合、下に落とせるだけ落とす
          let newY = y;
          while (newY + 1 < boardHeight && !board[newY + 1][x]) {
            newY++;
          }
          
          if (newY !== y) {
            // 移動先が現在位置と異なる場合のみ移動
            board[newY][x] = board[y][x];
            board[y][x] = null;
            moved = true;
          }
        }
      }
    }
  } while (moved);
}

// ゲーム開始時の初期化
async function startGame() {
  fallingPair = createPair();
  nextPair = createPair();
  drawNextBlock();
  let groups;
  do {
    groups = findMatches();
    if (groups.length > 0) {
      await eraseBlocksWithEffect(groups[0]);
      applyGravity();
    }
  } while (groups.length > 0);
  requestAnimationFrame(gameLoop);
}

// ゲーム開始時はstartGame()を呼ぶようにしてください

// 設定モーダルの開閉・保存
const settingBtn = document.getElementById("setting-button");
const settingModal = document.getElementById("setting-modal");
const settingOkBtn = document.getElementById("setting-ok");
const blockTypesForm = document.getElementById("block-types-form");

// 感度設定スライダー
const sensitivitySliders = {
  "😊": document.getElementById("sensitivity-happy"),
  "😡": document.getElementById("sensitivity-angry"), 
  "😢": document.getElementById("sensitivity-sad"),
  "😲": document.getElementById("sensitivity-surprise")
};

const sensitivityLabels = {
  1: "とても低い",
  2: "低い",
  3: "普通",
  4: "高い",
  5: "とても高い"
};

// 初期値を設定
function initSensitivitySliders() {
  if (window.EmotionDetector && window.EmotionDetector.sensitivitySettings) {
    Object.entries(window.EmotionDetector.sensitivitySettings).forEach(([emotion, level]) => {
      const slider = sensitivitySliders[emotion];
      if (slider) {
        slider.value = level;
        updateSensitivityLabel(slider);
      }
    });
  }
}

// 感度ラベルを更新する関数
function updateSensitivityLabel(slider) {
  const value = parseInt(slider.value);
  const valueText = sensitivityLabels[value] || "普通";
  slider.nextElementSibling.textContent = valueText;
}

// 感度スライダーのイベントリスナー設定
Object.values(sensitivitySliders).forEach(slider => {
  if (slider) {
    slider.addEventListener('input', function() {
      updateSensitivityLabel(this);
    });
  }
});

settingBtn.onclick = () => {
  settingModal.style.display = "flex";
  initSensitivitySliders(); // スライダー初期値設定
};

settingOkBtn.onclick = () => {
  const checked = Array.from(blockTypesForm.querySelectorAll('input[type=checkbox]:checked'));
  enabledEmojis = checked.map(cb => cb.value);
  if (enabledEmojis.length === 0) {
    alert("最低1つは選択してください");
    return;
  }
  
  // 感度設定を保存
  if (window.EmotionDetector) {
    window.EmotionDetector.updateSensitivity("😊", parseInt(sensitivitySliders["😊"].value));
    window.EmotionDetector.updateSensitivity("😡", parseInt(sensitivitySliders["😡"].value));
    window.EmotionDetector.updateSensitivity("😢", parseInt(sensitivitySliders["😢"].value));
    window.EmotionDetector.updateSensitivity("😲", parseInt(sensitivitySliders["😲"].value));
    window.EmotionDetector.saveSensitivitySettings();
  }
  
  settingModal.style.display = "none";
};

// モーダル外クリックで閉じる
settingModal.onclick = (e) => {
  if (e.target === settingModal) settingModal.style.display = "none";
};