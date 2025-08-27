import * as THREE from 'three';
import { Cursor } from '../game/Cursor';
import { TweenSystem, EasingType } from './TweenSystem';
import { BlockDimensions, getBlockPosition } from '../rendering/BlockConstants';

export interface CursorAnimationState {
  isPulsing: boolean;
  isMoving: boolean;
  pulseId?: string | undefined;
  moveId?: string | undefined;
  swapFeedbackId?: string | undefined;
}

export class CursorAnimator {
  private tweenSystem: TweenSystem;
  private cursor: Cursor;
  private cursorMesh: THREE.Mesh | THREE.LineSegments | null = null;
  private cursorMaterial: THREE.Material | null = null;
  private animationState: CursorAnimationState;
  private tileSize: number;
  private tileSizeY: number;

  constructor(cursor: Cursor, tileSize: number = BlockDimensions.TILE_SIZE_X) {
    this.tweenSystem = TweenSystem.getInstance();
    this.cursor = cursor;
    this.tileSize = tileSize;
    this.tileSizeY = BlockDimensions.TILE_SIZE_Y;
    this.animationState = {
      isPulsing: false,
      isMoving: false
    };
  }

  // Set the cursor mesh and material for animation
  public setCursorMesh(mesh: THREE.Mesh | THREE.LineSegments, material: THREE.Material): void {
    this.cursorMesh = mesh;
    this.cursorMaterial = material;
    
    // Start default pulsing animation
    this.startPulseAnimation();
  }

  // Update animator each tick
  public tick(): void {
    this.updateCursorEffects();
  }

  // Start pulsing animation
  public startPulseAnimation(): void {
    if (!this.cursorMaterial || this.animationState.isPulsing) return;

    this.animationState.isPulsing = true;

    // Create continuous pulsing effect
    this.animationState.pulseId = this.createPulseLoop();
  }

  // Stop pulsing animation
  public stopPulseAnimation(): void {
    if (this.animationState.pulseId) {
      this.tweenSystem.removeTween(this.animationState.pulseId);
      this.animationState.pulseId = undefined;
    }
    this.animationState.isPulsing = false;
  }

  // Start smooth movement animation
  public startMoveAnimation(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    onComplete?: () => void
  ): void {
    if (!this.cursorMesh) return;

    // Stop any existing movement animation
    if (this.animationState.moveId) {
      this.tweenSystem.removeTween(this.animationState.moveId);
    }

    this.animationState.isMoving = true;

    const fromPos = this.boardToWorldPosition(fromY, fromX);
    const toPos = this.boardToWorldPosition(toY, toX);

    if (this.cursorMesh) {
      this.animationState.moveId = this.tweenSystem.createTween({
        target: this.cursorMesh,
        duration: 8, // Quick but smooth movement
        from: { position: fromPos },
        to: { position: toPos },
        easing: EasingType.EASE_OUT,
        onComplete: onComplete ? (): void => {
          this.animationState.isMoving = false;
          this.animationState.moveId = undefined;
          onComplete();
        } : (): void => {
          this.animationState.isMoving = false;
          this.animationState.moveId = undefined;
        }
      });
    }
  }

  // Animate cursor swap feedback
  public animateSwapFeedback(): void {
    if (!this.cursorMesh) return;

    // Quick scale pulse to indicate swap action
    const originalScale = this.cursorMesh.scale.clone();
    const pulseScale = new THREE.Vector3(
      originalScale.x * 1.3,
      originalScale.y * 1.3,
      originalScale.z
    );

    if (this.cursorMesh) {
      this.animationState.swapFeedbackId = this.tweenSystem.createTween({
        target: this.cursorMesh,
        duration: 8, // Quick feedback
        from: { scale: originalScale },
        to: { scale: pulseScale },
        easing: EasingType.EASE_OUT,
        onComplete: () => {
          // Scale back to normal
          if (this.cursorMesh) {
            this.tweenSystem.createTween({
              target: this.cursorMesh,
              duration: 8,
              from: { scale: pulseScale },
              to: { scale: originalScale },
              easing: EasingType.EASE_IN,
              onComplete: () => {
                this.animationState.swapFeedbackId = undefined;
              }
            });
          }
        }
      });
    }
  }

  // Animate panic mode cursor (faster, more intense pulsing)
  public startPanicMode(): void {
    this.stopPulseAnimation();
    
    if (!this.cursorMaterial) return;

    this.animationState.isPulsing = true;
    this.animationState.pulseId = this.createPanicPulseLoop();
  }

