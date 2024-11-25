import { _decorator, Component, Node, input, Input, Vec2, Vec3, EventMouse, EventKeyboard,KeyCode, tween, bezierByTime, v2, lerp, Director, director, random, Collider, ICollisionEvent, ITriggerEvent } from 'cc';
import { RoadManager } from './RoadManager';
import { Road } from './Road';
import { Tile } from './Tile';
import { GameManager, GameState,AudioType} from './GameManager';

const { ccclass, property } = _decorator;

@ccclass('Controller')
export class Controller extends Component {

    @property({ type: Node, tooltip: 'The object to control' })
    controlledObject: Node | null = null;

    @property({ type: RoadManager, tooltip: 'Get current road data' })
    roadManager: RoadManager | null = null;

    @property({ tooltip: 'Minimum distance for swipe detection' })
    swipeThreshold: number = 50;

    private touchStartPos: Vec2 = new Vec2();
    private isSwiping: boolean = false;
    private currentRoad: Road | null = null;
    private currentTileIndex: number = 0;

    private playerTileIndex = 9;
    private isJumping = false;

    private currentTween: any = null;
    private originalPosition: Vec3 = new Vec3();

    private pressedKeys: Set<string> = new Set();


    start() {
        input.on(Input.EventType.MOUSE_DOWN, this.onTouchStart, this);
        input.on(Input.EventType.MOUSE_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.MOUSE_UP, this.onTouchEnd, this);

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);

