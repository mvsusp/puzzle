import * as THREE from 'three';

// Easing functions for animations
export enum EasingType {
  LINEAR = 'linear',
  EASE_IN = 'ease-in',
  EASE_OUT = 'ease-out',
  EASE_IN_OUT = 'ease-in-out',
  BOUNCE_OUT = 'bounce-out',
  ELASTIC_OUT = 'elastic-out'
}

// Animation targets and properties
export interface AnimationTarget {
  position?: THREE.Vector3;
  scale?: THREE.Vector3;
  rotation?: THREE.Euler;
  opacity?: number;
  color?: THREE.Color;
}

export interface TweenConfig {
  target: THREE.Object3D | THREE.Material | { value?: number };
  duration: number; // Duration in ticks (60 FPS)
  from: AnimationTarget & { value?: number };
  to: AnimationTarget & { value?: number };
  easing?: EasingType;
  onComplete?: (() => void) | undefined;
  onUpdate?: ((progress: number) => void) | undefined;
  delay?: number;
}

export interface Tween {
  id: string;
  config: TweenConfig;
  startTime: number;
  currentTime: number;
  isComplete: boolean;
  isActive: boolean;
}

export class TweenSystem {
  private static instance: TweenSystem | null = null;
  private tweens: Map<string, Tween> = new Map();
  private currentTick: number = 0;
  private nextId: number = 0;

  static getInstance(): TweenSystem {
    if (!TweenSystem.instance) {
      TweenSystem.instance = new TweenSystem();
    }
    return TweenSystem.instance;
  }

  // Create a new tween animation
  public createTween(config: TweenConfig): string {
    const id = `tween_${this.nextId++}`;
    
    const tween: Tween = {
      id,
      config,
      startTime: this.currentTick + (config.delay || 0),
      currentTime: this.currentTick,
      isComplete: false,
      isActive: false
    };

    this.tweens.set(id, tween);
    return id;
  }

  // Remove a tween by ID
  public removeTween(id: string): boolean {
    return this.tweens.delete(id);
  }

  // Stop all tweens for a specific target
  public stopTweensForTarget(target: THREE.Object3D | THREE.Material): void {
    const toRemove: string[] = [];
    
    this.tweens.forEach((tween, id) => {
      if (tween.config.target === target) {
        toRemove.push(id);
      }
    });
    
    toRemove.forEach(id => this.tweens.delete(id));
  }

  // Clear all tweens
  public clearAllTweens(): void {
    this.tweens.clear();
  }

  // Update all active tweens
  public tick(): void {
    this.currentTick++;

    const completedTweens: string[] = [];

    this.tweens.forEach((tween, id) => {
      // Check if tween should start
      if (!tween.isActive && this.currentTick >= tween.startTime) {
        tween.isActive = true;
      }

      if (tween.isActive && !tween.isComplete) {
        const elapsed = this.currentTick - tween.startTime;
        const progress = Math.min(elapsed / tween.config.duration, 1);
        const easedProgress = this.applyEasing(progress, tween.config.easing || EasingType.LINEAR);

        this.updateTweenTarget(tween, easedProgress);

        // Call update callback
        if (tween.config.onUpdate) {
          tween.config.onUpdate(easedProgress);
        }

        if (progress >= 1) {
          tween.isComplete = true;
          completedTweens.push(id);
          
          // Call completion callback
          if (tween.config.onComplete) {
            tween.config.onComplete();
          }
        }
      }
    });

    // Remove completed tweens
    completedTweens.forEach(id => this.tweens.delete(id));
  }

  // Apply easing function to progress
  private applyEasing(progress: number, easing: EasingType): number {
    switch (easing) {
      case EasingType.LINEAR:
        return progress;
        
      case EasingType.EASE_IN:
        return progress * progress;
        
      case EasingType.EASE_OUT:
        return 1 - Math.pow(1 - progress, 2);
        
      case EasingType.EASE_IN_OUT:
        return progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
          
      case EasingType.BOUNCE_OUT: {
        const n1 = 7.5625;
        const d1 = 2.75;
        
        if (progress < 1 / d1) {
          return n1 * progress * progress;
        } else if (progress < 2 / d1) {
          return n1 * (progress -= 1.5 / d1) * progress + 0.75;
        } else if (progress < 2.5 / d1) {
          return n1 * (progress -= 2.25 / d1) * progress + 0.9375;
        } else {
          return n1 * (progress -= 2.625 / d1) * progress + 0.984375;
        }
      }
        
      case EasingType.ELASTIC_OUT: {
        const c4 = (2 * Math.PI) / 3;
        return progress === 0
          ? 0
          : progress === 1
          ? 1
          : Math.pow(2, -10 * progress) * Math.sin((progress * 10 - 0.75) * c4) + 1;
      }
          
      default:
        return progress;
    }
  }

  // Update the target object based on tween progress
  private updateTweenTarget(tween: Tween, progress: number): void {
    const { target, from, to } = tween.config;

    // Handle Object3D properties
    if (target instanceof THREE.Object3D) {
      if (from.position && to.position) {
        target.position.lerpVectors(from.position, to.position, progress);
      }
      
      if (from.scale && to.scale) {
        target.scale.lerpVectors(from.scale, to.scale, progress);
      }
      
      if (from.rotation && to.rotation) {
        // Interpolate rotation
        target.rotation.x = this.lerp(from.rotation.x, to.rotation.x, progress);
        target.rotation.y = this.lerp(from.rotation.y, to.rotation.y, progress);
        target.rotation.z = this.lerp(from.rotation.z, to.rotation.z, progress);
      }
    }

    // Handle Material properties
    if (target instanceof THREE.Material) {
      if (from.opacity !== undefined && to.opacity !== undefined) {
        target.opacity = this.lerp(from.opacity, to.opacity, progress);
      }
      
      if (from.color && to.color && 'color' in target) {
        (target as THREE.Material & { color: THREE.Color }).color.lerpColors(from.color, to.color, progress);
      }
    }
  }

