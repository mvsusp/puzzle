import * as THREE from 'three';
import { BlockTextureManager } from '../rendering/BlockTextureManager';

export interface LoadingProgress {
  loaded: number;
  total: number;
  item: string;
}

export class AssetLoader {
  private textureLoader: THREE.TextureLoader;
  private audioLoader: THREE.AudioLoader;
  private loadedTextures: Map<string, THREE.Texture> = new Map();
  private loadedAudio: Map<string, AudioBuffer> = new Map();
  private blockTextureManager: BlockTextureManager;
  
  private onProgressCallback?: (progress: LoadingProgress) => void;
  
  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.audioLoader = new THREE.AudioLoader();
    this.blockTextureManager = new BlockTextureManager();
    
    // Set up texture loader defaults
    this.textureLoader.setPath(`${import.meta.env.BASE_URL}assets/sprites/`);
  }
  
  public setProgressCallback(callback: (progress: LoadingProgress) => void): void {
    this.onProgressCallback = callback;
  }
  
  public async loadEssentialAssets(): Promise<void> {
    // Load block textures and sprites in parallel
    await Promise.all([
      this.loadGameSprites(),
      this.blockTextureManager.preloadAllTextures()
    ]);
    console.log('Essential assets loaded');
  }
  
  private loadTexture(_name: string, url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          // Set up texture properties for pixel-perfect rendering
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          
          resolve(texture);
        },
        undefined, // onProgress
        (error) => reject(error)
      );
    });
  }
  
  private _loadAudio(_name: string, url: string): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      this.audioLoader.load(
        url,
        (audioBuffer) => resolve(audioBuffer),
        undefined, // onProgress
        (error) => reject(error)
      );
    });
  }
  
  private reportProgress(loaded: number, total: number, item: string): void {
    const progress: LoadingProgress = { loaded, total, item };
    
    if (this.onProgressCallback) {
      this.onProgressCallback(progress);
    }
    
    // Update loading screen
    this.updateLoadingScreen(progress);
  }
  
  private updateLoadingScreen(progress: LoadingProgress): void {
    const progressElement = document.getElementById('loadingProgress');
    if (progressElement) {
      const percentage = Math.round((progress.loaded / progress.total) * 100);
      progressElement.textContent = `${percentage}% - Loading ${progress.item}`;
    }
  }
  
  // Asset getters
  public getTexture(name: string): THREE.Texture | null {
    return this.loadedTextures.get(name) || null;
  }
  
  public getAudio(name: string): AudioBuffer | null {
    return this.loadedAudio.get(name) || null;
  }
  
  public hasTexture(name: string): boolean {
    return this.loadedTextures.has(name);
  }
  
  public hasAudio(name: string): boolean {
    return this.loadedAudio.has(name);
  }
  
  public async loadGameSprites(): Promise<void> {
    const assetsToLoad = [
      { type: 'texture', name: 'spritesheet', url: 'sprites.png' },
    ];

    let loaded = 0;
    const total = assetsToLoad.length;

    for (const asset of assetsToLoad) {
      try {
        if (asset.type === 'texture') {
          const texture = await this.loadTexture(asset.name, asset.url);
          this.loadedTextures.set(asset.name, texture);
        }

        loaded++;
        this.reportProgress(loaded, total, asset.name);

      } catch (error) {
        console.warn(`Failed to load asset ${asset.name}:`, error);
        // Still count as loaded to not hang the loading screen
        loaded++;
        this.reportProgress(loaded, total, asset.name);
      }
    }
  }
  
  public async loadGameAudio(): Promise<void> {
    // This will be implemented in later phases
    // Implementation will come in Phase 10
    console.log('Game audio loading will be implemented in Phase 10');
  }
  
  // Get the block texture manager
  public getBlockTextureManager(): BlockTextureManager {
    return this.blockTextureManager;
  }
  
  // Cleanup method
  public dispose(): void {
    // Dispose of all loaded textures
    for (const texture of this.loadedTextures.values()) {
      texture.dispose();
    }
    this.loadedTextures.clear();
    
    // Dispose block textures
    this.blockTextureManager.dispose();
    
    // Clear audio (AudioBuffer doesn't need explicit disposal)
    this.loadedAudio.clear();
    
    console.log('AssetLoader disposed');
  }
}
