/**
 * MusicSystem - Handles background music playback, looping, and crossfading
 * Manages different tracks for different game states (normal, panic, menu, etc.)
 */

import { AudioEngine } from './AudioEngine';

export type MusicTrack = 
  | 'title_intro'
  | 'title_loop'
  | 'battle_normal'
  | 'battle_panic';

export interface MusicTrackInfo {
  url: string;
  loop: boolean;
  loopStart?: number; // Time in seconds to start loop from
  loopEnd?: number;   // Time in seconds to end loop at
}

export class MusicSystem {
  private audioEngine: AudioEngine;
  private currentTrack: MusicTrack | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGain: GainNode | null = null;
  
  private crossfadeSource: AudioBufferSourceNode | null = null;
  private crossfadeGain: GainNode | null = null;
  
  private fadeTimeout: number | null = null;
  private isPlaying = false;
  private isPaused = false;
  private startTime = 0;
  private pauseTime = 0;
  
  private trackDefinitions: Map<MusicTrack, MusicTrackInfo> = new Map([
    ['title_intro', {
      url: '/assets/audio/music/panelpop_intro.ogg',
      loop: false
    }],
    ['title_loop', {
      url: '/assets/audio/music/panelpop_loop.ogg',
      loop: true
    }],
    ['battle_normal', {
      url: '/assets/audio/music/battle1_loop.ogg',
      loop: true
    }],
    ['battle_panic', {
      url: '/assets/audio/music/battle1_panic.ogg',
      loop: true
    }]
  ]);

  constructor(audioEngine: AudioEngine) {
    this.audioEngine = audioEngine;
  }

  /**
   * Load all music tracks
   */
  public async loadAllTracks(): Promise<void> {
    if (!this.audioEngine.isReady()) {
      console.warn('AudioEngine not ready, skipping music loading');
      return;
    }

    const loadPromises: Promise<void>[] = [];
    
    for (const [trackName, trackInfo] of this.trackDefinitions) {
      const promise = this.audioEngine.loadAudio(`music_${trackName}`, trackInfo.url)
        .then(() => {
          // Successfully loaded
        })
        .catch(error => {
          console.warn(`Failed to load music track ${trackName}:`, error);
        });
      loadPromises.push(promise);
    }
    
    await Promise.all(loadPromises);
    console.log('Music tracks loaded');
  }

  /**
   * Play a music track
   */
  public async play(track: MusicTrack, fadeInDuration: number = 0.5): Promise<void> {
    if (!this.audioEngine.isReady()) {
      console.warn('AudioEngine not ready, cannot play music');
      return;
    }

    // Stop current track if playing
    if (this.isPlaying) {
      this.stop(fadeInDuration);
    }

    const trackInfo = this.trackDefinitions.get(track);
    if (!trackInfo) {
      console.error(`Unknown music track: ${track}`);
      return;
    }

    const audioBuffer = this.audioEngine.getAudio(`music_${track}`);
    if (!audioBuffer) {
      console.error(`Music track not loaded: ${track}`);
      return;
    }

    const context = this.audioEngine.getContext();
    const musicGain = this.audioEngine.getMusicGain();
    
    if (!context || !musicGain) {
      return;
    }

    // Create source and gain nodes
    this.currentSource = this.audioEngine.createSource(audioBuffer);
    this.currentGain = context.createGain();
    
    if (!this.currentSource || !this.currentGain) {
      return;
    }

    // Set up audio graph
    this.currentSource.connect(this.currentGain);
    this.currentGain.connect(musicGain);

    // Set up looping
    this.currentSource.loop = trackInfo.loop;
    if (trackInfo.loopStart !== undefined) {
      this.currentSource.loopStart = trackInfo.loopStart;
    }
    if (trackInfo.loopEnd !== undefined) {
      this.currentSource.loopEnd = trackInfo.loopEnd;
    }

    // Set initial gain for fade in
    this.currentGain.gain.setValueAtTime(0, context.currentTime);
    
    // Start playback
    this.currentSource.start();
    this.startTime = context.currentTime;
    this.isPlaying = true;
    this.isPaused = false;
    this.currentTrack = track;

    // Fade in
    if (fadeInDuration > 0) {
      this.currentGain.gain.linearRampToValueAtTime(1, context.currentTime + fadeInDuration);
    } else {
      this.currentGain.gain.setValueAtTime(1, context.currentTime);
    }

    // Handle track ended (for non-looping tracks)
    this.currentSource.onended = (): void => {
      if (this.currentTrack === track && !trackInfo.loop) {
        this.handleTrackEnded();
      }
    };
  }

  /**
   * Stop current music track
   */
  public stop(fadeOutDuration: number = 0.5): void {
    if (!this.isPlaying || !this.currentSource || !this.currentGain) {
      return;
    }

    const context = this.audioEngine.getContext();
    if (!context) {
      return;
    }

    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }

