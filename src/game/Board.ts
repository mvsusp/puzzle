import { Block } from './Block';
import { GarbageBlock, GarbageBlockType } from './GarbageBlock';
import { BlockColor, BoardState, TileType } from './BlockTypes';

export interface Tile {
  type: TileType;
  block: Block | null;
  garbageRef: GarbageBlock | null;
  chain: boolean;
}

export interface GarbageSpawn {
  fullWidth: boolean;
  type: GarbageBlockType;
  size: number;
  spawnTimer: number;
}

export class Board {
  // Constants from original game
  public static readonly BOARD_WIDTH = 6;
  public static readonly BOARD_HEIGHT = 24;
  public static readonly TOP_ROW = 11; // Visible top row (rows 12-23 are hidden)
  public static readonly PANIC_HEIGHT = 9;
  public static readonly WARN_HEIGHT = 10;
  public static readonly FLOAT_TICKS = 12;
  public static readonly STACK_RAISE_STEPS = 32;
  public static readonly BASE_EXPLOSION_TICKS = 61;
  public static readonly ADD_EXPLOSION_TICKS = 9;
  public static readonly SWAP_DELAY = 3;
  public static readonly COUNTDOWN_TICKS = 188;
  
  // Core grid data
  private tiles: Tile[][];
  private bufferRow: Tile[];
  private garbageBlocks: GarbageBlock[] = [];
  private garbageQueue: GarbageSpawn[] = [];
  
  // Game state
  public state: BoardState;
  public ticksRun: number = 0;
  
  // Cursor position
  public cursorX: number = 2;
  public cursorY: number = 5;
  
  // Stack management
  public stackOffset: number = 0; // Pixel offset for smooth stack raising
  public stackRaiseTicks: number = 300; // Ticks between automatic raises (5 seconds at 60 FPS)
  public stackRaiseTimer: number = 0;
  public stackRaiseForced: boolean = false;
  
  // Game mechanics state
  public graceTimer: number = 180; // Prevents stack raising during active play (3 seconds initial grace)
  public activeBlocks: boolean = false; // True if blocks are falling/matching
  public chainCounter: number = 1;
  public lastChain: number = 0;
  public score: number = 0;
  public panic: boolean = false;
  
  // Per-tick state tracking
  public tickMatched: number = 0; // Blocks matched this tick
  public tickChain: boolean = false; // Chain occurred this tick
  public tickChainEnd: boolean = false; // Chain ended this tick
  public tickMatchRow: number = -1;
  public tickMatchCol: number = -1;
  
  // Visual state
  public warnColumns: boolean[] = new Array(Board.BOARD_WIDTH).fill(false);
  public blockOnTopRow: boolean = false;
  
  // Countdown state
  public countdownState: number = 3; // 3, 2, 1, 0 (GO)
  
  constructor() {
    // Initialize tile grid
    this.tiles = Array(Board.BOARD_HEIGHT).fill(null).map(() =>
      Array(Board.BOARD_WIDTH).fill(null).map(() => this.createEmptyTile())
    );
    
    // Initialize buffer row
    this.bufferRow = Array(Board.BOARD_WIDTH).fill(null).map(() => this.createEmptyTile());
    
    this.state = BoardState.COUNTDOWN;
    this.initializeBoard();
  }
  
  // Create empty tile
  private createEmptyTile(): Tile {
    return {
      type: TileType.AIR,
      block: null,
      garbageRef: null,
      chain: false
    };
  }
  
