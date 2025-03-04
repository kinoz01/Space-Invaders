class GameEngine {
    constructor() {
        this.lobby = document.getElementById('lobby');
        this.gameContainer = document.getElementById('game');
        this.playerElement = document.getElementById('player');
        this.scoreElement = document.querySelector('.score a');
        this.waveElement = document.querySelector('.wave a');
        this.timeElement = document.querySelector('.time');
        this.livesElements = document.querySelectorAll('.life');
        this.pauseModal = document.getElementById('pause-modal');

        this.explosionManager = new Explosion(this.gameContainer);
        this.screenManager = new Screens(this);

        // Gameplay parameters.
        this.enemyGrid = null;
        this.keyStates = {
            ArrowLeft: false,
            ArrowRight: false,
            Space: false
        };

        this.gameState = 'lobby'; // 'lobby', 'playing', 'paused', 'gameOver', 'victory'
        this.gameTime = 0;
        this.score = 0;
        this.lives = 3;
        this.currentLevel = 1;
        this.playerX = (this.GAME_WIDTH - this.PLAYER_WIDTH) / 2;
        this.playerY = 570;
        this.isRunning = false;
        this.isPaused = false;
        this.lastUIUpdate = 0;

        // Bullet management
        this.bulletsContainer = document.createElement('div');
        this.bulletsContainer.id = 'bullets-container';
        this.gameContainer.appendChild(this.bulletsContainer);
        this.bulletPool = new BulletPool(this.bulletsContainer, 50);

        this.lastPlayerShot = 0;
        this.playerShootCooldown = 350;

        // Semi-fixed timestep parameters for the game loop.
        this.TIMESTEP = 1000 / 60; // 16.7 ms
        this.MAX_FRAMETIME = 250;
        this.lastTick = performance.now();
        this.accumulator = 0;
        this.rafHandle = null;

        // more Gameplay parameters.
        this.PLAYER_SPEED = 0.3;
        this.GAME_WIDTH = 640;
        this.PLAYER_WIDTH = 48;
        this.PLAYER_HEIGHT = 48;
        this.currentWave = 1;
        this.enemiesPerWave = 21; // 3 rows × 7 columns = 21 enemies
        this.enemiesDefeated = 0;
        this.isWaveTransitioning = false;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.optimizePerformance();
        this.resetPlayerPosition();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            // If the game is paused, check for resume/restart keys.
            if (this.gameState === 'paused') {
                if (e.code === 'KeyP') {
                    // Resume game.
                    this.togglePause();
                    return;
                } else if (e.code === 'KeyR') {
                    // Restart game: cancel any animation frame, hide modal, and ensure pause is cleared.
                    cancelAnimationFrame(this.rafHandle);
                    this.hidePauseModal();
                    this.isPaused = false;           // Clear pause flag
                    this.gameState = 'lobby';        // Reset state to lobby before starting new game
                    this.resetGame();
                    this.startGame();
                    return;
                }
            }

            if (this.keyStates.hasOwnProperty(e.code)) {
                e.preventDefault();
                this.keyStates[e.code] = true;
                if (e.code === 'Space') {
                    this.handleSpacePress();
                }
            }

            if (e.code === 'KeyP' && this.gameState === 'playing') {
                this.togglePause();
            }
            if (e.code === 'KeyL' && this.gameState === 'playing') {
                if (this.currentLevel < 5) {
                    this.currentWave++;
                    if (this.currentWave % 2 == 0) {
                        this.currentLevel++
                        this.setupLevel(this.currentLevel);
                    }
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            if (this.keyStates.hasOwnProperty(e.code)) {
                e.preventDefault();
                this.keyStates[e.code] = false;
            }
        });
    }

    createEnemyBullet(x, y) {
        this.bulletPool.spawn(x, y, false);
    }

    handleSpacePress() {
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

        // Create and reset enemy grid
        this.enemyGrid = new EnemyGrid();
        this.setupLevel(this.currentLevel);
        this.runGameLoop();
    }

    setupLevel(level) {
        const baseSpeed = 0.03;

        const levelFormations = {
            1: { rows: 3, cols: 7 },
            2: { rows: 4, cols: 6 },
            3: { rows: 4, cols: 7 },
            4: { rows: 5, cols: 6 },
            5: { rows: 5, cols: 7 },
        };
        this.enemyGrid.dualShooting = (level === 4);

        const formation = levelFormations[level] || levelFormations[1];
        this.enemyGrid.setFormation(formation.rows, formation.cols);
        this.enemiesPerWave = formation.rows * formation.cols;

        switch (level) {
            case 1:
                this.enemyGrid.setContinuousSpeed(baseSpeed * 3);
                break;
            case 2:
                this.enemyGrid.setContinuousSpeed(baseSpeed * 4);
                break;
            case 3:
                this.enemyGrid.setContinuousSpeed(baseSpeed * 5);
                break;
            case 4:
                this.enemyGrid.setContinuousSpeed(baseSpeed * 6);
                break;
            case 5:
                this.enemyGrid.setContinuousSpeed(baseSpeed * 7);
                break;
        }

        const totalEnemies = this.enemiesPerWave;
        this.enemyGrid.enemyShootInterval = Math.max(
            400,
            1000 - (level * 300) - (totalEnemies * 5)
        );

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
                if (this.checkBulletPlayerCollision(bullet)) {
                    const explosionX = this.playerX + (this.PLAYER_WIDTH / 2) - 24;
                    const explosionY = this.playerY + (this.PLAYER_HEIGHT / 2) - 24;
                    this.explosionManager.createExplosion(explosionX, explosionY);
                    this.handlePlayerHit();
                    this.bulletPool.release(bullet);

                    // Flash effect via CSS class.
                    this.playerElement.classList.add('flash');
                    this.playerElement.addEventListener('animationend', () => {
                        this.playerElement.classList.remove('flash');
                    }, { once: true });
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
            this.enemiesDefeated = 0;

            if (this.currentWave % 2 === 0) {
                this.currentLevel++;
                if (this.currentLevel > 5) {
                    this.victoryScreen();
                    this.isWaveTransitioning = false;
                    return;
                }
                this.setupLevel(this.currentLevel);
            } else {
                this.enemyGrid.initialize();
            }

            const activeBullets = this.bulletPool.getActiveBullets();
            for (let bullet of activeBullets) {
                this.bulletPool.release(bullet);
            }

            this.isWaveTransitioning = false;
        });
    }

    victoryScreen() {
        this.isRunning = false;
        this.gameState = 'victory';
        cancelAnimationFrame(this.rafHandle);

        const finalScore = this.score;
        const timeElapsed = this.timeElement.textContent;
        this.screenManager.showVictoryScreen(finalScore, timeElapsed);
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

    // Update player position and gamePlay elements.
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
        } else if (this.gameState === 'paused') {
            this.isPaused = false;
            this.gameState = 'playing';
            this.hidePauseModal();
            this.lastTick = performance.now();
            this.accumulator = 0;
            this.frameTime = 0;
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

    gameOver() {
        this.isRunning = false;
        this.gameState = 'gameOver';
        cancelAnimationFrame(this.rafHandle);
        this.screenManager.showGameOverScreen(this.score);
    }

    resetGame() {
        this.gameTime = 0;
        this.score = 0;
        this.lives = 3;
        this.currentLevel = 1;
        this.currentWave = 1;
        this.enemiesDefeated = 0;
        this.resetPlayerPosition();
        this.updateUI();
        this.lobby.style.display = 'flex';
        this.gameContainer.style.display = 'none';
        this.isRunning = false;
        this.gameState = 'lobby';
        this.explosionManager.clear();
        this.resetKeyStates();
        const activeBullets = this.bulletPool.getActiveBullets();
        for (let bullet of activeBullets) {
            this.bulletPool.release(bullet);
        }
        this.screenManager.hideScreens();
    }
}