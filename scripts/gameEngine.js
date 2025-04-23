class GameEngine {
    constructor() {
        this.initDOMElements();
        this.initGameplayParameters();
        this.initBulletManagement();
        this.initTimestepParameters();
        this.initAudio();
        this.setupEventListeners();
        this.optimizePerformance();
        this.resetPlayerPosition();
    }

    // Initialize all DOM elements
    initDOMElements() {
        this.lobby = document.getElementById('lobby');
        this.gameContainer = document.getElementById('game');
        this.playerElement = document.getElementById('player');
        this.scoreElement = document.querySelector('.score a');
        this.waveElement = document.querySelector('.wave a');
        this.timeElement = document.querySelector('.time');
        this.livesElements = document.querySelectorAll('.life');
        this.pauseModal = document.getElementById('pause-modal');
        this.explosionManager = new Explosion(this.gameContainer); // Create explosion pool
        this.screenManager = new Screens(this); // Grab screens and bind event listener on screens
    }

    // Initialize timestep parameters for smooth gameloop
    initTimestepParameters() {
        this.TIMESTEP = 7; // 7 ms
        this.MAX_FRAMETIME = 150;
        this.lastTick = performance.now();
        this.accumulator = 0;
        this.rafHandle = null;
    }

    // Initialize gameplay parameters
    initGameplayParameters() {
        this.enemyGrid = null;
        this.keyStates = {
            ArrowLeft: false,
            ArrowRight: false,
            Space: false
        };
        this.gameState = 'lobby'; // Possible states: 'lobby', 'playing', 'paused', 'gameOver', 'victory'
        this.gameTime = 0;
        this.score = 0;
        this.lives = 3;
        this.currentLevel = 1;
        this.playerX = (this.GAME_WIDTH - this.PLAYER_WIDTH) / 2;
        this.playerY = 570;
        this.isRunning = false;
        this.isPaused = false;
        this.lastUIUpdate = 0;
        this.PLAYER_SPEED = 0.3;
        this.GAME_WIDTH = 640;
        this.PLAYER_WIDTH = 48;
        this.PLAYER_HEIGHT = 48;
        this.currentWave = 1;
        this.isWaveTransitioning = false;
    }

    // Initialize bullet management system (bullets pool)
    initBulletManagement() {
        this.bulletsContainer = document.createElement('div');
        this.bulletsContainer.id = 'bullets-container';
        this.gameContainer.appendChild(this.bulletsContainer);
        this.bulletPool = new BulletPool(this.bulletsContainer, 20);
        this.lastPlayerShot = 0;
        this.playerShootCooldown = 350;
    }

    // Initialize audio settings
    initAudio() {
        this.bgMusic = new Audio('assets/bgmusic.mp3');
        this.bgMusic.loop = true;
        this.isMuted = false;

        this.shootSound = new Audio('assets/shot.mp3');
        this.explosionSound = new Audio('assets/explosion2.mp3');

        // Initially set all muted flags
        this.bgMusic.muted = this.isMuted;
        this.shootSound.muted = this.isMuted;
        this.explosionSound.muted = this.isMuted;

        // Pause music if tab is not active
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.bgMusic.pause();
            } else {
                if (!this.isPaused && this.gameState === 'playing' && !this.isMuted) {
                    this.bgMusic.play();
                }
            }
        });
        this.bgMusic.volume = 1;
        this.shootSound.volume = 0.8;
        this.explosionSound.volume = 0.4;
    }

    // Setup key up/down buttons.
    setupEventListeners() {
        document.addEventListener('keyup', (e) => {
            // If the game is paused, check for resume/restart keys first
            if (this.gameState === 'paused') {
                if (e.code === 'KeyP') {
                    this.togglePause();
                    return;
                } else if (e.code === 'KeyR') {
                    cancelAnimationFrame(this.rafHandle);
                    this.hidePauseModal();
                    this.isPaused = false;
                    this.gameState = 'lobby';
                    this.resetGame();
                    this.startGame();
                    return
                }
            }
            // Pause
            if (e.code === 'KeyP' && this.gameState === 'playing') {
                this.togglePause();
            }
        })

        document.addEventListener('keydown', (e) => {

            // If user presses M
            if (e.code === 'Semicolon') {
                this.toggleMute();
            }

            // Movement keys or space
            if (this.keyStates.hasOwnProperty(e.code)) {
                e.preventDefault(); // usually for arrow keys & space
                this.keyStates[e.code] = true;
                if (e.code === 'Space') {
                    this.handleSpacePress();
                }
            }

            // Press L to jump level
            if (e.code === 'KeyL' && this.gameState === 'playing') {
                if (this.currentLevel < 6) {
                    this.currentWave++;
                    if (this.currentWave % 2 === 0) {
                        this.currentLevel++;
                        // If we jumped to level 4 => show mid-scene
                        if (this.currentLevel === 4) {
                            cancelAnimationFrame(this.rafHandle);
                            this.showMidScene();
                        } else {
                            this.setupLevel(this.currentLevel);
                        }
                    }
                }
            }

            // Skip mid-scene with S
            if (this.isMidSceneActive && e.code === 'KeyS') {
                clearInterval(this._midSceneInterval);
                this.hideMidScene();
                this.finishMidScene();
            }
            // Skip entry scene with S
            if (this.isCutsceneActive && e.code === 'KeyS') {
                clearInterval(this._cutsceneInterval);
                // 2) Immediately hide the cutscene
                this.hideCutscene();
                this.startGame();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (this.keyStates.hasOwnProperty(e.code)) {
                e.preventDefault();
                this.keyStates[e.code] = false;
            }
        });
    }

    // Toggle audio mute
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.bgMusic.muted = this.isMuted;
        this.shootSound.muted = this.isMuted;
        this.explosionSound.muted = this.isMuted;

        // If we just unmuted and the game is playing, resume background music
        if (!this.isMuted && this.gameState === 'playing' && !this.isPaused) {
            this.bgMusic.play();
        }
    }

    createEnemyBullet(x, y) {
        this.bulletPool.spawn(x, y, false);
    }

    handleSpacePress() {
        if (this.gameState === 'lobby') {
            this.gameState = 'cutscene';
            this.lobby.style.display = 'none';
            // Show cutscene now
            this.showCutscene();
            return;
        }

        if (this.gameState === 'gameOver' ||
            this.gameState === 'lobby' ||
            this.gameState === 'victory') {
            this.resetGame();
            this.startGame();
        }
    }

    resetKeyStates() {
        Object.keys(this.keyStates).forEach(key => {
            this.keyStates[key] = false;
        });
    }

    optimizePerformance() {
        this.playerElement.style.transform = 'translateZ(0)';
        this.playerElement.style.willChange = 'transform';
    }

    startGame() {
        this.lobby.style.display = 'none';
        this.gameContainer.style.display = 'block';
        this.isRunning = true;
        this.gameState = 'playing';
        this.lastTick = performance.now();

        // Start background music from beginning
        this.bgMusic.currentTime = 0;
        if (!this.isMuted) {
            this.bgMusic.play();
        }

        // Create and reset enemy grid
        this.enemyGrid = new EnemyGrid();
        this.setupLevel(this.currentLevel);
        this.runGameLoop();
    }

    setupLevel(level) {
        const backgroundEl = document.getElementById('background');
        if (level === 2) {
            backgroundEl.style.backgroundImage = "url('assets/Playground2.webp')";
            backgroundEl.style.fill = "black";
            backgroundEl.style.opacity = 0.7;
        } else if (level === 3) {
            backgroundEl.style.backgroundImage = "url('assets/Playground3.webp')";
            backgroundEl.style.fill = "black";
            backgroundEl.style.opacity = 0.4;
        } else {
            backgroundEl.style.backgroundImage = "url('assets/Playground.webp')";
        }

        const baseSpeed = 0.03;

        const levelFormations = {
            1: { rows: 5, cols: 5 },
            2: { rows: 4, cols: 6 },
            3: { rows: 3, cols: 9 },
            4: { rows: 5, cols: 6 },
            5: { rows: 5, cols: 7 },
            6: { rows: 5, cols: 7 },
        };
        this.enemyGrid.dualShooting = (level === 3 || level === 4 || level === 2 || level === 6);

        const formation = levelFormations[level] || levelFormations[1];
        this.enemyGrid.setFormation(formation.rows, formation.cols, level);

        // Example speeds & intervals
        switch (level) {
            case 1:
                this.enemyGrid.setContinuousSpeed(baseSpeed * 3);
                this.enemyGrid.enemyShootInterval = 1000;
                break;
            case 2:
                this.enemyGrid.setContinuousSpeed(baseSpeed * 4);
                this.enemyGrid.enemyShootInterval = 700;
                break;
            case 3:
                this.enemyGrid.setContinuousSpeed(baseSpeed * 2.5);
                this.enemyGrid.enemyShootInterval = 700;
                break;
            case 4:
                this.enemyGrid.setContinuousSpeed(baseSpeed * 5);
                this.enemyGrid.enemyShootInterval = 700;
                break;
            case 5:
                this.enemyGrid.setContinuousSpeed(baseSpeed * 5.5);
                this.enemyGrid.enemyShootInterval = 700;
                break;
            case 6:
                this.enemyGrid.setContinuousSpeed(baseSpeed * 6);
                this.enemyGrid.enemyShootInterval = 700;
                break;
        }

        this.enemyGrid.dropDistance = Math.min(
            25 + (level * 4),
            65 / formation.rows
        );
    }

    playerShoot() {
        const now = performance.now();
        if (now - this.lastPlayerShot >= this.playerShootCooldown) {
            const bulletX = this.playerX + (this.PLAYER_WIDTH / 2) - 10.5;
            const bulletY = this.playerY - 20;
            this.bulletPool.spawn(bulletX, bulletY, true);
            this.lastPlayerShot = now;

            if (!this.isMuted) {
                // Rewind + play shoot sound
                this.shootSound.currentTime = 0;
                this.shootSound.play()
            }
        }
    }

    updateBullets(timeStep) {
        const activeBullets = this.bulletPool.getActiveBullets();

        for (let bullet of activeBullets) {
            const inBounds = bullet.update(timeStep);
            if (!inBounds) {
                this.bulletPool.release(bullet);
                continue;
            }

            if (bullet.isPlayerBullet && this.enemyGrid) {
                const enemies = this.enemyGrid.enemies;
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    if (bullet.checkCollision(enemy)) {
                        this.explosionManager.createExplosion(enemy.x, enemy.y);

                        // Play explosion SFX if not muted
                        if (!this.isMuted) {
                            this.explosionSound.currentTime = 0;
                            this.explosionSound.play()
                        }

                        const scorePoints = this.calculateScore(enemy.type);
                        this.score += scorePoints;
                        this.enemyGrid.removeEnemy(enemy);
                        this.bulletPool.release(bullet);
                        if (this.enemyGrid.enemies.length === 0) {
                            setTimeout(() => this.startNewWave(), 0);
                        }
                        break;
                    }
                }
            } else {
                // Enemy bullet
                if (this.checkBulletPlayerCollision(bullet)) {
                    this.explosionManager.createExplosion(this.playerX, this.playerY);

                    if (!this.isMuted) {
                        this.explosionSound.currentTime = 0;
                        this.explosionSound.play()
                    }

                    this.handlePlayerHit();
                    this.bulletPool.release(bullet);
                }
            }
        }
    }

    calculateScore(enemyType) {
        switch (enemyType) {
            case 3: return 30;
            case 2: return 20;
            default: return 10;
        }
    }

    startNewWave() {
        if (this.isWaveTransitioning) return;
        this.isWaveTransitioning = true;

        requestAnimationFrame(() => {
            this.currentWave++;

            if (this.currentWave % 2 === 0) {
                this.currentLevel++;
                // If last level completed => Victory
                if (this.currentLevel > 6) {
                    this.victoryScreen();
                    this.isWaveTransitioning = false;
                    return;
                }
                // if we've just reached level 3
                if (this.currentLevel === 4) {
                    cancelAnimationFrame(this.rafHandle);
                    this.showMidScene();
                } else {
                    this.setupLevel(this.currentLevel);
                }
            } else {
                // Re-initialize same level's formation
                this.enemyGrid.initialize(this.currentLevel);
            }

            // Clear any active bullets
            const activeBullets = this.bulletPool.getActiveBullets();
            for (let bullet of activeBullets) {
                this.bulletPool.release(bullet);
            }

            this.isWaveTransitioning = false;
        });
    }

    victoryScreen() {
        cancelAnimationFrame(this.rafHandle);
        this.isRunning = false;
        this.gameState = 'victory';

        this.bgMusic.pause();
        this.bgMusic.currentTime = 0;

        const finalScore = this.score;
        const timeElapsed = this.timeElement.textContent;
        this.screenManager.showVictoryScreen(finalScore, timeElapsed);
    }

    gameOver() {
        cancelAnimationFrame(this.rafHandle);
        this.isRunning = false;
        this.gameState = 'gameOver';

        this.bgMusic.pause();
        this.bgMusic.currentTime = 0;

        const timeElapsed = this.timeElement.textContent;
        this.screenManager.showGameOverScreen(this.score, timeElapsed);
    }

    runGameLoop() {
        if (!this.isRunning) return;

        const now = performance.now();
        let delta = now - this.lastTick;
        this.lastTick = now;
        if (delta > this.MAX_FRAMETIME) {
            delta = this.MAX_FRAMETIME;
        }
        this.accumulator += delta;

        while (this.accumulator >= this.TIMESTEP) {
            this.update(this.TIMESTEP, now);
            this.accumulator -= this.TIMESTEP;
        }
        this.render();
        this.rafHandle = requestAnimationFrame(this.runGameLoop.bind(this));
    }

    update(timeStep, currentTime) {
        if (this.isPaused) return;

        const movement = this.PLAYER_SPEED * timeStep;
        if (this.keyStates.ArrowLeft) {
            this.playerX = Math.max(0, this.playerX - movement);
        }
        if (this.keyStates.ArrowRight) {
            this.playerX = Math.min(this.GAME_WIDTH - this.PLAYER_WIDTH, this.playerX + movement);
        }

        if (this.keyStates.Space && this.gameState === 'playing') {
            this.playerShoot();
        }

        if (this.enemyGrid) {
            this.enemyGrid.update(timeStep, currentTime);
        }

        this.updateBullets(timeStep);
        this.gameTime += timeStep;
        this.updateTimeDisplay();
    }

    checkBulletPlayerCollision(bullet) {
        return (
            bullet.x < this.playerX + this.PLAYER_WIDTH &&
            bullet.x + bullet.width > this.playerX &&
            bullet.y < this.playerY + this.PLAYER_HEIGHT &&
            bullet.y + bullet.height > this.playerY
        );
    }

    handlePlayerHit() {
        this.lives--;
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            this.resetPlayerPosition();
        }
    }

    updateTimeDisplay() {
        const minutes = Math.floor(this.gameTime / 60000);
        const seconds = Math.floor((this.gameTime % 60000) / 1000);
        this.timeElement.textContent =
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    render() {
        const renderX = Math.round(this.playerX);
        this.playerElement.style.transform = `translate3d(${renderX}px, ${this.playerY}px, 0)`;
        this.updateUI();
    }

    updateUI() {
        const now = performance.now();
        if (now - this.lastUIUpdate < 16) return;

        this.scoreElement.textContent = `SCORE: ${this.score}`;
        this.waveElement.textContent = `WAVE: ${this.currentWave}`;
        this.livesElements.forEach((life, index) => {
            life.style.opacity = index < this.lives ? 1 : 0.3;
        });
        this.lastUIUpdate = now;
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.isPaused = true;
            this.gameState = 'paused';
            this.showPauseModal();
            this.bgMusic.pause();
        } else if (this.gameState === 'paused') {
            this.isPaused = false;
            this.gameState = 'playing';
            this.hidePauseModal();
            this.lastTick = performance.now();
            this.accumulator = 0;
            // Resume background music if not muted
            if (!this.isMuted) {
                this.bgMusic.play();
            }
        }
    }

    showPauseModal() {
        if (this.pauseModal) {
            this.pauseModal.classList.remove('hidden');
        }
    }

    hidePauseModal() {
        if (this.pauseModal) {
            this.pauseModal.classList.add('hidden');
        }
    }

    resetPlayerPosition() {
        this.playerX = (this.GAME_WIDTH - this.PLAYER_WIDTH) / 2;
        this.playerY = 570;
        this.playerElement.style.transform = `translate3d(${this.playerX}px, ${this.playerY}px, 0)`;
    }

    resetGame() {
        this.gameTime = 0;
        this.score = 0;
        this.lives = 3;
        this.currentLevel = 1;
        this.currentWave = 1;
        this.resetPlayerPosition();
        this.updateUI();
        this.lobby.style.display = 'flex';
        this.gameContainer.style.display = 'none';
        this.isRunning = false;
        this.gameState = 'lobby';
        this.explosionManager.clear();
        this.resetKeyStates();

        // Clear bullets
        const activeBullets = this.bulletPool.getActiveBullets();
        for (let bullet of activeBullets) {
            this.bulletPool.release(bullet);
        }
        this.screenManager.hideScreens();

        // Stop background music and rewind
        this.bgMusic.pause();
        this.bgMusic.currentTime = 0;
    }

    showCutscene() {
        // Show the cutscene container
        const cutsceneEl = document.getElementById('cutscene');
        const cutsceneTextEl = document.getElementById('cutscene-text');
        cutsceneEl.style.display = 'block';

        // Clear any old text
        cutsceneTextEl.textContent = '';

        // The storyline text
        const storyline = "Space Invaders have arrived!\n\nYour mission is to defend Earth and wait for backup.\n\nGood luck!";

        // Type it out, store the interval so we can skip if needed
        const speed = 100; // ms between each character
        this._cutsceneInterval = this.typeWriter(cutsceneTextEl, storyline, speed, () => {
            // Once text finishes naturally -> automatically start game
            this.hideCutscene();
            this.startGame();
        });

        // We'll track that the cutscene is currently active to skip if we want
        this.isCutsceneActive = true;
    }

    hideCutscene() {
        const cutsceneEl = document.getElementById('cutscene');
        cutsceneEl.style.display = 'none';
        this.isCutsceneActive = false;
    }

    showMidScene() {
        this.isMidSceneActive = true; // To skip
        const midEl = document.getElementById('mid-scene');
        const midTextEl = document.getElementById('mid-scene-text');
        midEl.style.display = 'block';
        midTextEl.textContent = '';

        const storyline =
            "Your spaceship has been reinforced!!\n\n" +
            "You can take an additional hit";
        const speed = 90;
        this._midSceneInterval = this.typeWriter(midTextEl, storyline, speed, () => {
            // If it finishes (no skip pressed) run this function:
            this.hideMidScene();
            this.finishMidScene();
        });
    }

    hideMidScene() {
        const midEl = document.getElementById('mid-scene');
        midEl.style.display = 'none';
        this.isMidSceneActive = false;
    }

    finishMidScene() {
        this.lives++;
        this.updateUI();

        // Then resume level
        this.setupLevel(3);
        this.runGameLoop();
    }

    typeWriter(element, text, speed, onComplete) {
        let index = 0;
        const intervalId = setInterval(() => {
            if (index < text.length) {
                element.textContent += text.charAt(index);
                index++;
            } else {
                clearInterval(intervalId);
                if (onComplete) onComplete();
            }
        }, speed);

        return intervalId;
    }
}
