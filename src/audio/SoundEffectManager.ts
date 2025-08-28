/**
 * SoundEffectManager - Handles all game sound effects with priority system
 * Manages chain/combo sound matrix and audio pooling for performance
 */

import { AudioEngine } from './AudioEngine';

export type SfxType = 
  // UI sounds
  | 'cursor'
  | 'swap'
  | 'countdown'
  | 'go'
  | 'pause'
  
  // Game sounds
  | 'chain'
  | 'combo'
  | 'thump'
  | 'bigthump'
  | 'fanfare1'
  | 'fanfare2'
  | 'fanfare3'
  
  // Chain matrix sounds (1x1 to 4x10)
  | 'chain_1x1' | 'chain_1x2' | 'chain_1x3' | 'chain_1x4' | 'chain_1x5'
  | 'chain_1x6' | 'chain_1x7' | 'chain_1x8' | 'chain_1x9' | 'chain_1x10'
  | 'chain_2x1' | 'chain_2x2' | 'chain_2x3' | 'chain_2x4' | 'chain_2x5'
  | 'chain_2x6' | 'chain_2x7' | 'chain_2x8' | 'chain_2x9' | 'chain_2x10'
  | 'chain_3x1' | 'chain_3x2' | 'chain_3x3' | 'chain_3x4' | 'chain_3x5'
  | 'chain_3x6' | 'chain_3x7' | 'chain_3x8' | 'chain_3x9' | 'chain_3x10'
  | 'chain_4x1' | 'chain_4x2' | 'chain_4x3' | 'chain_4x4' | 'chain_4x5'
  | 'chain_4x6' | 'chain_4x7' | 'chain_4x8' | 'chain_4x9' | 'chain_4x10';

export interface SfxInfo {
  url: string;
  volume?: number;
  priority?: number; // Higher = more important
  maxConcurrent?: number; // Max concurrent instances
}

export interface PlayingSfx {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  startTime: number;
  type: SfxType;
}

export class SoundEffectManager {
  private audioEngine: AudioEngine;
  private playingSfx: PlayingSfx[] = [];
  private sfxPool: Map<SfxType, AudioBuffer> = new Map();
  
  private sfxDefinitions: Map<SfxType, SfxInfo> = new Map();

  constructor(audioEngine: AudioEngine) {
    this.audioEngine = audioEngine;
    this.initializeSfxDefinitions();
  }

  /**
   * Initialize all sound effect definitions
   */
  private initializeSfxDefinitions(): void {
    // UI sounds
    this.sfxDefinitions.set('cursor', {
      url: `${import.meta.env.BASE_URL}assets/audio/sfx/cursor.wav`,
      volume: 0.6,
      priority: 1
    });
    
    this.sfxDefinitions.set('swap', {
      url: `${import.meta.env.BASE_URL}assets/audio/sfx/swap.wav`,
      volume: 0.8,
      priority: 2
    });
    
    this.sfxDefinitions.set('countdown', {
      url: `${import.meta.env.BASE_URL}assets/audio/sfx/countdown.wav`,
      volume: 0.9,
      priority: 10
    });
    
    this.sfxDefinitions.set('go', {
      url: `${import.meta.env.BASE_URL}assets/audio/sfx/go.wav`,
      volume: 0.9,
      priority: 10
    });
    
    this.sfxDefinitions.set('pause', {
      url: `${import.meta.env.BASE_URL}assets/audio/sfx/pause.wav`,
      volume: 0.7,
      priority: 8
    });

    // Game sounds
    this.sfxDefinitions.set('chain', {
      url: `${import.meta.env.BASE_URL}assets/audio/sfx/chain.wav`,
      volume: 0.8,
      priority: 6
    });
    
    this.sfxDefinitions.set('combo', {
      url: `${import.meta.env.BASE_URL}assets/audio/sfx/combo.wav`,
      volume: 0.8,
      priority: 6
    });
    
    this.sfxDefinitions.set('thump', {
      url: `${import.meta.env.BASE_URL}assets/audio/sfx/thump.wav`,
      volume: 0.7,
      priority: 3,
      maxConcurrent: 3
    });
    
    this.sfxDefinitions.set('bigthump', {
      url: `${import.meta.env.BASE_URL}assets/audio/sfx/bigthump.wav`,
      volume: 0.8,
      priority: 5
    });
    
    this.sfxDefinitions.set('fanfare1', {
      url: `${import.meta.env.BASE_URL}assets/audio/sfx/fanfare1.wav`,
      volume: 0.9,
      priority: 9
    });
    
    this.sfxDefinitions.set('fanfare2', {
      url: `${import.meta.env.BASE_URL}assets/audio/sfx/fanfare2.wav`,
      volume: 0.9,
      priority: 9
    });
    
    this.sfxDefinitions.set('fanfare3', {
      url: `${import.meta.env.BASE_URL}assets/audio/sfx/fanfare3.wav`,
      volume: 0.9,
      priority: 9
    });

    // Chain matrix sounds (1x1 to 4x10)
    for (let chain = 1; chain <= 4; chain++) {
      for (let combo = 1; combo <= 10; combo++) {
        const sfxType = `chain_${chain}x${combo}` as SfxType;
        this.sfxDefinitions.set(sfxType, {
          url: `${import.meta.env.BASE_URL}assets/audio/sfx/${chain}x${combo}.wav`,
          volume: 0.8,
          priority: 7,
          maxConcurrent: 2
        });
      }
    }
  }

