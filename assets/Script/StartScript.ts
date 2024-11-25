import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('StartScript')
export class StartScript extends Component {
    start() {
        console.info('Hello world');
    }

    update(deltaTime: number) {
        
    }
}


