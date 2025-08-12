/**
 * Game Mode Manager - Phase 11
 * 
 * Central coordinator for all game modes. Handles mode switching,
 * initialization, and cleanup.
 */

import { GameMode } from '../core/GameState';
import { Board } from './Board';
import { GameController } from './GameController';
import { BaseGameMode } from './GameModes';
import { EndlessMode } from './modes/EndlessMode';
import { VSMode } from './modes/VSMode';
import { DemoMode } from './modes/DemoMode';

export class GameModeManager {
  private static instance: GameModeManager | null = null;
  
  private currentMode: BaseGameMode | null = null;
  private board: Board | null = null;
  private gameController: GameController | null = null;
  private idleTickCounter: number = 0;
  
  // VS Mode specific
  private player1Board: Board | null = null;
  private player2Board: Board | null = null;
  
  private constructor() {}
  
  public static getInstance(): GameModeManager {
    if (!GameModeManager.instance) {
      GameModeManager.instance = new GameModeManager();
    }
    return GameModeManager.instance;
  }
  
  /**
   * Reset singleton instance (FOR TESTING ONLY)
   */
  public static resetInstance(): void {
    GameModeManager.instance = null;
  }
  
  /**
   * Initialize the game mode manager
   */
  public initialize(board: Board, gameController: GameController): void {
    this.board = board;
    this.gameController = gameController;
    this.idleTickCounter = 0;
    
    console.log('GameModeManager: Initialized');
  }
  
  /**
   * Start a specific game mode
   */
  public startMode(gameMode: GameMode): void {
    // Stop current mode if active
    if (this.currentMode) {
      this.stopCurrentMode();
    }
    
    console.log(`GameModeManager: Starting ${gameMode}`);
    
    // Create and initialize new mode
    this.currentMode = this.createModeInstance(gameMode);
    
    if (!this.currentMode) {
      console.error(`GameModeManager: Failed to create mode ${gameMode}`);
      return;
    }
    
    // Initialize the mode with appropriate boards
    if (this.isVSMode(gameMode)) {
      this.initializeVSMode(gameMode);
    } else {
      this.initializeSinglePlayerMode();
    }
    
    // Start the mode
    this.currentMode.start();
    this.idleTickCounter = 0;
  }
  
  /**
   * Stop the current game mode
   */
  public stopCurrentMode(): void {
    if (this.currentMode) {
      console.log(`GameModeManager: Stopping ${this.currentMode.getMode()}`);
      this.currentMode.stop();
      this.currentMode = null;
    }
    
    this.idleTickCounter = 0;
  }
  
  /**
   * Update the current game mode (called each tick)
   */
  public update(): void {
    if (this.currentMode) {
      this.currentMode.update();
    }
    
    // Track idle time for demo mode
    this.updateIdleTracking();
  }
  
  /**
   * Handle user input (resets idle counter)
   */
  public onUserInput(): void {
    this.idleTickCounter = 0;
    
    // If in demo mode, notify it of user input
    if (this.currentMode instanceof DemoMode) {
      this.currentMode.resetIdleTimer();
    }
  }
  
  /**
   * Get current game mode
   */
  public getCurrentMode(): BaseGameMode | null {
    return this.currentMode;
  }
  
  /**
   * Get current game mode type
   */
  public getCurrentModeType(): GameMode | null {
    return this.currentMode?.getMode() || null;
  }
  
  /**
   * Check if currently in a specific mode
   */
  public isInMode(gameMode: GameMode): boolean {
    return this.currentMode?.getMode() === gameMode;
  }
  
  /**
   * Create mode instance based on game mode type
   */
  private createModeInstance(gameMode: GameMode): BaseGameMode | null {
    switch (gameMode) {
      case GameMode.ENDLESS:
        return new EndlessMode();
        
      case GameMode.VS_AI:
        return new VSMode(GameMode.VS_AI);
        
      case GameMode.VS_HUMAN:
        return new VSMode(GameMode.VS_HUMAN);
        
      case GameMode.DEMO:
        return new DemoMode();
        
      default:
        console.error(`GameModeManager: Unknown game mode ${gameMode}`);
        return null;
    }
  }
  
  /**
   * Initialize VS mode with dual boards
   */
  private initializeVSMode(_gameMode: GameMode): void {
    if (!this.gameController) {
      throw new Error('GameModeManager: GameController required for VS mode');
    }
    
    // Create second board for VS mode if not exists
    if (!this.player2Board) {
      this.player2Board = new Board();
      // TODO: Position player 2 board appropriately in scene
    }
    
    this.player1Board = this.board;
    
    // Initialize VS mode with both boards
    const vsMode = this.currentMode as VSMode;
    if (vsMode && this.player1Board && this.player2Board) {
      vsMode.initializeVS(this.player1Board, this.player2Board, this.gameController);
    }
  }
  
  /**
   * Initialize single player mode
   */
  private initializeSinglePlayerMode(): void {
    if (!this.board || !this.gameController || !this.currentMode) {
      throw new Error('GameModeManager: Board and GameController required');
    }
    
    this.currentMode.initialize(this.board, this.gameController);
  }
  
  /**
   * Check if game mode is a VS mode
   */
  private isVSMode(gameMode: GameMode): boolean {
    return gameMode === GameMode.VS_AI || gameMode === GameMode.VS_HUMAN;
  }
  
  /**
   * Update idle tracking for demo mode
   */
  private updateIdleTracking(): void {
    if (this.currentMode instanceof DemoMode) {
      // Don't track idle time while in demo mode
      return;
    }
    
    this.idleTickCounter++;
    
    // Check if we should start demo mode
    if (this.shouldStartDemoMode()) {
      console.log('GameModeManager: Idle timeout reached, starting demo mode');
      this.startMode(GameMode.DEMO);
    }
  }
  
  /**
   * Check if demo mode should start due to idle timeout
   */
  private shouldStartDemoMode(): boolean {
    // Only start demo if not currently in a game
    if (this.currentMode && this.currentMode.getMode() !== GameMode.ENDLESS) {
      return false;
    }
    
    // Check idle timeout (600 ticks = 10 seconds)
    const demoMode = new DemoMode();
    return demoMode.checkIdleTimeout(this.idleTickCounter);
  }
  
  /**
   * Set up dual board rendering for VS modes
   */
  public setupDualBoardRendering(_sceneManager: unknown): void {
    if (!this.isVSMode(this.getCurrentModeType() || GameMode.ENDLESS)) {
      return;
    }
    
    // TODO: Configure scene manager for dual board rendering
    // This would involve positioning two boards side by side
    // and updating the camera to show both
    
    console.log('GameModeManager: Setting up dual board rendering');
  }
  
  /**
   * Get statistics for current game mode
   */
  public getCurrentModeStats(): unknown {
    if (!this.currentMode) return null;
    
    return this.currentMode.getStats();
  }
  
  /**
   * Check if any game mode is currently active
   */
  public isAnyModeActive(): boolean {
    return this.currentMode !== null;
  }
  
  /**
   * Force end current game (for game over scenarios)
   */
  public forceEndCurrentGame(): void {
    if (this.currentMode) {
      console.log('GameModeManager: Force ending current game');
      this.stopCurrentMode();
    }
  }
  
  /**
   * Get idle tick counter
   */
  public getIdleTickCounter(): number {
    return this.idleTickCounter;
  }
  
  /**
   * Reset idle counter manually
   */
  public resetIdleCounter(): void {
    this.idleTickCounter = 0;
  }
}