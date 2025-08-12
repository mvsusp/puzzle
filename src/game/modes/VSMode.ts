/**
 * VS Mode Implementation - Phase 11
 * 
 * Two-player competitive mode with garbage block sending.
 * Can be used for both VS AI and VS Human modes.
 */

import { GameMode } from '../../core/GameState';
import { BaseGameMode, GAME_MODE_CONFIGS, AIConfig } from '../GameModes';
import { Board } from '../Board';
import { GameController } from '../GameController';
import { GarbageBlock, GarbageBlockType } from '../GarbageBlock';

export enum VSPlayer {
  PLAYER1 = 'player1',
  PLAYER2 = 'player2'
}

/**
 * Garbage sending data structure
 */
export interface GarbageSendData {
  width: number;
  height: number;
  type: GarbageBlockType;
  sourcePlayer: VSPlayer;
  chainLength?: number;
  comboSize?: number;
}

export class VSMode extends BaseGameMode {
  protected player1Board: Board | null = null;
  protected player2Board: Board | null = null;
  protected isAIMode: boolean = false;
  protected aiConfig: AIConfig | null = null;
  protected garbageQueue: Map<VSPlayer, GarbageSendData[]> = new Map();
  protected matchWinner: VSPlayer | null = null;
  
  // AI state (when applicable)
  private aiDecisionTimer: number = 0;
  private aiLastAction: string = '';
  
  constructor(gameMode: GameMode.VS_AI | GameMode.VS_HUMAN) {
    super(GAME_MODE_CONFIGS[gameMode]);
    
    this.isAIMode = (gameMode === GameMode.VS_AI);
    if (this.isAIMode) {
      this.aiConfig = this.config.aiConfig || null;
    }
    
    // Initialize garbage queues
    this.garbageQueue.set(VSPlayer.PLAYER1, []);
    this.garbageQueue.set(VSPlayer.PLAYER2, []);
  }
  
  public getMode(): GameMode {
    return this.isAIMode ? GameMode.VS_AI : GameMode.VS_HUMAN;
  }
  
  /**
   * Initialize with both player boards
   */
  public initializeVS(player1Board: Board, player2Board: Board, gameController: unknown): void {
    this.player1Board = player1Board;
    this.player2Board = player2Board;
    this.board = player1Board; // Primary board reference
    this.gameController = gameController as GameController;
    
    // Set up garbage sending callbacks
    this.setupGarbageSending();
  }
  
  protected onStart(): void {
    console.log(`VSMode: Starting ${this.getMode()}`);
    
    if (!this.player1Board || !this.player2Board) {
      throw new Error('VSMode: Both player boards must be initialized before starting');
    }
    
    // Configure both boards for VS mode
    this.configureBoardForVS(this.player1Board, VSPlayer.PLAYER1);
    this.configureBoardForVS(this.player2Board, VSPlayer.PLAYER2);
    
    // Reset match state
    this.matchWinner = null;
    
    // Clear garbage queues
    this.garbageQueue.get(VSPlayer.PLAYER1)?.splice(0);
    this.garbageQueue.get(VSPlayer.PLAYER2)?.splice(0);
    
    // Initialize AI if needed
    if (this.isAIMode && this.aiConfig) {
      this.initializeAI();
    }
    
    console.log(`VSMode: Both boards configured for ${this.getMode()}`);
  }
  
  protected onStop(): void {
    console.log(`VSMode: Stopping ${this.getMode()}`);
    
    // Clear garbage queues
    this.garbageQueue.get(VSPlayer.PLAYER1)?.splice(0);
    this.garbageQueue.get(VSPlayer.PLAYER2)?.splice(0);
  }
  
  protected onUpdate(): void {
    if (!this.player1Board || !this.player2Board) return;
    
    // Process garbage queues
    this.processGarbageQueues();
    
    // Update AI if in AI mode
    if (this.isAIMode) {
      this.updateAI();
    }
    
    // Check for win conditions
    this.checkVSWinConditions();
  }
  
