import * as THREE from 'three';
import { SceneManager } from '../rendering/SceneManager';
import { AssetLoader } from '../assets/AssetLoader';
import { GameController } from '../game/GameController';
import { InputAction } from '../input/InputManager';
import { StateManager } from './StateManager';
import { UIManager } from '../ui/UIManager';
import { StateTransition, StateUtils } from './GameState';
import { AudioSystem } from '../audio/AudioSystem';

export class GameEngine {
  private renderer: THREE.WebGLRenderer;
  private sceneManager: SceneManager;
  private assetLoader: AssetLoader;
  private gameController: GameController | null = null;
  private stateManager: StateManager;
  private uiManager: UIManager;
  private audioSystem: AudioSystem;
  private clock: THREE.Clock;
  private accumulator: number = 0;
  private readonly timestep: number = 1 / 60; // 60 FPS
  private readonly maxFrameTime: number = 0.25; // Prevent spiral of death
  
  private ticksRun: number = 0;
  private frameTimeHistory: number[] = [];
  
  private isRunning: boolean = false;
  private debugMode: boolean = false;
  
  constructor(canvas: HTMLCanvasElement) {
    console.log('GameEngine: Constructor called');
    
    // Initialize Three.js renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    // Set pixel ratio before sizing to ensure correct backbuffer
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1.0);
    
    // Initialize core systems
    this.clock = new THREE.Clock();
    this.assetLoader = new AssetLoader();
    this.sceneManager = new SceneManager(this.assetLoader);
    
    // Initialize Phase 9 systems
    // console.log('GameEngine: Initializing StateManager');
    this.stateManager = StateManager.getInstance();
    // console.log('GameEngine: Initializing UIManager');
    this.uiManager = UIManager.getInstance();
    // console.log('GameEngine: Phase 9 systems initialized');
    
    // Initialize Phase 10 systems (Audio)
    console.log('GameEngine: Initializing AudioSystem');
    this.audioSystem = new AudioSystem();
    console.log('GameEngine: Phase 10 systems initialized');
    
    // Set up event listeners
    this.setupEventListeners();

    // Perform an initial resize so the camera and renderer
    // match the actual window size before the first frame
    this.handleResize();
    
    // Enable debug mode in development
    if (import.meta.env?.DEV) {
      this.debugMode = true;
      this.setupDebugUI();
    }
    
