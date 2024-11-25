import { _decorator, Component, Node, Vec3, tween } from 'cc';
const { ccclass, property } = _decorator;
import { Road, RoadType } from './Road';

@ccclass('Car')
export class Car extends Component {
    private endPosition: Vec3 = Vec3.ZERO;
    private startPosition: Vec3 = Vec3.ZERO;
    @property({ tooltip: "car speed" })
    public speed: number = 5; 
    private isRunning: boolean = false;
    public currentRoad: Road = null;

    protected start(): void {
        this.currentRoad = this.node.parent.getComponent(Road);
    }


    public async carSpawning(spawnPosition: Vec3, endPosition: Vec3, reverseDir: boolean): Promise<void> {
        this.startPosition = spawnPosition.clone();
        this.endPosition = endPosition.clone();

        if (this.node) {
            this.node.position = spawnPosition;
        }
        if(reverseDir){
            this.reverseYRotation(this.node);
        }

        return Promise.resolve();
    }

    reverseYRotation(node: Node) {
        const currentRotation = node.eulerAngles;
        if(currentRotation.y>0) return;
        
        node.eulerAngles = new Vec3(
            currentRotation.x,
            (currentRotation.y + 180) % 360,
            currentRotation.z
        );
    }

    public async carRunning(): Promise<void> {
        if (this.isRunning) return;

        this.isRunning = true;

        return new Promise<void>((resolve) => {
            const distance = Vec3.distance(this.node.position, this.endPosition);
            const duration = distance / this.speed;

            tween(this.node)
                .to(duration, { position: this.endPosition }, {
                    onComplete: () => {
                        this.isRunning = false;
                        this.node.active = false; 
                        resolve();
                    }
                })
                .start();
        });
    }

    public getIsRunning(): boolean {
        return this.isRunning;
    }
}

