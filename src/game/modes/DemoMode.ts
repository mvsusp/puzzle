/**
 * Demo Mode Implementation - Phase 11
 * 
 * AI-controlled demonstration mode that triggers after idle timeout.
 * Showcases gameplay mechanics automatically.
 */

import { GameMode } from '../../core/GameState';
import { BaseGameMode, GAME_MODE_CONFIGS } from '../GameModes';
import { InputAction } from '../../input/InputManager';

/**
 * Demo mode configuration
 */
export interface DemoConfig {
  /** Number of ticks before demo starts when idle */
  idleTimeout: number;
  /** Maximum duration for demo in milliseconds */
  maxDuration: number;
  /** Whether demo can be interrupted by user input */
  interruptible: boolean;
}

export class DemoMode extends BaseGameMode {
  private idleTimer: number = 0;
  private demoConfig: DemoConfig;
  private userInputDetected: boolean = false;
  private aiDecisionTimer: number = 0;
  private lastAIAction: string = '';
  
  // AI state tracking
  private aiCursorX: number = 2;
  private aiCursorY: number = 5;
  private aiActionQueue: InputAction[] = [];
  
  constructor() {
    super(GAME_MODE_CONFIGS[GameMode.DEMO]);
    
    this.demoConfig = {
      idleTimeout: 600, // 10 seconds at 60 FPS
      maxDuration: 120000, // 2 minutes
      interruptible: true
    };
  }
  
  public getMode(): GameMode {
    return GameMode.DEMO;
  }
  
  /**
   * Check if demo should start based on idle time
   */
  public checkIdleTimeout(ticksSinceLastInput: number): boolean {
    return ticksSinceLastInput >= this.demoConfig.idleTimeout;
  }
  
  /**
   * Reset idle timer (called when user input is detected)
   */
  public resetIdleTimer(): void {
    this.idleTimer = 0;
    this.userInputDetected = true;
  }
  
  protected onStart(): void {
    // console.log('DemoMode: Starting Demo Mode');
    
    this.userInputDetected = false;
    this.idleTimer = 0;
    this.aiDecisionTimer = 0;
    this.lastAIAction = '';
    
    // Initialize AI cursor position
    this.aiCursorX = 2;
    this.aiCursorY = 5;
    this.aiActionQueue = [];
    
    if (this.board) {
      // Configure board for demo mode
      this.board.setStackRaiseSpeed(this.config.initialStackRaiseSpeed);
      this.board.setAutoRaise(true);
      this.board.setGarbageSpawningEnabled(false);
      
      // Reset board to a good starting state
      this.board.resetToStartingState();
    }
    
    if (this.gameController) {
      // Take control of the game controller for AI input
      this.gameController.setDemoMode(true);
    }
    
    console.log('DemoMode: AI is now controlling the game');
  }
  
  protected onStop(): void {
    console.log('DemoMode: Stopping Demo Mode');
    
    if (this.gameController) {
      // Return control to the user
      this.gameController.setDemoMode(false);
    }
    
    // Clear any queued AI actions
    this.aiActionQueue = [];
  }
  
  protected onUpdate(): void {
    if (!this.board || !this.gameController) return;
    
    // Check if demo should be interrupted
    if (this.demoConfig.interruptible && this.userInputDetected) {
      console.log('DemoMode: User input detected, ending demo');
      this.stop();
      return;
    }
    
    // Check if demo has run for maximum duration
    if (Date.now() - this.startTime > this.demoConfig.maxDuration) {
      console.log('DemoMode: Demo timeout reached');
      this.stop();
      return;
    }
    
    // Update AI decision making
    this.updateAI();
  }
  
  /**
   * Update AI logic for demo mode
   */
  private updateAI(): void {
    if (!this.board || !this.gameController || !this.config.aiConfig) return;
    
    this.aiDecisionTimer++;
    
    // Make decisions at configured interval
    if (this.aiDecisionTimer >= this.config.aiConfig.decisionDelay) {
      this.makeAIDecision();
      this.aiDecisionTimer = 0;
    }
    
    // Execute queued actions
    this.executeQueuedActions();
  }
  
