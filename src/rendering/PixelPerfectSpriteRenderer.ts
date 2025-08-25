import * as THREE from 'three';
import { AssetLoader } from '../assets/AssetLoader';
import { BlockColor, BlockState } from '../game/BlockTypes';

export class PixelPerfectSpriteRenderer {
  private spritesheet: HTMLImageElement | null = null;
  private canvasCache: Map<string, HTMLCanvasElement> = new Map();
  private textureCache: Map<string, THREE.Texture> = new Map();

  constructor(private assetLoader: AssetLoader) {}

  public async initialize(): Promise<void> {
    await this.loadSpritesheet();
    this.generateAllSprites();
  }

  private loadSpritesheet(): Promise<void> {
    return new Promise((resolve, reject) => {
      const texture = this.assetLoader.getTexture('spritesheet');
      if (!texture) {
        reject(new Error('Spritesheet not found'));
        return;
      }

      this.spritesheet = new Image();
      this.spritesheet.onload = (): void => resolve();
      this.spritesheet.onerror = reject;
      this.spritesheet.src = texture.image.src;
    });
  }

  private generateAllSprites(): void {
    if (!this.spritesheet) return;

    const TILE_SIZE = 32;
    const uvs: Record<string, { x: number; y: number }> = {
      purple: { x: 96, y: 0 },
      yellow: { x: 0, y: 0 },
      red: { x: 128, y: 0 },
      cyan: { x: 64, y: 0 },
      green: { x: 32, y: 0 },
    };

    const states: Record<string, { y: number }> = {
      normal: { y: 0 },
      landed: { y: 128 },
      exploding: { y: 160 },
    };

    for (const [colorName] of Object.entries(BlockColor).filter(([k]) => isNaN(Number(k)))) {
      for (const [stateName] of Object.entries(BlockState).filter(([k]) => isNaN(Number(k)))) {
        const uv = uvs[colorName.toLowerCase()];
        const stateY = states[stateName.toLowerCase()]?.y;

        if (uv && stateY !== undefined) {
          const key = `${colorName}-${stateName}`;
          const canvas = this.createPixelPerfectSprite(uv.x, stateY, TILE_SIZE);
          
          if (canvas) {
            this.canvasCache.set(key, canvas);
            
            // Create Three.js texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.flipY = false;
            
            this.textureCache.set(key, texture);
          }
        }
      }
    }
  }

  private createPixelPerfectSprite(sourceX: number, sourceY: number, size: number): HTMLCanvasElement | null {
    if (!this.spritesheet) return null;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Disable image smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;

    // Draw sprite from spritesheet
    ctx.drawImage(
      this.spritesheet,
      sourceX,        // source x
      sourceY,        // source y
      size,           // source width
      size,           // source height
      0,              // dest x
      0,              // dest y
      size,           // dest width
      size            // dest height
    );

    return canvas;
  }

  public getTexture(colorName: string, stateName: string): THREE.Texture | null {
    const key = `${colorName}-${stateName}`;
    return this.textureCache.get(key) || null;
  }

  public getCanvas(colorName: string, stateName: string): HTMLCanvasElement | null {
    const key = `${colorName}-${stateName}`;
    return this.canvasCache.get(key) || null;
  }

  public dispose(): void {
    // Dispose of all textures
    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    
    this.textureCache.clear();
    this.canvasCache.clear();
    this.spritesheet = null;
  }
}