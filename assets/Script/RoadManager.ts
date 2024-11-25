import { _decorator, Component, Node, Prefab, Vec3, instantiate,director  } from 'cc';
import { Road, RoadType } from './Road';
import { Tile } from './Tile';
import { Car } from './Car';
import { GameManager, GameState,GAME_EVENTS  } from './GameManager';


const { ccclass, property } = _decorator;

@ccclass('RoadManager')
export class RoadManager extends Component {
    @property({ type: Prefab, tooltip: 'The road prefab to instance' })
    roadPrefab: Prefab | null = null;

    @property({ tooltip: 'Number of road pieces in pool' })
    poolSize: number = 7;

    @property({ tooltip: 'Number of visible road pieces (must be smaller than pool size)' })
    visibleRoadCount: number = 5;

    @property({ tooltip: 'Number of tiles per road' })
    tilesPerRoad: number = 5;

    @property({ tooltip: 'Space between each road piece' })
    roadSpacing: number = 10;

    @property({ tooltip: 'Space between tiles' })
    tileSpacing: number = 2;

    @property({ tooltip: 'How many road patterns to remember' })
    private patternMemory: number = 5;

    private previousPatterns: RoadType[] = [];

    private roadPool: Road[] = [];
    private activeRoads: Road[] = [];
    private lastSpawnPosition: Vec3 = new Vec3();
    @property({ tooltip: "current road index" })
    currentRoadIndex: number = 0;
    currentRoadIndexMax: number=0;

    private lastRoadType: RoadType = RoadType.GRASS;
    private consecutiveHazards: number = 0;
    private maxConsecutiveHazards: number = 3; 


    private firstActiveRoadIndex: number = 0;
    private initGrassBlock: number = 2;
    public finishedInitPool: boolean=false;
    private timeLeft: number = 5;
    private maxTimeLeft: number = 5;
    private gameTimer: number = 0;
    private lastProgressTime: number = 0;


    start() {
        if (!this.roadPrefab) {
            return;
        }

        GameManager.instance.updateScore(this.currentRoadIndex);

        this.visibleRoadCount = Math.min(this.visibleRoadCount, this.poolSize - 1);

        this.initializePool();
        this.spawnInitialRoads();
        this.finishedInitPool=true;
        this.resetTimer();
    }

    update(dt: number) {
        if (GameManager.instance.currentState === GameState.PLAYING) {
            this.updateTimer(dt);
        }
    }

    private updateTimer(dt: number) {
        this.timeLeft -= dt;
        
        this.updateTimerUI();

        if (this.currentRoadIndex > this.currentRoadIndexMax) {
            this.currentRoadIndexMax = this.currentRoadIndex;
            this.resetTimer();
        }

        if (this.timeLeft <= 0) {
            this.handleTimeOut();
        }
    }

    private resetTimer() {
        this.timeLeft = this.maxTimeLeft;
        this.lastProgressTime = director.getTotalTime() / 1000; 
        this.updateTimerUI();
    }

    private updateTimerUI() {
        const timeToDisplay = Math.max(0, Math.round(this.timeLeft * 10) / 10);
        
        GameManager.instance.node.emit(GAME_EVENTS.TIME_UPDATED, timeToDisplay);
    }

    private handleTimeOut() {
        if (this.timeLeft <= 0) {
            this.timeLeft = -1;
            
            console.log('Time out! Game Over');
            GameManager.instance.setState(GameState.GAME_OVER);
        }
    }
    public resetGame() {
        this.currentRoadIndex = 0;
        this.currentRoadIndexMax = 0;
        this.resetTimer();
    }

    private initializePool() {
        for (let i = 0; i < this.poolSize; i++) {
            const roadNode = instantiate(this.roadPrefab);
            const road = roadNode.getComponent(Road);
            roadNode.parent = this.node;
            roadNode.active = false;
            this.roadPool.push(road);
        }
    }

    private getRoadFromPool(): Road | null {
        const inactiveRoads = this.roadPool.filter(road => !road.node.active);

        if (inactiveRoads.length === 0) {
            return null;
        }

        const randomIndex = Math.floor(Math.random() * inactiveRoads.length);
        const road = inactiveRoads[randomIndex];

        if (road) {
            road.node.active = true;
            return road;
        }

        return null;
    }

    private returnRoadToPool(road: Road) {
        road.node.active = false;
    }

    private spawnInitialRoads() {
        this.activeRoads = [];
        this.currentRoadIndex = 0;
        this.firstActiveRoadIndex = 0;
        this.lastSpawnPosition = this.node.position.clone();

        for (let i = 0; i < this.visibleRoadCount; i++) {
            this.spawnRoadPiece();
        }
    }

    private spawnRoadPiece(): Road | null {
        const road = this.getRoadFromPool();
        if (!road) return null;

        road.node.setPosition(0, this.lastSpawnPosition.y, this.lastSpawnPosition.z);
        this.lastSpawnPosition = new Vec3(
            this.lastSpawnPosition.x,
            this.lastSpawnPosition.y,
            this.lastSpawnPosition.z + this.roadSpacing
        );
        this.spawnTypeRoad(road);
        this.activeRoads.push(road);
        return road;
    }

    public spawnTypeRoad(road: Road) {
        const roadType = this.getNextRoadType();
        road.setRoadType(roadType);
        this.lastRoadType = roadType;
    }

