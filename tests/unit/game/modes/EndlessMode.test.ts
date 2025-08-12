/**
 * Endless Mode Tests - Phase 11
 * 
 * Tests for the Endless Mode implementation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EndlessMode } from '../../../../src/game/modes/EndlessMode';
import { GameMode } from '../../../../src/core/GameState';
import { Board } from '../../../../src/game/Board';
import { GameController } from '../../../../src/game/GameController';
import { Cursor } from '../../../../src/game/Cursor';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock dependencies
vi.mock('../../../../src/audio/AudioSystem', () => ({
  AudioSystem: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    isReady: () => false,
    getDebugInfo: () => ({ initialized: false, currentTrack: null, playingSfxCount: 0 })
  }))
}));

describe('EndlessMode', () => {
  let endlessMode: EndlessMode;
  let board: Board;
  let gameController: GameController;
  let cursor: Cursor;

  beforeEach(() => {
    // Clear localStorage mocks
    vi.clearAllMocks();
    
    // Create dependencies
    board = new Board();
    cursor = new Cursor(board, 32);
    gameController = new GameController(board, cursor);
    
    // Create mode instance
    endlessMode = new EndlessMode();
    endlessMode.initialize(board, gameController);
  });

  afterEach(() => {
    if (endlessMode) {
      endlessMode.stop();
    }
  });

  describe('Mode Identity', () => {
    it('should return correct game mode', () => {
      expect(endlessMode.getMode()).toBe(GameMode.ENDLESS);
    });
  });

  describe('High Score Management', () => {
    it('should load high score from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('5000');
      
      const newMode = new EndlessMode();
      expect(newMode.getHighScore()).toBe(5000);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('panelPop_highScore_endless');
    });

    it('should default to 0 if no high score stored', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const newMode = new EndlessMode();
      expect(newMode.getHighScore()).toBe(0);
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const newMode = new EndlessMode();
      expect(newMode.getHighScore()).toBe(0);
    });
  });

  describe('Game Flow', () => {
    it('should start correctly', () => {
      endlessMode.start();
      
      const stats = endlessMode.getStats();
      expect(stats.isActive).toBe(true);
      expect(stats.mode).toBe(GameMode.ENDLESS);
    });

    it('should stop correctly', () => {
      endlessMode.start();
      endlessMode.stop();
      
      const stats = endlessMode.getStats();
      expect(stats.isActive).toBe(false);
    });

    it('should configure board correctly on start', () => {
      const setStackRaiseSpeedSpy = vi.spyOn(board, 'setStackRaiseSpeed');
      const setAutoRaiseSpy = vi.spyOn(board, 'setAutoRaise');
      const setGarbageSpawningSpy = vi.spyOn(board, 'setGarbageSpawningEnabled');
      
      endlessMode.start();
      
      expect(setStackRaiseSpeedSpy).toHaveBeenCalled();
      expect(setAutoRaiseSpy).toHaveBeenCalledWith(true);
      expect(setGarbageSpawningSpy).toHaveBeenCalledWith(false);
    });
  });

  describe('Statistics', () => {
    it('should provide basic statistics', () => {
      endlessMode.start();
      const stats = endlessMode.getStats();
      
      expect(stats).toMatchObject({
        mode: GameMode.ENDLESS,
        elapsedTime: expect.any(Number),
        score: expect.any(Number),
        level: expect.any(Number),
        isActive: true
      });
    });

    it('should provide detailed statistics', () => {
      endlessMode.start();
      const detailedStats = endlessMode.getDetailedStats();
      
      expect(detailedStats).toMatchObject({
        mode: GameMode.ENDLESS,
        elapsedTime: expect.any(Number),
        score: expect.any(Number),
        level: expect.any(Number),
        isActive: true,
        highScore: expect.any(Number),
        thresholdProgress: expect.any(Number)
      });
    });

    it('should calculate level progression', () => {
      endlessMode.start();
      
      // Initially level 1
      expect(endlessMode.getStats().level).toBe(1);
    });
  });

  describe('Score Thresholds', () => {
    it('should track threshold progress', () => {
      endlessMode.start();
      const detailedStats = endlessMode.getDetailedStats();
      
      expect(detailedStats.thresholdProgress).toBeGreaterThanOrEqual(0);
      expect(detailedStats.thresholdProgress).toBeLessThanOrEqual(1);
    });

    it('should have next threshold when not at max', () => {
      endlessMode.start();
      const detailedStats = endlessMode.getDetailedStats();
      
      // Should have a current threshold (first one is 10000)
      expect(detailedStats.currentThreshold).toBe(10000);
    });
  });

  describe('Update Cycle', () => {
    it('should update without errors when active', () => {
      endlessMode.start();
      
      expect(() => {
        endlessMode.update();
        endlessMode.update();
        endlessMode.update();
      }).not.toThrow();
    });

    it('should not update when inactive', () => {
      expect(() => {
        endlessMode.update();
      }).not.toThrow();
    });
  });
});