  /**
   * Configure a board for VS mode
   */
  private configureBoardForVS(board: Board, _player: VSPlayer): void {
    // Set initial stack raising speed
    board.setStackRaiseSpeed(this.config.initialStackRaiseSpeed);
    
    // Enable automatic stack raising
    board.setAutoRaise(true);
    
    // Enable garbage spawning for receiving blocks
    board.setGarbageSpawningEnabled(true);
  }
  
  /**
   * Set up garbage sending between boards
   */
  private setupGarbageSending(): void {
    if (!this.player1Board || !this.player2Board) return;
    
    // Set up callbacks for when chains/combos occur
    this.player1Board.onChainComplete = (chainLength: number, comboSize: number): void => {
      this.onPlayerChainComplete(VSPlayer.PLAYER1, chainLength, comboSize);
    };
    
    this.player2Board.onChainComplete = (chainLength: number, comboSize: number): void => {
      this.onPlayerChainComplete(VSPlayer.PLAYER2, chainLength, comboSize);
    };
  }
  
  /**
   * Handle chain completion and garbage sending
   */
  private onPlayerChainComplete(sourcePlayer: VSPlayer, chainLength: number, comboSize: number): void {
    // Calculate garbage to send based on chain length and combo size
    const garbageData = this.calculateGarbageToSend(chainLength, comboSize, sourcePlayer);
    
    if (garbageData) {
      // Add to opponent's garbage queue
      const targetPlayer = sourcePlayer === VSPlayer.PLAYER1 ? VSPlayer.PLAYER2 : VSPlayer.PLAYER1;
      this.queueGarbageForPlayer(targetPlayer, garbageData);
      
      console.log(`VSMode: ${sourcePlayer} sent garbage (${garbageData.width}x${garbageData.height}) to ${targetPlayer}`);
    }
  }
  
  /**
   * Calculate garbage blocks to send based on chain/combo
   */
  private calculateGarbageToSend(chainLength: number, comboSize: number, sourcePlayer: VSPlayer): GarbageSendData | null {
    // Only send garbage for chains of 2+ or combos of 4+
    if (chainLength < 2 && comboSize < 4) {
      return null;
    }
    
    const width = 6; // Default to full width
    let height = 1;
    let type = GarbageBlockType.NORMAL;
    
    // Calculate based on chain length
    if (chainLength >= 2) {
      height = Math.min(chainLength - 1, 6); // Chain 2 = 1 row, Chain 3 = 2 rows, etc.
    }
    
    // Add extra height for large combos
    if (comboSize >= 6) {
      height += Math.floor(comboSize / 6);
    }
    
    // Gray garbage for very large chains
    if (chainLength >= 6 || comboSize >= 10) {
      type = GarbageBlockType.GRAY;
    }
    
    return {
      width,
      height: Math.min(height, 8), // Cap at 8 rows
      type,
      sourcePlayer,
      chainLength,
      comboSize
    };
  }
  
  /**
   * Queue garbage for a specific player
   */
  private queueGarbageForPlayer(player: VSPlayer, garbageData: GarbageSendData): void {
    const queue = this.garbageQueue.get(player);
    if (queue) {
      queue.push(garbageData);
    }
  }
  
  /**
   * Process queued garbage for both players
   */
  private processGarbageQueues(): void {
    // Process Player 1's incoming garbage
    this.processPlayerGarbageQueue(VSPlayer.PLAYER1, this.player1Board);
    
    // Process Player 2's incoming garbage
    this.processPlayerGarbageQueue(VSPlayer.PLAYER2, this.player2Board);
  }
  
  /**
   * Process garbage queue for a specific player
   */
  private processPlayerGarbageQueue(player: VSPlayer, board: Board | null): void {
    if (!board) return;
    
    const queue = this.garbageQueue.get(player);
    if (!queue || queue.length === 0) return;
    
    // Process one garbage block per tick (to avoid overwhelming)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const garbageData = queue.shift()!;
    
    // Create and spawn the garbage block
    this.spawnGarbageOnBoard(board, garbageData);
  }
  
