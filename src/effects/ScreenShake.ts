import * as THREE from 'three';

export interface ShakeConfig {
  intensity: number;
  duration: number; // in ticks
  frequency?: number; // oscillations per second
  dampening?: number; // how quickly shake reduces over time
}

export class ScreenShake {
  private camera: THREE.Camera;
  private originalPosition: THREE.Vector3;
  private isShaking: boolean = false;
  private intensity: number = 0;
  private duration: number = 0;
  private frequency: number = 10;
  private dampening: number = 0.95;
  private elapsedTime: number = 0;
  private originalDuration: number = 0;

  // Shake pattern tracking
  private shakeX: number = 0;
  private shakeY: number = 0;
  private phase: number = 0;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.originalPosition = camera.position.clone();
  }

  public startShake(config: ShakeConfig): void {
    // If already shaking with lower intensity, upgrade to higher
    if (this.isShaking && config.intensity <= this.intensity) {
      return;
    }

    this.intensity = config.intensity;
    this.duration = config.duration;
    this.originalDuration = config.duration;
    this.frequency = config.frequency || 10;
    this.dampening = config.dampening || 0.95;
    this.elapsedTime = 0;
    this.isShaking = true;
    this.phase = 0;

    // Store the current position as original if not shaking
    if (!this.isShaking) {
      this.originalPosition.copy(this.camera.position);
    }
  }

  public update(): void {
    if (!this.isShaking) return;

    this.elapsedTime++;
    this.duration--;

    // Calculate shake intensity with dampening
    const dampenedIntensity = this.intensity * Math.pow(this.dampening, this.elapsedTime / 10);
    
    // Generate shake offset using sine waves for smooth movement
    this.phase += this.frequency * (1/60); // Assuming 60fps
    
    // Use different phases for X and Y to create more natural shake
    this.shakeX = Math.sin(this.phase) * dampenedIntensity;
    this.shakeY = Math.sin(this.phase * 1.3) * dampenedIntensity; // Different frequency for Y

    // Add some randomness for less predictable shake
    this.shakeX += (Math.random() - 0.5) * dampenedIntensity * 0.5;
    this.shakeY += (Math.random() - 0.5) * dampenedIntensity * 0.5;

    // Apply shake to camera position
    this.camera.position.copy(this.originalPosition);
    this.camera.position.x += this.shakeX;
    this.camera.position.y += this.shakeY;

    // End shake when duration expires
    if (this.duration <= 0) {
      this.stopShake();
    }
  }

  public stopShake(): void {
    if (!this.isShaking) return;

    this.isShaking = false;
    this.intensity = 0;
    this.duration = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    
    // Restore original camera position
    this.camera.position.copy(this.originalPosition);
  }

  public updateCameraPosition(newPosition: THREE.Vector3): void {
    this.originalPosition.copy(newPosition);
    if (!this.isShaking) {
      this.camera.position.copy(newPosition);
    }
  }

  public isCurrentlyShaking(): boolean {
    return this.isShaking;
  }

  public getCurrentIntensity(): number {
    return this.isShaking ? this.intensity : 0;
  }

  public getDebugInfo(): string {
    if (!this.isShaking) return 'Shake: OFF';
    return `Shake: ${this.intensity.toFixed(1)} (${this.duration}t)`;
  }
}

export class ScreenShakeManager {
  private screenShake: ScreenShake;
  private queuedShakes: ShakeConfig[] = [];

  constructor(camera: THREE.Camera) {
    this.screenShake = new ScreenShake(camera);
  }

  public shakeForChain(chainLength: number): void {
    if (chainLength < 2) return; // No shake for single matches

    let intensity: number;
    let duration: number;

    if (chainLength <= 3) {
      intensity = 1;
      duration = 15;
    } else if (chainLength <= 5) {
      intensity = 2;
      duration = 25;
    } else if (chainLength <= 7) {
      intensity = 4;
      duration = 35;
    } else if (chainLength <= 10) {
      intensity = 6;
      duration = 45;
    } else {
      // Super high chains
      intensity = 8;
      duration = 60;
    }

    this.screenShake.startShake({
      intensity,
      duration,
      frequency: 12 + chainLength,
      dampening: 0.92
    });
  }

  public shakeForCombo(comboSize: number): void {
    if (comboSize < 4) return; // No shake for small combos

    let intensity: number;
    let duration: number;

    if (comboSize <= 6) {
      intensity = 1.5;
      duration = 20;
    } else if (comboSize <= 10) {
      intensity = 3;
      duration = 30;
    } else if (comboSize <= 15) {
      intensity = 5;
      duration = 40;
    } else {
      // Massive combos
      intensity = 7;
      duration = 50;
    }

    this.screenShake.startShake({
      intensity,
      duration,
      frequency: 8 + comboSize * 0.5,
      dampening: 0.94
    });
  }

  public shakeForGarbageTransform(garbageSize: number): void {
    const intensity = Math.min(garbageSize * 0.5, 4);
    const duration = Math.min(garbageSize * 5, 30);

    this.screenShake.startShake({
      intensity,
      duration,
      frequency: 6,
      dampening: 0.96
    });
  }

  public shakeForSpecialEvent(intensity: number, duration: number): void {
    this.screenShake.startShake({
      intensity,
      duration,
      frequency: 15,
      dampening: 0.9
    });
  }

  public shakeForPanicMode(): void {
    // Continuous low-level shake for panic mode
    this.screenShake.startShake({
      intensity: 0.5,
      duration: 30,
      frequency: 20,
      dampening: 0.98
    });
  }

  public update(): void {
    this.screenShake.update();

    // Process queued shakes
    if (this.queuedShakes.length > 0 && !this.screenShake.isCurrentlyShaking()) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const nextShake = this.queuedShakes.shift()!; // Safe: length checked above
      this.screenShake.startShake(nextShake);
    }
  }

  public queueShake(config: ShakeConfig): void {
    this.queuedShakes.push(config);
  }

  public stopAllShakes(): void {
    this.screenShake.stopShake();
    this.queuedShakes = [];
  }

  public updateCameraPosition(position: THREE.Vector3): void {
    this.screenShake.updateCameraPosition(position);
  }

  public isShaking(): boolean {
    return this.screenShake.isCurrentlyShaking();
  }

  public getDebugInfo(): string {
    return this.screenShake.getDebugInfo();
  }
}