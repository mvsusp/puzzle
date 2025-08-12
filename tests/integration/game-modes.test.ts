/**
 * Game Modes Integration Tests - Phase 11
 * 
 * Integration tests for game mode functionality and state transitions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '../../src/core/StateManager';
import { GameModeManager } from '../../src/game/GameModeManager';
import { GameMode, GameState, StateTransition } from '../../src/core/GameState';
import { Board } from '../../src/game/Board';
import { GameController } from '../../src/game/GameController';
import { Cursor } from '../../src/game/Cursor';

// Mock dependencies
vi.mock('../../src/audio/AudioSystem', () => ({
  AudioSystem: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    isReady: () => false,
    getDebugInfo: () => ({ initialized: false, currentTrack: null, playingSfxCount: 0 }),
    update: vi.fn(),
    suspend: vi.fn(),
    resume: vi.fn()
  }))
}));

describe('Game Modes Integration', () => {
  let stateManager: StateManager;
  let gameModeManager: GameModeManager;
  let board: Board;
  let gameController: GameController;
  let cursor: Cursor;

  beforeEach(() => {
    // Clear any existing state
    vi.clearAllMocks();
    
    // Reset singleton instances to ensure fresh state
    StateManager.resetInstance();
    GameModeManager.resetInstance();
    
    // Create fresh instances
    board = new Board();
    cursor = new Cursor(board, 32);
    gameController = new GameController(board, cursor);
    
    // Get singleton instances (fresh after reset)
    stateManager = StateManager.getInstance();
    gameModeManager = GameModeManager.getInstance();
    
    // Initialize systems
    stateManager.initialize(board, gameController);
    gameModeManager.initialize(board, gameController);
  });

  describe('State Transitions with Game Modes', () => {
    it('should set game mode and transition to game countdown', () => {
      // First transition to title screen, then main menu
      stateManager.requestTransition(StateTransition.LOADING_COMPLETE);
      stateManager.requestTransition(StateTransition.SHOW_MAIN_MENU);
      expect(stateManager.getCurrentState()).toBe(GameState.MAIN_MENU);
      
      // Set endless mode
      stateManager.setGameMode(GameMode.ENDLESS);
      expect(stateManager.getCurrentGameMode()).toBe(GameMode.ENDLESS);
      
      // Transition to game start
      const success = stateManager.requestTransition(StateTransition.START_GAME);
      expect(success).toBe(true);
      expect(stateManager.getCurrentState()).toBe(GameState.GAME_COUNTDOWN);
    });

    it('should handle VS AI mode transition', () => {
      // Setup proper state
      stateManager.requestTransition(StateTransition.LOADING_COMPLETE);
      stateManager.requestTransition(StateTransition.SHOW_MAIN_MENU);
      
      stateManager.setGameMode(GameMode.VS_AI);
      expect(stateManager.getCurrentGameMode()).toBe(GameMode.VS_AI);
      
      const success = stateManager.requestTransition(StateTransition.START_GAME);
      expect(success).toBe(true);
      expect(stateManager.getCurrentState()).toBe(GameState.GAME_COUNTDOWN);
    });

    it('should handle demo mode transition', () => {
      // Setup proper state - start from title screen for demo timeout
      stateManager.requestTransition(StateTransition.LOADING_COMPLETE);
      expect(stateManager.getCurrentState()).toBe(GameState.TITLE_SCREEN);
      
      // Demo transitions from title screen, not main menu
      stateManager.setGameMode(GameMode.DEMO);
      expect(stateManager.getCurrentGameMode()).toBe(GameMode.DEMO);
      
      const success = stateManager.requestTransition(StateTransition.SHOW_DEMO);
      expect(success).toBe(true);
      expect(stateManager.getCurrentState()).toBe(GameState.DEMO);
    });
  });

  describe('Game Mode Manager Integration', () => {
    it('should start game mode when state transitions to countdown', () => {
      // Setup proper state first
      stateManager.requestTransition(StateTransition.LOADING_COMPLETE);
      stateManager.requestTransition(StateTransition.SHOW_MAIN_MENU);
      
      // Set up spy on the singleton instance AFTER state setup
      const gameModeManagerInstance = GameModeManager.getInstance();
      const startModeSpy = vi.spyOn(gameModeManagerInstance, 'startMode');
      
      // Set mode and transition - this should trigger startMode
      stateManager.setGameMode(GameMode.ENDLESS);
      const success = stateManager.requestTransition(StateTransition.START_GAME);
      
      expect(success).toBe(true);
      expect(stateManager.getCurrentState()).toBe(GameState.GAME_COUNTDOWN);
      
      // Should have started the game mode
      expect(startModeSpy).toHaveBeenCalledWith(GameMode.ENDLESS);
      expect(gameModeManagerInstance.getCurrentModeType()).toBe(GameMode.ENDLESS);
    });

    it('should update game modes during tick', () => {
      // Setup proper state first
      stateManager.requestTransition(StateTransition.LOADING_COMPLETE);
      stateManager.requestTransition(StateTransition.SHOW_MAIN_MENU);
      
      stateManager.setGameMode(GameMode.ENDLESS);
      stateManager.requestTransition(StateTransition.START_GAME);
      
      // Tick the state manager (which should update game modes)
      expect(() => {
        stateManager.tick();
        stateManager.tick();
        stateManager.tick();
      }).not.toThrow();
      
      expect(gameModeManager.isAnyModeActive()).toBe(true);
    });

    it('should handle user input for idle detection', () => {
      const onUserInputSpy = vi.spyOn(gameModeManager, 'onUserInput');
      
      // Simulate user input through state manager
      stateManager.onUserInput();
      
      expect(onUserInputSpy).toHaveBeenCalled();
    });
  });

  describe('Board Configuration by Game Modes', () => {
    it('should configure board settings when starting endless mode', () => {
      const setStackRaiseSpeedSpy = vi.spyOn(board, 'setStackRaiseSpeed');
      const setAutoRaiseSpy = vi.spyOn(board, 'setAutoRaise');
      const setGarbageSpawningSpy = vi.spyOn(board, 'setGarbageSpawningEnabled');
      
      // Start endless mode
      gameModeManager.startMode(GameMode.ENDLESS);
      
      expect(setStackRaiseSpeedSpy).toHaveBeenCalled();
      expect(setAutoRaiseSpy).toHaveBeenCalledWith(true);
      expect(setGarbageSpawningSpy).toHaveBeenCalledWith(false);
    });

    it('should configure board settings for VS modes', () => {
      const setStackRaiseSpeedSpy = vi.spyOn(board, 'setStackRaiseSpeed');
      const setAutoRaiseSpy = vi.spyOn(board, 'setAutoRaise');
      
      // Start VS AI mode
      gameModeManager.startMode(GameMode.VS_AI);
      
      expect(setStackRaiseSpeedSpy).toHaveBeenCalled();
      expect(setAutoRaiseSpy).toHaveBeenCalledWith(true);
    });
  });

  describe('Game Mode Switching', () => {
    it('should properly switch between game modes', () => {
      // Start endless mode
      gameModeManager.startMode(GameMode.ENDLESS);
      expect(gameModeManager.getCurrentModeType()).toBe(GameMode.ENDLESS);
      
      // Switch to demo mode
      gameModeManager.startMode(GameMode.DEMO);
      expect(gameModeManager.getCurrentModeType()).toBe(GameMode.DEMO);
      expect(gameModeManager.isInMode(GameMode.ENDLESS)).toBe(false);
    });

    it('should clean up properly when stopping modes', () => {
      gameModeManager.startMode(GameMode.ENDLESS);
      expect(gameModeManager.isAnyModeActive()).toBe(true);
      
      gameModeManager.stopCurrentMode();
      expect(gameModeManager.isAnyModeActive()).toBe(false);
      expect(gameModeManager.getCurrentModeType()).toBeNull();
    });
  });

  describe('Debug Information', () => {
    it('should provide debug information including game mode', () => {
      stateManager.setGameMode(GameMode.ENDLESS);
      const debugInfo = stateManager.getDebugInfo();
      
      expect(debugInfo).toContain('Mode: endless');
    });

    it('should provide game mode statistics', () => {
      gameModeManager.startMode(GameMode.ENDLESS);
      const stats = gameModeManager.getCurrentModeStats();
      
      expect(stats).toBeDefined();
    });
  });
});