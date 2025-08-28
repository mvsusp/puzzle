import * as THREE from 'three';
import { Board } from '../game/Board';
import { Block } from '../game/Block';
import { Cursor } from '../game/Cursor';
import { BlockState } from '../game/BlockTypes';
import { VisualTimings } from '../rendering/BlockConstants';
import { TweenSystem } from './TweenSystem';
import { BlockAnimator } from './BlockAnimator';
import { StackAnimator } from './StackAnimator';
import { CursorAnimator } from './CursorAnimator';

export interface AnimationConfig {
  enableBlockAnimations: boolean;
  enableStackAnimations: boolean;
  enableCursorAnimations: boolean;
  animationSpeed: number; // Multiplier for animation speeds (1.0 = normal)
}

export class AnimationManager {
  private board: Board;
  private cursor: Cursor | null = null;
  private tweenSystem: TweenSystem;
  private blockAnimator: BlockAnimator;
  private stackAnimator: StackAnimator;
  private cursorAnimator: CursorAnimator | null = null;
  private config: AnimationConfig;
  private tileSize: number;

  // Animation tracking
  private lastBlockStates = new Map<Block, BlockState>();
  private blockMeshMap = new Map<Block, THREE.Mesh>();
  private blockMaterialMap = new Map<Block, THREE.Material>();

  constructor(board: Board, config?: Partial<AnimationConfig>) {
    this.board = board;
    this.tweenSystem = TweenSystem.getInstance();
    this.tileSize = 32;

    // Default configuration
    this.config = {
      enableBlockAnimations: true,
      enableStackAnimations: true,
      enableCursorAnimations: true,
      animationSpeed: 1.0,
      ...config
    };

    // Initialize animators
    this.blockAnimator = new BlockAnimator(this.tileSize);
    this.stackAnimator = new StackAnimator(this.board, this.tileSize);
  }

  // Initialize cursor animator when cursor is available
  public setCursor(cursor: Cursor): void {
    this.cursor = cursor;
    if (this.config.enableCursorAnimations) {
      this.cursorAnimator = new CursorAnimator(cursor, this.tileSize);
    }
  }

  // Set cursor mesh for animation
  public setCursorMesh(mesh: THREE.Mesh | THREE.LineSegments, material: THREE.Material): void {
    if (this.cursorAnimator) {
      this.cursorAnimator.setCursorMesh(mesh, material);
    }
  }

  // Register block mesh for animation tracking
  public registerBlockMesh(block: Block, mesh: THREE.Mesh, material: THREE.Material): void {
    this.blockMeshMap.set(block, mesh);
    this.blockMaterialMap.set(block, material);
    this.lastBlockStates.set(block, block.state);
  }

  // Unregister block mesh
  public unregisterBlockMesh(block: Block): void {
    this.blockMeshMap.delete(block);
    this.blockMaterialMap.delete(block);
    this.lastBlockStates.delete(block);
    this.blockAnimator.stopBlockAnimations(block);
  }

  // Main update method - call each tick
  public tick(): void {
    // Update all animation systems
    this.tweenSystem.tick();
    this.blockAnimator.tick();
    this.stackAnimator.tick();
    this.cursorAnimator?.tick();

    // Check for block state changes and trigger animations
    if (this.config.enableBlockAnimations) {
      this.updateBlockAnimations();
    }

    // Handle stack animations
    if (this.config.enableStackAnimations) {
      this.updateStackAnimations();
    }
  }

  // Trigger stack rise animation
  public startStackRise(onComplete?: () => void): void {
    if (!this.config.enableStackAnimations) {
      if (onComplete) onComplete();
      return;
    }

    this.stackAnimator.startStackRise(onComplete);
  }

  // Trigger cursor swap feedback
  public triggerSwapFeedback(): void {
    if (this.cursorAnimator && this.config.enableCursorAnimations) {
      this.cursorAnimator.animateSwapFeedback();
    }
  }

  // Enable/disable panic mode animations
  public setPanicMode(enabled: boolean): void {
    if (this.cursorAnimator) {
      if (enabled) {
        this.cursorAnimator.startPanicMode();
      } else {
        this.cursorAnimator.stopPanicMode();
      }
    }
  }

  // Animate block meshes with stack rise offset
  public animateBlockMeshesForStackRise(blockMeshes: THREE.Mesh[][]): void {
    if (this.stackAnimator.isRising()) {
      this.stackAnimator.animateBlockMeshes(blockMeshes);
    }
  }

  // Check if any critical animations are playing
  public hasCriticalAnimations(): boolean {
    return this.stackAnimator.isRising() || 
           this.hasBlockFallAnimations() ||
           this.hasBlockExplosionAnimations();
  }

  // Check if blocks are currently falling
  public hasBlockFallAnimations(): boolean {
    for (const block of this.blockMeshMap.keys()) {
      const animState = this.blockAnimator.getAnimationState(block);
      if (animState?.isFalling) return true;
    }
    return false;
  }

  // Check if blocks are currently exploding
  public hasBlockExplosionAnimations(): boolean {
    for (const block of this.blockMeshMap.keys()) {
      const animState = this.blockAnimator.getAnimationState(block);
      if (animState?.isExploding) return true;
    }
    return false;
  }

  // Update block animations based on state changes
  private updateBlockAnimations(): void {
    this.blockMeshMap.forEach((mesh, block) => {
      const material = this.blockMaterialMap.get(block);
      if (!material) return;

      const currentState = block.state;
      const lastState = this.lastBlockStates.get(block);

      // Check for state changes that trigger animations
      if (currentState !== lastState) {
        this.handleBlockStateChange(block, mesh, material, lastState, currentState);
        this.lastBlockStates.set(block, currentState);
      }

      // Handle ongoing state-based animations
      this.handleOngoingAnimations(block, mesh, material, currentState);
    });
  }