    if (fadeOutDuration > 0) {
      // Fade out
      this.currentGain.gain.linearRampToValueAtTime(0, context.currentTime + fadeOutDuration);
      
      // Stop after fade completes
      this.fadeTimeout = window.setTimeout(() => {
        this.stopImmediate();
      }, fadeOutDuration * 1000);
      
    } else {
      this.stopImmediate();
    }
  }

  /**
   * Immediately stop current track
   */
  private stopImmediate(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (error) {
        // Source might already be stopped
      }
      this.currentSource = null;
    }
    
    this.currentGain = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.currentTrack = null;
    this.startTime = 0;
    this.pauseTime = 0;
  }

  /**
   * Crossfade to a new track
   */
  public async crossfade(newTrack: MusicTrack, duration: number = 1.0): Promise<void> {
    if (!this.audioEngine.isReady()) {
      return;
    }

    if (this.currentTrack === newTrack) {
      return; // Already playing this track
    }

    // If something is already crossfading, stop it
    if (this.crossfadeSource) {
      this.crossfadeSource.stop();
      this.crossfadeSource = null;
      this.crossfadeGain = null;
    }

    const trackInfo = this.trackDefinitions.get(newTrack);
    if (!trackInfo) {
      console.error(`Unknown music track: ${newTrack}`);
      return;
    }

    const audioBuffer = this.audioEngine.getAudio(`music_${newTrack}`);
    if (!audioBuffer) {
      console.error(`Music track not loaded: ${newTrack}`);
      return;
    }

    const context = this.audioEngine.getContext();
    const musicGain = this.audioEngine.getMusicGain();
    
    if (!context || !musicGain) {
      return;
    }

    // Create new source and gain for crossfade
    this.crossfadeSource = this.audioEngine.createSource(audioBuffer);
    this.crossfadeGain = context.createGain();
    
    if (!this.crossfadeSource || !this.crossfadeGain) {
      return;
    }

    // Set up audio graph
    this.crossfadeSource.connect(this.crossfadeGain);
    this.crossfadeGain.connect(musicGain);

    // Set up looping
    this.crossfadeSource.loop = trackInfo.loop;
    if (trackInfo.loopStart !== undefined) {
      this.crossfadeSource.loopStart = trackInfo.loopStart;
    }
    if (trackInfo.loopEnd !== undefined) {
      this.crossfadeSource.loopEnd = trackInfo.loopEnd;
    }

    // Start crossfade
    const halfDuration = duration / 2;
    
    // Fade out current track
    if (this.currentGain && this.isPlaying) {
      this.currentGain.gain.linearRampToValueAtTime(0, context.currentTime + halfDuration);
    }

    // Start new track at zero volume
    this.crossfadeGain.gain.setValueAtTime(0, context.currentTime);
    this.crossfadeSource.start();

    // Fade in new track
    this.crossfadeGain.gain.linearRampToValueAtTime(1, context.currentTime + duration);

    // Schedule cleanup of old track
    setTimeout(() => {
      this.stopImmediate(); // Stop old track
      
      // Move crossfade to current
      this.currentSource = this.crossfadeSource;
      this.currentGain = this.crossfadeGain;
      this.currentTrack = newTrack;
      this.isPlaying = true;
      this.isPaused = false;
      this.startTime = context.currentTime;
      
      // Clear crossfade references
      this.crossfadeSource = null;
      this.crossfadeGain = null;
      
    }, halfDuration * 1000);
  }

  /**
   * Pause current track
   */
  public pause(): void {
    if (!this.isPlaying || this.isPaused) {
      return;
    }

    const context = this.audioEngine.getContext();
    if (!context) {
      return;
    }

    this.pauseTime = context.currentTime - this.startTime;
    this.stopImmediate();
    this.isPaused = true;
  }

  /**
   * Resume paused track
   */
  public async resume(): Promise<void> {
    if (!this.isPaused || !this.currentTrack) {
      return;
    }

    const trackInfo = this.trackDefinitions.get(this.currentTrack);
    const audioBuffer = this.audioEngine.getAudio(`music_${this.currentTrack}`);
    
    if (!trackInfo || !audioBuffer) {
      this.isPaused = false;
      return;
    }

    const context = this.audioEngine.getContext();
    const musicGain = this.audioEngine.getMusicGain();
    
    if (!context || !musicGain) {
      return;
    }

    // Create new source
    this.currentSource = this.audioEngine.createSource(audioBuffer);
    this.currentGain = context.createGain();
    
    if (!this.currentSource || !this.currentGain) {
      return;
    }

    // Set up audio graph
    this.currentSource.connect(this.currentGain);
    this.currentGain.connect(musicGain);

    // Set up looping
    this.currentSource.loop = trackInfo.loop;
    if (trackInfo.loopStart !== undefined) {
      this.currentSource.loopStart = trackInfo.loopStart;
    }
    if (trackInfo.loopEnd !== undefined) {
      this.currentSource.loopEnd = trackInfo.loopEnd;
    }

    // Resume from pause position
    this.currentGain.gain.setValueAtTime(1, context.currentTime);
    this.currentSource.start(0, this.pauseTime);
    
    this.startTime = context.currentTime - this.pauseTime;
    this.isPlaying = true;
    this.isPaused = false;
  }

  /**
   * Get current track info
   */
  public getCurrentTrack(): MusicTrack | null {
    return this.currentTrack;
  }

  public isCurrentlyPlaying(): boolean {
    return this.isPlaying && !this.isPaused;
  }

  public isCurrentlyPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Handle track ended event
   */
  private handleTrackEnded(): void {
    // For intro track, automatically play title loop
    if (this.currentTrack === 'title_intro') {
      this.play('title_loop', 0.5);
      return;
    }
    
    this.stopImmediate();
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    this.stop(0);
    
    if (this.crossfadeSource) {
      try {
        this.crossfadeSource.stop();
      } catch (error) {
        // May already be stopped
      }
      this.crossfadeSource = null;
      this.crossfadeGain = null;
    }
    
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }
    
    console.log('MusicSystem disposed');
  }
}