class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 48;
        this.height = 48;
        this.type = type;
        this.element = this.createEnemyElement();
    }

    createEnemyElement() {
        const enemy = document.createElement('div');
        enemy.className = 'enemy';
        enemy.style.cssText = `
        position: absolute;
        width: 48px;
        height: 48px;
        background-image: url('assets/enemy2.svg');
        background-size: contain;
        background-repeat: no-repeat;
        transform: translate3d(${this.x}px, ${this.y}px, 0);
        will-change: transform;
        filter: ${this.getColorFilter()};
        flex-shrink: 0;
      `;
        return enemy;
    }

    getColorFilter() {
        switch (this.type) {
            case 2:
                return 'hue-rotate(120deg)';
            case 3:
                return 'hue-rotate(240deg)';
            default:
                return 'none';
        }
    }

    updatePosition() {
        this.element.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
    }
}  