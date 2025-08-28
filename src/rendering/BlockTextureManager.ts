import * as THREE from 'three';
import { BlockColor, BlockState } from '../game/BlockTypes';

export class BlockTextureManager {
  private textureLoader: THREE.TextureLoader;
  private textureCache: Map<string, THREE.Texture> = new Map();
  private loadingPromises: Map<string, Promise<THREE.Texture>> = new Map();
  private basePath: string = `${import.meta.env.BASE_URL}assets/sprites/blocks/`;
  
  constructor() {
    this.textureLoader = new THREE.TextureLoader();
  }
  
  /**
   * Get texture key for a specific block color and state
   */
  private getTextureKey(color: BlockColor, state: BlockState): string {
    const colorName = BlockColor[color].toLowerCase();
    const stateName = state; // BlockState values are already lowercase strings
    return `${colorName}-${stateName}`;
  }
  
  /**
   * Get file path for a specific block texture
   */
  private getTexturePath(color: BlockColor, state: BlockState): string {
    const colorName = BlockColor[color].toLowerCase();
    
    // Map states to folder structure
    let folder = 'normal';
    let filename = `${colorName}.png`;
    
    if (state === BlockState.MATCHED) {
      folder = 'landed';
      filename = `${colorName}-landed.png`;
    } else if (state === BlockState.EXPLODING) {
      folder = 'blink';
      filename = `${colorName}-blink.png`;
    }
    
    return `${this.basePath}${folder}/${filename}`;
  }
  
  /**
   * Load a texture for a specific block color and state
   */
  private loadTexture(color: BlockColor, state: BlockState): Promise<THREE.Texture> {
    const key = this.getTextureKey(color, state);
    
    // Check if already loading
    const existingPromise = this.loadingPromises.get(key);
    if (existingPromise) {
      return existingPromise;
    }
    
    // Create loading promise
    const promise = new Promise<THREE.Texture>((resolve, reject) => {
      const path = this.getTexturePath(color, state);
      
      this.textureLoader.load(
        path,
        (texture) => {
          // Configure texture for pixel-perfect rendering
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.generateMipmaps = false;
          texture.premultiplyAlpha = false;
          texture.colorSpace = THREE.SRGBColorSpace;
          
          // Cache the texture
          this.textureCache.set(key, texture);
          this.loadingPromises.delete(key);
          
          resolve(texture);
        },
        undefined,
        (error) => {
          console.error(`Failed to load texture: ${path}`, error);
          this.loadingPromises.delete(key);
          reject(error);
        }
      );
    });
    
    this.loadingPromises.set(key, promise);
    return promise;
  }
  
  /**
   * Get a texture for a specific block color and state
   * Returns null if not loaded yet
   */
  public getTexture(color: BlockColor, state: BlockState): THREE.Texture | null {
    const key = this.getTextureKey(color, state);
    return this.textureCache.get(key) || null;
  }
  
  /**
   * Preload all block textures
   */
  public async preloadAllTextures(): Promise<void> {
    const promises: Promise<THREE.Texture>[] = [];
    
    // Load all combinations of colors and states
    const colors = [
      BlockColor.RED,
      BlockColor.GREEN,
      BlockColor.CYAN,
      BlockColor.YELLOW,
      BlockColor.PURPLE
    ];
    
    const states = [
      BlockState.NORMAL,
      BlockState.MATCHED,
      BlockState.EXPLODING
    ];
    
    for (const color of colors) {
      for (const state of states) {
        promises.push(this.loadTexture(color, state));
      }
    }
    
    try {
      await Promise.all(promises);
      console.log(`Loaded ${promises.length} block textures successfully`);
    } catch (error) {
      console.error('Failed to preload some textures:', error);
    }
  }
  
  /**
   * Get or load a texture (async version)
   */
  public async getTextureAsync(color: BlockColor, state: BlockState): Promise<THREE.Texture> {
    const key = this.getTextureKey(color, state);
    
    // Return cached texture if available
    const cachedTexture = this.textureCache.get(key);
    if (cachedTexture) {
      return cachedTexture;
    }
    
    // Load the texture
    return this.loadTexture(color, state);
  }
  
  /**
   * Create a material from a texture
   */
  public createMaterial(texture: THREE.Texture): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({
      map: texture,
      transparent: true,
      opacity: 1.0,
      emissive: 0x000000,
      side: THREE.FrontSide,
    });
  }
  
  /**
   * Get a material for a specific block color and state
   */
  public getMaterial(color: BlockColor, state: BlockState): THREE.MeshLambertMaterial | null {
    const texture = this.getTexture(color, state);
    if (!texture) return null;
    
    return this.createMaterial(texture);
  }
  
  /**
   * Dispose of all loaded textures
   */
  public dispose(): void {
    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    this.textureCache.clear();
    this.loadingPromises.clear();
  }
}
