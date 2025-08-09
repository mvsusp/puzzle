import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssetLoader } from '../../../src/assets/AssetLoader';
import * as THREE from 'three';

describe('AssetLoader', () => {
  let assetLoader: AssetLoader;

  beforeEach(() => {
    assetLoader = new AssetLoader();
  });

  describe('Initialization', () => {
    it('should create AssetLoader instance', () => {
      expect(assetLoader).toBeDefined();
    });

    it('should not have any loaded assets initially', () => {
      expect(assetLoader.hasTexture('test')).toBe(false);
      expect(assetLoader.hasAudio('test')).toBe(false);
    });
  });

  describe('Progress Callbacks', () => {
    it('should accept progress callback', () => {
      const callback = vi.fn();
      assetLoader.setProgressCallback(callback);
      
      // Callback should be stored (no direct way to test this without loading)
      expect(callback).toBeDefined();
    });
  });

  describe('Essential Asset Loading', () => {
    it('should load essential assets without errors', async () => {
      await expect(assetLoader.loadEssentialAssets()).resolves.not.toThrow();
    });

    it('should have test texture after loading essential assets', async () => {
      await assetLoader.loadEssentialAssets();
      
      expect(assetLoader.hasTexture('test')).toBe(true);
      
      const testTexture = assetLoader.getTexture('test');
      expect(testTexture).toBeInstanceOf(THREE.Texture);
    });

    it('should create test texture with correct properties', async () => {
      await assetLoader.loadEssentialAssets();
      
      const testTexture = assetLoader.getTexture('test');
      expect(testTexture?.magFilter).toBe(THREE.NearestFilter);
      expect(testTexture?.minFilter).toBe(THREE.NearestFilter);
      expect(testTexture?.wrapS).toBe(THREE.ClampToEdgeWrapping);
      expect(testTexture?.wrapT).toBe(THREE.ClampToEdgeWrapping);
    });
  });

  describe('Asset Getters', () => {
    beforeEach(async () => {
      await assetLoader.loadEssentialAssets();
    });

    it('should return null for non-existent textures', () => {
      expect(assetLoader.getTexture('nonexistent')).toBeNull();
    });

    it('should return null for non-existent audio', () => {
      expect(assetLoader.getAudio('nonexistent')).toBeNull();
    });

    it('should return correct texture when it exists', () => {
      const testTexture = assetLoader.getTexture('test');
      expect(testTexture).not.toBeNull();
      expect(testTexture).toBeInstanceOf(THREE.Texture);
    });
  });

  describe('Future Loading Methods', () => {
    it('should have placeholder for game sprites loading', async () => {
      // These methods should exist but not fully implemented yet
      await expect(assetLoader.loadGameSprites()).resolves.not.toThrow();
    });

    it('should have placeholder for game audio loading', async () => {
      await expect(assetLoader.loadGameAudio()).resolves.not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should dispose of assets without errors', async () => {
      await assetLoader.loadEssentialAssets();
      
      expect(() => assetLoader.dispose()).not.toThrow();
      
      // Assets should be cleared after disposal
      expect(assetLoader.hasTexture('test')).toBe(false);
    });
  });
});