  /**
   * AI decision making for demo mode
   */
  private makeAIDecision(): void {
    if (!this.board) return;
    
    // Analyze current board state
    const boardAnalysis = this.analyzeBoard();
    
    // Choose action based on analysis
    const action = this.chooseAction(boardAnalysis);
    
    if (action) {
      this.queueAIAction(action);
      this.lastAIAction = action.toString();
    }
  }
  
  /**
   * Analyze current board state for AI decision making
   */
  private analyzeBoard(): BoardAnalysis {
    if (!this.board) {
      return { hasMatches: false, hasFloatingBlocks: false, canMakeMatch: false, riskLevel: 0 };
    }
    
    // Simple analysis for demo purposes
    const analysis: BoardAnalysis = {
      hasMatches: this.board.hasActiveMatches(),
      hasFloatingBlocks: this.board.hasFloatingBlocks(),
      canMakeMatch: this.findPossibleMatches().length > 0,
      riskLevel: this.calculateRiskLevel()
    };
    
    return analysis;
  }
  
  /**
   * Choose next action based on board analysis
   */
  private chooseAction(analysis: BoardAnalysis): InputAction | null {
    // Priority system for demo AI:
    // 1. If matches are available, let them process
    // 2. Look for immediate match opportunities
    // 3. Set up potential matches
    // 4. Move around to show activity
    
    if (analysis.hasMatches || analysis.hasFloatingBlocks) {
      // Let the board settle - don't interfere
      return null;
    }
    
    // Look for match opportunities
    const matchOpportunity = this.findBestMatchOpportunity();
    if (matchOpportunity) {
      return this.getActionToReachPosition(matchOpportunity.x, matchOpportunity.y);
    }
    
    // Move around to show different parts of the board
    return this.getExplorationAction();
  }
  
