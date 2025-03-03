// Bullet class handles individual bullet logic
class Bullet {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.width = 21;
        this.height = 22;
        this.speed = -0.5;         // Default speed for a player's bullet
        this.isPlayerBullet = true;
        this.active = false;       // Managed by the bullet pool

        // Pre-create the DOM element
        this.element = document.createElement('div');
        this.element.className = 'bullet';
        this.element.style.cssText = `
        position: absolute;
        width: ${this.width}px;
        height: ${this.height}px;
        background-size: contain;
        background-repeat: no-repeat;
        transform: translate3d(${this.x}px, ${this.y}px, 0);
        will-change: transform;
        display: none; /* hidden by default, shown when activated */
      `;
    }

    // Initialize or "activate" a bullet with specific parameters.
    init(x, y, isPlayerBullet) {
        this.x = x;
        this.y = y;
        this.isPlayerBullet = isPlayerBullet;
        this.speed = isPlayerBullet ? -0.5 : 0.3;
        this.active = true;
        this.element.style.backgroundImage = isPlayerBullet
            ? "url('assets/Player_Bullet.png')"
            : "url('assets/enemy_bullet.png')";
        this.element.style.display = 'block';
        this.updatePosition();
    }

    // Update bullet position and return false if it's out of bounds
    update(timeStep) {
        this.y += this.speed * timeStep;
        this.updatePosition();
        return this.isInBounds();
    }

    updatePosition() {
        this.element.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
    }

    isInBounds() {
        // Adjust your game boundaries as needed (currently 0 to 640)
        return this.y > -this.height && this.y < 640;
    }

    // Check collision with a target that has x, y, width, height
    checkCollision(target) {
        return (
            this.x < target.x + target.width &&
            this.x + this.width > target.x &&
            this.y < target.y + target.height &&
            this.y + this.height > target.y
        );
    }
}

// BulletPool manages a reusable pool of Bullet instances
class BulletPool {
    constructor(container, poolSize = 50) {
        this.container = container;
        this.poolSize = poolSize;
        this.bullets = [];

        // Create a pool of bullet objects ahead of time
        for (let i = 0; i < poolSize; i++) {
            const bullet = new Bullet();
            this.container.appendChild(bullet.element);
            this.bullets.push(bullet);
        }
    }

    // Spawn (activate) a bullet from the pool. Returns `null` if none are available.
    spawn(x, y, isPlayerBullet = true) {
        for (let bullet of this.bullets) {
            if (!bullet.active) {
                bullet.init(x, y, isPlayerBullet);
                return bullet;
            }
        }
        // No available bullet in the pool; consider increasing poolSize if this occurs often
        return null;
    }

    // Deactivate and hide a bullet, returning it to the pool.
    release(bullet) {
        bullet.active = false;
        bullet.element.style.display = 'none';
    }

    // Retrieves all currently active bullets (for updates, collision checks, etc.)
    getActiveBullets() {
        return this.bullets.filter((b) => b.active);
    }
}
