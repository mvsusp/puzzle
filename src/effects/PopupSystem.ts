import * as THREE from 'three';

export interface PopupConfig {
  position: THREE.Vector3;
  text: string;
  color?: THREE.Color;
  fontSize?: number;
  lifetime?: number;
  fadeOut?: boolean;
  moveUp?: boolean;
  scale?: number;
}

export class Popup {
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public text: string;
  public color: THREE.Color;
  public fontSize: number;
  public lifetime: number;
  public maxLifetime: number;
  public fadeOut: boolean;
  public moveUp: boolean;
  public scale: number;
  public mesh: THREE.Mesh | null = null;
  public active: boolean = false;

  private initialScale: number;

  constructor(config?: Partial<PopupConfig>) {
    this.position = config?.position?.clone() || new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.text = config?.text || '';
    this.color = config?.color?.clone() || new THREE.Color(0xffffff);
    this.fontSize = config?.fontSize || 16;
    this.lifetime = config?.lifetime || 90; // ~1.5 seconds at 60fps
    this.maxLifetime = this.lifetime;
    this.fadeOut = config?.fadeOut !== false;
    this.moveUp = config?.moveUp !== false;
    this.scale = config?.scale || 1.0;
    this.initialScale = this.scale;

    if (this.moveUp) {
      this.velocity.y = 1; // Move upward
    }
  }

  public reset(config: PopupConfig): void {
    this.position.copy(config.position);
    this.velocity.set(0, 0, 0);
    this.text = config.text;
    this.color.copy(config.color || new THREE.Color(0xffffff));
    this.fontSize = config.fontSize || 16;
    this.lifetime = config.lifetime || 90;
    this.maxLifetime = this.lifetime;
    this.fadeOut = config.fadeOut !== false;
    this.moveUp = config.moveUp !== false;
    this.scale = config.scale || 1.0;
    this.initialScale = this.scale;
    this.active = true;

    if (this.moveUp) {
      this.velocity.y = 1; // Move upward
    }
  }

  public update(): boolean {
    if (!this.active) return false;

    // Update position
    this.position.add(this.velocity);

    // Gradually slow down movement
    this.velocity.multiplyScalar(0.98);

    // Update lifetime
    this.lifetime--;

    // Update mesh if available
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      
      // Update material opacity for fade out
      if (this.fadeOut && this.mesh.material) {
        const material = this.mesh.material as THREE.MeshBasicMaterial;
        const alpha = this.lifetime / this.maxLifetime;
        material.opacity = alpha;
      }

      // Scale animation - grow initially, then shrink
      const lifetimeRatio = this.lifetime / this.maxLifetime;
      let scaleMultiplier = 1.0;
      
      if (lifetimeRatio > 0.8) {
        // Growing phase (first 20% of lifetime)
        scaleMultiplier = 1.0 + (1.0 - lifetimeRatio) * 2; // Grows up to 1.4x
      } else if (lifetimeRatio < 0.2) {
        // Shrinking phase (last 20% of lifetime)
        scaleMultiplier = lifetimeRatio * 5; // Shrinks down to 0x
      }

      this.mesh.scale.setScalar(this.initialScale * scaleMultiplier);
    }

    // Deactivate if lifetime expired
    if (this.lifetime <= 0) {
      this.active = false;
      return false;
    }

    return true;
  }

  public setMesh(mesh: THREE.Mesh): void {
    this.mesh = mesh;
    this.mesh.position.copy(this.position);
    // Ensure popup appears above everything else
    this.mesh.position.z = 20;
  }

  public dispose(): void {
    this.active = false;
    this.mesh = null;
  }
}

export class PopupPool {
  private popups: Popup[] = [];
  private availablePopups: Popup[] = [];
  private activePopups: Popup[] = [];
  private maxPopups: number;

  // Canvas for text rendering
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private textureCache: Map<string, THREE.Texture> = new Map();

  constructor(maxPopups: number = 50) {
    this.maxPopups = maxPopups;

    // Create canvas for text rendering
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 64;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.context = this.canvas.getContext('2d')!; // Safe: always available

    // Pre-allocate popup pool
    for (let i = 0; i < maxPopups; i++) {
      const popup = new Popup();
      this.popups.push(popup);
      this.availablePopups.push(popup);
    }
  }

