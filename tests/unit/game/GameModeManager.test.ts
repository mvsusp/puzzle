/**
 * Game Mode Manager Tests - Phase 11
 * 
 * Tests for the GameModeManager and all game modes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameModeManager } from '../../../src/game/GameModeManager';
import { GameMode } from '../../../src/core/GameState';
import { Board } from '../../../src/game/Board';
import { GameController } from '../../../src/game/GameController';
import { Cursor } from '../../../src/game/Cursor';

// Mock dependencies
vi.mock('../../../src/audio/AudioSystem', () => ({
  AudioSystem: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    isReady: () => false,
    getDebugInfo: () => ({ initialized: false, currentTrack: null, playingSfxCount: 0 })
  }))
}));

describe('GameModeManager', () => {
  let gameModeManager: GameModeManager;
  let board: Board;
  let gameController: GameController;
  let cursor: Cursor;

  beforeEach(() => {
    // Create fresh instances
    board = new Board();
    cursor = new Cursor(board, 32);
    gameController = new GameController(board, cursor);
    
    // Get singleton instance (reset state)
    gameModeManager = GameModeManager.getInstance();
    gameModeManager.initialize(board, gameController);
  });

  describe('Initialization', () => {
    it('should initialize with board and game controller', () => {
      expect(gameModeManager).toBeDefined();
      expect(gameModeManager.getCurrentModeType()).toBeNull();
      expect(gameModeManager.isAnyModeActive()).toBe(false);
    });

    it('should get singleton instance', () => {
      const instance1 = GameModeManager.getInstance();
      const instance2 = GameModeManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Game Mode Starting', () => {
    it('should start endless mode', () => {
      gameModeManager.startMode(GameMode.ENDLESS);
      
      expect(gameModeManager.getCurrentModeType()).toBe(GameMode.ENDLESS);
      expect(gameModeManager.isAnyModeActive()).toBe(true);
      expect(gameModeManager.isInMode(GameMode.ENDLESS)).toBe(true);
    });

    it('should start VS AI mode', () => {
      gameModeManager.startMode(GameMode.VS_AI);
      
      expect(gameModeManager.getCurrentModeType()).toBe(GameMode.VS_AI);
      expect(gameModeManager.isInMode(GameMode.VS_AI)).toBe(true);
    });

    it('should start demo mode', () => {
      gameModeManager.startMode(GameMode.DEMO);
      
      expect(gameModeManager.getCurrentModeType()).toBe(GameMode.DEMO);
      expect(gameModeManager.isInMode(GameMode.DEMO)).toBe(true);
    });

    it('should stop current mode when starting new mode', () => {
      gameModeManager.startMode(GameMode.ENDLESS);
      expect(gameModeManager.isInMode(GameMode.ENDLESS)).toBe(true);
      
      gameModeManager.startMode(GameMode.DEMO);
      expect(gameModeManager.isInMode(GameMode.DEMO)).toBe(true);
      expect(gameModeManager.isInMode(GameMode.ENDLESS)).toBe(false);
    });
  });

  describe('Game Mode Stopping', () => {
    it('should stop current mode', () => {
      gameModeManager.startMode(GameMode.ENDLESS);
      expect(gameModeManager.isAnyModeActive()).toBe(true);
      
      gameModeManager.stopCurrentMode();
      expect(gameModeManager.isAnyModeActive()).toBe(false);
      expect(gameModeManager.getCurrentModeType()).toBeNull();
    });
  });

  describe('Input Handling', () => {
    it('should reset idle counter on user input', () => {
      const initialIdleCounter = gameModeManager.getIdleTickCounter();
      
      // Simulate some idle ticks
      gameModeManager.update();
      gameModeManager.update();
      gameModeManager.update();
      
      expect(gameModeManager.getIdleTickCounter()).toBeGreaterThan(initialIdleCounter);
      
      // User input should reset counter
      gameModeManager.onUserInput();
      expect(gameModeManager.getIdleTickCounter()).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should return null stats when no mode active', () => {
      const stats = gameModeManager.getCurrentModeStats();
      expect(stats).toBeNull();
    });

    it('should return stats when mode is active', () => {
      gameModeManager.startMode(GameMode.ENDLESS);
      const stats = gameModeManager.getCurrentModeStats();
      expect(stats).toBeDefined();
    });
  });
});