  /**
   * Load all sound effects
   */
  public async loadAllSfx(): Promise<void> {
    if (!this.audioEngine.isReady()) {
      console.warn('AudioEngine not ready, skipping SFX loading');
      return;
    }

    const loadPromises: Promise<void>[] = [];
    
    for (const [sfxType, sfxInfo] of this.sfxDefinitions) {
      const promise = this.audioEngine.loadAudio(`sfx_${sfxType}`, sfxInfo.url)
        .then(buffer => {
          this.sfxPool.set(sfxType, buffer);
        })
        .catch(error => {
          console.warn(`Failed to load SFX ${sfxType}:`, error);
        });
      loadPromises.push(promise);
    }
    
    await Promise.all(loadPromises);
    console.log('Sound effects loaded');
  }

  /**
   * Play a sound effect
   */
  public play(sfxType: SfxType, volume?: number, pitch?: number): boolean {
    if (!this.audioEngine.isReady()) {
      return false;
    }

    const sfxInfo = this.sfxDefinitions.get(sfxType);
    const audioBuffer = this.sfxPool.get(sfxType);
    
    if (!sfxInfo || !audioBuffer) {
      console.warn(`Sound effect not found or loaded: ${sfxType}`);
      return false;
    }

    const context = this.audioEngine.getContext();
    const sfxGain = this.audioEngine.getSfxGain();
    
    if (!context || !sfxGain) {
      return false;
    }

    // Check concurrent limit
    if (sfxInfo.maxConcurrent) {
      const concurrent = this.playingSfx.filter(sfx => sfx.type === sfxType).length;
      if (concurrent >= sfxInfo.maxConcurrent) {
        // Stop oldest instance
        const oldest = this.playingSfx
          .filter(sfx => sfx.type === sfxType)
          .sort((a, b) => a.startTime - b.startTime)[0];
        if (oldest) {
          this.stopSfx(oldest);
        }
      }
    }

    // Create audio source
    const source = this.audioEngine.createSource(audioBuffer);
    if (!source) {
      return false;
    }

    // Create gain node for individual volume control
    const gainNode = context.createGain();
    
    // Set volume
    const finalVolume = (volume !== undefined ? volume : 1.0) * (sfxInfo.volume || 1.0);
    gainNode.gain.setValueAtTime(finalVolume, context.currentTime);
    
    // Set pitch (playback rate)
    if (pitch !== undefined) {
      source.playbackRate.setValueAtTime(pitch, context.currentTime);
    }
    
    // Connect audio graph
    source.connect(gainNode);
    gainNode.connect(sfxGain);
    
    // Track playing sound
    const playingSfx: PlayingSfx = {
      source,
      gainNode,
      startTime: context.currentTime,
      type: sfxType
    };
    
    this.playingSfx.push(playingSfx);
    
    // Clean up when finished
    source.onended = (): void => {
      this.removeSfx(playingSfx);
    };
    
    // Start playback
    source.start();
    
    return true;
  }

  /**
   * Play chain sound based on chain and combo count
   */
  public playChain(chainCount: number, comboCount: number): boolean {
    // Clamp values to available sounds
    const clampedChain = Math.max(1, Math.min(4, chainCount));
    const clampedCombo = Math.max(1, Math.min(10, comboCount));
    
    const sfxType = `chain_${clampedChain}x${clampedCombo}` as SfxType;
    return this.play(sfxType);
  }

  /**
   * Play fanfare based on achievement level
   */
  public playFanfare(level: number): boolean {
    const fanfareType = `fanfare${Math.max(1, Math.min(3, level))}` as SfxType;
    return this.play(fanfareType);
  }

  /**
   * Stop all sounds of a specific type
   */
  public stopType(sfxType: SfxType): void {
    const toStop = this.playingSfx.filter(sfx => sfx.type === sfxType);
    toStop.forEach(sfx => this.stopSfx(sfx));
  }

  /**
   * Stop all sound effects
   */
  public stopAll(): void {
    const toStop = [...this.playingSfx];
    toStop.forEach(sfx => this.stopSfx(sfx));
  }

  /**
   * Stop a specific playing sound effect
   */
  private stopSfx(playingSfx: PlayingSfx): void {
    try {
      playingSfx.source.stop();
    } catch (error) {
      // Source might already be stopped
    }
    
    this.removeSfx(playingSfx);
  }

  /**
   * Remove a sound effect from tracking
   */
  private removeSfx(playingSfx: PlayingSfx): void {
    const index = this.playingSfx.indexOf(playingSfx);
    if (index !== -1) {
      this.playingSfx.splice(index, 1);
    }
  }

  /**
   * Cleanup old finished sound effects (maintenance)
   */
  public cleanup(): void {
    const currentTime = this.audioEngine.getContext()?.currentTime || 0;
    const maxAge = 10; // seconds
    
    this.playingSfx = this.playingSfx.filter(sfx => {
      if (currentTime - sfx.startTime > maxAge) {
        try {
          sfx.source.stop();
        } catch (error) {
          // Already stopped
        }
        return false;
      }
      return true;
    });
  }

  /**
   * Get current playing sound count
   */
  public getPlayingCount(): number {
    return this.playingSfx.length;
  }

  /**
   * Get playing sounds by type
   */
  public getPlayingByType(sfxType: SfxType): number {
    return this.playingSfx.filter(sfx => sfx.type === sfxType).length;
  }

  /**
   * Cleanup and dispose
   */
  public dispose(): void {
    this.stopAll();
    this.sfxPool.clear();
    console.log('SoundEffectManager disposed');
  }
}
