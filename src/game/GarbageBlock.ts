import { Block } from './Block';
import { BlockColor } from './BlockTypes';

export enum GarbageBlockType {
  NORMAL = 'normal',
  GRAY = 'gray'
}

export enum GarbageBlockState {
  NORMAL = 'normal',
  TRIGGERED = 'triggered',
  TRANSFORMING = 'transforming'
}

export class GarbageBlock {
  // Position and size (upper-left corner)
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  
  // State and type
  public type: GarbageBlockType;
  public state: GarbageBlockState;
  
  // Transformation properties
  public bufferRow: Block[] = [];
  public transformationTicks: number = 0;
  public transformationTimer: number = 0;
  public animationStart: number = 0;
  
  // Movement properties
  public falling: boolean = false;
  public initialFall: boolean = true;
  
  // Visual properties
  public explosionOrder: number = 0;
  
  constructor(x: number, y: number, width: number, height: number, type: GarbageBlockType = GarbageBlockType.NORMAL) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.state = GarbageBlockState.NORMAL;
    
    // Calculate transformation time based on size
    this.transformationTicks = this.calculateTransformationTime();
    
    // Fill buffer row with random blocks
    this.fillBufferRow();
  }
  
  // Calculate transformation time based on garbage block size
  private calculateTransformationTime(): number {
    const baseTime = 60; // Base transformation time
    const sizeMultiplier = this.width * this.height;
    return baseTime + (sizeMultiplier * 10);
  }
  
  // Fill buffer row with random blocks that will spawn after transformation
  private fillBufferRow(): void {
    this.bufferRow = [];
    
    for (let i = 0; i < this.width; i++) {
      // Generate random color, avoiding adjacent duplicates
      const excludeColors: BlockColor[] = [];
      if (i > 0) {
        excludeColors.push(this.bufferRow[i - 1].color);
      }
      
      const randomColor = Block.getRandomColor(excludeColors);
      const block = new Block(randomColor);
      this.bufferRow.push(block);
    }
  }
  
  // Trigger garbage block transformation
  public trigger(): void {
    if (this.state === GarbageBlockState.NORMAL) {
      this.state = GarbageBlockState.TRIGGERED;
      this.transformationTimer = 0;
      this.animationStart = 0; // Will be set by the board system
    }
  }
  
  // Update garbage block each tick
  public tick(): void {
    if (this.state === GarbageBlockState.TRIGGERED || this.state === GarbageBlockState.TRANSFORMING) {
      this.transformationTimer++;
      
      if (this.state === GarbageBlockState.TRIGGERED && this.transformationTimer >= 30) {
        // Start transformation after trigger delay
        this.state = GarbageBlockState.TRANSFORMING;
      }
    }
  }
  
  // Check if garbage block can fall
  public canFall(): boolean {
    return !this.falling && this.state === GarbageBlockState.NORMAL;
  }
  
  // Check if transformation is complete
  public isTransformationComplete(): boolean {
    return this.state === GarbageBlockState.TRANSFORMING && 
           this.transformationTimer >= this.transformationTicks;
  }
  
  // Check if garbage block should be removed
  public shouldRemove(): boolean {
    return this.isTransformationComplete();
  }
  
  // Get blocks that will be spawned after transformation
  public getTransformationBlocks(): Block[] {
    return [...this.bufferRow]; // Return copy of buffer row
  }
  
  // Get garbage block bounds for collision detection
  public getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }
  
  // Check if position is within this garbage block
  public containsPosition(x: number, y: number): boolean {
    return x >= this.x && x < this.x + this.width &&
           y >= this.y && y < this.y + this.height;
  }
  
  // Get transformation progress (0-1)
  public getTransformationProgress(): number {
    if (this.transformationTicks === 0) return 1;
    return Math.min(this.transformationTimer / this.transformationTicks, 1);
  }
  
  // Reset garbage block state
  public reset(): void {
    this.state = GarbageBlockState.NORMAL;
    this.transformationTimer = 0;
    this.animationStart = 0;
    this.falling = false;
    this.initialFall = true;
    this.explosionOrder = 0;
    this.fillBufferRow(); // Regenerate buffer row
  }
  
  // Clean up resources
  public dispose(): void {
    this.bufferRow.forEach(block => block.dispose());
    this.bufferRow = [];
  }
  
  // Get debug string representation
  public toString(): string {
    return `GarbageBlock(${this.x},${this.y} ${this.width}x${this.height} ${this.type} ${this.state})`;
  }
}