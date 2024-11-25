import { _decorator, Component, Node, director, Prefab, instantiate, sys, AudioClip, AudioSource } from 'cc';
const { ccclass, property } = _decorator;
import { CanvasManager } from './CanvasManager';

export enum GameState {
    NONE = 'NONE',
    INIT = 'INIT',
    MENU = 'MENU',
    PLAYING = 'PLAYING',
    PAUSED = 'PAUSED',
    GAME_OVER = 'GAME_OVER'
}

export const GAME_EVENTS = {
    STATE_CHANGED: 'game-state-changed',
    SCORE_UPDATED: 'score-updated',
    TIME_UPDATED: 'time-updated'
};
// Constants for storage keys
const STORAGE_KEYS = {
    HIGH_SCORE: 'game_high_score'
};

export enum AudioType {
    BGM_1 = 'BGM_1',
    BGM_2 = 'BGM_2',
    SFX_Jump = 'SFX_Jump',
    SFX_GameOver = 'SFX_GameOver',

}
interface AudioInfo {
    clip: AudioClip;
    isMusic: boolean;
}


@ccclass('GameManager')
export class GameManager extends Component {
    private static _instance: GameManager = null;

    @property
    private _currentState: GameState = GameState.NONE;

    @property
    private _score: number = 0;

    @property
    private _isGameOver: boolean = false;
    @property({ type: Prefab, tooltip: 'game environment' })
    gameEnv: Prefab | null = null;
    private currentEnv: Node = null;

    private _currentScore: number = 0;
    private _highScore: number = 0;

    @property({ type: [AudioClip] })
    private audioClips: AudioClip[] = [];

    @property({ type: [Boolean] })
    private isMusic: boolean[] = [];

    private audioMap: Map<string, AudioInfo> = new Map();
    private activeAudioNodes: Map<string, Node> = new Map();


    public static get instance(): GameManager {
        if (!this._instance) {
            this._instance = director.getScene().getComponentInChildren(GameManager);

            if (!this._instance) {
                const node = new Node();
                director.getScene().addChild(node);
                this._instance = node.addComponent(GameManager);
                node.name = 'GameManager';
            }
        }
        return this._instance;
    }
    protected start(): void {
        this.StartGame();
    }

    async delay(seconds: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }

    async StartGame() {
        await this.delay(0.5);
        this.setState(GameState.MENU);
    }

    onLoad() {
        if (GameManager._instance === null) {
            GameManager._instance = this;
            director.addPersistRootNode(this.node);  
        } else {
            this.node.destroy();
        }

        this.loadHighScore();

        for (let i = 0; i < this.audioClips.length; i++) {
            const clip = this.audioClips[i];
            if (clip) {
                this.audioMap.set(clip.name, {
                    clip: clip,
                    isMusic: this.isMusic[i] || false
                });
            }
        }
    }

    private loadHighScore() {
        try {
            const savedScore = sys.localStorage.getItem(STORAGE_KEYS.HIGH_SCORE);
            if (savedScore !== null) {
                this._highScore = parseInt(savedScore);
                this.node.emit(GAME_EVENTS.SCORE_UPDATED, {
                    current: this._currentScore,
                    high: this._highScore
                });
            }
        } catch (error) {
            console.error('Error loading high score:', error);
        }
    }