  // Linear interpolation helper
  private lerp(start: number, end: number, progress: number): number {
    return start + (end - start) * progress;
  }

  // Get active tween count (for debugging)
  public getActiveTweenCount(): number {
    return this.tweens.size;
  }

  // Get debug information
  public getDebugInfo(): string {
    const active = Array.from(this.tweens.values()).filter(t => t.isActive).length;
    return `Tweens: ${active}/${this.tweens.size} active`;
  }
}

// Helper functions for common animations
export class AnimationHelpers {
  private static tween = TweenSystem.getInstance();

  // Block fall animation
  static animateBlockFall(
    mesh: THREE.Mesh, 
    fromRow: number, 
    toRow: number, 
    tileSize: number,
    onComplete?: () => void
  ): string {
    const fromY = fromRow * tileSize - (384 / 2) + (tileSize / 2); // Board height / 2
    const toY = toRow * tileSize - (384 / 2) + (tileSize / 2);
    
    return this.tween.createTween({
      target: mesh,
      duration: 15, // 15 ticks for fall
      from: { position: new THREE.Vector3(mesh.position.x, fromY, mesh.position.z) },
      to: { position: new THREE.Vector3(mesh.position.x, toY, mesh.position.z) },
      easing: EasingType.EASE_IN,
      onComplete
    });
  }

  // Block swap animation
  static animateBlockSwap(
    mesh: THREE.Mesh,
    direction: 'left' | 'right',
    tileSize: number,
    onComplete?: () => void
  ): string {
    const offset = direction === 'left' ? -tileSize : tileSize;
    const fromPos = mesh.position.clone();
    const toPos = new THREE.Vector3(fromPos.x + offset, fromPos.y, fromPos.z);
    
    return this.tween.createTween({
      target: mesh,
      duration: 3, // 3 ticks for swap (matches original)
      from: { position: fromPos },
      to: { position: toPos },
      easing: EasingType.EASE_IN_OUT,
      onComplete
    });
  }

  // Block explosion animation
  static animateBlockExplosion(
    mesh: THREE.Mesh,
    material: THREE.Material,
    explosionTicks: number,
    onComplete?: () => void
  ): string {
    const fromScale = mesh.scale.clone();
    const toScale = new THREE.Vector3(fromScale.x * 1.5, fromScale.y * 1.5, fromScale.z);
    
    return this.tween.createTween({
      target: mesh,
      duration: explosionTicks,
      from: { 
        scale: fromScale,
        opacity: material.opacity
      },
      to: { 
        scale: toScale,
        opacity: 0
      },
      easing: EasingType.EASE_OUT,
      onComplete
    });
  }

  // Float bobbing animation (continuous)
  static animateFloatBobbing(mesh: THREE.Mesh): string {
    const baseY = mesh.position.y;
    const bobHeight = 2;
    
    // Create a continuous bobbing effect
    return this.tween.createTween({
      target: mesh,
      duration: 60, // 1 second cycle
      from: { position: new THREE.Vector3(mesh.position.x, baseY - bobHeight, mesh.position.z) },
      to: { position: new THREE.Vector3(mesh.position.x, baseY + bobHeight, mesh.position.z) },
      easing: EasingType.EASE_IN_OUT,
      onComplete: () => {
        // Restart the animation in reverse
        this.tween.createTween({
          target: mesh,
          duration: 60,
          from: { position: new THREE.Vector3(mesh.position.x, baseY + bobHeight, mesh.position.z) },
          to: { position: new THREE.Vector3(mesh.position.x, baseY - bobHeight, mesh.position.z) },
          easing: EasingType.EASE_IN_OUT,
          onComplete: () => AnimationHelpers.animateFloatBobbing(mesh)
        });
      }
    });
  }

  // Stack raise animation
  static animateStackRaise(
    meshes: THREE.Mesh[][],
    tileSize: number,
    onComplete?: () => void
  ): string {
    const duration = 32; // 32 steps as specified
    let completedMeshes = 0;
    const totalMeshes = meshes.flat().length;
    
    // Animate all blocks moving up by one tile
    meshes.forEach(row => {
      row.forEach(mesh => {
        const fromY = mesh.position.y;
        const toY = fromY + tileSize;
        
        this.tween.createTween({
          target: mesh,
          duration,
          from: { position: new THREE.Vector3(mesh.position.x, fromY, mesh.position.z) },
          to: { position: new THREE.Vector3(mesh.position.x, toY, mesh.position.z) },
          easing: EasingType.LINEAR,
          onComplete: () => {
            completedMeshes++;
            if (completedMeshes === totalMeshes && onComplete) {
              onComplete();
            }
          }
        });
      });
    });
    
    return 'stack_raise_animation';
  }

  // Cursor pulse animation
  static animateCursorPulse(mesh: THREE.Mesh, material: THREE.Material): string {
    return this.tween.createTween({
      target: material,
      duration: 30, // Half second pulse
      from: { opacity: 0.7 },
      to: { opacity: 1.0 },
      easing: EasingType.EASE_IN_OUT,
      onComplete: () => {
        // Pulse back down
        this.tween.createTween({
          target: material,
          duration: 30,
          from: { opacity: 1.0 },
          to: { opacity: 0.7 },
          easing: EasingType.EASE_IN_OUT,
          onComplete: () => AnimationHelpers.animateCursorPulse(mesh, material)
        });
      }
    });
  }
}