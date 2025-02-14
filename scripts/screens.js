// Victory and game-over screens
class Screens {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.victoryScreen = document.querySelector('.victory-screen');
        this.gameOverScreen = document.querySelector('.game-over-screen');
        this.bindEvents();
    }

    bindEvents() {
        this.victoryScreen.querySelector('.restart-btn').addEventListener('click', () => {
        this.hideScreens();
        this.gameEngine.resetGame();
        });
        
        this.gameOverScreen.querySelector('.restart-btn').addEventListener('click', () => {
        this.hideScreens();
        this.gameEngine.resetGame();
        });
    }

    hideScreens() {
        this.victoryScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
    }

    showVictoryScreen(score, time) {
        this.victoryScreen.querySelector('.final-score').textContent = score;
        this.victoryScreen.querySelector('.final-time').textContent = time;
        this.victoryScreen.classList.remove('hidden');
    }

    showGameOverScreen(score) {
        this.gameOverScreen.querySelector('.final-score').textContent = score;
        this.gameOverScreen.classList.remove('hidden');
    }
}