    console.log('GameEngine: Constructor completed');
  }
  
  public async initialize(): Promise<void> {
    try {
      // Load essential assets
      await this.assetLoader.loadEssentialAssets();
      
      // Initialize scene
      this.sceneManager.initialize();
      
      // Initialize UI manager
      console.log('GameEngine: Calling uiManager.initialize()');
      this.uiManager.initialize();
      
      // Initialize UI system (now that UIManager is ready to receive events)
      console.log('GameEngine: Calling stateManager.initializeUI()');
      this.stateManager.initializeUI();
      
      // Initialize audio system (Phase 10)
      console.log('GameEngine: Initializing AudioSystem');
      await this.audioSystem.initialize();
      
      // Pass audio system to scene manager before initializing board
      this.sceneManager.setAudioSystem(this.audioSystem);
      
      // Set up game components once scene is ready
      this.setupGameComponents();
      
      // Hide loading screen and transition to title screen
      this.hideLoadingScreen();
      
      // Transition from loading to title screen
      console.log('GameEngine: Requesting transition to LOADING_COMPLETE');
      this.stateManager.requestTransition(StateTransition.LOADING_COMPLETE);
      
      console.log('GameEngine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize GameEngine:', error);
      throw error;
    }
  }
  
  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.clock.start();
    this.gameLoop();
    
    console.log('GameEngine started');
  }
  
  public stop(): void {
    this.isRunning = false;
    console.log('GameEngine stopped');
  }
  
  /**
   * Set up game components (Phase 9 integration)
   */
  private setupGameComponents(): void {
    const board = this.sceneManager.getBoard();
    if (!board) {
      throw new Error('Board not found in SceneManager');
    }
    
    // Initialize the state manager with the board (for later when game controller is set)
    // We'll connect the game controller when it's created in main.ts
    
    console.log('Game components set up for Phase 9');
  }
  
  private gameLoop(): void {
    if (!this.isRunning) return;
    
    requestAnimationFrame(() => this.gameLoop());
    
    const deltaTime = Math.min(this.clock.getDelta(), this.maxFrameTime);
    this.accumulator += deltaTime;
    
    // Fixed timestep updates
    let ticksThisFrame = 0;
    while (this.accumulator >= this.timestep && ticksThisFrame < 4) {
      this.tick();
      this.accumulator -= this.timestep;
      ticksThisFrame++;
    }
    
    // Interpolation factor for smooth rendering
    const alpha = this.accumulator / this.timestep;
    
    // Render frame
    this.render(alpha);
    
    // Update debug info
    if (this.debugMode) {
      this.updateDebugInfo(deltaTime);
    }
  }
  
  private tick(): void {
    this.ticksRun++;
    
    // Update state management system
    this.stateManager.tick();
    
    // Only update game systems if we're in a gameplay state
    const currentState = this.stateManager.getCurrentState();
    if (StateUtils.isGameplayState(currentState)) {
      // Update game controller (input handling)
      if (this.gameController) {
        this.gameController.tick();
        
        // Update cursor state based on game state
        this.gameController.updateCursorState();
      }
      
      // Update game systems
      this.sceneManager.tick();
    }
    
    // Update audio system (Phase 10)
    this.audioSystem.update();
    
    // Update UI system
    this.uiManager.update();
  }
  
  private render(alpha: number): void {
    // Clear the frame
    this.renderer.clear();
    
    // Render the scene
    this.sceneManager.render(this.renderer, alpha);
  }
  
  private setupEventListeners(): void {
    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());
    
    // Handle visibility change (pause when tab not active)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.clock.stop();
        this.audioSystem.suspend();
      } else {
        this.clock.start();
        this.audioSystem.resume();
      }
    });
    
    // Initialize audio on user interaction (required by browsers)
    const initAudio = async (): Promise<void> => {
      await this.audioSystem.resume();
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
    
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });
  }
  
  private handleResize(): void {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);

    this.renderer.setSize(width, height);
    this.sceneManager.handleResize(width, height);
  }
  
  private hideLoadingScreen(): void {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }
  }
  
  private setupDebugUI(): void {
    const debugInfo = document.getElementById('debugInfo');
    if (debugInfo) {
      debugInfo.style.display = 'block';
    }
    
    console.log('Debug UI enabled - Press F3 to toggle, Arrow keys to move cursor');
    console.log('Keybindings: ↑↓←→/WASD = move, X = swap, Z = raise stack, ESC = pause');
    
    // Toggle debug info with F3
    window.addEventListener('keydown', (event) => {
      if (event.code === 'F3') {
        event.preventDefault();
        const debugInfo = document.getElementById('debugInfo');
        if (debugInfo) {
          debugInfo.style.display = 
            debugInfo.style.display === 'none' ? 'block' : 'none';
        }
      }
    });
  }
  
  private updateDebugInfo(deltaTime: number): void {
    this.frameTimeHistory.push(deltaTime * 1000);
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift();
    }
    
    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / 
                        this.frameTimeHistory.length;
    const fps = Math.round(1000 / avgFrameTime);
    
    // Update basic performance info
    const fpsElement = document.getElementById('fps');
    const frameTimeElement = document.getElementById('frameTime');
    const ticksElement = document.getElementById('ticks');
    
    if (fpsElement) fpsElement.textContent = fps.toString();
    if (frameTimeElement) frameTimeElement.textContent = `${avgFrameTime.toFixed(2)}ms`;
    if (ticksElement) ticksElement.textContent = this.ticksRun.toString();
    
    // Update game controller info
    if (this.gameController) {
      const controllerElement = document.getElementById('gameController');
      if (controllerElement) {
        controllerElement.textContent = this.gameController.getDebugInfo();
      }
      
      // Update input manager info
      const inputElement = document.getElementById('inputManager');
      if (inputElement) {
        inputElement.textContent = this.gameController.getInputManager().getDebugInfo();
      }
      
      // Update input states
      const inputStatesElement = document.getElementById('inputStates');
      if (inputStatesElement) {
        const inputManager = this.gameController.getInputManager();
        const states = [
          `UP: ${inputManager.isPressed(InputAction.UP) ? '■' : '□'}`,
          `DOWN: ${inputManager.isPressed(InputAction.DOWN) ? '■' : '□'}`,
          `LEFT: ${inputManager.isPressed(InputAction.LEFT) ? '■' : '□'}`,
          `RIGHT: ${inputManager.isPressed(InputAction.RIGHT) ? '■' : '□'}`,
          `SWAP: ${inputManager.isPressed(InputAction.SWAP) ? '■' : '□'}`,
          `RAISE: ${inputManager.isPressed(InputAction.RAISE) ? '■' : '□'}`,
          `PAUSE: ${inputManager.isPressed(InputAction.PAUSE) ? '■' : '□'}`
        ];
        inputStatesElement.textContent = states.join(' | ');
      }
    }
    
    // Update cursor info
    const sceneManager = this.sceneManager;
    const cursor = sceneManager.getCursor();
    if (cursor) {
      const cursorElement = document.getElementById('cursor');
      if (cursorElement) {
        cursorElement.textContent = cursor.getDebugInfo();
      }
      
      // Update cursor position details
      const cursorPosElement = document.getElementById('cursorPos');
      if (cursorPosElement) {
        const pos = cursor.getPosition();
        const target = cursor.getTargetPosition();
        const moving = cursor.isMoving();
        cursorPosElement.textContent = `Pos:(${pos.x},${pos.y}) Target:(${target.x},${target.y}) Moving:${moving}`;
      }
    }
    
    // Update board info
    const board = sceneManager.getBoard();
    if (board) {
      const boardElement = document.getElementById('board');
      if (boardElement) {
        boardElement.textContent = board.getDebugInfo();
      }
      
      // Update board state
      const boardStateElement = document.getElementById('boardState');
      if (boardStateElement) {
        boardStateElement.textContent = `State: ${board.state} | Panic: ${board.isPanic()} | Score: ${board.getScore()}`;
      }
    }
    
    // Update visual effects info
    const visualEffectsManager = sceneManager.getVisualEffectsManager();
    if (visualEffectsManager) {
      const visualEffectsElement = document.getElementById('visualEffects');
      if (visualEffectsElement) {
        visualEffectsElement.textContent = visualEffectsManager.getDebugInfo();
      }
    }
    
    // Update state management info (Phase 9)
    const stateInfoElement = document.getElementById('stateManager');
    if (stateInfoElement) {
      stateInfoElement.textContent = this.stateManager.getDebugInfo();
    }
    
    const uiInfoElement = document.getElementById('uiManager');
    if (uiInfoElement) {
      uiInfoElement.textContent = this.uiManager.getDebugInfo();
    }
    
    // Update audio system info (Phase 10)
    const audioInfoElement = document.getElementById('audioSystem');
    if (audioInfoElement) {
      const audioInfo = this.audioSystem.getDebugInfo();
      audioInfoElement.textContent = `Audio: ${audioInfo.initialized ? 'Ready' : 'Not Ready'} | Music: ${audioInfo.currentTrack || 'None'} | SFX: ${audioInfo.playingSfxCount}`;
    }
  }
  
  // Getters for debugging and testing
  public getTicksRun(): number {
    return this.ticksRun;
  }
  
  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }
  
  public getSceneManager(): SceneManager {
    return this.sceneManager;
  }
  
  public isDebugMode(): boolean {
    return this.debugMode;
  }
  
  // Game controller management
  public setGameController(gameController: GameController): void {
    this.gameController = gameController;
    
    // Initialize state manager with board and game controller (Phase 9)
    const board = this.sceneManager.getBoard();
    if (board) {
      this.stateManager.initialize(board, gameController, this.audioSystem);
      // console.log('StateManager initialized with board, game controller, and audio system');
    }
  }
  
  public getGameController(): GameController | null {
    return this.gameController;
  }
  
  public getStateManager(): StateManager {
    return this.stateManager;
  }
  
  public getUIManager(): UIManager {
    return this.uiManager;
  }
  
  public getAudioSystem(): AudioSystem {
    return this.audioSystem;
  }
  
  // Input handling
  public isPaused(): boolean {
    return this.gameController?.isPaused() ?? false;
  }
  
  public pause(): void {
    this.gameController?.pause();
  }
  
  public resume(): void {
    this.gameController?.resume();
  }
}
