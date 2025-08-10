import * as THREE from 'three';
import { SceneManager } from '../rendering/SceneManager';
import { AssetLoader } from '../assets/AssetLoader';
import { GameController } from '../game/GameController';
import { InputAction } from '../input/InputManager';

export class GameEngine {
  private renderer: THREE.WebGLRenderer;
  private sceneManager: SceneManager;
  private assetLoader: AssetLoader;
  private gameController: GameController | null = null;
  private clock: THREE.Clock;
  private accumulator: number = 0;
  private readonly timestep: number = 1 / 60; // 60 FPS
  private readonly maxFrameTime: number = 0.25; // Prevent spiral of death
  
  private ticksRun: number = 0;
  private frameTimeHistory: number[] = [];
  
  private isRunning: boolean = false;
  private debugMode: boolean = false;
  
  constructor(canvas: HTMLCanvasElement) {
    // Initialize Three.js renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    
    this.renderer.setSize(800, 600);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1.0);
    
    // Initialize core systems
    this.clock = new THREE.Clock();
    this.sceneManager = new SceneManager();
    this.assetLoader = new AssetLoader();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Enable debug mode in development
    if (import.meta.env?.DEV) {
      this.debugMode = true;
      this.setupDebugUI();
    }
  }
  
  public async initialize(): Promise<void> {
    try {
      // Load essential assets
      await this.assetLoader.loadEssentialAssets();
      
      // Initialize scene
      this.sceneManager.initialize();
      
      // Hide loading screen
      this.hideLoadingScreen();
      
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
    
    // Update game controller (input handling)
    if (this.gameController) {
      this.gameController.tick();
      
      // Update cursor state based on game state
      this.gameController.updateCursorState();
    }
    
    // Update game systems
    this.sceneManager.tick();
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
      } else {
        this.clock.start();
      }
    });
  }
  
  private handleResize(): void {
    const canvas = this.renderer.domElement;
    const container = canvas.parentElement;
    
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
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
  }
  
  public getGameController(): GameController | null {
    return this.gameController;
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