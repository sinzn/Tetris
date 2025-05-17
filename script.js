    const canvas = document.getElementById("tetris");
    const context = canvas.getContext("2d");
    context.scale(20, 20);

    const scoreElement = document.getElementById("score");
    const levelElement = document.getElementById("level");
    const gameOverElement = document.getElementById("game-over");
    const playAgainBtn = document.getElementById("play-again");
    const playMusicBtn = document.getElementById("play-music");
    const leaderboardList = document.getElementById("leaderboard-list");
    const bgMusic = document.getElementById("bg-music");

    const ROWS = 24;
    const COLS = 12;

    // Colors for pieces
    const colors = [
      null,
      "#FF8000", // orange L
      "#FF0000", // red Z
      "#00BFFF", // blue I
      "#0000FF", // blue J
      "#FFBF00", // yellow O
      "#800080", // purple T
      "#00FF00", // green S
    ];

    // Tetromino shapes
    const tetrominoes = {
      I: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      J: [
        [2, 0, 0],
        [2, 2, 2],
        [0, 0, 0],
      ],
      L: [
        [0, 0, 3],
        [3, 3, 3],
        [0, 0, 0],
      ],
      O: [
        [4, 4],
        [4, 4],
      ],
      S: [
        [0, 5, 5],
        [5, 5, 0],
        [0, 0, 0],
      ],
      T: [
        [0, 6, 0],
        [6, 6, 6],
        [0, 0, 0],
      ],
      Z: [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0],
      ],
    };

    // Create empty matrix
    function createMatrix(w, h) {
      const matrix = [];
      while (h--) {
        matrix.push(new Array(w).fill(0));
      }
      return matrix;
    }

    // Draw a matrix on the canvas at position offset
    function drawMatrix(matrix, offset) {
      matrix.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            context.fillStyle = colors[value];
            context.fillRect(x + offset.x, y + offset.y, 1, 1);
            context.strokeStyle = "#fff";
            context.lineWidth = 0.05;
            context.strokeRect(x + offset.x, y + offset.y, 1, 1);
          }
        });
      });
    }

    // Rotate matrix clockwise
    function rotate(matrix) {
      const N = matrix.length;
      const result = createMatrix(N, N);
      for (let y = 0; y < N; ++y) {
        for (let x = 0; x < N; ++x) {
          result[x][N - 1 - y] = matrix[y][x];
        }
      }
      return result;
    }

    // Check collision of player piece with arena
    function collide(arena, player) {
      const m = player.matrix;
      const o = player.pos;
      for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
          if (
            m[y][x] !== 0 &&
            (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0
          ) {
            return true;
          }
        }
      }
      return false;
    }

    // Merge player piece into arena
    function merge(arena, player) {
      player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            arena[y + player.pos.y][x + player.pos.x] = value;
          }
        });
      });
    }

    // Clear full rows and update score
    function arenaSweep() {
      let rowCount = 0;
      outer: for (let y = arena.length - 1; y >= 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
          if (arena[y][x] === 0) {
            continue outer;
          }
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        rowCount++;
      }
      if (rowCount > 0) {
        // Scoring: 100 points per line, multiplied by level
        player.score += rowCount * 100 * player.level;
        player.lines += rowCount;
        // Increase level every 10 lines cleared
        if (player.lines >= player.level * 10) {
          player.level++;
          dropInterval = Math.max(100, dropInterval - 100);
        }
        updateScore();
      }
    }

    // Update score and level display
    function updateScore() {
      scoreElement.textContent = player.score;
      levelElement.textContent = player.level;
    }

    // Draw the arena and player piece
    function draw() {
      context.fillStyle = "#f3f4f6"; // light gray background for grid
      context.fillRect(0, 0, canvas.width / 20, canvas.height / 20);

      drawMatrix(arena, { x: 0, y: 0 });
      drawMatrix(player.matrix, player.pos);
    }

    // Drop piece down by one
    function playerDrop() {
      player.pos.y++;
      if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        arenaSweep();
        playerReset();
        if (collide(arena, player)) {
          gameOver();
        }
      }
      dropCounter = 0;
    }

    // Fast drop piece to bottom
    function playerFastDrop() {
      while (!collide(arena, player)) {
        player.pos.y++;
      }
      player.pos.y--;
      merge(arena, player);
      arenaSweep();
      playerReset();
      if (collide(arena, player)) {
        gameOver();
      }
      dropCounter = 0;
    }

    // Move piece left or right
    function playerMove(dir) {
      player.pos.x += dir;
      if (collide(arena, player)) {
        player.pos.x -= dir;
      }
    }

    // Rotate piece and handle wall kicks
    function playerRotate() {
      const pos = player.pos.x;
      let offset = 1;
      player.matrix = rotate(player.matrix);
      while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
          player.matrix = rotate(rotate(rotate(player.matrix))); // rotate back
          player.pos.x = pos;
          return;
        }
      }
    }

    // Reset player piece to new random piece at top center
    function playerReset() {
      const pieces = "ILJOTSZ";
      const type = pieces[(pieces.length * Math.random()) | 0];
      player.matrix = tetrominoes[type].map((row) => row.slice());
      player.pos.y = 0;
      player.pos.x = ((COLS / 2) | 0) - ((player.matrix[0].length / 2) | 0);
    }

    // Game over handler
    function gameOver() {
      gameOverElement.classList.remove("hidden");
      cancelAnimationFrame(animationId);
      isGameOver = true;
      saveScore(player.score);
      renderLeaderboard();
      stopMusic();
    }

    // Game variables
    let dropCounter = 0;
    let dropInterval = 1000;
    let lastTime = 0;
    let animationId;
    let isGameOver = false;

    const arena = createMatrix(COLS, ROWS);

    const player = {
      pos: { x: 0, y: 0 },
      matrix: null,
      score: 0,
      level: 1,
      lines: 0,
    };

    // Game loop
    function update(time = 0) {
      if (isGameOver) return;
      const deltaTime = time - lastTime;
      lastTime = time;

      dropCounter += deltaTime;
      if (dropCounter > dropInterval) {
        playerDrop();
      }

      draw();
      animationId = requestAnimationFrame(update);
    }

    // Keyboard controls
    document.addEventListener("keydown", (event) => {
      if (isGameOver) return;
      if (event.repeat) return;
      switch (event.key) {
        case "ArrowLeft":
          playerMove(-1);
          break;
        case "ArrowRight":
          playerMove(1);
          break;
        case "ArrowDown":
          // Fast drop while holding Down Arrow
          playerDrop();
          break;
        case " ":
          // Space triggers instant fast drop
          event.preventDefault();
          playerFastDrop();
          break;
        case "ArrowUp":
          playerRotate();
          break;
      }
    });

    // Play again button resets game
    playAgainBtn.addEventListener("click", () => {
      arena.forEach((row) => row.fill(0));
      player.score = 0;
      player.level = 1;
      player.lines = 0;
      dropInterval = 1000;
      isGameOver = false;
      gameOverElement.classList.add("hidden");
      playerReset();
      updateScore();
      lastTime = 0;
      dropCounter = 0;
      update();
    });

    // Music playback from file in same directory
    let isPlayingMusic = false;

    function playMusic() {
      bgMusic.play();
      isPlayingMusic = true;
      playMusicBtn.innerHTML =
        '<i class="fas fa-music text-xs"></i> Stop Music';
    }

    function stopMusic() {
      bgMusic.pause();
      bgMusic.currentTime = 0;
      isPlayingMusic = false;
      playMusicBtn.innerHTML =
        '<i class="fas fa-music text-xs"></i> Play Music';
    }

    playMusicBtn.addEventListener("click", () => {
      if (!isPlayingMusic) {
        playMusic();
      } else {
        stopMusic();
      }
    });

    // Leaderboard management using localStorage
    function getLeaderboard() {
      const data = localStorage.getItem("tetrisLeaderboard");
      if (!data) return [];
      try {
        return JSON.parse(data);
      } catch {
        return [];
      }
    }

    // Send highest score to MongoDB Atlas via API
    async function sendScoreToMongoDB(score) {
      // Replace the URL below with your actual API endpoint that handles MongoDB insertion
      const apiUrl = "https://your-api-endpoint.example.com/api/tetris-score";

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ score }),
        });
        if (!response.ok) {
          console.warn("Failed to send score to MongoDB Atlas");
        }
      } catch (error) {
        console.warn("Error sending score to MongoDB Atlas:", error);
      }
    }

    // Save score locally and send highest score to MongoDB Atlas
    function saveScore(score) {
      if (score <= 0) return;
      const leaderboard = getLeaderboard();
      leaderboard.push({ score, date: new Date().toISOString() });
      leaderboard.sort((a, b) => b.score - a.score);
      if (leaderboard.length > 10) leaderboard.length = 10;
      localStorage.setItem("tetrisLeaderboard", JSON.stringify(leaderboard));

      // Send highest score to MongoDB Atlas
      if (leaderboard.length > 0 && leaderboard[0].score === score) {
        sendScoreToMongoDB(score);
      }
    }

    function renderLeaderboard() {
      const leaderboard = getLeaderboard();
      leaderboardList.innerHTML = "";
      if (leaderboard.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No scores yet";
        leaderboardList.appendChild(li);
        return;
      }
      // Show only last 5 highest scores
      const topFive = leaderboard.slice(0, 5);
      topFive.forEach((entry) => {
        const li = document.createElement("li");
        const date = new Date(entry.date);
        li.textContent = `${entry.score} pts - ${date.toLocaleDateString()}`;
        leaderboardList.appendChild(li);
      });
    }

    // Initialize game and leaderboard
    playerReset();
    updateScore();
    renderLeaderboard();
    update();
  