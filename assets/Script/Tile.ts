import { _decorator, Component, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Tile')
export class Tile extends Component {
    @property({ tooltip: 'World position of the tile' })
    worldPosition: Vec3 = new Vec3();

    @property({ tooltip: 'Is this tile walkable?' })
    isWalkable: boolean = true;

    @property({ tooltip: 'Is this tile HavingTree?' })
    isHavingTree: boolean = false;

    @property({ tooltip: 'Type of tile (road, grass, water, etc.)' })
    tileType: string = 'grass';
}