  /**
   * Find possible matches on the board
   */
  private findPossibleMatches(): MatchOpportunity[] {
    const opportunities: MatchOpportunity[] = [];
    
    if (!this.board) return opportunities;
    
    // Simple implementation - check immediate swap opportunities
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 5; col++) { // Only check swappable positions
        if (this.canCreateMatchAtPosition(col, row)) {
          opportunities.push({ x: col, y: row, priority: this.calculateMatchPriority(col, row) });
        }
      }
    }
    
    // Sort by priority (higher is better)
    opportunities.sort((a, b) => b.priority - a.priority);
    
    return opportunities;
  }
  
  /**
   * Find the best match opportunity
   */
  private findBestMatchOpportunity(): MatchOpportunity | null {
    const opportunities = this.findPossibleMatches();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return opportunities.length > 0 ? opportunities[0]! : null;
  }
  
  /**
   * Check if a match can be created at the given position
   */
  private canCreateMatchAtPosition(_x: number, _y: number): boolean {
    // Simplified implementation - would need actual board state checking
    // For demo purposes, return true with some probability
    return Math.random() < 0.3;
  }
  
  /**
   * Calculate priority for a potential match
   */
  private calculateMatchPriority(_x: number, y: number): number {
    // Higher priority for matches lower on the board
    // and for matches that might create chains
    let priority = (12 - y) * 10; // Lower rows get higher priority
    
    // Add some randomness to make demo less predictable
    priority += Math.random() * 20;
    
    return priority;
  }
  
  /**
   * Get action to reach a specific position
   */
  private getActionToReachPosition(targetX: number, targetY: number): InputAction | null {
    const dx = targetX - this.aiCursorX;
    const dy = targetY - this.aiCursorY;
    
    // Move toward target
    if (Math.abs(dx) > Math.abs(dy)) {
      // Prioritize horizontal movement
      if (dx > 0) {
        this.aiCursorX = Math.min(this.aiCursorX + 1, 4);
        return InputAction.RIGHT;
      } else if (dx < 0) {
        this.aiCursorX = Math.max(this.aiCursorX - 1, 0);
        return InputAction.LEFT;
      }
    } else {
      // Prioritize vertical movement
      if (dy > 0) {
        this.aiCursorY = Math.min(this.aiCursorY + 1, 11);
        return InputAction.DOWN;
      } else if (dy < 0) {
        this.aiCursorY = Math.max(this.aiCursorY - 1, 0);
        return InputAction.UP;
      }
    }
    
    // We're at the target position - try to swap
    return InputAction.SWAP;
  }
  
  /**
   * Get an exploration action to show different parts of the board
   */
  private getExplorationAction(): InputAction {
    const actions = [InputAction.UP, InputAction.DOWN, InputAction.LEFT, InputAction.RIGHT, InputAction.SWAP];
    
    // Weighted random selection - prefer movement over swapping for exploration
    const weights = [2, 2, 2, 2, 1];
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const random = Math.random() * totalWeight;
    
    let weightSum = 0;
    for (let i = 0; i < actions.length; i++) {
      weightSum += weights[i];
      if (random <= weightSum) {
        this.updateAICursorPosition(actions[i]);
        return actions[i];
      }
    }
    
    return InputAction.SWAP;
  }
  
  /**
   * Update AI cursor position based on action
   */
  private updateAICursorPosition(action: InputAction): void {
    switch (action) {
      case InputAction.LEFT:
        this.aiCursorX = Math.max(this.aiCursorX - 1, 0);
        break;
      case InputAction.RIGHT:
        this.aiCursorX = Math.min(this.aiCursorX + 1, 4);
        break;
      case InputAction.UP:
        this.aiCursorY = Math.max(this.aiCursorY - 1, 0);
        break;
      case InputAction.DOWN:
        this.aiCursorY = Math.min(this.aiCursorY + 1, 11);
        break;
    }
  }
  
  /**
   * Calculate risk level (how close to topping out)
   */
  private calculateRiskLevel(): number {
    if (!this.board) return 0;
    
    // Check highest occupied row
    const highestRow = this.board.getHighestOccupiedRow();
    
    // Risk increases as blocks get closer to top
    return Math.max(0, (12 - highestRow) / 12);
  }
  
  /**
   * Queue an AI action for execution
   */
  private queueAIAction(action: InputAction): void {
    this.aiActionQueue.push(action);
  }
  
  /**
   * Execute queued AI actions
   */
  private executeQueuedActions(): void {
    if (this.aiActionQueue.length === 0 || !this.gameController) return;
    
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const action = this.aiActionQueue.shift()!;
    
    // Simulate input for the action
    this.gameController.simulateInput(action);
  }
  
  /**
   * Get demo mode statistics
   */
  public getDemoStats(): DemoModeStats {
    return {
      mode: this.getMode(),
      elapsedTime: Date.now() - this.startTime,
      score: this.board?.getScore() || 0,
      level: this.getCurrentLevel(),
      isActive: this.gameStarted,
      aiCursorPosition: { x: this.aiCursorX, y: this.aiCursorY },
      lastAIAction: this.lastAIAction,
      queuedActions: this.aiActionQueue.length
    };
  }
}

/**
 * Board analysis interface
 */
interface BoardAnalysis {
  hasMatches: boolean;
  hasFloatingBlocks: boolean;
  canMakeMatch: boolean;
  riskLevel: number;
}

/**
 * Match opportunity interface
 */
interface MatchOpportunity {
  x: number;
  y: number;
  priority: number;
}

/**
 * Demo mode statistics interface
 */
export interface DemoModeStats {
  mode: GameMode;
  elapsedTime: number;
  score: number;
  level: number;
  isActive: boolean;
  aiCursorPosition: { x: number; y: number };
  lastAIAction: string;
  queuedActions: number;
}