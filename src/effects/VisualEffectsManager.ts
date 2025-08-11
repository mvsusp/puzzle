import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';
import { PopupSystem } from './PopupSystem';
import { ScreenShakeManager } from './ScreenShake';
import { Board } from '../game/Board';
import { Block } from '../game/Block';
import { TileType } from '../game/BlockTypes';

export interface EffectsConfig {
  enableParticles: boolean;
  enablePopups: boolean;
  enableScreenShake: boolean;
  particleCount: number;
  maxPopups: number;
}

export interface MatchEventData {
  blocks: Block[];
  positions: THREE.Vector3[];
  isChain: boolean;
  chainLength?: number;
  comboSize?: number;
  score?: number;
}

export interface GarbageEventData {
  position: THREE.Vector3;
  size: number;
  type: 'transform' | 'fall' | 'trigger';
}

export class VisualEffectsManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private board: Board;
  
  // Effect systems
  private particleSystem: ParticleSystem;
  private popupSystem: PopupSystem;
  private screenShakeManager: ScreenShakeManager;
  
  private config: EffectsConfig;
  private isEnabled: boolean = true;
  private panicMode: boolean = false;

  // Warning system
  private warningIndicators: THREE.Mesh[] = [];
  private warningMaterials: THREE.MeshBasicMaterial[] = [];
  private warningBlinkTimer: number = 0;

  // Flash effects
  private flashMeshes: THREE.Mesh[] = [];
  private flashTimer: number = 0;

  constructor(
    scene: THREE.Scene, 
    camera: THREE.Camera, 
    board: Board, 
    config?: Partial<EffectsConfig>
  ) {
    this.scene = scene;
    this.camera = camera;
    this.board = board;

    // Default configuration
    this.config = {
      enableParticles: true,
      enablePopups: true,
      enableScreenShake: true,
      particleCount: 200,
      maxPopups: 50,
      ...config
    };

    // Initialize effect systems
    this.particleSystem = new ParticleSystem(scene, this.config.particleCount);
    this.popupSystem = new PopupSystem(scene, this.config.maxPopups);
    this.screenShakeManager = new ScreenShakeManager(camera);

    this.initializeWarningSystem();
  }

  private initializeWarningSystem(): void {
    // Create warning indicators for the top visible row
    const boardWidth = Board.BOARD_WIDTH;
    const tileSize = 32;
    const warningY = (Board.TOP_ROW) * tileSize - ((Board.TOP_ROW + 1) * tileSize) / 2 + tileSize / 2;

    for (let col = 0; col < boardWidth; col++) {
      // Create warning indicator geometry
      const geometry = new THREE.PlaneGeometry(tileSize * 0.8, tileSize * 0.8);
      const material = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        col * tileSize - (boardWidth * tileSize) / 2 + tileSize / 2,
        warningY,
        0.5 // Behind blocks but in front of grid
      );
      mesh.name = `WarningIndicator_${col}`;
      mesh.visible = false;

      this.warningIndicators.push(mesh);
      this.warningMaterials.push(material);
      this.scene.add(mesh);
    }
  }

  // Handle block match events
  public onBlockMatch(eventData: MatchEventData): void {
    if (!this.isEnabled) return;

    const { blocks, positions, isChain, chainLength, comboSize, score } = eventData;

    // Create explosion particles for each matched block
    if (this.config.enableParticles && blocks.length > 0) {
      blocks.forEach((block, index) => {
        if (index < positions.length) {
          this.particleSystem.createBlockExplosionParticles(
            positions[index],
            block.color,
            6 + Math.min(blocks.length, 4) // More particles for bigger matches
          );

          // Add match flash particles
          this.particleSystem.createMatchFlashParticles(
            positions[index],
            block.color,
            8
          );
        }
      });

      // Create chain effect particles if it's a chain
      if (isChain && chainLength && chainLength > 1) {
        this.particleSystem.createChainEffectParticles(positions, chainLength);
      }
    }

    // Show popups
    if (this.config.enablePopups && positions.length > 0) {
      const centerPosition = this.calculateCenterPosition(positions);

      // Show chain popup
      if (isChain && chainLength && chainLength > 1) {
        this.popupSystem.showChainPopup(centerPosition, chainLength);
      }

      // Show combo popup
      if (comboSize && comboSize > 1) {
        this.popupSystem.showComboPopup(
          centerPosition.clone().add(new THREE.Vector3(0, isChain ? 25 : 0, 0)), 
          comboSize
        );
      }

      // Show score popup
      if (score && score > 0) {
        this.popupSystem.showScorePopup(
          centerPosition.clone().add(new THREE.Vector3(0, -15, 0)), 
          score
        );
      }
    }

    // Screen shake effects
    if (this.config.enableScreenShake) {
      if (isChain && chainLength && chainLength > 1) {
        this.screenShakeManager.shakeForChain(chainLength);
      }
      if (comboSize && comboSize > 3) {
        this.screenShakeManager.shakeForCombo(comboSize);
      }
    }

    // Flash effect disabled - only particles now
    // this.triggerMatchFlash(positions);
  }

  // Handle garbage block events
  public onGarbageEvent(eventData: GarbageEventData): void {
    if (!this.isEnabled) return;

    const { position, size, type } = eventData;

    if (type === 'transform' && this.config.enableScreenShake) {
      this.screenShakeManager.shakeForGarbageTransform(size);
    }

    if (type === 'transform' && this.config.enableParticles) {
      // Create transformation particles
      const particleCount = Math.min(size * 2, 20);
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        
        const velocity = new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed + 1,
          0
        );

        // Use gray/white particles for garbage
        const particle = this.particleSystem['particlePool'].getParticle({
          position: position.clone(),
          velocity,
          color: new THREE.Color(0x888888),
          size: 4 + Math.random() * 2,
          lifetime: 40 + Math.random() * 20,
          gravity: true,
          fadeOut: true
        });

        if (particle) {
          this.particleSystem['particlePool'].createParticleMesh(
            particle, 
            this.particleSystem['effectsGroup']
          );
        }
      }
    }
  }

  // Handle special events
  public onSpecialEvent(eventType: string, data?: { level?: number }): void {
    if (!this.isEnabled) return;

    switch (eventType) {
      case 'panic_start':
        this.setPanicMode(true);
        if (this.config.enablePopups) {
          this.popupSystem.showSpecialEffectPopup(
            new THREE.Vector3(0, 50, 0),
            'DANGER!',
            new THREE.Color(0xff0000)
          );
        }
        break;

      case 'panic_end':
        this.setPanicMode(false);
        break;

      case 'game_over':
        if (this.config.enablePopups) {
          this.popupSystem.showSpecialEffectPopup(
            new THREE.Vector3(0, 0, 0),
            'GAME OVER',
            new THREE.Color(0xff4444)
          );
        }
        if (this.config.enableScreenShake) {
          this.screenShakeManager.shakeForSpecialEvent(5, 60);
        }
        break;

      case 'level_up':
        if (this.config.enablePopups && data?.level) {
          this.popupSystem.showSpecialEffectPopup(
            new THREE.Vector3(0, 20, 0),
            `LEVEL ${data.level}`,
            new THREE.Color(0x44ff44)
          );
        }
        break;
    }
  }

  // Update warning system based on board state
  public updateWarningSystem(): void {
    this.warningBlinkTimer++;

    for (let col = 0; col < Board.BOARD_WIDTH; col++) {
      const tile = this.board.getTile(Board.TOP_ROW, col);
      const indicator = this.warningIndicators[col];
      const material = this.warningMaterials[col];

      if (tile && tile.type !== TileType.AIR) {
        // Show warning indicator
        indicator.visible = true;
        
        // Blinking effect
        const blinkPhase = Math.sin(this.warningBlinkTimer * 0.2) * 0.5 + 0.5;
        material.opacity = 0.3 + blinkPhase * 0.4;
        
        // Color intensity based on danger level
        if (this.panicMode) {
          material.color.setHex(0xff0000); // Bright red in panic
        } else {
          material.color.setHex(0xff4444); // Warning red
        }
      } else {
        indicator.visible = false;
      }
    }
  }

  // Trigger match flash effect
  private triggerMatchFlash(positions: THREE.Vector3[]): void {
    this.flashTimer = 8; // Slightly longer for the ripple effect

    // Create temporary flash meshes - larger transparent ripple effect
    positions.forEach(position => {
      const geometry = new THREE.RingGeometry(20, 25, 16); // Ring shape: inner radius 20, outer 25, 16 segments
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4, // Very transparent
        side: THREE.FrontSide,
        blending: THREE.NormalBlending, // No additive blending
        alphaTest: 0.1
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.position.z = 5; // Above everything else
      
      this.flashMeshes.push(mesh);
      this.scene.add(mesh);
    });
  }

  // Update flash effects
  private updateFlashEffects(): void {
    if (this.flashTimer > 0) {
      this.flashTimer--;

      // Update flash mesh opacity and scale for ripple effect
      this.flashMeshes.forEach(mesh => {
        const material = mesh.material as THREE.MeshBasicMaterial;
        const progress = this.flashTimer / 8; // Use new duration
        
        // Fade out as it expands
        material.opacity = progress * 0.4;
        
        // Start small and expand outward like a ripple
        const scale = 1 + (1 - progress) * 1.5; // Larger expansion (1.5x)
        mesh.scale.setScalar(scale);
      });

      // Remove flash meshes when done
      if (this.flashTimer === 0) {
        this.flashMeshes.forEach(mesh => {
          this.scene.remove(mesh);
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material instanceof THREE.Material) {
            mesh.material.dispose();
          }
        });
        this.flashMeshes = [];
      }
    }
  }

  // Calculate center position of multiple positions
  private calculateCenterPosition(positions: THREE.Vector3[]): THREE.Vector3 {
    const center = new THREE.Vector3();
    positions.forEach(pos => center.add(pos));
    center.divideScalar(positions.length);
    return center;
  }

  // Set panic mode
  public setPanicMode(enabled: boolean): void {
    this.panicMode = enabled;
    
    if (enabled && this.config.enableScreenShake) {
      // Start continuous panic shake
      this.screenShakeManager.shakeForPanicMode();
    }
  }

  // Main update method
  public tick(): void {
    if (!this.isEnabled) return;

    // Update all effect systems
    this.particleSystem.tick();
    this.popupSystem.tick();
    this.screenShakeManager.update();

    // Update warning system
    this.updateWarningSystem();

    // Update flash effects
    this.updateFlashEffects();

    // Continue panic shake if in panic mode
    if (this.panicMode && this.config.enableScreenShake) {
      if (!this.screenShakeManager.isShaking()) {
        this.screenShakeManager.shakeForPanicMode();
      }
    }
  }

  // Enable/disable all effects
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.screenShakeManager.stopAllShakes();
    }
  }

  // Update configuration
  public updateConfig(newConfig: Partial<EffectsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get debug information
  public getDebugInfo(): string {
    const parts = [];
    
    parts.push(`Effects: ${this.isEnabled ? 'ON' : 'OFF'}`);
    
    if (this.isEnabled) {
      parts.push(this.particleSystem.getDebugInfo());
      parts.push(this.popupSystem.getDebugInfo());
      parts.push(this.screenShakeManager.getDebugInfo());
      
      if (this.panicMode) {
        parts.push('PANIC');
      }
    }

    return parts.join(' | ');
  }

  // Clean up resources
  public dispose(): void {
    // Dispose effect systems
    this.particleSystem.dispose();
    this.popupSystem.dispose();
    this.screenShakeManager.stopAllShakes();

    // Dispose warning indicators
    this.warningIndicators.forEach(indicator => {
      this.scene.remove(indicator);
      if (indicator.geometry) indicator.geometry.dispose();
    });
    this.warningMaterials.forEach(material => material.dispose());
    this.warningIndicators = [];
    this.warningMaterials = [];

    // Dispose flash meshes
    this.flashMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    });
    this.flashMeshes = [];
  }
}