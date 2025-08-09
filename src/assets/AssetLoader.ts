import * as THREE from 'three';

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
  
  private onProgressCallback?: (progress: LoadingProgress) => void;
  
  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.audioLoader = new THREE.AudioLoader();
    
    // Set up texture loader defaults
    this.textureLoader.setPath('/assets/sprites/');
  }
  
  public setProgressCallback(callback: (progress: LoadingProgress) => void): void {
    this.onProgressCallback = callback;
  }
  
  public async loadEssentialAssets(): Promise<void> {
    const assetsToLoad = [
      // Test texture for Phase 1 - we'll create a simple colored square
      { type: 'texture', name: 'test', url: this.createTestTexture() },
    ];
    
    let loaded = 0;
    const total = assetsToLoad.length;
    
    for (const asset of assetsToLoad) {
      try {
        if (asset.type === 'texture') {
          if (typeof asset.url === 'string') {
            const texture = await this.loadTexture(asset.name, asset.url);
            this.loadedTextures.set(asset.name, texture);
          } else {
            // Handle the test texture case
            this.loadedTextures.set(asset.name, asset.url as THREE.Texture);
          }
        }
        
        loaded++;
        this.reportProgress(loaded, total, asset.name);
        
      } catch (error) {
        console.warn(`Failed to load asset ${asset.name}:`, error);
        loaded++;
        this.reportProgress(loaded, total, asset.name);
      }
    }
    
    console.log('Essential assets loaded');
  }
  
  private createTestTexture(): THREE.Texture {
    // Create a simple test texture programmatically
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not create 2D context for test texture');
    }
    
    // Create a colorful test pattern
    const gradient = context.createLinearGradient(0, 0, 64, 64);
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(0.5, '#4ecdc4');
    gradient.addColorStop(1, '#45b7d1');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    
    // Add border
    context.strokeStyle = '#ffffff';
    context.lineWidth = 2;
    context.strokeRect(0, 0, 64, 64);
    
    // Add text
    context.fillStyle = '#ffffff';
    context.font = '12px monospace';
    context.textAlign = 'center';
    context.fillText('TEST', 32, 20);
    context.fillText('SPRITE', 32, 35);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    
    return texture;
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
  
  // Future methods for loading game assets
  public async loadGameSprites(): Promise<void> {
    // This will be implemented in later phases
    // Implementation will come in Phase 2
    console.log('Game sprites loading will be implemented in Phase 2');
  }
  
  public async loadGameAudio(): Promise<void> {
    // This will be implemented in later phases
    // Implementation will come in Phase 10
    console.log('Game audio loading will be implemented in Phase 10');
  }
  
  // Cleanup method
  public dispose(): void {
    // Dispose of all loaded textures
    for (const texture of this.loadedTextures.values()) {
      texture.dispose();
    }
    this.loadedTextures.clear();
    
    // Clear audio (AudioBuffer doesn't need explicit disposal)
    this.loadedAudio.clear();
    
    console.log('AssetLoader disposed');
  }
}