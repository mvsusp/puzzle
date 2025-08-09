import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../../../src/core/GameEngine';

describe('GameEngine', () => {
  let canvas: HTMLCanvasElement;
  let gameEngine: GameEngine;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);
    
    gameEngine = new GameEngine(canvas);
  });

  afterEach(() => {
    if (gameEngine) {
      gameEngine.stop();
    }
    if (canvas && canvas.parentElement) {
      document.body.removeChild(canvas);
    }
  });

  describe('Initialization', () => {
    it('should create a GameEngine instance', () => {
      expect(gameEngine).toBeDefined();
      expect(gameEngine.getTicksRun()).toBe(0);
    });

    it('should initialize WebGL renderer', () => {
      const renderer = gameEngine.getRenderer();
      expect(renderer).toBeDefined();
      expect(renderer.domElement).toBe(canvas);
    });

    it('should initialize SceneManager', () => {
      const sceneManager = gameEngine.getSceneManager();
      expect(sceneManager).toBeDefined();
    });

    it('should enable debug mode in development', () => {
      // This test assumes we're in development mode
      expect(gameEngine.isDebugMode()).toBe(true);
    });
  });

  describe('Game Loop', () => {
    it('should start and stop correctly', () => {
      expect(gameEngine.getTicksRun()).toBe(0);
      
      gameEngine.start();
      // Game should be running now
      
      gameEngine.stop();
      // Game should be stopped
    });

    it('should increment ticks when running', async () => {
      const initialTicks = gameEngine.getTicksRun();
      
      gameEngine.start();
      
      // Wait a few frames
      await new Promise(resolve => setTimeout(resolve, 100));
      
      gameEngine.stop();
      
      expect(gameEngine.getTicksRun()).toBeGreaterThan(initialTicks);
    });
  });

  describe('Asset Loading', () => {
    it('should initialize without throwing errors', async () => {
      await expect(gameEngine.initialize()).resolves.not.toThrow();
    });
  });
});