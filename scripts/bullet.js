class Bullet {
  constructor(x, y, isPlayerBullet = true) {
    this.x = x;
    this.y = y;
    this.width = 21;
    this.height = 22;
    this.speed = isPlayerBullet ? -0.5 : 0.3;
    this.isPlayerBullet = isPlayerBullet;
    this.element = this.createBulletElement();
  }

  createBulletElement() {
    const bullet = document.createElement('div');
    bullet.className = 'bullet';
    bullet.style.cssText = `
      position: absolute;
      width: ${this.width}px;
      height: ${this.height}px;
      background-image: url('${this.isPlayerBullet ? 'assets/Player_Bullet.png' : 'assets/enemy_bullet.png'}');
      background-size: contain;
      background-repeat: no-repeat;
      transform: translate3d(${this.x}px, ${this.y}px, 0);
      will-change: transform;
    `;
    return bullet;
  }

  update(delta) {
    this.y += this.speed * delta;
    this.updatePosition();
    return this.isInBounds();
  }

  updatePosition() {
    this.element.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
  }

  isInBounds() {
    return this.y > -this.height && this.y < 640;
  }

  checkCollision(target) {
    return this.x < target.x + target.width &&
            this.x + this.width > target.x &&
            this.y < target.y + target.height &&
            this.y + this.height > target.y;
  }
}  