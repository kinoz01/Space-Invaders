class GameEngine {
    constructor() {
        this.lobby = document.getElementById('lobby');
        this.gameContainer = document.getElementById('game');
        this.playerElement = document.getElementById('player');
        this.scoreElement = document.querySelector('.score a');
        this.timeElement = document.querySelector('.time');
        this.livesElements = document.querySelectorAll('.life');

        this.explosionManager = new Explosion(this.gameContainer);
        this.screenManager = new Screens(this);

        this.enemyGrid = null;
        this.keyStates = {
            ArrowLeft: false,
            ArrowRight: false,
            Space: false
        };

        this.gameState = 'lobby'; // Can be 'lobby', 'playing', 'paused', 'gameOver'
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

        // Create a bullet pool with a chosen size.
        this.bulletPool = new BulletPool(this.bulletsContainer, 50);

        this.lastPlayerShot = 0;
        this.playerShootCooldown = 350;

        this.TIMESTEP = 1000 / 60; // 16.7 ms
        this.MAX_FRAMETIME = 250;
        this.lastTick = performance.now();
        this.accumulator = 0;
        this.rafHandle = null;

        this.PLAYER_SPEED = 0.3;
        this.GAME_WIDTH = 640;
        this.PLAYER_WIDTH = 48;
        this.PLAYER_HEIGHT = 48;

        this.currentWave = 1;
        this.enemiesPerWave = 21; // 3 rows × 7 columns = 21 enemies
        this.enemiesDefeated = 0;
        this.isWaveTransitioning = false;

        // Animation properties
        this.spriteFrame = 0;
        this.frameTime = 0;
        this.frameDuration = 100; // Update every 100ms

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.optimizePerformance();
        this.resetPlayerPosition();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.keyStates.hasOwnProperty(e.code)) {
                e.preventDefault();
                this.keyStates[e.code] = true;

                // Special handling for Space key
                if (e.code === 'Space') {
                    this.handleSpacePress();
                }
            }

            if (e.code === 'KeyP') {
                this.togglePause();
            }
            if (e.code === 'KeyL' && this.gameState === 'playing') {
                if (this.currentLevel < 10) {
                    this.currentLevel++;
                    this.setupLevel(this.currentLevel);
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
        // Spawn an enemy bullet from the pool
        this.bulletPool.spawn(x, y, false);
    }

    handleSpacePress() {
        switch (this.gameState) {
            case 'lobby':
                this.startGame();
                break;
            case 'gameOver':
                this.resetGame();
                break;
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
        this.gameContainer.style.willChange = 'contents';
    }

    startGame() {
        this.lobby.style.display = 'none';
        this.gameContainer.style.display = 'block';
        this.isRunning = true;
        this.gameState = 'playing';
        this.lastTick = performance.now();
        this.gameTime = 0;
        this.score = 0;
        this.lives = 3;
        this.currentLevel = 1;
        this.currentWave = 1;
        this.enemiesDefeated = 0;

        // Create and reset enemy grid
        this.enemyGrid = new EnemyGrid('step');
        this.enemyGrid.reset();
        this.setupLevel(this.currentLevel);

        this.resetKeyStates();
        this.runGameLoop();
    }

    setupLevel(level) {
        const baseSpeed = 0.03;
        const baseStepDistance = 20;
        const baseInterval = 2000;
        const baseDuration = 1000;

        // Define formations for each level
        const levelFormations = {
            1: { rows: 2, cols: 5 },
            2: { rows: 2, cols: 7 },
            3: { rows: 3, cols: 6 },
            4: { rows: 3, cols: 7 },
            5: { rows: 4, cols: 6 },
            6: { rows: 4, cols: 7 },
            7: { rows: 5, cols: 6 },
            8: { rows: 5, cols: 7 },
            9: { rows: 6, cols: 7 },
            10: { rows: 7, cols: 8 }
        };

        // Get formation for current level
        const formation = levelFormations[level] || levelFormations[1];
        this.enemyGrid.setFormation(formation.rows, formation.cols);
        this.enemiesPerWave = formation.rows * formation.cols;

        switch (level) {
            case 1: // Beginner level
                this.enemyGrid.setMovementMode('step');
                this.enemyGrid.setStepParameters(baseSpeed, baseStepDistance, baseInterval, baseDuration);
                break;

            case 2:
                this.enemyGrid.setMovementMode('step');
                this.enemyGrid.setStepParameters(baseSpeed * 1.4, baseStepDistance,
                    baseInterval - 300, baseDuration - 100);
                break;

            case 3:
                this.enemyGrid.setMovementMode('continuous');
                this.enemyGrid.setContinuousSpeed(baseSpeed * 1.5);
                break;

            case 4:
                this.enemyGrid.setMovementMode('continuous');
                this.enemyGrid.setContinuousSpeed(baseSpeed * 1.7);
                break;

            case 5:
                this.enemyGrid.setMovementMode('step');
                this.enemyGrid.setStepParameters(baseSpeed * 1.8, baseStepDistance + 10,
                    baseInterval - 600, baseDuration - 300);
                break;

            case 6:
                this.enemyGrid.setMovementMode('continuous');
                this.enemyGrid.setContinuousSpeed(baseSpeed * 2.0);
                break;

            case 7:
                this.enemyGrid.setMovementMode('step');
                this.enemyGrid.setStepParameters(baseSpeed * 2.2, baseStepDistance + 15,
                    baseInterval - 800, baseDuration - 400);
                break;

            case 8:
                this.enemyGrid.setMovementMode('continuous');
                this.enemyGrid.setContinuousSpeed(baseSpeed * 2.4);
                break;

            case 9:
                this.enemyGrid.setMovementMode('step');
                this.enemyGrid.setStepParameters(baseSpeed * 2.6, baseStepDistance + 20,
                    baseInterval - 1000, baseDuration - 500);
                break;

            case 10: // Final level - maximum challenge
                this.enemyGrid.setMovementMode('continuous');
                this.enemyGrid.setContinuousSpeed(baseSpeed * 3.0);
                break;
        }

        // Adjust enemy shooting intervals
        const totalEnemies = this.enemiesPerWave;
        this.enemyGrid.enemyShootInterval = Math.max(
            400,
            2000 - (level * 150) - (totalEnemies * 5)
        );

        // Adjust drop distance based on formation height
        this.enemyGrid.dropDistance = Math.min(
            25 + (level * 2),
            65 / formation.rows // smaller drops for taller formations
        );
    }

    playerShoot() {
        const now = performance.now();
        if (now - this.lastPlayerShot >= this.playerShootCooldown) {
            const bulletX = this.playerX + (this.PLAYER_WIDTH / 2) - 10.5;
            const bulletY = this.playerY - 22;

            this.bulletPool.spawn(bulletX, bulletY, true);
            this.lastPlayerShot = now;
        }
    }

    // Check and update bullets every frame
    updateBullets(timeStep) {
        const activeBullets = this.bulletPool.getActiveBullets();
        for (let bullet of activeBullets) {
            const isInBounds = bullet.update(timeStep);

            // If bullet goes out of bounds, release it back to the pool
            if (!isInBounds) {
                this.bulletPool.release(bullet);
                continue;
            }

            // Handle player bullets hitting enemies
            if (bullet.isPlayerBullet && this.enemyGrid) {
                for (let j = this.enemyGrid.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.enemyGrid.enemies[j];
                    if (bullet.checkCollision(enemy)) {
                        // Explosion at enemy position
                        this.explosionManager.createExplosion(enemy.x, enemy.y);

                        // Score
                        const scorePoints = this.calculateScore(enemy.type);
                        this.score += scorePoints;

                        // Remove enemy
                        this.enemyGrid.removeEnemy(enemy);

                        // Release bullet
                        this.bulletPool.release(bullet);

                        // Show score popup
                        const scoreText = document.createElement('div');
                        scoreText.className = 'score-popup';
                        scoreText.textContent = `+${scorePoints}`;
                        scoreText.style.cssText = `
                            position: absolute;
                            left: ${enemy.x + 24}px;
                            top: ${enemy.y}px;
                            color: white;
                            font-family: var(--font-primary);
                            font-size: 12px;
                            pointer-events: none;
                            z-index: 1000;
                            opacity: 1;
                            transform: translateY(0);
                        `;
                        this.gameContainer.appendChild(scoreText);

                        requestAnimationFrame(() => {
                            scoreText.style.opacity = '0';
                            scoreText.style.transform = 'translateY(-20px)';
                        });
                        setTimeout(() => {
                            if (scoreText.parentNode) {
                                this.gameContainer.removeChild(scoreText);
                            }
                        }, 500);

                        // Check if wave is cleared
                        if (this.enemyGrid.enemies.length === 0) {
                            setTimeout(() => this.startNewWave(), 0);
                        }
                        break; // break out of the enemy loop
                    }
                }
            }
            else {
                // Enemy bullets hitting the player
                if (this.checkBulletPlayerCollision(bullet)) {
                    // Explosion effect on player
                    this.explosionManager.createExplosion(
                        this.playerX + (this.PLAYER_WIDTH / 2) - 24,
                        this.playerY + (this.PLAYER_HEIGHT / 2) - 24
                    );

                    this.handlePlayerHit();

                    // Release bullet
                    this.bulletPool.release(bullet);

                    // Hit flash effect
                    this.playerElement.style.filter = 'brightness(2)';
                    setTimeout(() => {
                        this.playerElement.style.filter = 'none';
                    }, 100);
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
                if (this.currentLevel > 10) {
                    this.victoryScreen();
                    return;
                }
                this.setupLevel(this.currentLevel);
            } else {
                // For odd-numbered waves, just re-initialize with the same formation
                this.enemyGrid.initialize();
            }

            // Clear all bullets from the pool visually
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

        // Clamp 'delta' in case it gets too large (if the tab was inactive, for instance)
        if (delta > this.MAX_FRAMETIME) {
            delta = this.MAX_FRAMETIME;
        }

        this.accumulator += delta;

        while (this.accumulator >= this.TIMESTEP) {
            this.update(this.TIMESTEP, now);
            this.accumulator -= this.TIMESTEP;
        }
        // Interpolate
        this.render(this.accumulator / this.TIMESTEP);
        this.rafHandle = requestAnimationFrame(this.runGameLoop.bind(this));
    }

    update(timeStep, currentTime) {
        if (this.isPaused) return;

        // Sprite animation
        this.frameTime += timeStep;
        if (this.frameTime >= this.frameDuration) {
            this.spriteFrame = (this.spriteFrame + 1) % 2;
            this.frameTime = 0;
            // Shift background sprite - each frame is 48px wide
            this.playerElement.style.backgroundPosition = `${this.spriteFrame * -48}px 0`;
        }

        // Player movement
        const movement = this.PLAYER_SPEED * timeStep;
        if (this.keyStates.ArrowLeft) {
            this.playerX = Math.max(0, this.playerX - movement);
        }
        if (this.keyStates.ArrowRight) {
            this.playerX = Math.min(this.GAME_WIDTH - this.PLAYER_WIDTH, this.playerX + movement);
        }

        // Shooting
        if (this.keyStates.Space && this.gameState === 'playing') {
            this.playerShoot();
        }

        // Enemies
        if (this.enemyGrid) {
            this.enemyGrid.update(timeStep, currentTime);
        }

        // Bullets
        this.updateBullets(timeStep);

        // Time
        this.gameTime += timeStep;
        this.updateTimeDisplay();
    }

    checkBulletPlayerCollision(bullet) {
        return (
            bullet.x < this.playerX + this.PLAYER_WIDTH &&
            bullet.x + bullet.width > this.playerX &&
            bullet.y < this.playerY + 45 &&
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

    render(alpha) {
        const renderX = this.playerX + (this.PLAYER_SPEED * alpha * this.TIMESTEP);
        this.playerElement.style.transform = `translate3d(${renderX}px, ${this.playerY}px, 0)`;
        this.updateUI();
    }


    updateUI() {
        const now = performance.now();      
        if (now - this.lastUIUpdate < 16) return;

        this.scoreElement.textContent = `SCORE: ${this.score}`;
        document.querySelector('.wave a').textContent = `WAVE: ${this.currentWave}`;
        this.livesElements.forEach((life, index) => {
            life.style.opacity = index < this.lives ? 1 : 0.3;
        });

        this.lastUIUpdate = now;
    }

    togglePause() {
        if (this.gameState !== 'playing' && this.gameState !== 'paused') return;

        this.isPaused = !this.isPaused;
        this.gameState = this.isPaused ? 'paused' : 'playing';

        // Reset frame timing on unpause
        if (!this.isPaused) {
            this.lastTick = performance.now();
            this.accumulator = 0;
            this.frameTime = 0;
        }
    }

    resetPlayerPosition() {
        this.playerX = 300;
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
        this.score = 0;
        this.lives = 3;
        this.gameTime = 0;
        this.currentLevel = 1;
        this.resetPlayerPosition();
        this.updateUI();
        this.lobby.style.display = 'flex';
        this.gameContainer.style.display = 'none';
        this.isRunning = false;
        this.gameState = 'lobby';
        this.currentWave = 1;
        this.enemiesDefeated = 0;
        this.explosionManager.clear();

        // Reset key states when resetting
        this.resetKeyStates();

        // Clear all bullets from the pool
        const activeBullets = this.bulletPool.getActiveBullets();
        for (let bullet of activeBullets) {
            this.bulletPool.release(bullet);
        }

        this.screenManager.hideScreens();
    }
}
