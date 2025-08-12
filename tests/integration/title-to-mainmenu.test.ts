/**
 * Title Screen to Main Menu Integration Test - Phase 11
 * 
 * Tests the navigation from title screen to main menu with game modes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '../../src/core/StateManager';
import { GameModeManager } from '../../src/game/GameModeManager';
import { TitleScreen } from '../../src/ui/components/TitleScreen';
import { MainMenu } from '../../src/ui/components/MainMenu';
import { GameState, StateTransition, GameMode } from '../../src/core/GameState';

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

describe('Title Screen to Main Menu Navigation', () => {
  let stateManager: StateManager;
  let titleScreen: TitleScreen;
  let mainMenu: MainMenu;

  beforeEach(() => {
    // Reset singleton instances to ensure fresh state
    StateManager.resetInstance();
    GameModeManager.resetInstance();
    
    stateManager = StateManager.getInstance();
    titleScreen = new TitleScreen();
    mainMenu = new MainMenu();
  });

  describe('Navigation Flow', () => {
    it('should transition from title screen to main menu when Start Game is selected', () => {
      // Start at title screen
      const success = stateManager.requestTransition(StateTransition.LOADING_COMPLETE);
      expect(success).toBe(true);
      expect(stateManager.getCurrentState()).toBe(GameState.TITLE_SCREEN);
      
      // Request transition to main menu
      const showMainMenu = stateManager.requestTransition(StateTransition.SHOW_MAIN_MENU);
      expect(showMainMenu).toBe(true);
      expect(stateManager.getCurrentState()).toBe(GameState.MAIN_MENU);
    });

    it('should allow setting game mode and starting game from main menu', () => {
      // Navigate to main menu
      stateManager.requestTransition(StateTransition.LOADING_COMPLETE);
      stateManager.requestTransition(StateTransition.SHOW_MAIN_MENU);
      
      // Set endless mode
      stateManager.setGameMode(GameMode.ENDLESS);
      expect(stateManager.getCurrentGameMode()).toBe(GameMode.ENDLESS);
      
      // Start game
      const startGame = stateManager.requestTransition(StateTransition.START_GAME);
      expect(startGame).toBe(true);
      expect(stateManager.getCurrentState()).toBe(GameState.GAME_COUNTDOWN);
    });
  });

  describe('State Validation', () => {
    it('should allow SHOW_MAIN_MENU transition from TITLE_SCREEN', () => {
      stateManager.requestTransition(StateTransition.LOADING_COMPLETE);
      
      const canTransition = stateManager.requestTransition(StateTransition.SHOW_MAIN_MENU);
      expect(canTransition).toBe(true);
    });

    it('should allow START_GAME transition from MAIN_MENU', () => {
      stateManager.requestTransition(StateTransition.LOADING_COMPLETE);
      stateManager.requestTransition(StateTransition.SHOW_MAIN_MENU);
      
      const canStartGame = stateManager.requestTransition(StateTransition.START_GAME);
      expect(canStartGame).toBe(true);
    });

    it('should allow BACK_TO_TITLE transition from MAIN_MENU', () => {
      stateManager.requestTransition(StateTransition.LOADING_COMPLETE);
      stateManager.requestTransition(StateTransition.SHOW_MAIN_MENU);
      
      const canGoBack = stateManager.requestTransition(StateTransition.BACK_TO_TITLE);
      expect(canGoBack).toBe(true);
      expect(stateManager.getCurrentState()).toBe(GameState.TITLE_SCREEN);
    });
  });

  describe('Game Mode Selection', () => {
    it('should support all game modes from main menu', () => {
      stateManager.requestTransition(StateTransition.LOADING_COMPLETE);
      stateManager.requestTransition(StateTransition.SHOW_MAIN_MENU);
      
      // Test each game mode
      const modes = [GameMode.ENDLESS, GameMode.VS_AI, GameMode.VS_HUMAN];
      
      modes.forEach(mode => {
        stateManager.setGameMode(mode);
        expect(stateManager.getCurrentGameMode()).toBe(mode);
        
        const canStart = stateManager.requestTransition(StateTransition.START_GAME);
        expect(canStart).toBe(true);
        expect(stateManager.getCurrentState()).toBe(GameState.GAME_COUNTDOWN);
        
        // Go back to main menu for next test
        stateManager.requestTransition(StateTransition.BACK_TO_TITLE);
        stateManager.requestTransition(StateTransition.SHOW_MAIN_MENU);
      });
    });

    it('should handle demo mode transition correctly', () => {
      stateManager.requestTransition(StateTransition.LOADING_COMPLETE);
      stateManager.requestTransition(StateTransition.SHOW_MAIN_MENU);
      
      stateManager.setGameMode(GameMode.DEMO);
      const canShowDemo = stateManager.requestTransition(StateTransition.SHOW_DEMO);
      expect(canShowDemo).toBe(true);
      expect(stateManager.getCurrentState()).toBe(GameState.DEMO);
    });
  });

  describe('UI Components Integration', () => {
    it('should create title screen UI element', () => {
      expect(titleScreen.element).toBeDefined();
      expect(titleScreen.element?.tagName).toBe('DIV');
    });

    it('should create main menu UI element', () => {
      expect(mainMenu.element).toBeDefined();
      expect(mainMenu.element?.tagName).toBe('DIV');
    });

    it('should support menu navigation', () => {
      expect(mainMenu.getSelectedOption()).toBe(0);
      
      mainMenu.setSelectedOption(1);
      expect(mainMenu.getSelectedOption()).toBe(1);
      
      mainMenu.setSelectedOption(2);
      expect(mainMenu.getSelectedOption()).toBe(2);
    });
  });
});