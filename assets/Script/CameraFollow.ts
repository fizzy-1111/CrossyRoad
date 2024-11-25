import { _decorator, Component, Node, Vec3, Camera } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraFollow')
export class CameraFollow extends Component {
    @property({ type: Node, tooltip: 'The target object to follow and look at' })
    target: Node | null = null;

    @property({ tooltip: 'OffsetX distance behind the target' })
    offsetX: number = 5;

    @property({ tooltip: 'OffsetZ distance behind the target' })
    offsetZ: number = 5;

    @property({ tooltip: 'Height offset above the target' })
    height: number = 3;

    @property({ tooltip: 'How fast the camera follows the target' })
    followSpeed: number = 5.0;

    @property({ tooltip: 'How fast the camera looks at the target' })
    lookSpeed: number = 5.0;

    @property({ type: Camera, tooltip: 'Reference to the camera component' })
    private _camera: Camera | null = null;

    private desiredPosition: Vec3 = new Vec3();
    
    private currentLookAtPosition: Vec3 = new Vec3();

    start() {
        if (!this._camera) {
            this._camera = this.getComponent(Camera);
        }

        if (this.target) {
            this.updateDesiredPosition();
            this.node.setPosition(this.desiredPosition);
            this.currentLookAtPosition = this.target.position.clone();
        }
    }

    private updateDesiredPosition() {
        if (!this.target) return;

        const targetForward = new Vec3();
        Vec3.transformQuat(targetForward, Vec3.FORWARD, this.target.rotation);
        targetForward.normalize();

        const targetRight = new Vec3();
        Vec3.transformQuat(targetRight, Vec3.RIGHT, this.target.rotation);
        targetRight.normalize();

        this.desiredPosition = this.target.position.clone();
        
        this.desiredPosition.x -= -targetRight.x * this.offsetX;
        this.desiredPosition.y += this.height;
        this.desiredPosition.z -= targetForward.z * this.offsetZ;
    }


    private updatePosition(deltaTime: number) {
        const currentPos = this.node.position;
        const newPos = new Vec3();
        
        Vec3.lerp(newPos, currentPos, this.desiredPosition, this.followSpeed * deltaTime);
        this.node.setPosition(newPos);
    }

    private updateRotation(deltaTime: number) {
        if (!this.target) return;

        Vec3.lerp(
            this.currentLookAtPosition,
            this.currentLookAtPosition,
            this.target.position,
            this.lookSpeed * deltaTime
        );

        const up = Vec3.UP;
        const cameraPos = this.node.position;
        const lookAtDir = new Vec3();
        
        Vec3.subtract(lookAtDir, this.currentLookAtPosition, cameraPos);
        lookAtDir.normalize();

        const right = new Vec3();
        Vec3.cross(right, lookAtDir, up);
        right.normalize();

        const newUp = new Vec3();
        Vec3.cross(newUp, right, lookAtDir);
        newUp.normalize();

        this.node.lookAt(this.currentLookAtPosition, newUp);
    }

    update(deltaTime: number) {
        if (!this.target || !this._camera) return;

        this.updateDesiredPosition();

        this.updatePosition(deltaTime);

        // this.updateRotation(deltaTime);
    }

    // setTarget(newTarget: Node) {
    //     this.target = newTarget;
    //     if (this.target) {
    //         this.updateDesiredPosition();
    //         this.currentLookAtPosition = this.target.position.clone();
    //     }
    // }

    // setDistance(newDistance: number) {
    //     this.distance = newDistance;
    // }

    // setHeight(newHeight: number) {
    //     this.height = newHeight;
    // }
}