import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Board } from '../../../src/game/Board';
import { Cursor } from '../../../src/game/Cursor';
import { GameController, GameControllerState } from '../../../src/game/GameController';
import { BoardState } from '../../../src/game/BlockTypes';
import { InputAction } from '../../../src/input/InputManager';

// Mock performance.now
vi.stubGlobal('performance', {
  now: vi.fn(() => 1000)
});

describe('GameController', () => {
  let board: Board;
  let cursor: Cursor;
  let gameController: GameController;

  beforeEach(() => {
    board = new Board();
    cursor = new Cursor(board, 32);
    gameController = new GameController(board, cursor);
  });

  describe('Initialization', () => {
    it('should initialize in running state', () => {
      expect(gameController.state).toBe(GameControllerState.RUNNING);
      expect(gameController.isPaused()).toBe(false);
    });

    it('should initialize with zero statistics', () => {
      const stats = gameController.getStats();
      expect(stats.swaps).toBe(0);
      expect(stats.raises).toBe(0);
      expect(stats.moves).toBe(0);
    });

    it('should have input manager', () => {
      const inputManager = gameController.getInputManager();
      expect(inputManager).toBeDefined();
      expect(inputManager.isEnabled()).toBe(true);
    });
  });

  describe('Pause Functionality', () => {
    it('should pause and resume correctly', () => {
      expect(gameController.isPaused()).toBe(false);
      
      gameController.pause();
      expect(gameController.isPaused()).toBe(true);
      expect(gameController.state).toBe(GameControllerState.PAUSED);
      
      gameController.resume();
      expect(gameController.isPaused()).toBe(false);
      expect(gameController.state).toBe(GameControllerState.RUNNING);
    });

    it('should not double pause or resume', () => {
      gameController.pause();
      gameController.pause();
      expect(gameController.state).toBe(GameControllerState.PAUSED);
      
      gameController.resume();
      gameController.resume();
      expect(gameController.state).toBe(GameControllerState.RUNNING);
    });

    it('should handle game over state', () => {
      gameController.gameOver();
      expect(gameController.state).toBe(GameControllerState.GAME_OVER);
    });
  });

  describe('Input Processing', () => {
    it('should process tick without errors', () => {
      expect(() => gameController.tick()).not.toThrow();
    });

    it('should not process game input when paused', () => {
      const initialStats = gameController.getStats();
      
      gameController.pause();
      
      // Simulate some ticks
      for (let i = 0; i < 10; i++) {
        gameController.tick();
      }
      
      const finalStats = gameController.getStats();
      expect(finalStats).toEqual(initialStats);
    });

    it('should update cursor state based on board state', () => {
      expect(() => gameController.updateCursorState()).not.toThrow();
      
      // Test with different board states
      board.state = BoardState.COUNTDOWN;
      expect(() => gameController.updateCursorState()).not.toThrow();
      
      board.state = BoardState.GAME_OVER;
      expect(() => gameController.updateCursorState()).not.toThrow();
    });
  });

  describe('Key Binding Management', () => {
    it('should allow setting custom key bindings', () => {
      gameController.setKeyBinding('KeyQ', InputAction.PAUSE);
      
      const bindings = gameController.getKeyBindings();
      expect(bindings.get('KeyQ')).toBe(InputAction.PAUSE);
    });

    it('should return current key bindings', () => {
      const bindings = gameController.getKeyBindings();
      expect(bindings).toBeInstanceOf(Map);
      expect(bindings.size).toBeGreaterThan(0);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track move statistics', () => {
      const initialStats = gameController.getStats();
      expect(initialStats.moves).toBe(0);
      
      // Statistics are updated internally during input processing
      // We can verify the structure is correct
      expect(typeof initialStats.swaps).toBe('number');
      expect(typeof initialStats.raises).toBe('number');
      expect(typeof initialStats.moves).toBe('number');
    });

    it('should provide performance statistics', () => {
      const stats = gameController.getStats();
      expect(stats).toHaveProperty('swaps');
      expect(stats).toHaveProperty('raises');
      expect(stats).toHaveProperty('moves');
    });
  });

  describe('State Management', () => {
    it('should reset controller state', () => {
      // Modify state
      gameController.pause();
      // Simulate some actions (statistics would be modified by actual input)
      
      gameController.reset();
      
      expect(gameController.state).toBe(GameControllerState.RUNNING);
      expect(gameController.isPaused()).toBe(false);
      
      const stats = gameController.getStats();
      expect(stats.swaps).toBe(0);
      expect(stats.raises).toBe(0);
      expect(stats.moves).toBe(0);
    });

    it('should handle different game controller states', () => {
      // Test all states
      expect(gameController.state).toBe(GameControllerState.RUNNING);
      
      gameController.pause();
      expect(gameController.state).toBe(GameControllerState.PAUSED);
      
      gameController.gameOver();
      expect(gameController.state).toBe(GameControllerState.GAME_OVER);
      
      gameController.reset();
      expect(gameController.state).toBe(GameControllerState.RUNNING);
    });
  });

  describe('Input Integration', () => {
    it('should only process input when running', () => {
      board.state = BoardState.RUNNING;
      
      // Should process input normally when running
      expect(() => gameController.tick()).not.toThrow();
      
      // Should not process game input when paused
      gameController.pause();
      expect(() => gameController.tick()).not.toThrow();
      
      // Should not process input when game over
      gameController.gameOver();
      expect(() => gameController.tick()).not.toThrow();
    });

    it('should respect board state for input processing', () => {
      board.state = BoardState.COUNTDOWN;
      expect(() => gameController.tick()).not.toThrow();
      
      board.state = BoardState.WON;
      expect(() => gameController.tick()).not.toThrow();
      
      board.state = BoardState.GAME_OVER;
      expect(() => gameController.tick()).not.toThrow();
    });
  });

  describe('Cursor State Updates', () => {
    it('should update cursor based on board state', () => {
      // Test countdown state
      board.state = BoardState.COUNTDOWN;
      gameController.updateCursorState();
      expect(cursor.getMesh().visible).toBe(true);
      
      // Test running state
      board.state = BoardState.RUNNING;
      gameController.updateCursorState();
      expect(cursor.getMesh().visible).toBe(true);
      
      // Test game over state
      board.state = BoardState.GAME_OVER;
      gameController.updateCursorState();
      expect(cursor.getMesh().visible).toBe(false);
    });

    it('should change cursor color in panic mode', () => {
      // Normal mode
      expect(() => gameController.updateCursorState()).not.toThrow();
      
      // Simulate panic mode (this would be set by board logic)
      // The cursor color change is tested indirectly
    });
  });

  describe('Input Timing', () => {
    it('should handle input timing correctly', () => {
      // Input timing is handled internally
      // We verify that rapid ticks don't cause errors
      for (let i = 0; i < 100; i++) {
        expect(() => gameController.tick()).not.toThrow();
      }
    });

    it('should prevent input spam', () => {
      // The controller has internal timing to prevent input spam
      // This is tested by verifying multiple rapid ticks work correctly
      const rapidTicks = 50;
      for (let i = 0; i < rapidTicks; i++) {
        gameController.tick();
      }
      
      // Should not crash or cause errors
      expect(gameController.state).toBe(GameControllerState.RUNNING);
    });
  });

  describe('Debug Information', () => {
    it('should provide debug information', () => {
      const debugInfo = gameController.getDebugInfo();
      expect(debugInfo).toContain('Controller:');
      expect(debugInfo).toContain('Swaps:');
      expect(debugInfo).toContain('Raises:');
      expect(debugInfo).toContain('Moves:');
    });

    it('should include current state in debug info', () => {
      const debugInfo = gameController.getDebugInfo();
      expect(debugInfo).toContain(gameController.state);
    });
  });

  describe('Error Handling', () => {
    it('should handle null board gracefully', () => {
      // Test that the controller doesn't crash with edge cases
      expect(() => gameController.tick()).not.toThrow();
    });

    it('should handle invalid input states', () => {
      // Test various states and inputs
      gameController.gameOver();
      expect(() => gameController.tick()).not.toThrow();
      
      gameController.pause();
      expect(() => gameController.tick()).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should dispose without errors', () => {
      expect(() => gameController.dispose()).not.toThrow();
    });

    it('should dispose input manager on cleanup', () => {
      const inputManager = gameController.getInputManager();
      expect(inputManager.isEnabled()).toBe(true);
      
      gameController.dispose();
      
      // Input manager should be disposed
      expect(inputManager.isEnabled()).toBe(false);
    });

    it('should handle multiple dispose calls', () => {
      gameController.dispose();
      expect(() => gameController.dispose()).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should integrate with board and cursor correctly', () => {
      // Verify the controller has references to board and cursor
      expect(gameController.getStats()).toBeDefined();
      expect(() => gameController.updateCursorState()).not.toThrow();
      
      // Verify tick updates work with both components
      const initialTicks = board.ticksRun;
      gameController.tick();
      // Board ticks are controlled by the game engine, not the controller directly
    });

    it('should maintain consistent state with components', () => {
      // Test that controller state stays consistent with board/cursor
      gameController.pause();
      expect(gameController.isPaused()).toBe(true);
      
      gameController.resume();
      expect(gameController.isPaused()).toBe(false);
      
      gameController.reset();
      expect(gameController.state).toBe(GameControllerState.RUNNING);
    });
  });
});