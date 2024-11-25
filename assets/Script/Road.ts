import { _decorator, Component, Node, Vec3, Color, Material, MeshRenderer, Prefab, instantiate, RigidBody } from 'cc';
const { ccclass, property } = _decorator;
import { Tile } from './Tile';
import { Car } from './Car';

export enum RoadType {
    GRASS = 'grass',
    ROAD = 'road'
}

@ccclass('Road')
export class Road extends Component {
    @property({ type: Color, tooltip: 'Color for grass (green)' })
    grassColor: Color = null; 

    @property({ type: Color, tooltip: 'Color for river (blue)' })
    riverColor: Color = new Color(33, 150, 243, 255); 

    @property({ type: Color, tooltip: 'Color for road (grey)' })
    roadColor: Color = new Color(158, 158, 158, 255);

    @property({ type: Tile, tooltip: 'Tiles in this road segment' })
    gridList: Tile[] = [];

    @property({ type: MeshRenderer, tooltip: 'mesh of the road' })
    currentMesh: MeshRenderer = null;

    @property({ type: Prefab, tooltip: 'TreePrefabs' })
    Tree: Prefab = null;

    @property({ type: Prefab, tooltip: 'TreePrefabs' })
    Tree2: Prefab = null;

    private _trees: Node[] = [];

    private _type: RoadType = RoadType.GRASS;

    public roadIndex = 0;
    private randomNum = 0;
    private reverse = false;


    @property({ type: Prefab })
    public carPrefab: Prefab | null = null;

    @property
    private maxCars: number = 5;

    @property({ tooltip: "car speed" })
    public spawnIntervalMax: number = 4; 
    @property({ tooltip: "car speedmax" })
    public spawnIntervalMin: number = 1; 

    @property({ type: Node, tooltip: 'transform of spawnPos' })
    public spawnPos1: Node = null;
    @property({ type: Node, tooltip: 'transform of spawnPos' })
    public spawnPos2: Node = null;

    private carPool: Car[] = [];
    private isSpawning: boolean = false;
    private timeSinceLastSpawn: number = 0;

    private spawnInterval: number = 2;

    public get roadType(): RoadType {
        return this._type;
    }

    protected start(): void {
        this.initCar();
    }
    protected onDisable(): void {
        for (let i = 0; i < this.carPool.length; i++) {
            this.carPool[i].node.active = false;
        }
    }

    protected onEnable(): void {
        this.initCar();
    }

    initCar(){
        if (this._type == RoadType.ROAD) {

            if (!this.carPrefab) {
                console.error('Car prefab is not assigned!');
                return;
            }

            this.spawnInterval = Math.random() * (this.spawnIntervalMax - this.spawnIntervalMin) + this.spawnIntervalMin;
            this.randomNum = Math.random();
            this.reverse = this.randomNum < 0.5 ? false : true;

            this.initializeCarPool();
            this.startSpawnCycle();
        }
    }

    setRoadType(type: RoadType) {
        this._type = type;
        this.updateColor();

        this.gridList.forEach(tile => {
            tile.isHavingTree = false;
        })

        this.clearTrees();

        if (type === RoadType.GRASS) {
            this.spawnTrees();
        }
    }

    private clearTrees() {
        this._trees.forEach(tree => {
            if (tree.isValid) {
                tree.destroy();
            }
        });
        this._trees = [];
    }

    private getRandomTreePrefab(): Prefab | null {
        const prefabs = [this.Tree, this.Tree2].filter(prefab => prefab !== null);
        if (prefabs.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * prefabs.length);
        return prefabs[randomIndex];
    }

    private spawnTrees() {
        if (!this.Tree && !this.Tree) return;
        this.gridList.forEach(tile => {
            if (!tile || !tile.node) return;

            const spawnRate = tile.isWalkable ? 0.25 : 0.8;

            if (Math.random() < spawnRate) {
                const treePrefab = this.getRandomTreePrefab();
                if (!treePrefab) return;

                const treeNode = instantiate(treePrefab);
                if (!treeNode) return;

                treeNode.parent = this.node;

                const worldPos = tile.node.worldPosition;

                const randomOffset = new Vec3(
                    (Math.random() * 0.4) - 0.2,
                    0,
                    (Math.random() * 0.4) - 0.2
                );

                treeNode.worldPosition = new Vec3(
                    worldPos.x,
                    worldPos.y + 3,
                    worldPos.z
                );

                const parentScale = this.node.scale;
                const randomScale = 1.2 + (Math.random() * 0.4);
                treeNode.setScale(
                    randomScale,
                    randomScale,
                    randomScale
                );

                const rotation = new Vec3(0, Math.random() * 360, 0);
                treeNode.setRotationFromEuler(rotation.x, rotation.y, rotation.z);

                this._trees.push(treeNode);
                tile.isHavingTree = true;
            }
        });
    }

    private initializeCarPool() {
        for (let i = 0; i < this.maxCars; i++) {
            const carNode = instantiate(this.carPrefab);
            const car = carNode.getComponent(Car);

            if (!car) {
                console.error('Car component not found on prefab!');
                continue;
            }

            this.carPool.push(car);
            carNode.parent = this.node;
            carNode.active = false;
        }
    }

    private getInactiveCar(): Car | null {
        return this.carPool.find(car => !car.node.active);
    }

    update(deltaTime: number) {
        if (!this.isSpawning) return;

        if (this._type == RoadType.ROAD && this.node.activeInHierarchy) {
            this.timeSinceLastSpawn += deltaTime;

            if (this.timeSinceLastSpawn >= this.spawnInterval) {
                this.spawnCar();
                this.timeSinceLastSpawn = 0;
                this.spawnInterval = Math.random() * (this.spawnIntervalMax - this.spawnIntervalMin) + this.spawnIntervalMin;
            }
        }
    }

    private async spawnCar() {
        const car = this.getInactiveCar();
        if (!car) return; 

        var spawnPos = this.randomNum < 0.5 ? this.spawnPos1.position : this.spawnPos2.position;
        spawnPos = new Vec3(spawnPos.x, spawnPos.y + 0.5, spawnPos.z);
        var endPos = this.randomNum < 0.5 ? this.spawnPos2.position : this.spawnPos1.position;
        endPos = new Vec3(endPos.x, endPos.y + 0.5, endPos.z);


        car.node.active = true;
        await car.carSpawning(spawnPos, endPos, this.reverse);

        car.carRunning().catch(err => {
            console.error('Error in car running:', err);
        });
    }

    private startSpawnCycle() {
        this.isSpawning = true;
        this.timeSinceLastSpawn = 0;
    }

    public stopSpawning() {
        this.isSpawning = false;
    }

    private updateColor() {
        const meshRenderer = this.currentMesh;
        if (!meshRenderer) return;

        const material = meshRenderer.material;
        if (!material) return;

        let color: Color;
        switch (this._type) {
            case RoadType.GRASS:
                color = this.grassColor;
                break;
                color = this.riverColor;
                break;
            case RoadType.ROAD:
                color = this.roadColor;
                break;
            default:
                color = this.grassColor;
        }


        material.setProperty('mainColor', color);
    }

    getTileAtIndex(index: number): Tile | null {
        if (!this.gridList[index].isWalkable) return null;

        return this.gridList[index] || null;
    }

    getAvailableTiles(): Tile[] {
        return this.gridList.filter(tile => tile.isWalkable);
    }

    getAllTiles(): Tile[] {
        return this.gridList;
    }
}