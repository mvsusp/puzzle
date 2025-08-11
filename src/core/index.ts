/**
 * Core Module Index - Phase 9 Implementation
 * 
 * Centralized exports for core game systems
 */

export { GameEngine } from './GameEngine';
export { 
  GameState, 
  StateTransition, 
  StateUtils,
  MenuType,
  CountdownState,
  GameMode,
  UIOverlay
} from './GameState';
export type { 
  StateChangeListener, 
  StateData 
} from './GameState';
export { StateManager } from './StateManager';
export type { StateManagerEvent, StateEventData } from './StateManager';