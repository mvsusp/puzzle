import { describe, it, expect, beforeEach } from 'vitest';
import { SceneManager } from '../../../src/rendering/SceneManager';
import * as THREE from 'three';

describe('SceneManager', () => {
  let sceneManager: SceneManager;

  beforeEach(() => {
    sceneManager = new SceneManager();
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

    it('should create test sprite on initialization', () => {
      const gameContainer = sceneManager.getGameContainer();
      const testSprite = gameContainer.getObjectByName('TestSprite');
      
      expect(testSprite).toBeDefined();
      expect(testSprite).toBeInstanceOf(THREE.Mesh);
    });

    it('should animate test sprite on tick', () => {
      const gameContainer = sceneManager.getGameContainer();
      const testSprite = gameContainer.getObjectByName('TestSprite') as THREE.Mesh;
      
      const initialRotation = testSprite.rotation.z;
      const initialY = testSprite.position.y;
      
      // Run a few ticks
      for (let i = 0; i < 5; i++) {
        sceneManager.tick();
      }
      
      expect(testSprite.rotation.z).not.toBe(initialRotation);
      expect(testSprite.position.y).not.toBe(initialY);
    });

    it('should handle resize correctly', () => {
      const camera = sceneManager.getCamera();
      
      sceneManager.handleResize(1200, 800);
      
      const aspect = 1200 / 800;
      const frustumSize = 600;
      
      expect(camera.left).toBe((frustumSize * aspect) / -2);
      expect(camera.right).toBe((frustumSize * aspect) / 2);
    });

    it('should remove test sprite when requested', () => {
      const gameContainer = sceneManager.getGameContainer();
      let testSprite = gameContainer.getObjectByName('TestSprite');
      
      expect(testSprite).toBeDefined();
      
      sceneManager.removeTestSprite();
      
      testSprite = gameContainer.getObjectByName('TestSprite');
      expect(testSprite).toBeUndefined();
    });
  });
});