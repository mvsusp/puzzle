/**
 * Endless Mode Implementation - Phase 11
 * 
 * Single-player survival mode with progressive speed increase and score tracking.
 * Players continue until their board tops out.
 */

import { GameMode } from '../../core/GameState';
import { BaseGameMode, GAME_MODE_CONFIGS } from '../GameModes';

export class EndlessMode extends BaseGameMode {
  private scoreThresholds: number[] = [10000, 25000, 50000, 100000, 200000];
  private currentThresholdIndex: number = 0;
  private highScore: number = 0;
  
  constructor() {
    super(GAME_MODE_CONFIGS[GameMode.ENDLESS]);
    this.loadHighScore();
  }
  
  public getMode(): GameMode {
    return GameMode.ENDLESS;
  }
  
  protected onStart(): void {
    console.log('EndlessMode: Starting Endless Mode');
    
    // Reset progression tracking
    this.currentThresholdIndex = 0;
    
    // Initialize board for endless mode
    if (this.board) {
      // Set initial stack raising speed
      this.board.setStackRaiseSpeed(this.config.initialStackRaiseSpeed);
      
      // Enable automatic stack raising
      this.board.setAutoRaise(true);
      
      // Disable garbage spawning (endless mode is single player)
      this.board.setGarbageSpawningEnabled(false);
    }
    
    console.log(`EndlessMode: Started with high score ${this.highScore}`);
  }
  
  protected onStop(): void {
    console.log('EndlessMode: Stopping Endless Mode');
    
    // Check if we achieved a new high score
    if (this.board && this.board.getScore() > this.highScore) {
      this.highScore = this.board.getScore();
      this.saveHighScore();
      console.log(`EndlessMode: New high score! ${this.highScore}`);
    }
  }
  
  protected onUpdate(): void {
    if (!this.board) return;
    
    // Check for score thresholds for bonus events
    this.checkScoreThresholds();
    
    // Check if game should end (board topped out)
    if (this.board.isGameOver()) {
      this.handleGameOver();
    }
  }
  
  /**
   * Check if player has reached new score thresholds
   */
  private checkScoreThresholds(): void {
    if (!this.board || this.currentThresholdIndex >= this.scoreThresholds.length) {
      return;
    }
    
    const currentScore = this.board.getScore();
    const threshold = this.scoreThresholds[this.currentThresholdIndex];
    
    if (currentScore >= threshold) {
      this.onScoreThresholdReached(threshold);
      this.currentThresholdIndex++;
    }
  }
  
  /**
   * Handle reaching a score threshold
   */
  private onScoreThresholdReached(threshold: number): void {
    console.log(`EndlessMode: Score threshold reached: ${threshold}`);
    
    // Increase difficulty slightly
    this.increaseDifficulty();
    
    // TODO: Trigger visual/audio feedback for milestone
    // Could show a popup or play a special sound effect
  }
  
  /**
   * Increase game difficulty beyond normal progression
   */
  private increaseDifficulty(): void {
    if (!this.board) return;
    
    // Slightly boost the speed progression
    const currentSpeed = this.board.getStackRaiseSpeed();
    const boostedSpeed = Math.max(1, Math.floor(currentSpeed * 0.9));
    this.board.setStackRaiseSpeed(boostedSpeed);
    
    console.log(`EndlessMode: Difficulty increased, stack speed now ${boostedSpeed}`);
  }
  
  /**
   * Handle game over condition
   */
  private handleGameOver(): void {
    console.log('EndlessMode: Game Over');
    
    if (!this.board) return;
    
    const finalScore = this.board.getScore();
    const wasHighScore = finalScore > this.highScore;
    
    if (wasHighScore) {
      this.highScore = finalScore;
      this.saveHighScore();
    }
    
    // Stop the game mode
    this.stop();
    
    // Notify game controller of game over
    if (this.gameController) {
      this.gameController.onGameModeEnded({
        mode: GameMode.ENDLESS,
        score: finalScore,
        isHighScore: wasHighScore,
        elapsedTime: Date.now() - this.startTime
      });
    }
  }
  
  /**
   * Get current progression level based on score and time
   */
  protected getCurrentLevel(): number {
    // Level based on both time and score thresholds reached
    const timeLevel = Math.floor((Date.now() - this.startTime) / 60000) + 1;
    const scoreLevel = this.currentThresholdIndex + 1;
    
    return Math.max(timeLevel, scoreLevel);
  }
  
  /**
   * Load high score from local storage
   */
  private loadHighScore(): void {
    try {
      const saved = localStorage.getItem('panelPop_highScore_endless');
      this.highScore = saved ? parseInt(saved, 10) : 0;
    } catch (error) {
      console.warn('EndlessMode: Failed to load high score:', error);
      this.highScore = 0;
    }
  }
  
  /**
   * Save high score to local storage
   */
  private saveHighScore(): void {
    try {
      localStorage.setItem('panelPop_highScore_endless', this.highScore.toString());
    } catch (error) {
      console.warn('EndlessMode: Failed to save high score:', error);
    }
  }
  
  /**
   * Get the current high score
   */
  public getHighScore(): number {
    return this.highScore;
  }
  
  /**
   * Get detailed statistics for this mode
   */
  public getDetailedStats(): EndlessModeStats {
    const baseStats = this.getStats();
    
    return {
      ...baseStats,
      highScore: this.highScore,
      currentThreshold: this.currentThresholdIndex < this.scoreThresholds.length 
        ? this.scoreThresholds[this.currentThresholdIndex] 
        : null,
      thresholdProgress: this.calculateThresholdProgress()
    };
  }
  
  /**
   * Calculate progress toward next threshold
   */
  private calculateThresholdProgress(): number {
    if (!this.board || this.currentThresholdIndex >= this.scoreThresholds.length) {
      return 1.0; // Completed all thresholds
    }
    
    const currentScore = this.board.getScore();
    const currentThreshold = this.scoreThresholds[this.currentThresholdIndex];
    const previousThreshold = this.currentThresholdIndex > 0 
      ? this.scoreThresholds[this.currentThresholdIndex - 1] 
      : 0;
    
    const progress = (currentScore - previousThreshold) / (currentThreshold - previousThreshold);
    return Math.min(Math.max(progress, 0), 1);
  }
}

/**
 * Extended statistics interface for Endless Mode
 */
export interface EndlessModeStats {
  mode: GameMode;
  elapsedTime: number;
  score: number;
  level: number;
  isActive: boolean;
  highScore: number;
  currentThreshold: number | null;
  thresholdProgress: number;
}

/**
 * Game over data interface for endless mode
 */
export interface EndlessModeGameOverData {
  mode: GameMode;
  score: number;
  isHighScore: boolean;
  elapsedTime: number;
}