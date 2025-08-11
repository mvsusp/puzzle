import * as THREE from 'three';
import { BlockColor } from '../game/BlockTypes';

export interface ParticleConfig {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration?: THREE.Vector3;
  color: THREE.Color;
  size: number;
  lifetime: number;
  fadeOut?: boolean;
  gravity?: boolean;
}

export class Particle {
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public acceleration: THREE.Vector3;
  public color: THREE.Color;
  public size: number;
  public lifetime: number;
  public maxLifetime: number;
  public fadeOut: boolean;
  public gravity: boolean;
  public mesh: THREE.Mesh | null = null;
  public active: boolean = false;

  constructor(config?: Partial<ParticleConfig>) {
    this.position = config?.position?.clone() || new THREE.Vector3();
    this.velocity = config?.velocity?.clone() || new THREE.Vector3();
    this.acceleration = config?.acceleration?.clone() || new THREE.Vector3();
    this.color = config?.color?.clone() || new THREE.Color(0xffffff);
    this.size = config?.size || 4;
    this.lifetime = config?.lifetime || 60;
    this.maxLifetime = this.lifetime;
    this.fadeOut = config?.fadeOut || true;
    this.gravity = config?.gravity || false;
  }

  public reset(config: ParticleConfig): void {
    this.position.copy(config.position);
    this.velocity.copy(config.velocity);
    this.acceleration.copy(config.acceleration || new THREE.Vector3());
    this.color.copy(config.color);
    this.size = config.size;
    this.lifetime = config.lifetime;
    this.maxLifetime = this.lifetime;
    this.fadeOut = config.fadeOut !== false;
    this.gravity = config.gravity || false;
    this.active = true;

    // Apply gravity if enabled
    if (this.gravity) {
      this.acceleration.y = -0.5; // Gravity acceleration
    }
  }

  public update(): boolean {
    if (!this.active) return false;

    // Update physics
    this.velocity.add(this.acceleration);
    this.position.add(this.velocity);

    // Update lifetime
    this.lifetime--;

    // Update mesh if available
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      // Keep particles above blocks
      this.mesh.position.z = 10;
      
      // Update material opacity based on lifetime for fade out
      if (this.fadeOut && this.mesh.material) {
        const material = this.mesh.material as THREE.MeshBasicMaterial;
        const alpha = this.lifetime / this.maxLifetime;
        material.opacity = alpha;
      }

      // Update scale based on lifetime for size animation
      const scale = Math.max(0.1, this.lifetime / this.maxLifetime);
      this.mesh.scale.setScalar(scale);
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
    // Ensure particles appear above blocks
    this.mesh.position.z = 10;
    
    if (this.mesh.material) {
      const material = this.mesh.material as THREE.MeshBasicMaterial;
      material.color.copy(this.color);
      material.transparent = true;
      material.opacity = 1.0;
    }
  }

  public dispose(): void {
    this.active = false;
    this.mesh = null;
  }
}

export class ParticlePool {
  private particles: Particle[] = [];
  private availableParticles: Particle[] = [];
  private activeParticles: Particle[] = [];
  private maxParticles: number;
  private particleGeometry: THREE.CircleGeometry;
  private particleMaterials: Map<string, THREE.MeshBasicMaterial> = new Map();

  constructor(maxParticles: number = 200) {
    this.maxParticles = maxParticles;
    // Use CircleGeometry for round particles instead of square PlaneGeometry
    this.particleGeometry = new THREE.CircleGeometry(2, 8); // radius 2, 8 segments

    // Pre-allocate particle pool
    for (let i = 0; i < maxParticles; i++) {
      const particle = new Particle();
      this.particles.push(particle);
      this.availableParticles.push(particle);
    }

    // Create materials for different colors
    this.initializeMaterials();
  }