  /**
   * Spawn garbage block on a board
   */
  private spawnGarbageOnBoard(board: Board, garbageData: GarbageSendData): void {
    // Find a suitable spawn position
    const spawnRow = board.findGarbageSpawnRow(garbageData.height);
    if (spawnRow === -1) {
      console.warn('VSMode: Unable to spawn garbage - board full');
      return;
    }
    
    // Create garbage block
    const garbageBlock = new GarbageBlock(
      0, // x position (will be centered)
      spawnRow,
      garbageData.width,
      garbageData.height,
      garbageData.type
    );
    
    // Add to board
    board.addGarbageBlock(garbageBlock);
  }
  
  /**
   * Check VS mode win conditions
   */
  private checkVSWinConditions(): void {
    if (!this.player1Board || !this.player2Board || this.matchWinner) return;
    
    const player1GameOver = this.player1Board.isGameOver();
    const player2GameOver = this.player2Board.isGameOver();
    
    if (player1GameOver && player2GameOver) {
      // Double KO - determine winner by score or declare tie
      const p1Score = this.player1Board.getScore();
      const p2Score = this.player2Board.getScore();
      
      this.matchWinner = p1Score > p2Score ? VSPlayer.PLAYER1 : 
                        p2Score > p1Score ? VSPlayer.PLAYER2 : null;
    } else if (player1GameOver) {
      this.matchWinner = VSPlayer.PLAYER2;
    } else if (player2GameOver) {
      this.matchWinner = VSPlayer.PLAYER1;
    }
    
    if (this.matchWinner !== null) {
      this.handleMatchEnd();
    }
  }
  
  /**
   * Handle end of VS match
   */
  private handleMatchEnd(): void {
    console.log(`VSMode: Match ended, winner: ${this.matchWinner || 'TIE'}`);
    
    // Stop the game mode
    this.stop();
    
    // Notify game controller
    if (this.gameController) {
      this.gameController.onGameModeEnded({
        mode: this.getMode(),
        winner: this.matchWinner,
        player1Score: this.player1Board?.getScore() || 0,
        player2Score: this.player2Board?.getScore() || 0,
        elapsedTime: Date.now() - this.startTime
      });
    }
  }
  
  /**
   * Initialize AI system (placeholder for Phase 12)
   */
  private initializeAI(): void {
    if (!this.aiConfig) return;
    
    this.aiDecisionTimer = 0;
    this.aiLastAction = '';
    
    console.log(`VSMode: AI initialized with ${this.aiConfig.difficulty} difficulty`);
  }
  
  /**
   * Update AI system (placeholder for Phase 12)
   */
  private updateAI(): void {
    if (!this.aiConfig || !this.player2Board) return;
    
    this.aiDecisionTimer++;
    
    // Make AI decision based on delay
    if (this.aiDecisionTimer >= this.aiConfig.decisionDelay) {
      this.makeAIDecision();
      this.aiDecisionTimer = 0;
    }
  }
  
  /**
   * Make AI decision (placeholder implementation)
   */
  private makeAIDecision(): void {
    // TODO: Implement actual AI logic in Phase 12
    // For now, make random moves
    const actions = ['left', 'right', 'up', 'down', 'swap'];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    
    this.aiLastAction = randomAction;
    // TODO: Execute AI action on player2 board
  }
  
  /**
   * Get VS mode statistics
   */
  public getVSStats(): VSModeStats {
    return {
      mode: this.getMode(),
      elapsedTime: Date.now() - this.startTime,
      player1Score: this.player1Board?.getScore() || 0,
      player2Score: this.player2Board?.getScore() || 0,
      isActive: this.gameStarted,
      matchWinner: this.matchWinner,
      garbageQueueSizes: {
        player1: this.garbageQueue.get(VSPlayer.PLAYER1)?.length || 0,
        player2: this.garbageQueue.get(VSPlayer.PLAYER2)?.length || 0
      }
    };
  }
}

/**
 * VS Mode statistics interface
 */
export interface VSModeStats {
  mode: GameMode;
  elapsedTime: number;
  player1Score: number;
  player2Score: number;
  isActive: boolean;
  matchWinner: VSPlayer | null;
  garbageQueueSizes: {
    player1: number;
    player2: number;
  };
}

/**
 * Game over data for VS mode
 */
export interface VSModeGameOverData {
  mode: GameMode;
  winner: VSPlayer | null;
  player1Score: number;
  player2Score: number;
  elapsedTime: number;
}