  // Initialize board with random blocks
  private initializeBoard(): void {
    // Fill bottom 6 rows with random blocks (avoiding 3-in-a-row matches)
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < Board.BOARD_WIDTH; col++) {
        const excludeColors: BlockColor[] = [];
        
        // Avoid horizontal matches
        if (col >= 2) {
          const leftBlock1 = this.tiles[row][col - 1].block;
          const leftBlock2 = this.tiles[row][col - 2].block;
          if (leftBlock1 && leftBlock2 && leftBlock1.color === leftBlock2.color) {
            excludeColors.push(leftBlock1.color);
          }
        }
        
        // Avoid vertical matches
        if (row >= 2) {
          const belowBlock1 = this.tiles[row - 1][col].block;
          const belowBlock2 = this.tiles[row - 2][col].block;
          if (belowBlock1 && belowBlock2 && belowBlock1.color === belowBlock2.color) {
            excludeColors.push(belowBlock1.color);
          }
        }
        
        const randomColor = Block.getRandomColor(excludeColors);
        const block = new Block(randomColor);
        
        this.tiles[row][col] = {
          type: TileType.BLOCK,
          block: block,
          garbageRef: null,
          chain: false
        };
      }
    }
    
    // Fill buffer row
    this.fillBufferRow();
  }
  
  // Fill buffer row with random blocks
  private fillBufferRow(): void {
    for (let col = 0; col < Board.BOARD_WIDTH; col++) {
      const excludeColors: BlockColor[] = [];
      
      // Avoid matching with top row
      const topRowBlock = this.tiles[0][col].block;
      if (topRowBlock) {
        excludeColors.push(topRowBlock.color);
      }
      
      // Avoid horizontal matches in buffer row
      if (col > 0) {
        const leftBlock = this.bufferRow[col - 1].block;
        if (leftBlock) {
          excludeColors.push(leftBlock.color);
        }
      }
      
      const randomColor = Block.getRandomColor(excludeColors);
      const block = new Block(randomColor);
      
      this.bufferRow[col] = {
        type: TileType.BLOCK,
        block: block,
        garbageRef: null,
        chain: false
      };
    }
  }
  
  // Main game tick
  public tick(): void {
    this.ticksRun++;
    this.initTick();
    
    // Handle different board states
    switch (this.state) {
      case BoardState.COUNTDOWN:
        this.handleCountdown();
        break;
      case BoardState.RUNNING:
        this.handleGameplay();
        break;
      case BoardState.WON:
      case BoardState.GAME_OVER:
        // Game over states don't update
        break;
    }
  }
  
  // Initialize per-tick state
  private initTick(): void {
    this.tickMatched = 0;
    this.tickChain = false;
    this.tickChainEnd = false;
    this.tickMatchRow = -1;
    this.tickMatchCol = -1;
    
    // Update all blocks
    for (let row = 0; row < Board.BOARD_HEIGHT; row++) {
      for (let col = 0; col < Board.BOARD_WIDTH; col++) {
        const tile = this.tiles[row][col];
        if (tile.block) {
          tile.block.tick();
        }
      }
    }
    
    // Update buffer row
    for (const tile of this.bufferRow) {
      if (tile.block) {
        tile.block.tick();
      }
    }
    
    // Update garbage blocks
    this.garbageBlocks.forEach(garbage => garbage.tick());
  }
  
  // Handle countdown state
  private handleCountdown(): void {
    // Simple countdown implementation - will be enhanced in later phases
    if (this.ticksRun >= Board.COUNTDOWN_TICKS) {
      this.state = BoardState.RUNNING;
      this.countdownState = 0; // GO!
    } else {
      // Update countdown display
      const remaining = Board.COUNTDOWN_TICKS - this.ticksRun;
      if (remaining > Board.COUNTDOWN_TICKS * 0.75) {
        this.countdownState = 3;
      } else if (remaining > Board.COUNTDOWN_TICKS * 0.5) {
        this.countdownState = 2;
      } else if (remaining > Board.COUNTDOWN_TICKS * 0.25) {
        this.countdownState = 1;
      } else {
        this.countdownState = 0;
      }
    }
  }
  
  // Handle main gameplay
  private handleGameplay(): void {
    // Check for blocks on top row (game over condition)
    this.checkGameOver();
    
    // Update panic state
    this.updatePanicState();
    
    // Handle stack raising
    this.handleStackRaising();
    
    // Game mechanics will be implemented in Phase 4
    // For now, just update visual state
    this.updateVisualState();
  }
  
  // Check for game over condition
  private checkGameOver(): void {
    this.blockOnTopRow = false;
    
    for (let col = 0; col < Board.BOARD_WIDTH; col++) {
      const topTile = this.tiles[Board.TOP_ROW][col];
      if (topTile.type === TileType.BLOCK && topTile.block?.isStable()) {
        this.blockOnTopRow = true;
        break;
      }
    }
    
    if (this.blockOnTopRow && this.graceTimer <= 0) {
      this.state = BoardState.GAME_OVER;
    }
  }
  
  // Update panic state
  private updatePanicState(): void {
    let maxHeight = 0;
    
    for (let col = 0; col < Board.BOARD_WIDTH; col++) {
      for (let row = Board.BOARD_HEIGHT - 1; row >= 0; row--) {
        if (this.tiles[row][col].type === TileType.BLOCK) {
          maxHeight = Math.max(maxHeight, row + 1);
          break;
        }
      }
    }
    
    this.panic = maxHeight >= Board.PANIC_HEIGHT;
    
    // Update warning columns
    for (let col = 0; col < Board.BOARD_WIDTH; col++) {
      this.warnColumns[col] = this.tiles[Board.WARN_HEIGHT][col].type === TileType.BLOCK;
    }
  }
  
  // Handle automatic stack raising
  private handleStackRaising(): void {
    if (this.stackRaiseForced || (this.stackRaiseTimer <= 0 && this.graceTimer <= 0)) {
      this.raiseStack();
      this.stackRaiseTimer = this.stackRaiseTicks;
      this.stackRaiseForced = false;
    } else if (this.stackRaiseTimer > 0) {
      this.stackRaiseTimer--;
    }
    
    if (this.graceTimer > 0) {
      this.graceTimer--;
    }
  }
  
  // Raise the stack by one row
  public raiseStack(): void {
    // Move all tiles up one row
    for (let row = Board.BOARD_HEIGHT - 1; row > 0; row--) {
      for (let col = 0; col < Board.BOARD_WIDTH; col++) {
        this.tiles[row][col] = this.tiles[row - 1][col];
      }
    }
    
    // Move buffer row to bottom
    for (let col = 0; col < Board.BOARD_WIDTH; col++) {
      this.tiles[0][col] = this.bufferRow[col];
    }
    
    // Generate new buffer row
    this.fillBufferRow();
    
    // Reset stack offset for animation (will be used in Phase 6)
    this.stackOffset = 0;
  }
  
  // Force immediate stack raise
  public inputForceStackRaise(): void {
    this.stackRaiseForced = true;
  }
  
  // Update visual state
  private updateVisualState(): void {
    // Calculate active blocks
    this.activeBlocks = false;
    
    for (let row = 0; row < Board.BOARD_HEIGHT; row++) {
      for (let col = 0; col < Board.BOARD_WIDTH; col++) {
        const tile = this.tiles[row][col];
        if (tile.block && tile.block.isAnimating()) {
          this.activeBlocks = true;
          return;
        }
      }
    }
  }
  
  // Queue garbage block for spawning
  public queueGarbage(fullWidth: boolean, size: number, type: GarbageBlockType = GarbageBlockType.NORMAL): void {
    const spawn: GarbageSpawn = {
      fullWidth,
      type,
      size,
      spawnTimer: 80 // Spawn delay
    };
    this.garbageQueue.push(spawn);
  }
  
  // Get tile at position (safe access)
  public getTile(row: number, col: number): Tile | null {
    if (row < 0 || row >= Board.BOARD_HEIGHT || col < 0 || col >= Board.BOARD_WIDTH) {
      return null;
    }
    return this.tiles[row][col];
  }
  
  // Get buffer row tile (safe access)
  public getBufferRowTile(col: number): Tile | null {
    if (col < 0 || col >= Board.BOARD_WIDTH) {
      return null;
    }
    return this.bufferRow[col];
  }
  
  // Reset board to initial state
  public reset(): Board {
    // Clean up existing blocks
    for (let row = 0; row < Board.BOARD_HEIGHT; row++) {
      for (let col = 0; col < Board.BOARD_WIDTH; col++) {
        const tile = this.tiles[row][col];
        if (tile.block) {
          tile.block.dispose();
        }
      }
    }
    
    // Clean up buffer row
    for (const tile of this.bufferRow) {
      if (tile.block) {
        tile.block.dispose();
      }
    }
    
    // Clean up garbage blocks
    this.garbageBlocks.forEach(garbage => garbage.dispose());
    
    // Create new board with same setup
    return new Board();
  }
  
  // Check if board has any active (animating) blocks
  public hasActiveBlocks(): boolean {
    return this.activeBlocks;
  }
  
  // Get current score
  public getScore(): number {
    return this.score;
  }
  
  // Get chain counter
  public getChainCounter(): number {
    return this.chainCounter;
  }
  
  // Check if in panic mode
  public isPanic(): boolean {
    return this.panic;
  }
  
  // Get warning column state
  public getWarnColumn(col: number): boolean {
    return col >= 0 && col < Board.BOARD_WIDTH ? this.warnColumns[col] : false;
  }
  
  // Advance countdown state (for external control)
  public advanceCountdownState(): void {
    if (this.state === BoardState.COUNTDOWN) {
      this.countdownState = Math.max(0, this.countdownState - 1);
      if (this.countdownState === 0) {
        this.state = BoardState.RUNNING;
      }
    }
  }
  
  // Win the game
  public win(): void {
    this.state = BoardState.WON;
  }
  
  // Get debug information
  public getDebugInfo(): string {
    return `Board: ${this.state}, Ticks: ${this.ticksRun}, Score: ${this.score}, Chain: ${this.chainCounter}`;
  }
}