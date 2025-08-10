import * as THREE from 'three';
import { Board } from '../game/Board';
import { TweenSystem, EasingType } from './TweenSystem';

export interface StackRiseState {
  isRising: boolean;
  currentStep: number;
  totalSteps: number;
  targetOffset: number;
  startOffset: number;
}

export class StackAnimator {
  private tweenSystem: TweenSystem;
  private board: Board;
  private tileSize: number;
  private riseState: StackRiseState | null = null;
  private onRiseComplete?: (() => void) | undefined;

  constructor(board: Board, tileSize: number = 32) {
    this.tweenSystem = TweenSystem.getInstance();
    this.board = board;
    this.tileSize = tileSize;
  }

  // Start stack rise animation (32 steps as specified in the plan)
  public startStackRise(onComplete?: (() => void) | undefined): void {
    if (this.riseState?.isRising) {
      console.warn('Stack rise already in progress');
      return;
    }

    this.onRiseComplete = onComplete;
    this.riseState = {
      isRising: true,
      currentStep: 0,
      totalSteps: Board.STACK_RAISE_STEPS, // 32 steps
      targetOffset: this.tileSize,
      startOffset: this.board.stackOffset
    };

    // Start the smooth stack rise animation
    this.animateStackRise();
  }

  // Update stack animation each tick
  public tick(): void {
    if (this.riseState?.isRising) {
      this.updateStackRiseProgress();
    }
  }

  // Check if stack is currently rising
  public isRising(): boolean {
    return this.riseState?.isRising || false;
  }

  // Get current stack offset for rendering
  public getStackOffset(): number {
    if (this.riseState) {
      const progress = this.riseState.currentStep / this.riseState.totalSteps;
      return this.riseState.startOffset + (this.riseState.targetOffset * progress);
    }
    return this.board.stackOffset;
  }

  // Get stack rise progress (0-1)
  public getRiseProgress(): number {
    if (!this.riseState) return 0;
    return this.riseState.currentStep / this.riseState.totalSteps;
  }

  // Force stop stack rise animation
  public stopStackRise(): void {
    if (this.riseState) {
      this.riseState.isRising = false;
      this.board.stackOffset += this.riseState.targetOffset;
      this.riseState = null;
    }
  }

  // Animate all block meshes during stack rise
  public animateBlockMeshes(blockMeshes: THREE.Mesh[][]): void {
    if (!this.riseState?.isRising) return;

    const progress = this.getRiseProgress();
    const riseAmount = this.tileSize * progress;

    // Move all visible blocks up by the rise amount
    for (let row = 0; row <= Board.TOP_ROW; row++) {
      for (let col = 0; col < Board.BOARD_WIDTH; col++) {
        const mesh = blockMeshes[row]?.[col];
        if (mesh && mesh.visible) {
          // Calculate base position for this grid position
          const baseX = col * this.tileSize - ((Board.BOARD_WIDTH * this.tileSize) / 2) + (this.tileSize / 2);
          const baseY = row * this.tileSize - ((Board.TOP_ROW + 1) * this.tileSize / 2) + (this.tileSize / 2);
          
          // Apply stack rise offset
          mesh.position.x = baseX;
          mesh.position.y = baseY + riseAmount;
        }
      }
    }
  }

  // Animate grid lines during stack rise
  public animateGridLines(gridLines: THREE.Line[]): void {
    if (!this.riseState?.isRising) return;

    const riseAmount = this.tileSize * this.getRiseProgress();

    gridLines.forEach(line => {
      // Move grid lines up with the stack
      line.position.y = riseAmount;
    });
  }

  // Private method to handle the smooth stack rise
  private animateStackRise(): void {
    if (!this.riseState) return;

    // Use tween system for smooth 32-step animation
    const dummyTarget = { value: 0 };
    this.tweenSystem.createTween({
      target: dummyTarget,
      duration: this.riseState.totalSteps,
      from: { value: 0 },
      to: { value: 1 },
      easing: EasingType.LINEAR, // Linear for consistent stack raising
      onUpdate: (progress: number) => {
        if (this.riseState) {
          this.riseState.currentStep = Math.floor(progress * this.riseState.totalSteps);
        }
      },
      onComplete: () => {
        this.completeStackRise();
      }
    });
  }

  // Update the stack rise progress each tick
  private updateStackRiseProgress(): void {
    if (!this.riseState) return;

    // The tween system handles the smooth progression
    // This method can be used for additional per-tick updates if needed
    
    // Check if we've completed all steps
    if (this.riseState.currentStep >= this.riseState.totalSteps) {
      this.completeStackRise();
    }
  }

  // Complete the stack rise animation
  private completeStackRise(): void {
    if (!this.riseState) return;

    // Update board's actual stack offset
    this.board.stackOffset = 0; // Reset since blocks have physically moved up one row
    
    // Mark rise as complete
    this.riseState.isRising = false;
    this.riseState = null;

    // Call completion callback
    const callback = this.onRiseComplete;
    this.onRiseComplete = undefined;
    if (callback) {
      callback();
    }
  }

  // Get debug information
  public getDebugInfo(): string {
    if (this.riseState?.isRising) {
      const progress = (this.getRiseProgress() * 100).toFixed(1);
      return `StackRise: ${this.riseState.currentStep}/${this.riseState.totalSteps} (${progress}%)`;
    }
    return 'StackRise: idle';
  }

  // Clean up animations
  public dispose(): void {
    this.stopStackRise();
  }
}

// Helper class for stack rise visual effects
export class StackRiseEffects {
  private static createRiseParticles(_position: THREE.Vector3, _scene: THREE.Scene): void {
    // TODO: Implement particle effects for stack rise
    // This would create small particles that rise up when the stack moves
    // For now, we'll keep it simple and focus on the core animation
  }

  private static createStackRiseSound(): void {
    // TODO: Implement sound effect for stack rise
    // This would play the stack rise audio effect
  }

  // Visual effect when stack rise is triggered
  public static triggerStackRiseEffect(boardCenter: THREE.Vector3, scene: THREE.Scene): void {
    // Create visual feedback for stack rise
    this.createRiseParticles(boardCenter, scene);
    this.createStackRiseSound();
  }
}