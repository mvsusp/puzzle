import * as THREE from 'three';
import { BlockState, BlockColor } from './BlockTypes';

export class Block {
  // Core properties
  public state: BlockState;
  public color: BlockColor;
  
  // Visual properties
  public mesh: THREE.Mesh | null = null;
  
  // Animation and timing properties
  public falling: boolean = false; // Prevents matching while falling
  public floatTimer: number = 0; // Float duration after swap (12 ticks)
  public swapTimer: number = 0; // Swap delay and animation timer (3 ticks)
  public garbageFallChain: boolean = false; // Falling from garbage transformation
  public explosionOrder: number = 0; // Sound effect ordering
  
  // Explosion timing properties
  public explosionTicks: number = 0; // Total explosion duration
  public explosionAnimationTicks: number = 0; // Animation duration
  public explosionTimer: number = 0; // Current explosion progress
  
  constructor(color: BlockColor) {
    this.state = BlockState.NORMAL;
    this.color = color;
  }
  
  // Static method to get random color (avoiding certain colors if needed)
  public static getRandomColor(excludeColors: BlockColor[] = []): BlockColor {
    const availableColors = [];
    
    for (let color = 0; color < Object.keys(BlockColor).length / 2; color++) {
      if (!excludeColors.includes(color)) {
        availableColors.push(color);
      }
    }
    
    if (availableColors.length === 0) {
      // Fallback to any color if all are excluded
      return Math.floor(Math.random() * (Object.keys(BlockColor).length / 2));
    }
    
    return availableColors[Math.floor(Math.random() * availableColors.length)];
  }
  
  // Update block state each tick
  public tick(): void {
    // Handle float timer
    if (this.state === BlockState.FLOATING && this.floatTimer > 0) {
      this.floatTimer--;
      if (this.floatTimer <= 0) {
        this.state = BlockState.NORMAL;
      }
    }
    
    // Handle swap timer
    if ((this.state === BlockState.SWAPPING_LEFT || this.state === BlockState.SWAPPING_RIGHT) && this.swapTimer > 0) {
      this.swapTimer--;
      if (this.swapTimer <= 0) {
        this.state = BlockState.FLOATING;
        this.floatTimer = 12; // Float for 12 ticks after swap
      }
    }
    
    // Handle explosion timer
    if (this.state === BlockState.EXPLODING && this.explosionTimer < this.explosionTicks) {
      this.explosionTimer++;
    }
  }
  
  // Start floating state (after swap)
  public startFloat(): void {
    this.state = BlockState.FLOATING;
    this.floatTimer = 12;
  }
  
  // Start swap animation
  public startSwap(direction: 'left' | 'right'): void {
    this.state = direction === 'left' ? BlockState.SWAPPING_LEFT : BlockState.SWAPPING_RIGHT;
    this.swapTimer = 3; // 3 tick swap delay
  }
  
  // Mark block for matching
  public markMatched(): void {
    this.state = BlockState.MATCHED;
  }
  
  // Start explosion sequence
  public startExplosion(explosionTicks: number = 61): void {
    this.state = BlockState.EXPLODING;
    this.explosionTicks = explosionTicks;
    this.explosionAnimationTicks = explosionTicks;
    this.explosionTimer = 0;
  }
  
  // Check if block can be matched (only NORMAL state blocks)
  public canMatch(): boolean {
    return this.state === BlockState.NORMAL && !this.falling;
  }
  
  // Check if block is in a stable state
  public isStable(): boolean {
    return this.state === BlockState.NORMAL && !this.falling;
  }
  
  // Check if block is animating
  public isAnimating(): boolean {
    return this.state === BlockState.SWAPPING_LEFT || 
           this.state === BlockState.SWAPPING_RIGHT ||
           this.state === BlockState.FLOATING ||
           this.state === BlockState.EXPLODING;
  }
  
  // Reset block to initial state
  public reset(): void {
    this.state = BlockState.NORMAL;
    this.falling = false;
    this.floatTimer = 0;
    this.swapTimer = 0;
    this.garbageFallChain = false;
    this.explosionOrder = 0;
    this.explosionTicks = 0;
    this.explosionAnimationTicks = 0;
    this.explosionTimer = 0;
  }
  
  // Clean up resources
  public dispose(): void {
    if (this.mesh) {
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
      if (this.mesh.material instanceof THREE.Material) {
        this.mesh.material.dispose();
      }
      this.mesh = null;
    }
  }
  
  // Get debug string representation
  public toString(): string {
    return `Block(${BlockColor[this.color]}, ${this.state})`;
  }
}