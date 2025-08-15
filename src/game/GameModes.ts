/**
 * Game Modes System - Phase 11 Implementation
 * 
 * Implements different game modes with their specific rules and mechanics.
 * Based on implementation_plan.md Phase 11 requirements.
 */

import { GameMode } from '../core/GameState';
import { Board } from './Board';
import { GameController } from './GameController';

/**
 * Game mode configuration interface
 */
export interface GameModeConfig {
  /** Initial stack raising speed */
  initialStackRaiseSpeed: number;
  /** Speed progression rate */
  speedProgression: number;
  /** Maximum speed multiplier */
  maxSpeedMultiplier: number;
  /** Whether to send garbage blocks */
  sendsGarbage: boolean;
  /** AI opponent configuration */
  aiConfig?: AIConfig;
  /** Score tracking enabled */
  trackScore: boolean;
  /** High score system enabled */
  trackHighScore: boolean;
  /** Win conditions */
  winConditions: WinCondition[];
}

/**
 * AI configuration for computer opponents
 */
export interface AIConfig {
  /** AI difficulty level */
  difficulty: AIDifficulty;
  /** Decision making delay in ticks */
  decisionDelay: number;
  /** AI strategy type */
  strategy: AIStrategy;
}

export enum AIDifficulty {
  EASY = 'easy',
  NORMAL = 'normal',
  HARD = 'hard',
  EXPERT = 'expert'
}

export enum AIStrategy {
  DEFENSIVE = 'defensive',
  AGGRESSIVE = 'aggressive',
  CHAIN_FOCUSED = 'chain_focused',
  RANDOM = 'random'
}

/**
 * Win condition types
 */
export enum WinCondition {
  SURVIVE_TIME = 'survive_time',
  REACH_SCORE = 'reach_score',
  OPPONENT_DEFEAT = 'opponent_defeat'
}

/**
 * Base game mode class
 */
export abstract class BaseGameMode {
  protected config: GameModeConfig;
  protected board: Board | null = null;
  protected gameController: GameController | null = null;
  protected startTime: number = 0;
  protected gameStarted: boolean = false;

  constructor(config: GameModeConfig) {
    this.config = config;
  }

  /**
   * Initialize the game mode with board and controller
   */
  public initialize(board: Board, gameController: GameController): void {
    this.board = board;
    this.gameController = gameController;
    this.startTime = Date.now();
    this.gameStarted = false;
  }

  /**
   * Start the game mode
   */
  public start(): void {
    this.gameStarted = true;
    this.startTime = Date.now();
    this.onStart();
  }

  /**
   * Stop the game mode
   */
  public stop(): void {
    this.gameStarted = false;
    this.onStop();
  }

  /**
   * Update the game mode (called each tick)
   */
  public update(): void {
    if (!this.gameStarted || !this.board || !this.gameController) {
      return;
    }

    this.updateProgression();
    this.checkWinConditions();
    this.onUpdate();
  }

  /**
   * Get current game mode type
   */
  public abstract getMode(): GameMode;

  /**
   * Called when the game mode starts
   */
  protected abstract onStart(): void;

  /**
   * Called when the game mode stops
   */
  protected abstract onStop(): void;

  /**
   * Called each tick for mode-specific updates
   */
  protected abstract onUpdate(): void;

  /**
   * Update speed progression based on time/score
   */
  protected updateProgression(): void {
    if (!this.config.speedProgression || !this.board) return;

    const elapsedTime = Date.now() - this.startTime;
    const progressionFactor = Math.min(
      1 + (elapsedTime / 60000) * this.config.speedProgression, // 1 minute intervals
      this.config.maxSpeedMultiplier
    );

    // Apply speed progression to stack raising
    const newSpeed = Math.round(this.config.initialStackRaiseSpeed / progressionFactor);
    this.board.setStackRaiseSpeed(Math.max(newSpeed, 1));
  }

  /**
   * Check if any win conditions are met
   */
  protected checkWinConditions(): void {
    for (const condition of this.config.winConditions) {
      switch (condition) {
        case WinCondition.SURVIVE_TIME:
          // Endless mode doesn't have time limit
          break;

        case WinCondition.REACH_SCORE:
          // Check score thresholds if needed
          break;

        case WinCondition.OPPONENT_DEFEAT:
          // Check if opponent board is topped out
          break;
      }
    }
  }

  /**
   * Get game mode statistics
   */
  public getStats(): GameModeStats {
    const elapsedTime = this.gameStarted ? Date.now() - this.startTime : 0;

    return {
      mode: this.getMode(),
      elapsedTime,
      score: this.board?.getScore() || 0,
      level: this.getCurrentLevel(),
      isActive: this.gameStarted
    };
  }

  /**
   * Get current difficulty level based on progression
   */
  protected getCurrentLevel(): number {
    const elapsedTime = Date.now() - this.startTime;
    return Math.floor(elapsedTime / 60000) + 1; // Level up every minute
  }
}

/**
 * Game mode statistics interface
 */
export interface GameModeStats {
  mode: GameMode;
  elapsedTime: number;
  score: number;
  level: number;
  isActive: boolean;
}

/**
 * Predefined game mode configurations
 */
export const GAME_MODE_CONFIGS: Record<GameMode, GameModeConfig> = {
  [GameMode.ENDLESS]: {
    initialStackRaiseSpeed: 10, // Matching original game speed
    speedProgression: 0.1, // 10% faster per minute
    maxSpeedMultiplier: 5.0, // Max 5x speed
    sendsGarbage: false,
    trackScore: true,
    trackHighScore: true,
    winConditions: [] // Endless mode has no win condition
  },

  [GameMode.VS_AI]: {
    initialStackRaiseSpeed: 15, // Slightly slower than original for balance
    speedProgression: 0.05, // Slower progression in VS mode
    maxSpeedMultiplier: 3.0,
    sendsGarbage: true,
    aiConfig: {
      difficulty: AIDifficulty.NORMAL,
      decisionDelay: 30, // 30 ticks between decisions
      strategy: AIStrategy.CHAIN_FOCUSED
    },
    trackScore: true,
    trackHighScore: false,
    winConditions: [WinCondition.OPPONENT_DEFEAT]
  },

  [GameMode.VS_HUMAN]: {
    initialStackRaiseSpeed: 20, // Slower for human vs human
    speedProgression: 0.02,
    maxSpeedMultiplier: 2.0,
    sendsGarbage: true,
    trackScore: true,
    trackHighScore: false,
    winConditions: [WinCondition.OPPONENT_DEFEAT]
  },

  [GameMode.DEMO]: {
    initialStackRaiseSpeed: 12, // Slightly slower than original for demo
    speedProgression: 0.05,
    maxSpeedMultiplier: 3.0,
    sendsGarbage: false,
    aiConfig: {
      difficulty: AIDifficulty.NORMAL,
      decisionDelay: 20,
      strategy: AIStrategy.CHAIN_FOCUSED
    },
    trackScore: false,
    trackHighScore: false,
    winConditions: []
  }
};