    private getNextRoadType(): RoadType {
        if (this.initGrassBlock > 0) {
            this.consecutiveHazards = 0;
            this.initGrassBlock--;
            console.info("Spawning init grass");
            return RoadType.GRASS;
        }

        if (this.consecutiveHazards >= this.maxConsecutiveHazards) {
            this.consecutiveHazards = 0;
            return RoadType.GRASS;
        }

        if (this.lastRoadType === RoadType.GRASS) {
            this.consecutiveHazards = 1;
            const randomGrass = Math.random() < 0.2 ? RoadType.GRASS : RoadType.ROAD;
            return randomGrass;
        }

        const random = Math.random();
        if (random < 0.2) { 
            this.consecutiveHazards = 0;
            return RoadType.GRASS;
        } else { 
            this.consecutiveHazards++;
           
            const sameTypeChance = 0.7;
            if (Math.random() < sameTypeChance) {
                return this.lastRoadType;
            } else {
                return this.lastRoadType === RoadType.ROAD ? RoadType.GRASS : RoadType.ROAD;
            }
        }
    }

    public getCurrentRoad(): Road | null {
        const index = this.currentRoadIndex - this.firstActiveRoadIndex;
        return this.activeRoads[index] || null;
    }

    private recycleAndSpawnNewRoad() {
        const oldRoad = this.activeRoads.shift();
        if (!oldRoad) return;
        oldRoad.stopSpawning();
        oldRoad.node.active=false;

        const newType = this.getNextRoadType();

        const previousRoad = this.activeRoads[this.activeRoads.length - 1];
        const startX = previousRoad ? previousRoad.node.position.x : 0;

        const randomOffset = Math.random() * 2 - 1; 
        const targetX = startX + randomOffset;
        const clampedX = Math.max(-5, Math.min(5, targetX));

        oldRoad.node.setPosition(
            clampedX,
            this.lastSpawnPosition.y,
            this.lastSpawnPosition.z
        );

        oldRoad.setRoadType(newType);

        this.updatePatternMemory(newType);

        this.activeRoads.push(oldRoad);
        this.lastSpawnPosition.z += this.roadSpacing;
        this.firstActiveRoadIndex++;
        oldRoad.node.active=true;
    }

    private updatePatternMemory(newType: RoadType) {
        this.previousPatterns.push(newType);
        if (this.previousPatterns.length > this.patternMemory) {
            this.previousPatterns.shift();
        }
    }

    private getNextRoadTypeWithPattern(): RoadType {
        const recentPatterns = this.previousPatterns.slice(-3);
        const allSameType = recentPatterns.every(type => type === recentPatterns[0]);

        if (allSameType && recentPatterns.length >= 3) {
            const availableTypes = [RoadType.GRASS, RoadType.ROAD]
                .filter(type => type !== recentPatterns[0]);
            return availableTypes[Math.floor(Math.random() * availableTypes.length)];
        }

        const recentHazards = recentPatterns.filter(type => type !== RoadType.GRASS).length;
        if (recentHazards >= 3) {
            return RoadType.GRASS;
        }

        const random = Math.random();

        if (this.previousPatterns[this.previousPatterns.length - 1] === RoadType.GRASS) {
            return random < 0.8 ? RoadType.ROAD : RoadType.GRASS;
        }

        if (random < 0.25) { 
            return RoadType.GRASS;
        } else if (random < 0.75) { 
            return RoadType.ROAD;
        }
    }

    public moveToNextRoad() {
        const nextIndex = this.currentRoadIndex + 1;

        const middlePoint = Math.floor(this.visibleRoadCount / 2);

        if (this.currentRoadIndex - this.firstActiveRoadIndex >= middlePoint) {
            if (this.activeRoads.length < this.visibleRoadCount) {
                this.spawnRoadPiece();
            } else {
                this.recycleAndSpawnNewRoad();
            }
        }

        this.currentRoadIndex = nextIndex;
        if(this.currentRoadIndex>this.currentRoadIndexMax){
            GameManager.instance.updateScore(this.currentRoadIndex);
        }
        this.updateRoadPositions();
    }

    public moveToPrevoiusRoad() {
        if (this.currentRoadIndex > 0) {
            this.currentRoadIndex--;

            if (this.currentRoadIndex - this.firstActiveRoadIndex < 1) {
                if (this.firstActiveRoadIndex > 0) {
                    const lastRoad = this.activeRoads.pop();
                    if (lastRoad) {
                        this.firstActiveRoadIndex--;
                        this.lastSpawnPosition.z -= this.roadSpacing * this.visibleRoadCount;
                        lastRoad.node.setPosition(
                            0,
                            this.lastSpawnPosition.y,
                            this.lastSpawnPosition.z
                        );
                        this.activeRoads.unshift(lastRoad);
                        this.lastSpawnPosition.z += this.roadSpacing;
                    }
                }
            }
        }
        this.updateRoadPositions();
    }

    private updateRoadPositions() {
        this.activeRoads.forEach((road, index) => {
            const zPos = (this.firstActiveRoadIndex + index) * this.roadSpacing;
            road.node.setPosition(0, this.lastSpawnPosition.y, zPos);
        });
    }

    public getDebugInfo() {
        return {
            activeRoads: this.activeRoads.length,
            currentIndex: this.currentRoadIndex,
            firstActiveIndex: this.firstActiveRoadIndex,
            poolSize: this.poolSize,
            visibleRoads: this.visibleRoadCount
        };
    }
}