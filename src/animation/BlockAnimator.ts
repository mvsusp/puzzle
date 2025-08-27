import * as THREE from 'three';
import { Block } from '../game/Block';
import { BlockState } from '../game/BlockTypes';
import { TweenSystem, AnimationHelpers, EasingType } from './TweenSystem';
import { BlockDimensions } from '../rendering/BlockConstants';

// Animation state tracking for blocks
export interface BlockAnimationState {
  isFalling: boolean;
  isSwapping: boolean;
  isExploding: boolean;
  isFloating: boolean;
  fallFromRow?: number;
  fallToRow?: number;
  swapDirection?: 'left' | 'right';
  floatBobId?: string;
}

export class BlockAnimator {
  private tweenSystem: TweenSystem;
  private animationStates = new Map<Block, BlockAnimationState>();
  private tileSize: number;
  private tileSizeY: number;

  constructor(tileSize: number = BlockDimensions.TILE_SIZE_X) {
    this.tweenSystem = TweenSystem.getInstance();
    this.tileSize = tileSize;
    this.tileSizeY = BlockDimensions.TILE_SIZE_Y;
  }

  // Update animator each tick
  public tick(): void {
    this.updateAnimationStates();
  }

  // Start falling animation for a block
  public startFallAnimation(
    block: Block,
    mesh: THREE.Mesh,
    fromRow: number,
    toRow: number,
    onComplete?: () => void
  ): void {
    // Stop any existing animations for this block
    this.stopBlockAnimations(block);

    const animState: BlockAnimationState = {
      isFalling: true,
      isSwapping: false,
      isExploding: false,
      isFloating: false,
      fallFromRow: fromRow,
      fallToRow: toRow
    };

    this.animationStates.set(block, animState);

    // TODO: Calculate fall duration based on distance for future enhancement
    // const distance = Math.abs(toRow - fromRow);
    // const baseDuration = 8; // Base fall time for 1 row
    // const duration = Math.min(baseDuration + distance * 2, 20); // Max 20 ticks

    AnimationHelpers.animateBlockFall(mesh, fromRow, toRow, this.tileSize, () => {
      animState.isFalling = false;
      if (onComplete) onComplete();
    });
  }

  // Start swap animation for a block (relative movement - legacy)
  public startSwapAnimation(
    block: Block,
    mesh: THREE.Mesh,
    direction: 'left' | 'right',
    onComplete?: () => void
  ): void {
    this.stopBlockAnimations(block);

    const animState: BlockAnimationState = {
      isFalling: false,
      isSwapping: true,
      isExploding: false,
      isFloating: false,
      swapDirection: direction
    };

    this.animationStates.set(block, animState);

    AnimationHelpers.animateBlockSwap(mesh, direction, this.tileSize, () => {
      animState.isSwapping = false;
      // Note: The renderer will reset mesh position to correct grid location
      // once isSwapping becomes false in the next render cycle
      if (onComplete) onComplete();
    });
  }

  // Start swap animation for a block (absolute positioning)
  public startSwapAnimationToPosition(
    block: Block,
    mesh: THREE.Mesh,
    targetPosition: THREE.Vector3,
    onComplete?: () => void
  ): void {
    this.stopBlockAnimations(block);

    const animState: BlockAnimationState = {
      isFalling: false,
      isSwapping: true,
      isExploding: false,
      isFloating: false
    };

    this.animationStates.set(block, animState);

    AnimationHelpers.animateBlockSwapToPosition(mesh, targetPosition, () => {
      animState.isSwapping = false;
      if (onComplete) onComplete();
    });
  }

  // Start explosion animation for a block
  public startExplosionAnimation(
    block: Block,
    mesh: THREE.Mesh,
    material: THREE.Material,
    onComplete?: () => void
  ): void {
    this.stopBlockAnimations(block);

    const animState: BlockAnimationState = {
      isFalling: false,
      isSwapping: false,
      isExploding: true,
      isFloating: false
    };

    this.animationStates.set(block, animState);

    const explosionTicks = block.explosionTicks || 61;
    
    // Create compound explosion animation
    this.createExplosionEffect(mesh, material, explosionTicks, () => {
      animState.isExploding = false;
      // Restore material properties for blocks that survive the explosion
      material.opacity = 1.0;
      mesh.scale.set(1, 1, 1);
      mesh.rotation.set(0, 0, 0);
      if (onComplete) onComplete();
    });
  }

  // Start floating bobbing animation
  public startFloatAnimation(block: Block, mesh: THREE.Mesh): void {
    // Don't start if already floating
    const animState = this.animationStates.get(block);
    if (animState?.isFloating) return;

    const newAnimState: BlockAnimationState = {
      isFalling: false,
      isSwapping: false,
      isExploding: false,
      isFloating: true
    };

    this.animationStates.set(block, newAnimState);

    // Start continuous bobbing
    newAnimState.floatBobId = this.createFloatBobbing(mesh);
  }

