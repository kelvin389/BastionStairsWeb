(() => {
  // config/gameConfig.ts
  var defaultForwardKey = "j";
  var defaultBackwardKey = "k";
  var maxStamina = 100;
  var initStaminaDrain = 6;
  var staminaDrainIncrement = 0.15;
  var staminaGain = 10;
  var hardmodeStaminaDrainIncrement = 0.3;
  var maxStaminaDrainPlatform = 325;
  var hardmodeMaxStaminaDrainPlatform = 200;
  var initFallSpeed = 300;
  var fallSpeedAccel = 200;
  var gameConfig_default = {
    defaultForwardKey,
    defaultBackwardKey,
    maxStamina,
    initStaminaDrain,
    staminaDrainIncrement,
    staminaGain,
    hardmodeStaminaDrainIncrement,
    maxStaminaDrainPlatform,
    hardmodeMaxStaminaDrainPlatform,
    initFallSpeed,
    fallSpeedAccel,
  };

  // game.ts
  document.addEventListener("DOMContentLoaded", async () => {
    let Direction;
    ((Direction2) => {
      Direction2[(Direction2["Left"] = 0)] = "Left";
      Direction2[(Direction2["Right"] = 1)] = "Right";
    })(Direction || (Direction = {}));
    const screen = document.getElementById("screen");
    const ctx = screen.getContext("2d");
    const smallScreenWidth = 768;
    const playerImage = new Image();
    playerImage.src = "./assets/spaceman.png";
    const backgroundImage = new Image();
    backgroundImage.src = "./assets/background.png";
    await Promise.all([playerImage.decode(), backgroundImage.decode()]);
    const canvasMaxWidth = 1e3;
    const canvasMaxHeight = 800;
    let canvasWidth = 0;
    let canvasHeight = 0;
    const scoreX = 10;
    const scoreY = 40;
    const scoreBgPadding = 5;
    let staminaWidth = 0;
    const staminaHeight = 20;
    let staminaX = 0;
    let staminaY = 100;
    const cameraOffsetFromPlayer = { x: 0, y: 0 };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    function gameToCanvas(pos, cameraPos2, objWidth, objHeight) {
      const translatedX = pos.x - cameraPos2.x;
      const translatedY = pos.y - cameraPos2.y + canvasHeight / 2;
      const canvasX = translatedX + canvasWidth / 2;
      const canvasY = canvasHeight - translatedY;
      const offsetCanvasX = canvasX - objWidth / 2;
      const offsetCanvasY = canvasY - objHeight / 2;
      return { x: offsetCanvasX, y: offsetCanvasY };
    }
    function lerp(start, end, t) {
      const newX = start.x + (end.x - start.x) * t;
      const newY = start.y + (end.y - start.y) * t;
      return { x: newX, y: newY };
    }
    function resizeCanvas() {
      canvasWidth = Math.min(canvasMaxWidth, window.innerWidth * 0.95);
      canvasHeight = Math.min(canvasMaxHeight, window.innerHeight * 0.95);
      screen.width = canvasWidth;
      screen.height = canvasHeight;
      cameraOffsetFromPlayer.y = canvasHeight / 5;
      staminaWidth = window.innerWidth < smallScreenWidth ? canvasWidth * 0.8 : canvasWidth * 0.4;
      staminaX = canvasWidth / 2 - staminaWidth / 2;
      staminaY = window.innerWidth < smallScreenWidth ? 145 : 100;
    }
    let Difficulty;
    ((Difficulty2) => {
      Difficulty2[(Difficulty2["normal"] = 0)] = "normal";
      Difficulty2[(Difficulty2["hard"] = 1)] = "hard";
    })(Difficulty || (Difficulty = {}));
    let difficulty = 0; /* normal */
    let highScore = 0;
    if (localStorage.getItem("highScore") != null) {
      highScore = parseInt(localStorage.getItem("highScore"));
    }
    let gameOver = false;
    let pausedInputs = false;
    let falling = false;
    const origin = { x: 0, y: 0 };
    let fallSpeed = gameConfig_default.initFallSpeed;
    let curStamina = gameConfig_default.maxStamina;
    let curStaminaDrain = gameConfig_default.initStaminaDrain;
    const floorOffset = 30;
    const playerWidth = 100;
    const playerHeight = 100;
    const numInitPlatforms = 10;
    const platformOffsetX = 125;
    const platformOffsetY = 80;
    const platformWidth = 100;
    const platformHeight = 10;
    const initPlayerPos = { x: 0, y: playerHeight / 2 + platformHeight / 2 };
    let playerPos = { ...initPlayerPos };
    const initCameraPos = {
      x: playerPos.x + cameraOffsetFromPlayer.x,
      y: playerPos.y + cameraOffsetFromPlayer.y,
    };
    let cameraPos = { ...initCameraPos };
    const initCurPlatform = -1;
    let curPlatform = initCurPlatform;
    const initDirection = 1; /* Right */
    let curDirection = initDirection;
    let platforms = [];
    let nextPlatformX = 0;
    let nextPlatformY = 0;
    function generatePlatform() {
      const rand = Math.random();
      if (rand < 0.5) {
        nextPlatformX -= platformOffsetX;
      } else {
        nextPlatformX += platformOffsetX;
      }
      nextPlatformY += platformOffsetY;
      const newPlatform = { x: nextPlatformX, y: nextPlatformY };
      platforms.push(newPlatform);
    }
    function endGame() {
      pausedInputs = true;
      gameOver = true;
      const score = curPlatform + 1;
      if (difficulty === 0 /* normal */ && score > highScore) {
        localStorage.setItem("highScore", score.toString());
        highScore = score;
      } else if (difficulty === 1 /* hard */ && score > highScore) {
        localStorage.setItem("hardHighScore", score.toString());
        highScore = score;
      }
      setTimeout(() => {
        falling = true;
      }, 1e3);
    }
    function moveForward() {
      if (curDirection === 0 /* Left */) {
        moveLeft();
      } else {
        moveRight();
      }
      step();
    }
    function moveBackward() {
      if (curDirection === 0 /* Left */) {
        moveRight();
        curDirection = 1; /* Right */
      } else {
        moveLeft();
        curDirection = 0; /* Left */
      }
      step();
    }
    function moveLeft() {
      playerPos.x -= platformOffsetX;
      playerPos.y += platformOffsetY;
    }
    function moveRight() {
      playerPos.x += platformOffsetX;
      playerPos.y += platformOffsetY;
    }
    let storedForwardKey = localStorage.getItem("forwardKey");
    let storedBackwardKey = localStorage.getItem("backwardKey");
    document.addEventListener("keydown", function (event) {
      if (pausedInputs) {
        return;
      }
      if (event.repeat === true) {
        return;
      }
      if (event.key === storedForwardKey) {
        moveForward();
      } else if (event.key === storedBackwardKey) {
        moveBackward();
      }
    });
    const touchToggle = document.getElementById("touchToggle");
    function onTouchStart(e) {
      e.preventDefault();
      if (pausedInputs) {
        return;
      }
      for (let touch of e.touches) {
        const x = touch.clientX;
        if (x < screen.width / 2) {
          moveForward();
        } else {
          moveBackward();
        }
      }
    }
    touchToggle.addEventListener("change", () => {
      if (touchToggle.checked) {
        screen.addEventListener("touchstart", onTouchStart);
        localStorage.setItem("touchEnabled", "true");
      } else {
        screen.removeEventListener("touchstart", onTouchStart);
        localStorage.setItem("touchEnabled", "false");
      }
    });
    if (localStorage.getItem("touchEnabled") === "true") {
      touchToggle.checked = true;
      screen.addEventListener("touchstart", onTouchStart);
    }
    const forwardKeyInput = document.getElementById("forwardKeyInput");
    const backwardKeyInput = document.getElementById("backwardKeyInput");
    if (storedForwardKey && storedBackwardKey) {
      forwardKeyInput.value = storedForwardKey;
      backwardKeyInput.value = storedBackwardKey;
    } else {
      resetKeybinds();
    }
    const saveKeybindsButton = document.getElementById("saveKeybindsButton");
    const resetKeybindsButton = document.getElementById("resetKeybindsButton");
    if (saveKeybindsButton) {
      saveKeybindsButton.onclick = saveKeybinds;
    }
    if (resetKeybindsButton) {
      resetKeybindsButton.onclick = resetKeybinds;
    }
    function saveKeybinds() {
      if (forwardKeyInput && backwardKeyInput) {
        localStorage.setItem("forwardKey", forwardKeyInput.value);
        localStorage.setItem("backwardKey", backwardKeyInput.value);
        storedForwardKey = forwardKeyInput.value;
        storedBackwardKey = backwardKeyInput.value;
      }
    }
    function resetKeybinds() {
      localStorage.setItem("forwardKey", gameConfig_default.defaultForwardKey);
      localStorage.setItem("backwardKey", gameConfig_default.defaultBackwardKey);
      storedForwardKey = gameConfig_default.defaultForwardKey;
      storedBackwardKey = gameConfig_default.defaultBackwardKey;
      forwardKeyInput.value = gameConfig_default.defaultForwardKey;
      backwardKeyInput.value = gameConfig_default.defaultBackwardKey;
    }
    forwardKeyInput.addEventListener("keydown", (event) => {
      event.preventDefault();
      forwardKeyInput.value = event.key;
    });
    backwardKeyInput.addEventListener("keydown", (event) => {
      event.preventDefault();
      backwardKeyInput.value = event.key;
    });
    const hardmodeToggle = document.getElementById("hardmodeToggle");
    hardmodeToggle.addEventListener("change", () => {
      if (hardmodeToggle.checked) {
        difficulty = 1; /* hard */
        if (localStorage.getItem("hardHighScore") != null) {
          highScore = parseInt(localStorage.getItem("hardHighScore"));
        } else {
          highScore = 0;
        }
        localStorage.setItem("hardmode", "true");
      } else {
        difficulty = 0; /* normal */
        if (localStorage.getItem("highScore") != null) {
          highScore = parseInt(localStorage.getItem("highScore"));
        } else {
          highScore = 0;
        }
        localStorage.setItem("hardmode", "false");
      }
      reset();
    });
    if (localStorage.getItem("hardmode") === "true") {
      hardmodeToggle.checked = true;
      difficulty = 1; /* hard */
      if (localStorage.getItem("hardHighScore") != null) {
        highScore = parseInt(localStorage.getItem("hardHighScore"));
      } else {
        highScore = 0;
      }
    }
    function draw(ctx2) {
      ctx2.clearRect(0, 0, ctx2.canvas.width, ctx2.canvas.height);
      const BackgroundImage = {
        width: backgroundImage.naturalWidth,
        height: backgroundImage.naturalHeight,
      };
      for (let i = -1; i < canvasWidth / BackgroundImage.width + 1; i++) {
        for (let j = -1; j < canvasHeight / BackgroundImage.height + 1; j++) {
          ctx2.drawImage(
            backgroundImage,
            Math.round(i * BackgroundImage.width - (cameraPos.x % BackgroundImage.width)),
            Math.round(j * BackgroundImage.height + (cameraPos.y % BackgroundImage.height)),
            BackgroundImage.width,
            BackgroundImage.height
          );
        }
      }
      const floorCanvasCoords = gameToCanvas({ x: 0, y: floorOffset }, cameraPos, canvasWidth, 1);
      if (canvasHeight - floorCanvasCoords.y > 0) {
        const floorGrad = ctx2.createLinearGradient(0, floorCanvasCoords.y, 0, canvasHeight);
        floorGrad.addColorStop(0, "#3d5c80");
        floorGrad.addColorStop(1, "#001d3d");
        ctx2.fillStyle = floorGrad;
        ctx2.fillRect(0, floorCanvasCoords.y, canvasWidth, canvasHeight - floorCanvasCoords.y);
      }
      for (let i = 0; i < platforms.length; i++) {
        const canvasCoords = gameToCanvas(platforms[i], cameraPos, platformWidth, platformHeight);
        if (
          canvasCoords.x > -platformWidth &&
          canvasCoords.x < canvasWidth + platformWidth &&
          canvasCoords.y > -platformHeight &&
          canvasCoords.y < canvasHeight + platformHeight
        ) {
          if (curPlatform === i) {
            const platformGrad = ctx2.createLinearGradient(
              canvasCoords.x + platformWidth / 2,
              canvasCoords.y,
              canvasCoords.x + platformWidth / 2,
              canvasCoords.y + platformHeight
            );
            platformGrad.addColorStop(0, "lime");
            platformGrad.addColorStop(1, "green");
            ctx2.fillStyle = platformGrad;
            ctx2.fillRect(canvasCoords.x, canvasCoords.y, platformWidth, platformHeight);
          } else {
            const platformGrad = ctx2.createLinearGradient(
              canvasCoords.x + platformWidth / 2,
              canvasCoords.y,
              canvasCoords.x + platformWidth / 2,
              canvasCoords.y + platformHeight
            );
            platformGrad.addColorStop(0, "orange");
            platformGrad.addColorStop(1, "yellow");
            ctx2.fillStyle = platformGrad;
            ctx2.fillRect(canvasCoords.x, canvasCoords.y, platformWidth, platformHeight);
          }
        }
      }
      const playerCanvasCoords = gameToCanvas(playerPos, cameraPos, playerWidth, playerHeight);
      if (curDirection === 0 /* Left */) {
        ctx2.drawImage(
          playerImage,
          playerCanvasCoords.x,
          playerCanvasCoords.y,
          playerWidth,
          playerHeight
        );
      } else {
        ctx2.save();
        ctx2.scale(-1, 1);
        const flippedX = -(playerCanvasCoords.x + playerWidth);
        ctx2.drawImage(playerImage, flippedX, playerCanvasCoords.y, playerWidth, playerHeight);
        ctx2.restore();
      }
      ctx2.font = "32px 'Roboto', sans-serif";
      const highScoreTextMetrics = ctx2.measureText("High Score: " + highScore.toString());
      ctx2.fillStyle = "#000000";
      ctx2.fillRect(
        scoreX - scoreBgPadding,
        scoreY - 25 - scoreBgPadding,
        // scoreY normally indicates the center of the text. -25 places the y such that it perfectly wraps the text
        highScoreTextMetrics.width + scoreBgPadding * 2,
        65 + scoreBgPadding * 2
        // 65 is set somewhat arbitrarily to equal to the height of the text before padding
      );
      ctx2.fillStyle = "#ffffff";
      ctx2.fillText("High Score: " + highScore.toString(), scoreX, scoreY);
      ctx2.fillText("Score: " + (curPlatform + 1).toString(), scoreX, scoreY + 40);
      if (difficulty === 1 /* hard */) {
        ctx2.fillText("(Hard mode)", scoreX, scoreY + 80);
      }
      const outlineSize = 1;
      ctx2.fillStyle = "rgba(255,255,255,0.2)";
      ctx2.fillRect(
        staminaX - outlineSize,
        staminaY - outlineSize,
        staminaWidth + outlineSize * 2,
        staminaHeight + outlineSize * 2
      );
      ctx2.fillStyle = "white";
      ctx2.fillRect(
        staminaX - outlineSize,
        staminaY - outlineSize,
        (curStamina / gameConfig_default.maxStamina) * staminaWidth + outlineSize * 2,
        staminaHeight + outlineSize * 2
      );
      const staminaGrad = ctx2.createLinearGradient(
        staminaX,
        staminaY,
        staminaX + staminaWidth,
        staminaY + staminaHeight
      );
      staminaGrad.addColorStop(0, "red");
      staminaGrad.addColorStop(1, "lime");
      ctx2.fillStyle = staminaGrad;
      ctx2.fillRect(
        staminaX,
        staminaY,
        (curStamina / gameConfig_default.maxStamina) * staminaWidth,
        staminaHeight
      );
      const guidelineWidth = 3;
      const guideTextPaddingX = 10;
      const guideTextPaddingY = 15;
      if (touchToggle.checked) {
        ctx2.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx2.fillRect(screen.width / 2 - guidelineWidth / 2, 0, guidelineWidth, screen.height);
        ctx2.font = "24px 'Roboto', sans-serif";
        ctx2.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx2.fillText("Forward", guideTextPaddingX, screen.height - guideTextPaddingY);
        ctx2.fillText(
          "Backward",
          screen.width - guideTextPaddingX - ctx2.measureText("Backward").width,
          screen.height - guideTextPaddingY
        );
      }
    }
    const FIXED_TIME_STEP = 1 / 60;
    let accumulator = 0;
    let lastTime = performance.now() / 1e3;
    function update(timestamp) {
      if (!ctx) {
        return;
      }
      const now = performance.now() / 1e3;
      const deltaTime = now - lastTime;
      lastTime = now;
      accumulator += deltaTime;
      while (accumulator >= FIXED_TIME_STEP) {
        fixedUpdate(FIXED_TIME_STEP);
        accumulator -= FIXED_TIME_STEP;
      }
      draw(ctx);
      requestAnimationFrame(update);
    }
    function fixedUpdate(delta) {
      if (!gameOver) {
        curStamina = Math.max(0, curStamina - curStaminaDrain * delta);
        if (curStamina <= 0) {
          endGame();
        }
      }
      if (falling) {
        playerPos.y -= fallSpeed * delta;
        fallSpeed += gameConfig_default.fallSpeedAccel * delta;
        if (playerPos.y <= initPlayerPos.y) {
          falling = false;
          playerPos.y = initPlayerPos.y;
          setTimeout(() => {
            reset();
          }, 1e3);
        }
      }
      if (falling) {
        cameraPos = lerp(
          cameraPos,
          { x: playerPos.x + cameraOffsetFromPlayer.x, y: playerPos.y + cameraOffsetFromPlayer.y },
          0.15
        );
      } else {
        cameraPos = lerp(
          cameraPos,
          { x: playerPos.x + cameraOffsetFromPlayer.x, y: playerPos.y + cameraOffsetFromPlayer.y },
          0.1
        );
      }
    }
    function step() {
      generatePlatform();
      if (playerPos.x != platforms[curPlatform + 1].x) {
        endGame();
      } else {
        curPlatform += 1;
        curStamina = Math.min(
          gameConfig_default.maxStamina,
          curStamina + gameConfig_default.staminaGain
        );
        if (
          difficulty === 0 /* normal */ &&
          curPlatform <= gameConfig_default.maxStaminaDrainPlatform
        ) {
          curStaminaDrain += gameConfig_default.staminaDrainIncrement;
        } else if (
          difficulty === 1 /* hard */ &&
          curPlatform <= gameConfig_default.hardmodeMaxStaminaDrainPlatform
        ) {
          curStaminaDrain += gameConfig_default.hardmodeStaminaDrainIncrement;
        }
      }
    }
    function reset() {
      gameOver = false;
      pausedInputs = false;
      falling = false;
      fallSpeed = gameConfig_default.initFallSpeed;
      curStamina = gameConfig_default.maxStamina;
      curStaminaDrain = gameConfig_default.initStaminaDrain;
      curPlatform = initCurPlatform;
      curDirection = initDirection;
      platforms = [];
      playerPos = { ...initPlayerPos };
      cameraPos = { ...initCameraPos };
      nextPlatformX = 0;
      nextPlatformY = 0;
      for (let i = 0; i < numInitPlatforms; i++) {
        generatePlatform();
      }
    }
    reset();
    requestAnimationFrame(update);
  });
})();