  // Return to normal cursor animation
  public stopPanicMode(): void {
    this.stopPulseAnimation();
    this.startPulseAnimation();
  }

  // Check if cursor is currently moving
  public isMoving(): boolean {
    return this.animationState.isMoving;
  }

  // Update visual effects based on cursor state
  private updateCursorEffects(): void {
    if (!this.cursorMesh || !this.cursorMaterial) return;

    // Update cursor position to match logical cursor position if not animating
    if (!this.animationState.isMoving) {
      const cursorPos = this.cursor.getPosition();
      const worldPos = this.boardToWorldPosition(cursorPos.y, cursorPos.x);
      this.cursorMesh.position.copy(worldPos);
    }

    // Additional visual effects can be added here
    // For example, warning effects when cursor is near the top
  }

  // Create continuous pulsing animation loop
  private createPulseLoop(): string {
    if (!this.cursorMaterial) return '';
    
    const pulseLow = 0.6;
    const pulseHigh = 1.0;
    const pulseDuration = 30; // Half second cycles

    const pulseUp = (): string => {
      const material = this.cursorMaterial;
      if (!material) return '';
      return this.tweenSystem.createTween({
        target: material,
        duration: pulseDuration,
        from: { opacity: pulseLow },
        to: { opacity: pulseHigh },
        easing: EasingType.EASE_IN_OUT,
        onComplete: () => {
          if (this.animationState.isPulsing) {
            pulseDown();
          }
        }
      });
    };

    const pulseDown = (): string => {
      const material = this.cursorMaterial;
      if (!material) return '';
      return this.tweenSystem.createTween({
        target: material,
        duration: pulseDuration,
        from: { opacity: pulseHigh },
        to: { opacity: pulseLow },
        easing: EasingType.EASE_IN_OUT,
        onComplete: () => {
          if (this.animationState.isPulsing) {
            pulseUp();
          }
        }
      });
    };

    return pulseUp();
  }

  // Create panic mode pulsing (faster and more intense)
  private createPanicPulseLoop(): string {
    if (!this.cursorMaterial) return '';
    
    const pulseLow = 0.4;
    const pulseHigh = 1.0;
    const pulseDuration = 15; // Double speed for panic

    const pulseUp = (): string => {
      const material = this.cursorMaterial;
      if (!material) return '';
      return this.tweenSystem.createTween({
        target: material,
        duration: pulseDuration,
        from: { opacity: pulseLow },
        to: { opacity: pulseHigh },
        easing: EasingType.EASE_IN_OUT,
        onComplete: () => {
          if (this.animationState.isPulsing) {
            pulseDown();
          }
        }
      });
    };

    const pulseDown = (): string => {
      const material = this.cursorMaterial;
      if (!material) return '';
      return this.tweenSystem.createTween({
        target: material,
        duration: pulseDuration,
        from: { opacity: pulseHigh },
        to: { opacity: pulseLow },
        easing: EasingType.EASE_IN_OUT,
        onComplete: () => {
          if (this.animationState.isPulsing) {
            pulseUp();
          }
        }
      });
    };

    return pulseUp();
  }

  // Convert board coordinates to world position (adjusted for 2-block-wide cursor)
  private boardToWorldPosition(row: number, col: number): THREE.Vector3 {
    // Get the position of the left block
    const leftBlockPos = getBlockPosition(row, col);
    
    // Calculate cursor center (between two blocks, accounting for gap)
    // Cursor spans from left edge of left block to right edge of right block
    const cursorCenterX = leftBlockPos.x + (BlockDimensions.BLOCK_WIDTH / 2) + (BlockDimensions.BLOCK_GAP / 2);
    const cursorCenterY = leftBlockPos.y;

    return new THREE.Vector3(
      cursorCenterX,
      cursorCenterY,
      2 // Cursor above blocks
    );
  }

  // Get debug information
  public getDebugInfo(): string {
    const status = [];
    if (this.animationState.isPulsing) status.push('pulsing');
    if (this.animationState.isMoving) status.push('moving');
    if (this.animationState.swapFeedbackId) status.push('swap-feedback');
    
    return `CursorAnimator: ${status.join(', ') || 'idle'}`;
  }

  // Clean up all animations
  public dispose(): void {
    this.stopPulseAnimation();
    
    if (this.animationState.moveId) {
      this.tweenSystem.removeTween(this.animationState.moveId);
    }
    
    if (this.animationState.swapFeedbackId) {
      this.tweenSystem.removeTween(this.animationState.swapFeedbackId);
    }

    this.animationState = {
      isPulsing: false,
      isMoving: false
    };
  }
}
