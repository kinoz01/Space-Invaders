// Victory and game-over screens
class Screens {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.victoryScreen = document.querySelector('.victory-screen');
        this.gameOverScreen = document.querySelector('.game-over-screen');
        this.bindEvents();
    }

    bindEvents() {
        document.body.addEventListener('click', (event) => {
            if (event.target.matches('.restart-btn')) {
                this.hideScreens();
                this.gameEngine.resetGame();
                this.gameEngine.startGame();    
            }
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