    public saveHighScore() {
        try {
            sys.localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, this._highScore.toString());
        } catch (error) {
            console.error('Error saving high score:', error);
        }
    }

    updateScore(newScore: number) {
        this._currentScore = newScore;

        if (this._currentScore > this._highScore) {
            this._highScore = this._currentScore;
            this.saveHighScore();
        }

        this.node.emit(GAME_EVENTS.SCORE_UPDATED, {
            current: this._currentScore,
            high: this._highScore
        });
    }

    get highScore(): number {
        return this._highScore;
    }

    get currentScore(): number {
        return this._currentScore;
    }

    resetCurrentScore() {
        this._currentScore = 0;
        this.node.emit(GAME_EVENTS.SCORE_UPDATED, {
            current: this._currentScore,
            high: this._highScore
        });
    }

    clearHighScore() {
        this._highScore = 0;
        this.saveHighScore();
        this.node.emit(GAME_EVENTS.SCORE_UPDATED, {
            current: this._currentScore,
            high: this._highScore
        });
    }

    private createAudioNode(type: AudioType): [Node, AudioSource] {
        const audioNode = new Node('Audio-' + type);
        audioNode.parent = this.node; // Attach to AudioManager node
        const audioSource = audioNode.addComponent(AudioSource);
        return [audioNode, audioSource];
    }

    public playOneShot(type: AudioType, volume: number = 1.0): void {
        const audioInfo = this.audioMap.get(type);
        if (!audioInfo) {
            console.warn(`Audio not found: ${type}`);
            return;
        }

        const [audioNode, audioSource] = this.createAudioNode(type);
        audioSource.clip = audioInfo.clip;
        audioSource.loop = false;
        audioSource.volume = volume;
        audioSource.play();

        audioSource.node.once(AudioSource.EventType.ENDED, () => {
            audioNode.destroy();
        });
    }

    public playLoop(type: AudioType, volume: number = 1.0): void {
        const audioInfo = this.audioMap.get(type);
        if (!audioInfo) {
            console.warn(`Audio not found: ${type}`);
            return;
        }

        this.stopAudio(type);

        const [audioNode, audioSource] = this.createAudioNode(type);
        audioSource.clip = audioInfo.clip;
        audioSource.loop = true;
        audioSource.volume = volume;
        audioSource.play();

        this.activeAudioNodes.set(type, audioNode);
    }

    public stopAudio(type: AudioType): void {
        const audioNode = this.activeAudioNodes.get(type);
        if (audioNode) {
            audioNode.destroy();
            this.activeAudioNodes.delete(type);
        }
    }

    public stopAllAudio(): void {
        this.activeAudioNodes.forEach((audioNode) => {
            audioNode.destroy();
        });
        this.activeAudioNodes.clear();
    }

    public setVolume(type: AudioType, volume: number): void {
        const audioNode = this.activeAudioNodes.get(type);
        if (audioNode) {
            const audioSource = audioNode.getComponent(AudioSource);
            if (audioSource) {
                audioSource.volume = volume;
            }
        }
    }

    public isPlaying(type: AudioType): boolean {
        const audioNode = this.activeAudioNodes.get(type);
        if (!audioNode) return false;

        const audioSource = audioNode.getComponent(AudioSource);
        return audioSource ? audioSource.playing : false;
    }

    onDestroy() {
        this.stopAllAudio();
    }


    public get currentState(): GameState {
        return this._currentState;
    }

    public setState(newState: GameState) {
        console.info("Emitting state");
        this.node.emit(GAME_EVENTS.STATE_CHANGED, newState);
        const oldState = this._currentState;
        this._currentState = newState;
        this.onStateChanged(oldState, newState);
    }

    private onStateChanged(oldState: GameState, newState: GameState) {
        switch (newState) {
            case GameState.MENU:
                this.EnableMenu();
                break;
            case GameState.INIT:
                this.initializeGame();
                break;
            case GameState.PLAYING:
                this.startGame();
                break;
            case GameState.PAUSED:
                this.pauseGame();
                break;
            case GameState.GAME_OVER:
                this.endGame();
                break;
        }
    }

    private EnableMenu() {
        // this.gameCanvas.ActiveStartButton(true);
    }

    private initializeGame() {
        this._score = 0;
        this._isGameOver = false;

        this.currentEnv = instantiate(this.gameEnv);
        console.info(this.currentEnv.name);
        this.currentEnv.parent = this.node;
        this.currentEnv.active = true;
        this.setState(GameState.PLAYING);
    }

    private startGame() {
        var chooseBGM = Math.random() <0.5 ? AudioType.BGM_1: AudioType.BGM_2
        this.playLoop(chooseBGM);
    }

    private pauseGame() {

    }

    private async endGame() {
        this._isGameOver = true;
        this.stopAllAudio();    

        this.currentEnv.destroy();
        this.playOneShot(AudioType.SFX_GameOver);
        await this.delay(8);
        this.setState(GameState.MENU);
    }

    public get score(): number {
        return this._score;
    }

    public addScore(points: number) {
        this._score += points;
    }

    public get isGameOver(): boolean {
        return this._isGameOver;
    }

    public resetGame() {
        this._score = 0;
        this._isGameOver = false;
        this.setState(GameState.INIT);
    }
}