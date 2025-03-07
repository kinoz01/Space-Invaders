class Explosion {
    constructor(container, poolSize = 20) {
        this.container = container;
        this.pool = [];
        this.timeoutId = 0; // Fix error resulting on quick start (<300) after win/loss
        this.activeExplosions = new Set();

        // Create explosion pool
        for (let i = 0; i < poolSize; i++) {
            const explosion = document.createElement('div');
            explosion.className = 'explosion';
            this.pool.push(explosion);
        }
    }

    createExplosion(x, y) {
        // Get explosion from pool or create new if none available
        let explosion = this.pool.pop();
        if (!explosion) {
            explosion = document.createElement('div');
            explosion.className = 'explosion';
        }

        // Set position
        explosion.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        this.container.appendChild(explosion);
        this.activeExplosions.add(explosion);

        // Add active class in next frame for animation
        requestAnimationFrame(() => {
            explosion.classList.add('active');
        });

        // Return to pool after animation
        this.timeoutId = setTimeout(() => {
            explosion.classList.remove('active');
            this.container.removeChild(explosion);
            this.pool.push(explosion);
            this.activeExplosions.delete(explosion);
        }, 300); // Match animation duration
    }

    clear() {
        if (this.timeoutId) {         
            clearTimeout(this.timeoutId);
        }
        this.activeExplosions.forEach(explosion => {
            explosion.classList.remove('active');
            this.container.removeChild(explosion);
            this.pool.push(explosion);
        });
        this.activeExplosions.clear();
    }
}