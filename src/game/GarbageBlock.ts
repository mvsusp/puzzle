import { Block } from './Block';
import { BlockColor, TileType, BlockState } from './BlockTypes';

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
  
  // Trigger garbage block transformation (with support for multiple triggers for gray blocks)
  public trigger(): boolean {
    if (this.state === GarbageBlockState.TRANSFORMING) {
      return false; // Already transforming
    }
    
    // For normal garbage, trigger immediately
    if (this.type === GarbageBlockType.NORMAL) {
      if (this.state === GarbageBlockState.NORMAL) {
        this.state = GarbageBlockState.TRIGGERED;
        this.transformationTimer = 0;
        this.animationStart = 0;
        return true;
      }
    }
    
    // For gray garbage, multiple triggers might be needed
    // This implementation treats gray blocks the same as normal for now
    // Could be enhanced to require multiple adjacent matches
    if (this.type === GarbageBlockType.GRAY) {
      if (this.state === GarbageBlockState.NORMAL) {
        this.state = GarbageBlockState.TRIGGERED;
        this.transformationTimer = 0;
        this.animationStart = 0;
        return true;
      }
    }
    
    return false;
  }
  
  // Check if garbage block is adjacent to a match and should be triggered
  public checkForTrigger(getTile: (row: number, col: number) => unknown): boolean {
    // Check all adjacent positions for matched blocks
    const positions = [
      { row: this.y - 1, col: this.x }, // Above
      { row: this.y + this.height, col: this.x }, // Below
      { row: this.y, col: this.x - 1 }, // Left
      { row: this.y, col: this.x + this.width } // Right
    ];
    
    for (const pos of positions) {
      const tile = getTile(pos.row, pos.col);
      if (tile && typeof tile === 'object' && 'type' in tile && 'block' in tile) {
        const typedTile = tile as { type: TileType; block: Block | null };
        if (typedTile.type === TileType.BLOCK && typedTile.block?.state === BlockState.MATCHED) {
          return true;
        }
      }
    }
    
    return false;
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
  
  // Check if garbage block can fall (enhanced for multi-tile blocks)
  public canFall(getTile: (row: number, col: number) => unknown): boolean {
    if (this.falling || this.state !== GarbageBlockState.NORMAL) {
      return false;
    }
    
    // Check if at bottom row
    if (this.y === 0) return false;
    
    // Check if any part of the bottom edge has support
    for (let col = this.x; col < this.x + this.width; col++) {
      const tileBelow = getTile(this.y - 1, col);
      if (tileBelow && typeof tileBelow === 'object' && 'type' in tileBelow) {
        const typedTile = tileBelow as { type: TileType };
        if (typedTile.type !== TileType.AIR) {
          return false; // Has support, can't fall
        }
      }
    }
    
    return true; // No support found, can fall
  }
  
  // Start falling
  public startFall(): void {
    this.falling = true;
  }
  
  // Stop falling
  public stopFall(): void {
    this.falling = false;
  }
  
  // Move garbage block down one row
  public fall(): void {
    if (this.y > 0) {
      this.y--;
    }
    this.initialFall = false;
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

// Garbage spawn queue data structure
export interface GarbageSpawnData {
  fullWidth: boolean;     // Whether to spawn full-width (6-wide) garbage
  type: GarbageBlockType; // Normal or gray garbage
  size: number;           // Width for non-full-width garbage (2-6)
  height: number;         // Height of the garbage block
  spawnTimer: number;     // Ticks until spawn
}

// Utility class for managing garbage spawn queue
export class GarbageQueue {
  private queue: GarbageSpawnData[] = [];
  
  // Add garbage to spawn queue
  public addGarbage(data: GarbageSpawnData): void {
    this.queue.push(data);
  }
  
  // Get next garbage to spawn (if ready)
  public getNextSpawn(): GarbageSpawnData | null {
    if (this.queue.length === 0) return null;
    
    // Decrement spawn timers
    for (const item of this.queue) {
      item.spawnTimer--;
    }
    
    // Find first item ready to spawn
    const readyIndex = this.queue.findIndex(item => item.spawnTimer <= 0);
    if (readyIndex >= 0) {
      return this.queue.splice(readyIndex, 1)[0];
    }
    
    return null;
  }
  
  // Update queue timers each tick
  public tick(): void {
    for (const item of this.queue) {
      if (item.spawnTimer > 0) {
        item.spawnTimer--;
      }
    }
  }
  
  // Clear all queued garbage
  public clear(): void {
    this.queue = [];
  }
  
  // Get queue length
  public getQueueLength(): number {
    return this.queue.length;
  }
  
  // Check if queue has items ready to spawn
  public hasReadySpawns(): boolean {
    return this.queue.some(item => item.spawnTimer <= 0);
  }
  
  // Get debug information
  public getDebugInfo(): string {
    if (this.queue.length === 0) return 'GarbageQueue: empty';
    
    const nextSpawn = this.queue[0];
    return `GarbageQueue: ${this.queue.length} items, next in ${nextSpawn?.spawnTimer || 0} ticks`;
  }
}