        this.InitNodePosition();
        const collider = this.controlledObject.getComponent(Collider);
        if (collider) {
            console.info("Get collider");
            collider.on('onTriggerEnter', this.onTrigger, this);
        }
    }
    async delay(seconds: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }

    async waitUntil(condition: () => boolean): Promise<void> {
        return new Promise<void>((resolve) => {
            const checkCondition = () => {
                if (condition()) {
                    resolve();
                    director.off(Director.EVENT_AFTER_UPDATE, checkCondition);
                }
            };

            director.on(Director.EVENT_AFTER_UPDATE, checkCondition);
        });
    }

    onTrigger(event: ITriggerEvent) {
        console.info("Is colling");
        console.log(event.type, event);
        const otherCollider = event.otherCollider;
        const collisionTag = otherCollider.node.name;
        if (!this.controlledObject||collisionTag=="Plane") return;


        if (this.currentTween) {
            this.currentTween.stop();
            this.currentTween = null;
        }

        this.bounceBack();
    }

    getRandomElement<T>(array: T[], startIndex: number = 0, endIndex: number = array.length - 1): T {
        startIndex = Math.max(0, Math.min(startIndex, array.length - 1));
        endIndex = Math.max(0, Math.min(endIndex, array.length - 1));

        if (startIndex > endIndex) {
            [startIndex, endIndex] = [endIndex, startIndex]; 
        }

        const randomIndex = Math.floor(Math.random() * (endIndex - startIndex + 1)) + startIndex;
        return array[randomIndex];
    }


    async InitNodePosition() {
        await this.waitUntil(() => this.roadManager.finishedInitPool);
        const currentRoad = this.roadManager.getCurrentRoad();
        var randomTile = null;
        do {
            randomTile = this.getRandomElement(currentRoad?.getAllTiles(), 3, 12);
            var initPos = randomTile.node.worldPosition;
            initPos.y += 0.5;
            this.controlledObject.worldPosition = initPos;
            var indexTile = currentRoad?.getAllTiles().indexOf(randomTile);
        }
        while (randomTile.isHavingTree)
        console.info(indexTile);
        this.playerTileIndex = indexTile;
    }

    onKeyDown(event: EventKeyboard) {
        if (!this.controlledObject || this.isJumping) return;
        
        const keyCode = event.keyCode;
        this.pressedKeys.add(keyCode.toString());
        
        switch (keyCode) {
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this.moveLeft();
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this.moveRight();
                break;
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                this.moveForward();
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this.moveBackward();
                break;
        }
    }

    onKeyUp(event: EventKeyboard) {
        const keyCode = event.keyCode;
        this.pressedKeys.delete(keyCode.toString());
    }
    
    isKeyPressed(keyCode: KeyCode): boolean {
        return this.pressedKeys.has(keyCode.toString());
    }



    onTouchStart(event: EventMouse) {
        if (!this.controlledObject || this.isJumping) return;

        const location = event.getUILocation();
        this.touchStartPos.x = location.x;
        this.touchStartPos.y = location.y;
        this.isSwiping = false;
    }

    onTouchMove(event: EventMouse) {
        if (!this.controlledObject || this.isJumping) return;

        const location = event.getUILocation();
        const deltaX = location.x - this.touchStartPos.x;
        const deltaY = location.y - this.touchStartPos.y;

        if (Math.abs(deltaX) > this.swipeThreshold || Math.abs(deltaY) > this.swipeThreshold) {
            this.isSwiping = true;
        }

    }

    onTouchEnd(event: EventMouse) {
        if (!this.controlledObject || this.isJumping) return;

        const location = event.getUILocation();
        const deltaX = location.x - this.touchStartPos.x;
        const deltaY = location.y - this.touchStartPos.y;


        if (this.isSwiping) {
            if (deltaX > this.swipeThreshold) {
                this.moveRight();
            } else if (deltaX < -this.swipeThreshold) {
                this.moveLeft();
            }
            else if (Math.abs(deltaY) > Math.abs(deltaX)) {
                if (deltaY > this.swipeThreshold) this.moveForward();
                else this.moveBackward();
            }

        }
        else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
            this.moveForward();
        }
    }
    private bounceBack() {
        const currentPos = this.controlledObject.getWorldPosition();
        const bounceDirection = new Vec3();
        Vec3.subtract(bounceDirection, this.originalPosition, currentPos);
        bounceDirection.normalize();

        const bounceDistance = 2; 
        const bounceDestination = new Vec3(
            currentPos.x + bounceDirection.x * bounceDistance,
            currentPos.y,
            currentPos.z + bounceDirection.z * bounceDistance
        );

        
        const bounceDuration = 0.3; 
        const bounceHeight = 1; 

        tween(this.controlledObject)
            .to(bounceDuration, {
                position: bounceDestination,
            }, {
                onUpdate: (target: Node, ratio: number) => {
                    // Add a small arc to the bounce
                    const heightOffset = 4 * bounceHeight * ratio * (1 - ratio);
                    const bouncePos = target.getWorldPosition();
                    bouncePos.y = this.originalPosition.y + heightOffset;
                    target.setWorldPosition(bouncePos);
                },
                easing: 'quadOut'
            })
            .call(() => {
                this.isJumping = false;
                GameManager.instance.setState(GameState.GAME_OVER);
            })
            .start();
    }

    private lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }

    moveToTile(tile: Tile) {
        if (!this.controlledObject || this.isJumping) return;
        GameManager.instance.playOneShot(AudioType.SFX_Jump,0.2);

        const startPos = this.controlledObject.getWorldPosition();
        this.originalPosition = startPos.clone(); 
        const endPos = tile.node.worldPosition;

        const duration = 0.5;
        const jumpHeight = 2;

        let currentPosition = startPos.clone();

        this.isJumping = true;
        this.currentTween = tween(this.controlledObject)
            .to(duration, {
                position: endPos,
            }, {
                onUpdate: (target: Node, ratio: number) => {
                    if (!this.isJumping) return; 

                    const heightOffset = 4 * jumpHeight * ratio * (1 - ratio);

                    const currentX = lerp(startPos.x, endPos.x, ratio);
                    const currentZ = lerp(startPos.z, endPos.z, ratio);

                    currentPosition.set(
                        currentX,
                        startPos.y + heightOffset,
                        currentZ
                    );

                    target.setWorldPosition(currentPosition);
                },
                easing: 'quadOut'
            })
            .call(() => {
                this.isJumping = false;
                this.currentTween = null;
            })
            .start();
    }

    moveForward() {
        if (!this.roadManager || !this.controlledObject) return;

        this.roadManager.moveToNextRoad();

        const currentRoad = this.roadManager.getCurrentRoad();
        if (!currentRoad) return;

        console.info(currentRoad.name);
        var tile = currentRoad.getTileAtIndex(this.playerTileIndex);
        console.info(this.playerTileIndex);
        this.moveToTile(tile);


    }

    moveBackward() {
        if (!this.roadManager || !this.controlledObject) return;

        this.roadManager.moveToPrevoiusRoad();

        const currentRoad = this.roadManager.getCurrentRoad();
        if (!currentRoad) return;

        this.moveToTile(currentRoad.getTileAtIndex(this.playerTileIndex));
    }

    moveLeft() {

        if (!this.roadManager || !this.controlledObject) return;

        const currentRoad = this.roadManager.getCurrentRoad();
        if (!currentRoad) return;

        if (this.playerTileIndex + 1 >= currentRoad.getAllTiles().length) return;

        var seletectTile = currentRoad.getTileAtIndex(this.playerTileIndex + 1);
        if (!seletectTile) return;
        if (seletectTile.isHavingTree) return;

        this.playerTileIndex++;
        this.moveToTile(seletectTile);

    }

    moveRight() {

        if (!this.roadManager || !this.controlledObject) return;

        const currentRoad = this.roadManager.getCurrentRoad();
        if (!currentRoad) return;

        var seletectTile = currentRoad.getTileAtIndex(this.playerTileIndex - 1);
        if (!seletectTile) return;

        if (this.playerTileIndex == 0) return;
        if (seletectTile.isHavingTree) return;

        this.playerTileIndex--;
        this.moveToTile(seletectTile);
    }



    onDestroy() {
        input.off(Input.EventType.MOUSE_DOWN, this.onTouchStart, this);
        input.off(Input.EventType.MOUSE_MOVE, this.onTouchMove, this);
        input.off(Input.EventType.MOUSE_UP, this.onTouchEnd, this);

        // Remove keyboard listeners
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

}


