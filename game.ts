//import SpacemanImage from "./assets/spaceman.png";
//import BackgroundImage from "./assets/background.png";

import gameConfig from "./config/gameConfig.ts";

document.addEventListener("DOMContentLoaded", async () => {
  interface Coords2d {
    x: number;
    y: number;
  }
  interface GameCoords extends Coords2d {}
  interface CanvasCoords extends Coords2d {}

  enum Direction {
    Left = 0,
    Right = 1,
  }

  ///////////////////////
  // rendering variables
  ///////////////////////
  const screen = document.getElementById("screen") as HTMLCanvasElement;
  const ctx = screen.getContext("2d");

  const smallScreenWidth = 768;

  const playerImage = new Image();
  playerImage.src = "./assets/spaceman.png";
  const backgroundImage = new Image();
  backgroundImage.src = "./assets/background.png";

  // wait for images to load
  await Promise.all([playerImage.decode(), backgroundImage.decode()]);

  const canvasMaxWidth = 1000;
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

  const cameraOffsetFromPlayer: GameCoords = { x: 0, y: 0 };

  // resize canvas when window is resized
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // Conversion function from game coordinates to canvas coordinates
  function gameToCanvas(
    pos: GameCoords,
    cameraPos: GameCoords,
    objWidth: number,
    objHeight: number
  ): CanvasCoords {
    // Step 1: Translate game coordinates to canvas coordinates (with camera offset)
    const translatedX = pos.x - cameraPos.x; // Translate based on camera position
    // y is translated then canvasHeight/2 is added because:
    // if camera is positioned at (0,0) then the canvas should render (y=canvasHeight/2) at the top
    // and y=(-canvasHeight/2) at the bottom
    const translatedY = pos.y - cameraPos.y + canvasHeight / 2;

    // Step 2: Flip Y-axis and adjust X-axis for canvas
    const canvasX = translatedX + canvasWidth / 2; // Move X axis origin to center (canvas middle)
    const canvasY = canvasHeight - translatedY; // Flip Y axis to put origin at bottom middle

    // Step 3: offset the coordinate so that the game coordinates refer to the center of the object
    const offsetCanvasX = canvasX - objWidth / 2;
    const offsetCanvasY = canvasY - objHeight / 2;

    return { x: offsetCanvasX, y: offsetCanvasY };
  }

  function lerp(start: GameCoords, end: GameCoords, t: number): GameCoords {
    const newX = start.x + (end.x - start.x) * t;
    const newY = start.y + (end.y - start.y) * t;
    return { x: newX, y: newY };
  }

  function resizeCanvas() {
    canvasWidth = Math.min(canvasMaxWidth, window.innerWidth * 0.95);
    canvasHeight = Math.min(canvasMaxHeight, window.innerHeight * 0.95);
    screen.width = canvasWidth;
    screen.height = canvasHeight;

    // Update dependent values
    cameraOffsetFromPlayer.y = canvasHeight / 5;
    staminaWidth = window.innerWidth < smallScreenWidth ? canvasWidth * 0.8 : canvasWidth * 0.4;
    staminaX = canvasWidth / 2 - staminaWidth / 2;
    staminaY = window.innerWidth < smallScreenWidth ? 145 : 100; // lower stamina bar to prevent it from covering "(hard mode)" text when screen is too small
  }

  ////////////////////////////
  // game logic variables
  ////////////////////////////
  enum Difficulty {
    normal = 0,
    hard = 1,
  }

  let difficulty = Difficulty.normal;

  let highScore = 0;
  if (localStorage.getItem("highScore") != null) {
    highScore = parseInt(localStorage.getItem("highScore")!);
  }

  let gameOver = false;
  let pausedInputs = false;
  let falling = false;

  const origin: GameCoords = { x: 0, y: 0 };

  let fallSpeed = gameConfig.initFallSpeed;

  let curStamina = gameConfig.maxStamina;
  let curStaminaDrain = gameConfig.initStaminaDrain;

  // how far the player can stand inside the floor.
  // gives illusion of 3d
  const floorOffset = 30;

  const playerWidth = 100;
  const playerHeight = 100;

  const numInitPlatforms = 10;
  const platformOffsetX = 125;
  const platformOffsetY = 80;
  const platformWidth = 100;
  const platformHeight = 10;

  // + playerHeight/2 to align player height because coords point to middle of object
  // + platformHeight/2 to align player to sit on top of platforms
  const initPlayerPos: GameCoords = { x: 0, y: playerHeight / 2 + platformHeight / 2 };
  let playerPos: GameCoords = { ...initPlayerPos }; // playerPos = initPlayerPos;

  const initCameraPos: GameCoords = {
    x: playerPos.x + cameraOffsetFromPlayer.x,
    y: playerPos.y + cameraOffsetFromPlayer.y,
  };
  let cameraPos: GameCoords = { ...initCameraPos }; // cameraPos = initCameraPos;

  const initCurPlatform = -1;
  let curPlatform = initCurPlatform;
  const initDirection = Direction.Right;
  let curDirection = initDirection;

  // coordinates of the _MIDDLE_ of the platform position
  let platforms: GameCoords[] = [];

  let nextPlatformX = 0;
  let nextPlatformY = 0;

  function generatePlatform() {
    const rand = Math.random();
    // 50/50 for platform to be left or right
    if (rand < 0.5) {
      nextPlatformX -= platformOffsetX;
    } else {
      nextPlatformX += platformOffsetX;
    }
    nextPlatformY += platformOffsetY;

    const newPlatform: GameCoords = { x: nextPlatformX, y: nextPlatformY };
    platforms.push(newPlatform);
  }

  function endGame() {
    pausedInputs = true;
    gameOver = true;

    const score = curPlatform + 1;
    if (difficulty === Difficulty.normal && score > highScore) {
      localStorage.setItem("highScore", score.toString());
      highScore = score;
    } else if (difficulty === Difficulty.hard && score > highScore) {
      localStorage.setItem("hardHighScore", score.toString());
      highScore = score;
    }

    // game pause for 1 second
    setTimeout(() => {
      falling = true;
    }, 1000);
  }

  ///////////////////
  // input handling
  ///////////////////
  function moveForward() {
    if (curDirection === Direction.Left) {
      moveLeft();
    } else {
      moveRight();
    }
    step();
  }
  function moveBackward() {
    if (curDirection === Direction.Left) {
      moveRight();
      curDirection = Direction.Right;
    } else {
      moveLeft();
      curDirection = Direction.Left;
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

  // these are not null because if they are, they get set later in
  // the keybinding section
  let storedForwardKey = localStorage.getItem("forwardKey");
  let storedBackwardKey = localStorage.getItem("backwardKey");
  document.addEventListener("keydown", function (event) {
    if (pausedInputs) {
      return;
    }

    // disable inputs from key repeat (from holding key down)
    if (event.repeat === true) {
      return;
    }

    if (event.key === storedForwardKey) {
      moveForward();
    } else if (event.key === storedBackwardKey) {
      moveBackward();
    }
  });

  ///////////////////
  // touch controls
  ///////////////////
  const touchToggle = document.getElementById("touchToggle") as HTMLInputElement;

  function onTouchStart(e: TouchEvent) {
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

  // Enable or disable controls when checkbox changes
  touchToggle.addEventListener("change", () => {
    if (touchToggle.checked) {
      screen.addEventListener("touchstart", onTouchStart);
      localStorage.setItem("touchEnabled", "true");
    } else {
      screen.removeEventListener("touchstart", onTouchStart);
      localStorage.setItem("touchEnabled", "false");
    }
  });

  // load touchscreen setting from localstorage on initial page load
  if (localStorage.getItem("touchEnabled") === "true") {
    touchToggle.checked = true;
    screen.addEventListener("touchstart", onTouchStart);
  }

  ///////////////////
  // keybinding
  //
  // forwardKeyInput is the input text box element
  // storedForwardKey is the key that the javascript currently has stored for use in input detection
  // localStorage.getItem("forwardKey") is the key stored in localStorage (in the browser)
  ///////////////////
  const forwardKeyInput = document.getElementById("forwardKeyInput") as HTMLInputElement;
  const backwardKeyInput = document.getElementById("backwardKeyInput") as HTMLInputElement;

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

  // save keybinds to localstorage
  function saveKeybinds() {
    if (forwardKeyInput && backwardKeyInput) {
      localStorage.setItem("forwardKey", forwardKeyInput.value);
      localStorage.setItem("backwardKey", backwardKeyInput.value);

      storedForwardKey = forwardKeyInput.value;
      storedBackwardKey = backwardKeyInput.value;
    }
  }

  // reset keybinds to default
  function resetKeybinds() {
    localStorage.setItem("forwardKey", gameConfig.defaultForwardKey);
    localStorage.setItem("backwardKey", gameConfig.defaultBackwardKey);

    storedForwardKey = gameConfig.defaultForwardKey;
    storedBackwardKey = gameConfig.defaultBackwardKey;

    forwardKeyInput.value = gameConfig.defaultForwardKey;
    backwardKeyInput.value = gameConfig.defaultBackwardKey;
  }

  // hook onto textboxes so that whatever key you press while its selected is set as the textbox contents
  forwardKeyInput.addEventListener("keydown", (event: KeyboardEvent) => {
    // Prevent the default action of inserting the key into the textbox
    event.preventDefault();

    // Update the textbox value to the pressed key
    forwardKeyInput.value = event.key;
  });
  backwardKeyInput.addEventListener("keydown", (event: KeyboardEvent) => {
    // Prevent the default action of inserting the key into the textbox
    event.preventDefault();

    // Update the textbox value to the pressed key
    backwardKeyInput.value = event.key;
  });

  ///////////////////
  // hard mode toggle
  ///////////////////
  const hardmodeToggle = document.getElementById("hardmodeToggle") as HTMLInputElement;

  hardmodeToggle.addEventListener("change", () => {
    if (hardmodeToggle.checked) {
      difficulty = Difficulty.hard;
      if (localStorage.getItem("hardHighScore") != null) {
        highScore = parseInt(localStorage.getItem("hardHighScore")!);
      } else {
        highScore = 0;
      }

      localStorage.setItem("hardmode", "true");
    } else {
      difficulty = Difficulty.normal;
      if (localStorage.getItem("highScore") != null) {
        highScore = parseInt(localStorage.getItem("highScore")!);
      } else {
        highScore = 0;
      }

      localStorage.setItem("hardmode", "false");
    }
    reset();
  });

  // load hardmode setting from localStorage on initial page load
  if (localStorage.getItem("hardmode") === "true") {
    hardmodeToggle.checked = true;
    difficulty = Difficulty.hard;

    if (localStorage.getItem("hardHighScore") != null) {
      highScore = parseInt(localStorage.getItem("hardHighScore")!);
    } else {
      highScore = 0;
    }
  }

  //////////////////////////////////////////////////////////
  // main game loop functions
  //
  // update(), draw()   called every frame
  // fixedUpdate()      called 60 times per second. deltatime used to normalize things that would be fps dependent otherwise
  // step()             called after every movement step
  // reset()            called once before each game start
  //////////////////////////////////////////////////////////

  function draw(ctx: CanvasRenderingContext2D) {
    // wipe screen
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // background
    // this draws the background using the tilable background image.
    // the tiles are offset by (camerapos % BackgroundImage dimensions) which
    // creates the illusion that the background is continuous and infinite.
    // for loop ranges from -1 to (# tiles required + 1) to draw extra tiles in each direction
    // to help with this illusion
    const BackgroundImage = {
      width: backgroundImage.naturalWidth,
      height: backgroundImage.naturalHeight,
    }; // normally this project uses astro's image import to read the file metadata but this is
    for (let i = -1; i < canvasWidth / BackgroundImage.width + 1; i++) {
      // added as a bandaid because that is removed from this standalone version of the game
      for (let j = -1; j < canvasHeight / BackgroundImage.height + 1; j++) {
        ctx.drawImage(
          backgroundImage,
          Math.round(i * BackgroundImage.width - (cameraPos.x % BackgroundImage.width)),
          Math.round(j * BackgroundImage.height + (cameraPos.y % BackgroundImage.height)),
          BackgroundImage.width,
          BackgroundImage.height
        );
      }
    }

    // floor
    const floorCanvasCoords = gameToCanvas({ x: 0, y: floorOffset }, cameraPos, canvasWidth, 1);
    if (canvasHeight - floorCanvasCoords.y > 0) {
      // floor grad
      const floorGrad = ctx.createLinearGradient(0, floorCanvasCoords.y, 0, canvasHeight);
      floorGrad.addColorStop(0, "#3d5c80");
      floorGrad.addColorStop(1, "#001d3d");
      ctx.fillStyle = floorGrad;

      // illusion to make the floor seem infinite by always
      // drawing the floor at canvas x=0 with width canvasWidth
      ctx.fillRect(0, floorCanvasCoords.y, canvasWidth, canvasHeight - floorCanvasCoords.y);
    }

    // platforms
    for (let i = 0; i < platforms.length; i++) {
      const canvasCoords = gameToCanvas(platforms[i], cameraPos, platformWidth, platformHeight);
      // only draw platforms that are actually on screen
      if (
        canvasCoords.x > -platformWidth &&
        canvasCoords.x < canvasWidth + platformWidth &&
        canvasCoords.y > -platformHeight &&
        canvasCoords.y < canvasHeight + platformHeight
      ) {
        if (curPlatform === i) {
          // gradient from top to bottom of platform
          const platformGrad = ctx.createLinearGradient(
            canvasCoords.x + platformWidth / 2,
            canvasCoords.y,
            canvasCoords.x + platformWidth / 2,
            canvasCoords.y + platformHeight
          );
          platformGrad.addColorStop(0, "lime");
          platformGrad.addColorStop(1, "green");
          ctx.fillStyle = platformGrad;
          ctx.fillRect(canvasCoords.x, canvasCoords.y, platformWidth, platformHeight);
        } else {
          // gradient from top to bottom of platform
          const platformGrad = ctx.createLinearGradient(
            canvasCoords.x + platformWidth / 2,
            canvasCoords.y,
            canvasCoords.x + platformWidth / 2,
            canvasCoords.y + platformHeight
          );
          platformGrad.addColorStop(0, "orange");
          platformGrad.addColorStop(1, "yellow");
          ctx.fillStyle = platformGrad;
          ctx.fillRect(canvasCoords.x, canvasCoords.y, platformWidth, platformHeight);
        }
      }
    }

    // player
    const playerCanvasCoords = gameToCanvas(playerPos, cameraPos, playerWidth, playerHeight);
    if (curDirection === Direction.Left) {
      ctx.drawImage(
        playerImage,
        playerCanvasCoords.x,
        playerCanvasCoords.y,
        playerWidth,
        playerHeight
      );
    } else {
      ctx.save();
      ctx.scale(-1, 1);
      const flippedX = -(playerCanvasCoords.x + playerWidth);
      ctx.drawImage(playerImage, flippedX, playerCanvasCoords.y, playerWidth, playerHeight);
      ctx.restore();
    }

    ctx.font = "32px 'Roboto', sans-serif";
    // score background
    const highScoreTextMetrics = ctx.measureText("High Score: " + highScore.toString());
    ctx.fillStyle = "#000000";
    ctx.fillRect(
      scoreX - scoreBgPadding,
      scoreY - 25 - scoreBgPadding, // scoreY normally indicates the center of the text. -25 places the y such that it perfectly wraps the text
      highScoreTextMetrics.width + scoreBgPadding * 2,
      65 + scoreBgPadding * 2 // 65 is set somewhat arbitrarily to equal to the height of the text before padding
    );

    // score
    ctx.fillStyle = "#ffffff";
    ctx.fillText("High Score: " + highScore.toString(), scoreX, scoreY);
    ctx.fillText("Score: " + (curPlatform + 1).toString(), scoreX, scoreY + 40);
    if (difficulty === Difficulty.hard) {
      ctx.fillText("(Hard mode)", scoreX, scoreY + 80);
    }

    // stamina
    // draw black rect first as outline/background for the entire meter
    const outlineSize = 1;

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(
      staminaX - outlineSize,
      staminaY - outlineSize,
      staminaWidth + outlineSize * 2,
      staminaHeight + outlineSize * 2
    );
    ctx.fillStyle = "white";
    ctx.fillRect(
      staminaX - outlineSize,
      staminaY - outlineSize,
      (curStamina / gameConfig.maxStamina) * staminaWidth + outlineSize * 2,
      staminaHeight + outlineSize * 2
    );

    // red to green from left to right grad
    const staminaGrad = ctx.createLinearGradient(
      staminaX,
      staminaY,
      staminaX + staminaWidth,
      staminaY + staminaHeight
    );
    staminaGrad.addColorStop(0, "red");
    staminaGrad.addColorStop(1, "lime");
    ctx.fillStyle = staminaGrad;
    ctx.fillRect(
      staminaX,
      staminaY,
      (curStamina / gameConfig.maxStamina) * staminaWidth,
      staminaHeight
    );

    // touch controls guide
    const guidelineWidth = 3;
    const guideTextPaddingX = 10;
    const guideTextPaddingY = 15;

    if (touchToggle.checked) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(screen.width / 2 - guidelineWidth / 2, 0, guidelineWidth, screen.height);

      ctx.font = "24px 'Roboto', sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fillText("Forward", guideTextPaddingX, screen.height - guideTextPaddingY);
      ctx.fillText(
        "Backward",
        screen.width - guideTextPaddingX - ctx.measureText("Backward").width,
        screen.height - guideTextPaddingY
      );
    }
  }

  const FIXED_TIME_STEP = 1 / 60;
  let accumulator = 0;
  let lastTime = performance.now() / 1000;
  function update(timestamp: number) {
    if (!ctx) {
      return;
    }

    const now = performance.now() / 1000; // seconds
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

  function fixedUpdate(delta: number) {
    if (!gameOver) {
      // drain stamina every frame
      curStamina = Math.max(0, curStamina - curStaminaDrain * delta);

      // if playing and stamina runs out
      if (curStamina <= 0) {
        endGame();
      }
    }

    if (falling) {
      playerPos.y -= fallSpeed * delta;
      fallSpeed += gameConfig.fallSpeedAccel * delta;

      // hit the floor
      if (playerPos.y <= initPlayerPos.y) {
        falling = false;
        playerPos.y = initPlayerPos.y;

        // pause for a second before resetting
        setTimeout(() => {
          reset();
        }, 1000);
      }
    }

    // different camera lerp speed when falling
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

    // if player walked wrong direction
    if (playerPos.x != platforms[curPlatform + 1].x) {
      endGame();
    } else {
      curPlatform += 1;
      // gain stamina back
      curStamina = Math.min(gameConfig.maxStamina, curStamina + gameConfig.staminaGain);

      // increase drain
      // cap stamina loss at n platforms to make infinite play possible but still difficult
      if (difficulty === Difficulty.normal && curPlatform <= gameConfig.maxStaminaDrainPlatform) {
        curStaminaDrain += gameConfig.staminaDrainIncrement;
        // (DEBUG) CODE FOR TESTING FALLING
        // playerPos = { ...playerPos, y: 100000 };
        /* (DEBUG) CODE FOR TESTING DIFFICULTY CAP
        curStaminaDrain =
            gameConfig.initStaminaDrain +
            gameConfig.staminaDrainIncrement * gameConfig.maxStaminaDrainPlatform;
            */
      } else if (
        difficulty === Difficulty.hard &&
        curPlatform <= gameConfig.hardmodeMaxStaminaDrainPlatform
      ) {
        curStaminaDrain += gameConfig.hardmodeStaminaDrainIncrement;
        /* (DEBUG) CODE FOR TESTING DIFFICULTY CAP
        curStaminaDrain =
            gameConfig.initStaminaDrain +
            gameConfig.hardmodeStaminaDrainIncrement * gameConfig.hardmodeMaxStaminaDrainPlatform;
            */
      }
    }
  }

  function reset() {
    gameOver = false;
    pausedInputs = false;
    falling = false;
    fallSpeed = gameConfig.initFallSpeed;

    curStamina = gameConfig.maxStamina;
    curStaminaDrain = gameConfig.initStaminaDrain;

    curPlatform = initCurPlatform;
    curDirection = initDirection;

    platforms = [];
    playerPos = { ...initPlayerPos }; // playerPos = initPlayerPos;
    cameraPos = { ...initCameraPos }; // cameraPos = initCameraPos;

    nextPlatformX = 0;
    nextPlatformY = 0;
    for (let i = 0; i < numInitPlatforms; i++) {
      generatePlatform();
    }
  }
  // start game
  reset();
  requestAnimationFrame(update);
});
