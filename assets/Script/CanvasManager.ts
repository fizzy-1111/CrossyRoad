import { _decorator, Component, RichText, Sprite, Button, tween, Vec3, Color } from 'cc';
import { GameManager, GameState,GAME_EVENTS  } from './GameManager';
const { ccclass, property } = _decorator;

@ccclass('CanvasManager')
export class CanvasManager extends Component {
    @property(RichText)
    highscoreText: RichText = null!;

    @property(RichText)
    currentScoreText: RichText = null!;

    @property(RichText)
    timeLeftText: RichText = null!;

    @property(RichText)
    gameOverText: RichText = null!;

    @property(Sprite)
    background: Sprite = null!;

    @property(Button)
    startGameButton: Button = null!;

    private fadeInDuration: number = 0.5;
    private fadeOutDuration: number = 0.5;

    start() {
        this.registerEventListeners();
        if (this.gameOverText) {
            this.gameOverText.node.active = false;
        }

        this.setupStartGameButton();
    }

    private registerEventListeners() {
        console.info("Register event");
        GameManager.instance.node.on(GAME_EVENTS.STATE_CHANGED, this.onGameStateChanged, this);
        
        GameManager.instance.node.on(GAME_EVENTS.SCORE_UPDATED, this.onScoreUpdated, this);
        
        GameManager.instance.node.on(GAME_EVENTS.TIME_UPDATED, this.onTimeUpdated, this);
    }

    private onGameStateChanged(newState: GameState) {
        console.info("update game state");
        console.info(newState);
        this.updateUIForGameState(newState);
    }

    private onScoreUpdated(data: { current: number, high: number }) {
        this.displayCurrentScore(data.current);
        this.displayHighscore(data.high);
    }

 
    private onTimeUpdated(timeLeft: number) {
        this.displayTimeLeft(timeLeft);
    }

    private updateUIForGameState(state: GameState) {
        switch (state) {
            case GameState.MENU:
                console.info("Start menu");
                this.startGameButton.node.active = true;
                this.gameOverText.node.active = false;
                this.timeLeftText.node.active=false;
                this.currentScoreText.node.active=false;
                this.highscoreText.node.active=false;
                break;

            case GameState.PLAYING:
                this.startGameButton.node.active = false;
                this.gameOverText.node.active = false;
                this.timeLeftText.node.active=true;
                this.currentScoreText.node.active=true;
                this.highscoreText.node.active=true;
                break;


            case GameState.GAME_OVER:
                this.gameOverText.node.active = true;
                this.fadeInBackground();
                break;
        }
    }


    public ActiveStartButton(isActive: boolean){
        this.startGameButton.node.active=isActive;
    }

    displayHighscore(score: number) {
        if (this.highscoreText) {
            this.highscoreText.string = `High Score: ${score}`;
        }
    }

    displayCurrentScore(score: number) {
        if (this.currentScoreText) {
            this.currentScoreText.string = `Score: ${score}`;
        }
    }

    displayTimeLeft(seconds: number) {
        if (this.timeLeftText) {
            this.timeLeftText.string = `Time left: ${Math.ceil(seconds)}s`;
        }
    }

    fadeInBackground() {
        if (this.background) {
            const sprite = this.background.getComponent(Sprite);
            if (sprite) {
                const color = new Color(255, 255, 255, 0);
                sprite.color = color;

                tween(sprite)
                    .to(this.fadeInDuration, { color: new Color(255, 255, 255, 255) })
                    .start();
            }
        }
    }

    fadeOutBackground() {
        if (this.background) {
            const sprite = this.background.getComponent(Sprite);
            if (sprite) {
                tween(sprite)
                    .to(this.fadeOutDuration, { color: new Color(255, 255, 255, 0) })
                    .start();
            }
        }
    }

    private setupStartGameButton() {
        if (this.startGameButton) {
            this.startGameButton.node.on(Button.EventType.CLICK, this.onStartGameClick, this);
        }
    }

    onStartGameClick() {
        console.log('Start game button clicked - Override this method!');
        GameManager.instance.setState(GameState.INIT);
    }

    showGameOver() {
        if (this.gameOverText) {
            this.gameOverText.node.active = true;
        }
    }

    hideGameOver() {
        if (this.gameOverText) {
            this.gameOverText.node.active = false;
        }
    }
}