  private initializeMaterials(): void {
    // Basic white material
    const whiteMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      side: THREE.FrontSide, // Only render front face
      alphaTest: 0.1 // Remove transparent pixels
    });
    this.particleMaterials.set('white', whiteMaterial);

    // Block color materials
    const blockColors = {
      purple: 0x9932cc,
      yellow: 0xffd700,
      red: 0xff4444,
      cyan: 0x00bfff,
      green: 0x32cd32
    };

    Object.entries(blockColors).forEach(([name, color]) => {
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1.0,
        side: THREE.FrontSide, // Only render front face
        alphaTest: 0.1 // Remove transparent pixels
      });
      this.particleMaterials.set(name, material);
    });
  }

  public getParticle(config: ParticleConfig): Particle | null {
    if (this.availableParticles.length === 0) {
      // Pool exhausted, try to recycle oldest active particle
      if (this.activeParticles.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const oldest = this.activeParticles.shift()!; // Safe: length checked above
        this.recycleParticle(oldest);
      } else {
        return null; // No particles available
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const particle = this.availableParticles.pop()!; // Safe: length guaranteed by above logic
    particle.reset(config);
    this.activeParticles.push(particle);

    return particle;
  }

  public createParticleMesh(particle: Particle, parent: THREE.Group): THREE.Mesh {
    // Get or create material
    const materialKey = this.getColorMaterialKey(particle.color);
    let material = this.particleMaterials.get(materialKey);
    
    if (!material) {
      material = new THREE.MeshBasicMaterial({
        color: particle.color,
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide
      });
      this.particleMaterials.set(materialKey, material);
    }

    const mesh = new THREE.Mesh(this.particleGeometry, material.clone());
    mesh.scale.setScalar(particle.size / 2); // Increased scale for better visibility
    mesh.renderOrder = 1000; // Ensure particles render on top
    particle.setMesh(mesh);
    parent.add(mesh);

    return mesh;
  }

  private getColorMaterialKey(color: THREE.Color): string {
    return `#${color.getHexString()}`;
  }

  public update(): void {
    // Update all active particles
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const particle = this.activeParticles[i];
      
      if (!particle.update()) {
        // Particle is done, recycle it
        this.activeParticles.splice(i, 1);
        this.recycleParticle(particle);
      }
    }
  }

  private recycleParticle(particle: Particle): void {
    // Hide and remove mesh
    if (particle.mesh) {
      particle.mesh.visible = false;
      particle.mesh.parent?.remove(particle.mesh);
      
      // Dispose of cloned material
      if (particle.mesh.material instanceof THREE.Material) {
        particle.mesh.material.dispose();
      }
    }

    particle.dispose();
    this.availableParticles.push(particle);
  }

  public getActiveCount(): number {
    return this.activeParticles.length;
  }

  public getAvailableCount(): number {
    return this.availableParticles.length;
  }

  public dispose(): void {
    // Clear all particles
    this.activeParticles.forEach(particle => this.recycleParticle(particle));
    this.activeParticles = [];
    this.availableParticles = [];
    this.particles = [];

    // Dispose geometry
    this.particleGeometry.dispose();

    // Dispose materials
    this.particleMaterials.forEach(material => material.dispose());
    this.particleMaterials.clear();
  }
}

export class ParticleSystem {
  private particlePool: ParticlePool;
  private effectsGroup: THREE.Group;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, maxParticles: number = 200) {
    this.scene = scene;
    this.particlePool = new ParticlePool(maxParticles);
    this.effectsGroup = new THREE.Group();
    this.effectsGroup.name = 'ParticleEffects';
    scene.add(this.effectsGroup);
  }

  public createBlockExplosionParticles(
    position: THREE.Vector3,
    blockColor: BlockColor,
    particleCount: number = 8
  ): void {
    const color = this.getBlockColor(blockColor);
    console.log(`Creating ${particleCount} explosion particles at`, position, 'color:', color.getHexString());

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed + Math.random() * 2, // Add upward bias
        0
      );

      const particle = this.particlePool.getParticle({
        position: position.clone(),
        velocity,
        color,
        size: 12 + Math.random() * 8, // Doubled particle size
        lifetime: 30 + Math.random() * 20,
        gravity: true,
        fadeOut: true
      });

      if (particle) {
        this.particlePool.createParticleMesh(particle, this.effectsGroup);
      }
    }
  }

  public createMatchFlashParticles(
    position: THREE.Vector3,
    blockColor: BlockColor,
    particleCount: number = 12
  ): void {
    const color = this.getBlockColor(blockColor);
    color.multiplyScalar(1.5); // Brighten for flash effect

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0
      );

      const particle = this.particlePool.getParticle({
        position: position.clone(),
        velocity,
        color,
        size: 3 + Math.random() * 2,
        lifetime: 20 + Math.random() * 10,
        gravity: false,
        fadeOut: true
      });

      if (particle) {
        this.particlePool.createParticleMesh(particle, this.effectsGroup);
      }
    }
  }

  public createChainEffectParticles(
    positions: THREE.Vector3[],
    chainLength: number
  ): void {
    const color = new THREE.Color(0xffd700); // Gold for chains
    color.lerp(new THREE.Color(0xff4444), Math.min(chainLength / 10, 1)); // Red tint for high chains

    positions.forEach(position => {
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        
        const velocity = new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed + 3, // Strong upward movement
          0
        );

        const particle = this.particlePool.getParticle({
          position: position.clone(),
          velocity,
          color: color.clone(),
          size: 4 + Math.random() * 3,
          lifetime: 40 + Math.random() * 20,
          gravity: true,
          fadeOut: true
        });

        if (particle) {
          this.particlePool.createParticleMesh(particle, this.effectsGroup);
        }
      }
    });
  }

  private getBlockColor(blockColor: BlockColor): THREE.Color {
    switch (blockColor) {
      case BlockColor.PURPLE: return new THREE.Color(0x9932cc);
      case BlockColor.YELLOW: return new THREE.Color(0xffd700);
      case BlockColor.RED: return new THREE.Color(0xff4444);
      case BlockColor.CYAN: return new THREE.Color(0x00bfff);
      case BlockColor.GREEN: return new THREE.Color(0x32cd32);
      default: return new THREE.Color(0xffffff);
    }
  }

  public tick(): void {
    this.particlePool.update();
  }

  public getDebugInfo(): string {
    return `Particles: ${this.particlePool.getActiveCount()}/${this.particlePool.getActiveCount() + this.particlePool.getAvailableCount()}`;
  }

  public dispose(): void {
    this.particlePool.dispose();
    
    // Remove effects group from scene
    this.scene.remove(this.effectsGroup);
    
    // Clear effects group
    while (this.effectsGroup.children.length > 0) {
      const child = this.effectsGroup.children[0];
      this.effectsGroup.remove(child);
    }
  }
}