  public getPopup(config: PopupConfig): Popup | null {
    if (this.availablePopups.length === 0) {
      // Pool exhausted, try to recycle oldest active popup
      if (this.activePopups.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const oldest = this.activePopups.shift()!; // Safe: length checked above
        this.recyclePopup(oldest);
      } else {
        return null; // No popups available
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const popup = this.availablePopups.pop()!; // Safe: length guaranteed by above logic
    popup.reset(config);
    this.activePopups.push(popup);

    return popup;
  }

  public createPopupMesh(popup: Popup, parent: THREE.Group): THREE.Mesh {
    // Create or get cached texture for the text
    const textureKey = `${popup.text}_${popup.fontSize}_${popup.color.getHexString()}`;
    let texture = this.textureCache.get(textureKey);

    if (!texture) {
      texture = this.createTextTexture(popup.text, popup.fontSize, popup.color);
      this.textureCache.set(textureKey, texture);
    }

    // Create material with the text texture
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide,
      alphaTest: 0.1 // Skip fully transparent pixels
    });

    // Create geometry sized to the text - make it much larger
    const aspectRatio = texture.image.width / texture.image.height;
    const width = popup.fontSize * aspectRatio * 2.0; // Increased from 0.5 to 2.0
    const height = popup.fontSize * 2.0; // Increased from 0.5 to 2.0
    
    const geometry = new THREE.PlaneGeometry(width, height);
    const mesh = new THREE.Mesh(geometry, material);
    
    // Set high z-position and render order for visibility
    mesh.position.z = 20; // Much higher than particles (10) and blocks (1)
    mesh.renderOrder = 2000; // Highest render order
    
    console.log(`Creating popup: "${popup.text}" at position`, popup.position, 'size:', width, 'x', height);
    
    popup.setMesh(mesh);
    parent.add(mesh);

    return mesh;
  }

  private createTextTexture(text: string, fontSize: number, color: THREE.Color): THREE.Texture {
    // Clear canvas
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Set font properties
    this.context.font = `bold ${fontSize}px Arial, sans-serif`;
    this.context.fillStyle = `#${color.getHexString()}`;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';

    // Add text outline for better visibility
    this.context.strokeStyle = '#000000';
    this.context.lineWidth = 3;
    this.context.strokeText(text, this.canvas.width / 2, this.canvas.height / 2);
    
    // Fill text
    this.context.fillText(text, this.canvas.width / 2, this.canvas.height / 2);

    // Create texture
    const texture = new THREE.CanvasTexture(this.canvas);
    texture.needsUpdate = true;

    return texture;
  }

  public update(): void {
    // Update all active popups
    for (let i = this.activePopups.length - 1; i >= 0; i--) {
      const popup = this.activePopups[i];
      
      if (!popup.update()) {
        // Popup is done, recycle it
        this.activePopups.splice(i, 1);
        this.recyclePopup(popup);
      }
    }
  }

  private recyclePopup(popup: Popup): void {
    // Hide and remove mesh
    if (popup.mesh) {
      popup.mesh.visible = false;
      popup.mesh.parent?.remove(popup.mesh);
      
      // Dispose of material and geometry
      if (popup.mesh.material instanceof THREE.Material) {
        popup.mesh.material.dispose();
      }
      if (popup.mesh.geometry) {
        popup.mesh.geometry.dispose();
      }
    }

    popup.dispose();
    this.availablePopups.push(popup);
  }

  public getActiveCount(): number {
    return this.activePopups.length;
  }

  public getAvailableCount(): number {
    return this.availablePopups.length;
  }

  public dispose(): void {
    // Clear all popups
    this.activePopups.forEach(popup => this.recyclePopup(popup));
    this.activePopups = [];
    this.availablePopups = [];
    this.popups = [];

    // Dispose cached textures
    this.textureCache.forEach(texture => texture.dispose());
    this.textureCache.clear();
  }
}

