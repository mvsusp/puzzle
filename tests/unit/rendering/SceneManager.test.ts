import { describe, it, expect, beforeEach } from 'vitest';
import { SceneManager } from '../../../src/rendering/SceneManager';
import { AssetLoader } from '../../../src/assets/AssetLoader';
import * as THREE from 'three';

describe('SceneManager', () => {
  let sceneManager: SceneManager;
  let assetLoader: AssetLoader;

  beforeEach(() => {
    assetLoader = new AssetLoader();
    sceneManager = new SceneManager(assetLoader);
  });

  describe('Initialization', () => {
    it('should create scene and camera', () => {
      expect(sceneManager.getScene()).toBeInstanceOf(THREE.Scene);
      expect(sceneManager.getCamera()).toBeInstanceOf(THREE.OrthographicCamera);
    });

    it('should create game and UI containers', () => {
      const gameContainer = sceneManager.getGameContainer();
      const uiContainer = sceneManager.getUIContainer();

      expect(gameContainer).toBeInstanceOf(THREE.Group);
      expect(uiContainer).toBeInstanceOf(THREE.Group);
      expect(gameContainer.name).toBe('GameContainer');
      expect(uiContainer.name).toBe('UIContainer');
    });

    it('should set up orthographic camera correctly', () => {
      const camera = sceneManager.getCamera();
      
      expect(camera.type).toBe('OrthographicCamera');
      expect(camera.position.z).toBe(100);
    });

    it('should initialize without errors', () => {
      expect(() => sceneManager.initialize()).not.toThrow();
    });
  });

  describe('Scene Management', () => {
    beforeEach(() => {
      sceneManager.initialize();
    });

    it('should create game board on initialization', () => {
      const board = sceneManager.getBoard();
      const boardRenderer = sceneManager.getBoardRenderer();
      
      expect(board).toBeDefined();
      expect(boardRenderer).toBeDefined();
    });

    it('should have tick method', () => {
      // Just ensure the method exists
      expect(typeof sceneManager.tick).toBe('function');
    });

    it('should handle resize correctly', () => {
      const camera = sceneManager.getCamera();
      
      sceneManager.handleResize(1200, 800);
      
      const aspect = 1200 / 800;
      const frustumSize = 600;
      
      expect(camera.left).toBe((frustumSize * aspect) / -2);
      expect(camera.right).toBe((frustumSize * aspect) / 2);
    });

    it('should dispose without errors', () => {
      expect(() => sceneManager.dispose()).not.toThrow();
      
      // Should be able to call dispose multiple times
      expect(() => sceneManager.dispose()).not.toThrow();
    });
  });
});