  // Handle block state changes
  private handleBlockStateChange(
    block: Block,
    mesh: THREE.Mesh,
    material: THREE.Material,
    oldState: BlockState | undefined,
    newState: BlockState
  ): void {
    switch (newState) {
      case BlockState.FLOATING:
        if (oldState !== BlockState.FLOATING) {
          this.blockAnimator.startFloatAnimation(block, mesh);
        }
        break;

      case BlockState.SWAPPING_LEFT:
        if (block.swapTargetPosition) {
          // Use absolute positioning if target is available
          const targetPos = new THREE.Vector3(block.swapTargetPosition.x, block.swapTargetPosition.y, mesh.position.z);
          console.log(`[ANIMATION] Using ABSOLUTE positioning for LEFT swap: from (${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}) to (${targetPos.x.toFixed(2)}, ${targetPos.y.toFixed(2)})`);
          this.blockAnimator.startSwapAnimationToPosition(block, mesh, targetPos);
        } else {
          console.log(`[ANIMATION] Using RELATIVE positioning for LEFT swap (no target)`);
          this.blockAnimator.startSwapAnimation(block, mesh, 'left');
        }
        break;

      case BlockState.SWAPPING_RIGHT:
        if (block.swapTargetPosition) {
          // Use absolute positioning if target is available
          const targetPos = new THREE.Vector3(block.swapTargetPosition.x, block.swapTargetPosition.y, mesh.position.z);
          console.log(`[ANIMATION] Using ABSOLUTE positioning for RIGHT swap: from (${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}) to (${targetPos.x.toFixed(2)}, ${targetPos.y.toFixed(2)})`);
          this.blockAnimator.startSwapAnimationToPosition(block, mesh, targetPos);
        } else {
          console.log(`[ANIMATION] Using RELATIVE positioning for RIGHT swap (no target)`);
          this.blockAnimator.startSwapAnimation(block, mesh, 'right');
        }
        break;

      case BlockState.EXPLODING:
        if (oldState !== BlockState.EXPLODING) {
          // Start explosion visuals
          this.blockAnimator.startExplosionAnimation(block, mesh, material);
        }
        break;

      case BlockState.NORMAL:
        // Stop floating animation when block becomes normal
        if (oldState === BlockState.FLOATING) {
          this.blockAnimator.stopBlockAnimations(block);
        }
        break;
    }
  }

  // Handle ongoing animations for current states
  private handleOngoingAnimations(
    block: Block,
    mesh: THREE.Mesh,
    material: THREE.Material,
    currentState: BlockState
  ): void {
    // Handle falling blocks (not tied to BlockState but to block.falling property)
    if (block.falling && !this.blockAnimator.getAnimationState(block)?.isFalling) {
      // Trigger fall animation if block is falling but no animation is active
      // Note: We'd need to determine from/to positions based on board state
      // This is handled more directly in the board logic
    }

    // Handle continuous animations
    switch (currentState) {
      case BlockState.FLOATING:
        // Float animation should be continuous while in FLOATING state
        if (!this.blockAnimator.getAnimationState(block)?.isFloating) {
          this.blockAnimator.startFloatAnimation(block, mesh);
        }
        break;

      case BlockState.EXPLODING: {
        // Trigger the 90° Y rotation at the end of the landed phase
        const rotateStart = VisualTimings.MATCH_BLINK_TICKS + VisualTimings.MATCH_LANDED_TICKS;
        const hasAnim = this.blockAnimator.getAnimationState(block)?.isExploding;
        if (hasAnim && block.explosionTimer >= rotateStart) {
          // Start rotation once
          if (!(mesh.userData && mesh.userData.matchRotated)) {
            this.blockAnimator.startMatchRotation(block, mesh, VisualTimings.MATCH_ROTATE_TICKS);
          }
        }
        break;
      }
    }
  }

  // Update stack-related animations
  private updateStackAnimations(): void {
    // The stack animator handles its own updates in tick()
    // Additional stack-related visual effects could be added here
  }

  // Get comprehensive debug information
  public getDebugInfo(): string {
    const parts = [];
    
    parts.push(`AnimMgr: ${this.config.enableBlockAnimations ? 'ON' : 'OFF'}`);
    
    if (this.blockAnimator) {
      parts.push(this.blockAnimator.getDebugInfo());
    }
    
    if (this.stackAnimator) {
      parts.push(this.stackAnimator.getDebugInfo());
    }
    
    if (this.cursorAnimator) {
      parts.push(this.cursorAnimator.getDebugInfo());
    }

    return parts.join(' | ');
  }

  // Update animation configuration
  public updateConfig(newConfig: Partial<AnimationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Apply configuration changes
    if (!this.config.enableCursorAnimations && this.cursorAnimator) {
      this.cursorAnimator.dispose();
      this.cursorAnimator = null;
    } else if (this.config.enableCursorAnimations && !this.cursorAnimator && this.cursor) {
      this.cursorAnimator = new CursorAnimator(this.cursor, this.tileSize);
    }
  }

  // Clean up all animations
  public dispose(): void {
    this.tweenSystem.clearAllTweens();
    this.blockAnimator.dispose();
    this.stackAnimator.dispose();
    this.cursorAnimator?.dispose();
    
    this.blockMeshMap.clear();
    this.blockMaterialMap.clear();
    this.lastBlockStates.clear();
  }
}
