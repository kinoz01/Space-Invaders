class EnemyGrid {
    constructor() {
        this.enemies = [];
        this.container = document.getElementById('enemies-container');

        this.moveStep = 20;
        this.moveInterval = 2000;
        this.moveDuration = 1000;
        this.continuousSpeed = 0.05;
        this.dropDistance = 30;
        this.direction = 1;
        this.rows = 3;
        this.cols = 7;
        this.padding = 10;
        this.dualShooting = false;

        // Add formation tracking
        this.currentFormation = {
            rows: this.rows,
            cols: this.cols
        };

        this.lastEnemyShot = 0;
        this.enemyShootInterval = 1000; // Minimum time between any enemy shots
        this.initialize();
    }

    initialize() {
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        // Use current formation values
        const gridWidth = (48 + this.padding) * this.currentFormation.cols - this.padding;
        const startX = (640 - gridWidth) / 2;
        const startY = 60;

        // Clear existing enemies array
        this.enemies = [];

        for (let row = 0; row < this.currentFormation.rows; row++) {
            for (let col = 0; col < this.currentFormation.cols; col++) {
                const x = startX + col * (48 + this.padding);
                const y = startY + row * (48 + this.padding);
                const type = Math.min(row + 1, 3);

                const enemy = new Enemy(x, y, type);
                this.enemies.push(enemy);
                this.container.appendChild(enemy.element);
            }
        }
    }

    // Add method to change formation
    setFormation(rows, cols, padding = 10) {
        this.currentFormation = {
            rows: rows,
            cols: cols
        };
        this.padding = padding;
        this.initialize();
    }

    tryEnemyShoot(currentTime) {
        if (currentTime - this.lastEnemyShot < this.enemyShootInterval || this.enemies.length === 0) {
            return;
        }

        const bottomEnemies = this.getBottomEnemies();
        if (bottomEnemies.length === 0) return;

        let numShots = this.dualShooting ? 2 : 1; // Allow two shots if enabled
        for (let i = 0; i < numShots && bottomEnemies.length > 0; i++) {
            const randomEnemy = bottomEnemies.splice(Math.floor(Math.random() * bottomEnemies.length), 1)[0];
            randomEnemy.lastShot = currentTime;
            this.lastEnemyShot = currentTime;

            if (window.game) {
                const bulletX = randomEnemy.x + (randomEnemy.width / 2) - 10.5;
                const bulletY = randomEnemy.y + randomEnemy.height;
                game.createEnemyBullet(bulletX, bulletY);
            }
        }
    }

    getBottomEnemies() {
        const bottomEnemies = [];
        const enemiesByColumn = {};

        // Group enemies by their x position (column)
        this.enemies.forEach(enemy => {
            const column = Math.floor(enemy.x);
            if (!enemiesByColumn[column] || enemiesByColumn[column].y < enemy.y) {
                enemiesByColumn[column] = enemy;
            }
        });

        // Get only the bottom enemies
        return Object.values(enemiesByColumn);
    }

    update(timeStep, currentTime) {
        if (this.enemies.length === 0) return;
        this.updateContinuousMovement(timeStep);

        // Enable enemy shooting
        this.tryEnemyShoot(currentTime);
    }

    updateContinuousMovement(timeStep) {
        if (this.shouldChangeDirection()) {
            this.changeDirection();
        }

        const moveAmount = this.continuousSpeed * timeStep * this.direction;
        this.enemies.forEach(enemy => {
            enemy.x += moveAmount;
            enemy.updatePosition();
        });
    }

    shouldChangeDirection() {
        let leftmost = Infinity;
        let rightmost = -Infinity;

        this.enemies.forEach(enemy => {
            leftmost = Math.min(leftmost, enemy.x);
            rightmost = Math.max(rightmost, enemy.x + enemy.width);
        });

        return (rightmost + this.moveStep >= 640 && this.direction > 0) ||
            (leftmost - this.moveStep <= 0 && this.direction < 0);
    }

    changeDirection() {
        this.direction *= -1;
        this.enemies.forEach(enemy => {
            enemy.y += this.dropDistance;
            if (enemy.y + enemy.height >= 570) {
                this.triggerGameOver();
            }
        });
    }

    setContinuousSpeed(speed) {
        this.continuousSpeed = speed;
    }

    triggerGameOver() {
        if (window.game) {
            game.gameOver();
        }
    }

    removeEnemy(enemy) {
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
            this.enemies.splice(index, 1);
            this.container.removeChild(enemy.element);
        }
    }
}  