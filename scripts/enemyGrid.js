class EnemyGrid {
    constructor() {
        this.enemies = [];
        this.container = document.getElementById('enemies-container');

        this.moveStep = 20; // Grid left/right margins
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
        this.initialize(1);
    }

    initialize(level) {
        // First, clear out any existing enemies from the container
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        // Reset enemies array
        this.enemies = [];

        if (level === 1) {
            // We'll place them centered across width 640.
            const totalRows = 7;
            const enemySize = 48;
            const baseY = 60;      // starting Y
            const xPadding = 10;   // horizontal spacing between enemies
            const yPadding = 50;   // vertical spacing between rows

            for (let row = 0; row < totalRows; row++) {
                const enemyCount = row + 1; // row 0 => 1 enemy, row 4 => 5 enemies
                // total width of the row in pixels
                const rowWidth = enemyCount * (enemySize + xPadding) - xPadding;
                // center horizontally across 640px
                const startX = (640 - rowWidth) / 2;
                const y = baseY + row * yPadding;

                // Create enemies in this row
                for (let i = 0; i < enemyCount; i++) {
                    const x = startX + i * (enemySize + xPadding);
                    // Assign a type (1..3).
                    const type = Math.floor(Math.random() * 3) + 1;

                    const enemy = new Enemy(x, y, type);
                    this.enemies.push(enemy);
                    this.container.appendChild(enemy.element);
                }
            }
        } else if (level === 2) {
            // We'll define the row counts in an array
            // row 0 => 4 enemies, row 1 => 8 enemies, row 2 => 4 enemies
            const rowCounts = [6, 10, 6];
            const enemySize = 48;
            const xPadding = 10;  // horizontal gap between enemies
            const yPadding = 50;  // vertical gap between rows
            const baseY = 60;     // top row's Y position

            rowCounts.forEach((count, rowIndex) => {
                // total width of this row
                const rowWidth = count * (enemySize + xPadding) - xPadding;
                // center it in a 640px-wide area
                const startX = (640 - rowWidth) / 2;
                // compute Y for this row
                const y = baseY + rowIndex * yPadding;

                // Create each enemy for this row
                for (let i = 0; i < count; i++) {
                    const x = startX + i * (enemySize + xPadding);
                    // You can pick type however you want. For now, random from 1..3:
                    const type = Math.floor(Math.random() * 3) + 1;

                    const enemy = new Enemy(x, y, type);
                    this.enemies.push(enemy);
                    this.container.appendChild(enemy.element);
                }
            })
        } else {
            const gridWidth = (48 + this.padding) * this.currentFormation.cols - this.padding;
            const startX = (640 - gridWidth) / 2;
            const startY = 60;

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
    }

    // Add method to change formation
    setFormation(rows, cols, level) {
        this.currentFormation = {
            rows: rows,
            cols: cols
        };
        this.padding = 10;
        this.initialize(level);
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
        const leftmost = Math.min(...this.enemies.map(e => e.x));
        const rightmost = Math.max(...this.enemies.map(e => e.x + e.width));

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