export class PopupSystem {
  private popupPool: PopupPool;
  private popupGroup: THREE.Group;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, maxPopups: number = 50) {
    this.scene = scene;
    this.popupPool = new PopupPool(maxPopups);
    this.popupGroup = new THREE.Group();
    this.popupGroup.name = 'PopupEffects';
    scene.add(this.popupGroup);
  }

  public showChainPopup(position: THREE.Vector3, chainLength: number): void {
    const color = this.getChainColor(chainLength);
    const text = `${chainLength}x CHAIN`;
    const fontSize = Math.min(32 + chainLength * 4, 48); // Much larger: 32-48px instead of 20-32px

    const popup = this.popupPool.getPopup({
      position: position.clone().add(new THREE.Vector3(0, 40, 0)), // Higher position
      text,
      color,
      fontSize,
      lifetime: 90 + chainLength * 5, // Longer display for higher chains
      moveUp: true,
      scale: 1.0
    });

    if (popup) {
      this.popupPool.createPopupMesh(popup, this.popupGroup);
    }
  }

  public showComboPopup(position: THREE.Vector3, comboSize: number): void {
    const color = this.getComboColor(comboSize);
    const text = `${comboSize} COMBO`;
    const fontSize = Math.min(30 + comboSize * 2, 42); // Much larger: 30-42px instead of 18-28px

    const popup = this.popupPool.getPopup({
      position: position.clone().add(new THREE.Vector3(0, 20, 0)), // Higher position
      text,
      color,
      fontSize,
      lifetime: 75 + comboSize * 3,
      moveUp: true,
      scale: 1.0 // Full scale instead of 0.9
    });

    if (popup) {
      this.popupPool.createPopupMesh(popup, this.popupGroup);
    }
  }

  public showScorePopup(position: THREE.Vector3, score: number): void {
    const color = new THREE.Color(0xffd700); // Gold
    const text = `+${score}`;
    const fontSize = 24; // Increased from 16 to 24

    const popup = this.popupPool.getPopup({
      position: position.clone().add(new THREE.Vector3(0, -20, 0)), // Lower position
      text,
      color,
      fontSize,
      lifetime: 60,
      moveUp: true,
      scale: 1.0 // Full scale instead of 0.8
    });

    if (popup) {
      this.popupPool.createPopupMesh(popup, this.popupGroup);
    }
  }

  public showSpecialEffectPopup(position: THREE.Vector3, text: string, color?: THREE.Color): void {
    const popupColor = color || new THREE.Color(0xff44ff); // Magenta default
    const fontSize = 36; // Increased from 24 to 36

    const popup = this.popupPool.getPopup({
      position: position.clone(),
      text,
      color: popupColor,
      fontSize,
      lifetime: 120, // 2 seconds
      moveUp: true,
      scale: 1.5 // Even bigger for special events
    });

    if (popup) {
      this.popupPool.createPopupMesh(popup, this.popupGroup);
    }
  }

  private getChainColor(chainLength: number): THREE.Color {
    if (chainLength <= 2) return new THREE.Color(0x00ff00); // Green
    if (chainLength <= 4) return new THREE.Color(0xffff00); // Yellow
    if (chainLength <= 6) return new THREE.Color(0xff8800); // Orange
    if (chainLength <= 8) return new THREE.Color(0xff4400); // Red
    return new THREE.Color(0xff00ff); // Magenta for super high chains
  }

  private getComboColor(comboSize: number): THREE.Color {
    if (comboSize <= 4) return new THREE.Color(0x00ffff); // Cyan
    if (comboSize <= 8) return new THREE.Color(0x44ff44); // Light green
    if (comboSize <= 12) return new THREE.Color(0xffff44); // Light yellow
    return new THREE.Color(0xff4444); // Light red for big combos
  }

  public tick(): void {
    this.popupPool.update();
  }

  public getDebugInfo(): string {
    return `Popups: ${this.popupPool.getActiveCount()}/${this.popupPool.getActiveCount() + this.popupPool.getAvailableCount()}`;
  }

  public dispose(): void {
    this.popupPool.dispose();
    
    // Remove popup group from scene
    this.scene.remove(this.popupGroup);
    
    // Clear popup group
    while (this.popupGroup.children.length > 0) {
      const child = this.popupGroup.children[0];
      this.popupGroup.remove(child);
    }
  }
}