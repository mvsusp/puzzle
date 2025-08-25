import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PixelPerfectSpriteRenderer } from '../../../src/rendering/PixelPerfectSpriteRenderer';
import { AssetLoader } from '../../../src/assets/AssetLoader';
import * as THREE from 'three';

// Mock DOM elements
Object.defineProperty(window, 'HTMLImageElement', {
  writable: true,
  value: class MockImage {
    public onload: (() => void) | null = null;
    public onerror: ((error: Event) => void) | null = null;
    public src: string = '';
    
    constructor() {
      // Simulate successful image load after a short delay
      setTimeout(() => {
        if (this.onload) {
          this.onload();
        }
      }, 10);
    }
  }
});

// Mock document.createElement for canvas
const mockCanvas = {
  width: 32,
  height: 32,
  getContext: vi.fn().mockReturnValue({
    imageSmoothingEnabled: true,
    drawImage: vi.fn(),
  }),
};

Object.defineProperty(document, 'createElement', {
  writable: true,
  value: vi.fn().mockImplementation((tagName: string) => {
    if (tagName === 'canvas') {
      return mockCanvas;
    }
    return {};
  }),
});

describe.skip('PixelPerfectSpriteRenderer', () => {
  let renderer: PixelPerfectSpriteRenderer;
  let assetLoader: AssetLoader;
  let mockTexture: THREE.Texture;

  beforeEach(() => {
    assetLoader = new AssetLoader();
    renderer = new PixelPerfectSpriteRenderer(assetLoader);
    
    // Create a mock texture with a fake image
    const image = new Image();
    image.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    mockTexture = new THREE.Texture(image);
    mockTexture.image = { src: 'test-sprite.png', width: 640, height: 480 };
    
    // Mock the assetLoader to return our test texture
    vi.spyOn(assetLoader, 'getTexture').mockReturnValue(mockTexture);
  });

  describe('Initialization', () => {
    it('should create PixelPerfectSpriteRenderer instance', () => {
      expect(renderer).toBeDefined();
      expect(renderer).toBeInstanceOf(PixelPerfectSpriteRenderer);
    });

    it('should initialize without errors', async () => {
      await expect(renderer.initialize()).resolves.not.toThrow();
    }, 1000);

    it('should handle missing spritesheet gracefully', async () => {
      vi.spyOn(assetLoader, 'getTexture').mockReturnValue(null);
      
      await expect(renderer.initialize()).rejects.toThrow('Spritesheet not found');
    });
  });

  describe('Texture Generation', () => {
    beforeEach(async () => {
      await renderer.initialize();
    }, 2000);

    it('should generate textures for valid color/state combinations', () => {
      const texture = renderer.getTexture('PURPLE', 'NORMAL');
      expect(texture).toBeInstanceOf(THREE.Texture);
    });

    it('should return null for invalid combinations', () => {
      const texture = renderer.getTexture('INVALID', 'NORMAL');
      expect(texture).toBeNull();
    });

    it('should generate canvas for valid combinations', () => {
      const canvas = renderer.getCanvas('YELLOW', 'EXPLODING');
      expect(canvas).toBeTruthy();
    });
  });

  describe('Cleanup', () => {
    it('should dispose without errors', async () => {
      await renderer.initialize();
      expect(() => renderer.dispose()).not.toThrow();
    });

    it('should handle dispose before initialization', () => {
      expect(() => renderer.dispose()).not.toThrow();
    });
  });
});