  // Stop all animations for a block
  public stopBlockAnimations(block: Block): void {
    const animState = this.animationStates.get(block);
    if (animState?.floatBobId) {
      this.tweenSystem.removeTween(animState.floatBobId);
    }
    
    this.animationStates.delete(block);
  }

  // Check if block is currently animating
  public isBlockAnimating(block: Block): boolean {
    const animState = this.animationStates.get(block);
    return !!(animState?.isFalling || animState?.isSwapping || animState?.isExploding);
  }

  // Get animation state for a block
  public getAnimationState(block: Block): BlockAnimationState | null {
    return this.animationStates.get(block) || null;
  }

  // Update animation states based on block states
  private updateAnimationStates(): void {
    this.animationStates.forEach((animState, block) => {
      // Sync with block state
      if (block.state === BlockState.FLOATING && !animState.isFloating) {
        // Block became floating, but we don't have float animation - this shouldn't happen
        console.warn('Block in FLOATING state but no float animation active');
      }

      // Clean up completed animations
      if (!animState.isFalling && !animState.isSwapping && !animState.isExploding && !animState.isFloating) {
        this.animationStates.delete(block);
      }
    });
  }

  // Create complex explosion effect
  private createExplosionEffect(
    mesh: THREE.Mesh,
    material: THREE.Material,
    duration: number,
    onComplete: () => void
  ): void {
    const originalScale = mesh.scale.clone();
    const originalOpacity = material.opacity;
    const originalRotation = mesh.rotation.clone();

    // Phase 1: Quick scale up (first 20% of animation)
    const scaleUpDuration = Math.floor(duration * 0.2);
    this.tweenSystem.createTween({
      target: mesh,
      duration: scaleUpDuration,
      from: { scale: originalScale },
      to: { scale: new THREE.Vector3(originalScale.x * 1.2, originalScale.y * 1.2, originalScale.z) },
      easing: EasingType.EASE_OUT,
      onComplete: () => {
        // Phase 2: Scale up more and fade (remaining 80%)
        const fadeOutDuration = duration - scaleUpDuration;
        
        this.tweenSystem.createTween({
          target: mesh,
          duration: fadeOutDuration,
          from: { scale: new THREE.Vector3(originalScale.x * 1.2, originalScale.y * 1.2, originalScale.z) },
          to: { scale: new THREE.Vector3(originalScale.x * 1.8, originalScale.y * 1.8, originalScale.z) },
          easing: EasingType.EASE_IN,
        });

        this.tweenSystem.createTween({
          target: material,
          duration: fadeOutDuration,
          from: { opacity: originalOpacity },
          to: { opacity: 0 },
          easing: EasingType.EASE_IN,
        });

        // Rotation animation - 90 degrees on Y-axis from current rotation
        this.tweenSystem.createTween({
          target: mesh,
          duration: fadeOutDuration,
          from: { rotation: originalRotation },
          to: { rotation: new THREE.Euler(originalRotation.x, originalRotation.y + Math.PI / 2, originalRotation.z) },
          easing: EasingType.LINEAR,
          onComplete
        });
      }
    });
  }

  // Create continuous floating bobbing animation
  private createFloatBobbing(mesh: THREE.Mesh): string {
    const baseY = mesh.position.y;
    const bobHeight = 3;
    const cycleDuration = 40; // Slightly faster than original simple version

    const animateUp = (): string => {
      return this.tweenSystem.createTween({
        target: mesh,
        duration: cycleDuration,
        from: { position: new THREE.Vector3(mesh.position.x, baseY - bobHeight, mesh.position.z) },
        to: { position: new THREE.Vector3(mesh.position.x, baseY + bobHeight, mesh.position.z) },
        easing: EasingType.EASE_IN_OUT,
        onComplete: () => animateDown()
      });
    };

    const animateDown = (): string => {
      return this.tweenSystem.createTween({
        target: mesh,
        duration: cycleDuration,
        from: { position: new THREE.Vector3(mesh.position.x, baseY + bobHeight, mesh.position.z) },
        to: { position: new THREE.Vector3(mesh.position.x, baseY - bobHeight, mesh.position.z) },
        easing: EasingType.EASE_IN_OUT,
        onComplete: () => animateUp()
      });
    };

    return animateUp();
  }

  // Get debug information
  public getDebugInfo(): string {
    const animatingBlocks = this.animationStates.size;
    const tweenInfo = this.tweenSystem.getDebugInfo();
    return `BlockAnimator: ${animatingBlocks} blocks, ${tweenInfo}`;
  }

  // Dispose of all animations
  public dispose(): void {
    this.tweenSystem.clearAllTweens();
    this.animationStates.clear();
  }
}
