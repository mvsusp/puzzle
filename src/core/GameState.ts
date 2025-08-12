/**
 * Game State System - Phase 9 Implementation
 * 
 * Comprehensive state management system for the entire application.
 * Based on the original C++ implementation and Phase 9 requirements.
 */

/**
 * Top-level application states
 */
export enum GameState {
  // Initial states
  LOADING = 'loading',
  TITLE_SCREEN = 'title_screen',

  // Menu states
  MAIN_MENU = 'main_menu',
  OPTIONS_MENU = 'options_menu',

  // Game states
  GAME_COUNTDOWN = 'game_countdown',
  GAME_RUNNING = 'game_running',
  GAME_PAUSED = 'game_paused',
  GAME_OVER = 'game_over',

  // Special states
  DEMO = 'demo',
  TRANSITION = 'transition'
}

/**
 * State transition events
 */
export enum StateTransition {
  // From loading
  LOADING_COMPLETE = 'loading_complete',

  // From title screen
  SHOW_MAIN_MENU = 'show_main_menu',
  START_GAME = 'start_game',
  SHOW_OPTIONS = 'show_options',
  SHOW_DEMO = 'show_demo',

  // From menus
  BACK_TO_TITLE = 'back_to_title',
  BACK_TO_MENU = 'back_to_menu',

  // Game flow
  COUNTDOWN_COMPLETE = 'countdown_complete',
  PAUSE_GAME = 'pause_game',
  RESUME_GAME = 'resume_game',
  PLAYER_WON = 'player_won',
  PLAYER_LOST = 'player_lost',
  RESTART_GAME = 'restart_game',

  // Demo
  DEMO_TIMEOUT = 'demo_timeout',
  DEMO_EXIT = 'demo_exit'
}

/**
 * Menu types for different contexts
 */
export enum MenuType {
  MAIN = 'main',
  PAUSE = 'pause',
  OPTIONS = 'options',
  GAME_OVER = 'game_over'
}

/**
 * Countdown states for game start
 */
export enum CountdownState {
  THREE = 3,
  TWO = 2,
  ONE = 1,
  GO = 0
}

/**
 * Game modes available
 */
export enum GameMode {
  ENDLESS = 'endless',
  VS_AI = 'vs_ai',
  VS_HUMAN = 'vs_human',
  DEMO = 'demo'
}

/**
 * UI overlay types
 */
export enum UIOverlay {
  NONE = 'none',
  SCORE = 'score',
  TIMER = 'timer',
  COUNTDOWN = 'countdown',
  PAUSE_MENU = 'pause_menu',
  GAME_OVER = 'game_over'
}

/**
 * Interface for state change listeners
 */
export interface StateChangeListener {
  onStateChange(oldState: GameState, newState: GameState): void;
}

/**
 * Interface for state data that can be passed between states
 */
export interface StateData {
  gameMode?: GameMode;
  score?: number;
  level?: number;
  playerWon?: boolean;
  [key: string]: unknown;
}

/**
 * State configuration interface
 */
export interface StateConfig {
  allowedTransitions: StateTransition[];
  requiresGameBoard?: boolean;
  showUI?: UIOverlay[];
  isGameplayState?: boolean;
}

/**
 * State configurations defining what each state can do
 */
export const STATE_CONFIGS: Record<GameState, StateConfig> = {
  [GameState.LOADING]: {
    allowedTransitions: [StateTransition.LOADING_COMPLETE],
    showUI: [],
  },

  [GameState.TITLE_SCREEN]: {
    allowedTransitions: [
      StateTransition.SHOW_MAIN_MENU,
      StateTransition.START_GAME,
      StateTransition.SHOW_OPTIONS,
      StateTransition.SHOW_DEMO
    ],
    showUI: [],
  },

  [GameState.MAIN_MENU]: {
    allowedTransitions: [
      StateTransition.START_GAME,
      StateTransition.SHOW_OPTIONS,
      StateTransition.SHOW_DEMO,
      StateTransition.BACK_TO_TITLE
    ],
    showUI: [],
  },

  [GameState.OPTIONS_MENU]: {
    allowedTransitions: [
      StateTransition.BACK_TO_TITLE,
      StateTransition.BACK_TO_MENU
    ],
    showUI: [],
  },

  [GameState.GAME_COUNTDOWN]: {
    allowedTransitions: [
      StateTransition.COUNTDOWN_COMPLETE,
      StateTransition.BACK_TO_TITLE
    ],
    requiresGameBoard: true,
    showUI: [UIOverlay.COUNTDOWN, UIOverlay.SCORE],
    isGameplayState: true,
  },

  [GameState.GAME_RUNNING]: {
    allowedTransitions: [
      StateTransition.PAUSE_GAME,
      StateTransition.PLAYER_WON,
      StateTransition.PLAYER_LOST
    ],
    requiresGameBoard: true,
    showUI: [UIOverlay.SCORE, UIOverlay.TIMER],
    isGameplayState: true,
  },

  [GameState.GAME_PAUSED]: {
    allowedTransitions: [
      StateTransition.RESUME_GAME,
      StateTransition.RESTART_GAME,
      StateTransition.BACK_TO_TITLE
    ],
    requiresGameBoard: true,
    showUI: [UIOverlay.PAUSE_MENU, UIOverlay.SCORE],
    isGameplayState: true,
  },

  [GameState.GAME_OVER]: {
    allowedTransitions: [
      StateTransition.RESTART_GAME,
      StateTransition.BACK_TO_TITLE
    ],
    requiresGameBoard: true,
    showUI: [UIOverlay.GAME_OVER, UIOverlay.SCORE],
  },

  [GameState.DEMO]: {
    allowedTransitions: [
      StateTransition.DEMO_EXIT,
      StateTransition.BACK_TO_TITLE
    ],
    requiresGameBoard: true,
    showUI: [UIOverlay.SCORE],
    isGameplayState: true,
  },

  [GameState.TRANSITION]: {
    allowedTransitions: [], // Transitions are handled internally
    showUI: [],
  },
};

/**
 * Utility functions for state management
 */
export class StateUtils {
  static isGameplayState(state: GameState): boolean {
    return STATE_CONFIGS[state].isGameplayState === true;
  }

  static requiresGameBoard(state: GameState): boolean {
    return STATE_CONFIGS[state].requiresGameBoard === true;
  }

  static canTransition(currentState: GameState, transition: StateTransition): boolean {
    return STATE_CONFIGS[currentState].allowedTransitions.includes(transition);
  }

  static getUIOverlays(state: GameState): UIOverlay[] {
    return STATE_CONFIGS[state].showUI || [];
  }

  static isMenuState(state: GameState): boolean {
    return [
      GameState.TITLE_SCREEN,
      GameState.MAIN_MENU,
      GameState.OPTIONS_MENU
    ].includes(state);
  }

  static isPausedState(state: GameState): boolean {
    return [
      GameState.GAME_PAUSED,
      GameState.GAME_OVER
    ].includes(state);
  }
}