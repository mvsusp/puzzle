/**
 * State Manager - Phase 9 Implementation
 * 
 * Central state management system that coordinates all application states,
 * transitions, and UI overlays. Based on the original C++ StateManager.
 */

import {
  GameState,
  StateTransition,
  StateChangeListener,
  StateData,
  StateUtils,
  UIOverlay,
  MenuType,
  CountdownState,
  GameMode
} from './GameState';
import { Board } from '../game/Board';
import { GameController, GameControllerState } from '../game/GameController';
import { BoardState } from '../game/BlockTypes';
import { AudioSystem } from '../audio/AudioSystem';
import { GameModeManager } from '../game/GameModeManager';

/**
 * Event interface for state manager events
 */
export interface StateManagerEvent {
  type: 'stateChange' | 'transitionStart' | 'transitionComplete' | 'uiUpdate';
  data: StateEventData;
}

export interface StateEventData {
  oldState?: GameState;
  newState?: GameState;
  transition?: StateTransition;
  stateData?: StateData | undefined;
  uiOverlays?: UIOverlay[];
}

/**
 * Main state manager class
 */
export class StateManager {
  private static instance: StateManager | null = null;

  // Core state
  private currentState: GameState = GameState.LOADING;
  private previousState: GameState = GameState.LOADING;
  private transitionInProgress: boolean = false;
  private stateData: StateData = {};
  private currentGameMode: GameMode = GameMode.ENDLESS;

  // Listeners and callbacks
  private stateChangeListeners: StateChangeListener[] = [];
  private eventListeners: ((event: StateManagerEvent) => void)[] = [];

  // Game components (injected)
  private board: Board | null = null;
  private gameController: GameController | null = null;
  private audioSystem: AudioSystem | null = null;

  // UI state
  private activeUIOverlays: Set<UIOverlay> = new Set();
  private currentMenu: MenuType | null = null;

  // Countdown state
  private countdownState: CountdownState = CountdownState.THREE;
  private countdownTicks: number = 0;
  private readonly COUNTDOWN_DURATION = 188; // From original game (188 ticks total)

  // Demo timeout
  private demoTimeoutTicks: number = 0;
  private readonly DEMO_TIMEOUT = 600; // From TitleScreen.h
  private readonly ENABLE_TITLE_AUTO_DEMO = false; // Disable auto demo by default

  private constructor() {
    console.log('StateManager: Constructor called - initializing with LOADING state');
    // Initialize with loading state (but don't emit events yet - no listeners exist)
    this.activeUIOverlays.clear();
    const overlays = StateUtils.getUIOverlays(this.currentState);
    overlays.forEach(overlay => this.activeUIOverlays.add(overlay));
    console.log('StateManager: Constructor completed');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      console.log('StateManager: Creating new singleton instance');
      StateManager.instance = new StateManager();
    } else {
      console.log('StateManager: Returning existing singleton instance');
    }
    return StateManager.instance;
  }

  /**
   * Reset singleton instance (FOR TESTING ONLY)
   */
  public static resetInstance(): void {
    console.log('StateManager: Resetting singleton instance (TEST ONLY)');
    StateManager.instance = null;
  }

  /**
   * Initialize the state manager with game components
   */
  public initialize(board: Board, gameController: GameController, audioSystem?: AudioSystem): void {
    this.board = board;
    this.gameController = gameController;
    this.audioSystem = audioSystem || null;

    // Initialize the GameModeManager
    const gameModeManager = GameModeManager.getInstance();
    gameModeManager.initialize(board, gameController);

    console.log('StateManager initialized with game components');
  }

  /**
   * Initialize the UI system (call after UIManager is ready)
   */
  public initializeUI(): void {
    console.log('StateManager: Initializing UI system');
    // Emit initial UI state now that listeners are registered
    this.updateUIOverlays();

    // If we're not in loading state, also emit the current state
    if (this.currentState !== GameState.LOADING) {
      this.notifyStateChange(GameState.LOADING, this.currentState);
    }
    console.log('StateManager: UI system initialized');
  }

  /**
   * Main update loop - called every tick
   */
  public tick(): void {
    // Update game mode manager
    const gameModeManager = GameModeManager.getInstance();
    gameModeManager.update();

    // Handle state-specific ticking
    switch (this.currentState) {
      case GameState.TITLE_SCREEN:
        this.tickTitleScreen();
        break;
      case GameState.GAME_COUNTDOWN:
        this.tickCountdown();
        break;
      case GameState.GAME_RUNNING:
        this.tickGameRunning();
        break;
      case GameState.DEMO:
        // Demo state is handled by the game mode manager
        break;
    }

    // Update state data
    this.updateStateData();
  }

  /**
   * Request a state transition
   */
  public requestTransition(transition: StateTransition, data?: StateData): boolean {
    console.log(`StateManager: requestTransition called - ${transition} from ${this.currentState}`);

    if (this.transitionInProgress) {
      console.warn('Transition already in progress, ignoring request:', transition);
      return false;
    }

    if (!StateUtils.canTransition(this.currentState, transition)) {
      console.warn(`Invalid transition ${transition} from state ${this.currentState}`);
      return false;
    }

    console.log(`StateManager: Transition ${transition} is valid, executing...`);
    return this.executeTransition(transition, data);
  }

  /**
   * Execute a state transition
   */
  private executeTransition(transition: StateTransition, data?: StateData): boolean {
    const oldState = this.currentState;
    const newState = this.getNextState(transition);

    if (!newState) {
      console.warn('No target state defined for transition:', transition);
      return false;
    }

    console.log(`State transition: ${oldState} -> ${newState} (${transition})`);

    this.transitionInProgress = true;

    // Emit transition start event
    this.emitEvent({
      type: 'transitionStart',
      data: { oldState, newState, transition, stateData: data || undefined }
    });

    // Update state data
    if (data) {
      this.stateData = { ...this.stateData, ...data };
    }

    // Exit old state
    this.exitState(oldState);

    // Change state
    this.previousState = oldState;
    this.currentState = newState;

    // Enter new state
    this.enterState(newState);

    // Handle music transitions
    this.handleMusicTransition(oldState, newState);

    // Update UI overlays
    this.updateUIOverlays();

    // Notify listeners (this should trigger UI state components)
    console.log('StateManager: About to notify state change listeners');
    this.notifyStateChange(oldState, newState);

    this.transitionInProgress = false;

    // Emit transition complete event
    this.emitEvent({
      type: 'transitionComplete',
      data: { oldState, newState, transition, stateData: this.stateData }
    });

    return true;
  }

  /**
   * Get the next state for a given transition
   */
  private getNextState(transition: StateTransition): GameState | null {
    switch (transition) {
      case StateTransition.LOADING_COMPLETE:
        return GameState.TITLE_SCREEN;
      case StateTransition.SHOW_MAIN_MENU:
        return GameState.MAIN_MENU;
      case StateTransition.START_GAME:
        return GameState.GAME_COUNTDOWN;
      case StateTransition.SHOW_OPTIONS:
        return GameState.OPTIONS_MENU;
      case StateTransition.SHOW_DEMO:
        return GameState.DEMO;
      case StateTransition.BACK_TO_TITLE:
        return GameState.TITLE_SCREEN;
      case StateTransition.BACK_TO_MENU:
        return GameState.MAIN_MENU;
      case StateTransition.COUNTDOWN_COMPLETE:
        return GameState.GAME_RUNNING;
      case StateTransition.PAUSE_GAME:
        return GameState.GAME_PAUSED;
      case StateTransition.RESUME_GAME:
        return GameState.GAME_RUNNING;
      case StateTransition.PLAYER_WON:
      case StateTransition.PLAYER_LOST:
        return GameState.GAME_OVER;
      case StateTransition.RESTART_GAME:
        return GameState.GAME_COUNTDOWN;
      case StateTransition.DEMO_TIMEOUT:
      case StateTransition.DEMO_EXIT:
        return GameState.TITLE_SCREEN;
      default:
        return null;
    }
  }

  /**
   * Handle entering a new state
   */
  private enterState(state: GameState): void {
    console.log(`StateManager: Entering state: ${state}`);

    switch (state) {
      case GameState.TITLE_SCREEN:
        console.log('StateManager: Setting up TITLE_SCREEN state');
        this.currentMenu = MenuType.MAIN;
        this.demoTimeoutTicks = 0;
        break;
      case GameState.MAIN_MENU:
        console.log('StateManager: Setting up MAIN_MENU state');
        this.currentMenu = MenuType.MAIN;
        break;
      case GameState.GAME_COUNTDOWN:
        this.countdownState = CountdownState.THREE;
        this.countdownTicks = 0;
        this.initializeGameBoard();
        break;
      case GameState.GAME_RUNNING:
        this.startGame();
        break;
      case GameState.GAME_PAUSED:
        this.currentMenu = MenuType.PAUSE;
        this.pauseGame();
        break;
      case GameState.GAME_OVER:
        this.currentMenu = MenuType.GAME_OVER;
        this.endGame();
        break;
      case GameState.OPTIONS_MENU:
        this.currentMenu = MenuType.OPTIONS;
        break;
      case GameState.DEMO:
        this.startDemo();
        break;
    }
  }

  /**
   * Handle exiting a state
   */
  private exitState(state: GameState): void {
    switch (state) {
      case GameState.GAME_PAUSED:
        this.resumeGame();
        break;
      case GameState.DEMO:
        this.stopDemo();
        break;
    }

    // Clear menu when exiting menu states
    if (StateUtils.isMenuState(state) || StateUtils.isPausedState(state)) {
      this.currentMenu = null;
    }
  }

  /**
   * Update UI overlays based on current state
   */
  private updateUIOverlays(): void {
    this.activeUIOverlays.clear();

    const overlays = StateUtils.getUIOverlays(this.currentState);
    overlays.forEach(overlay => this.activeUIOverlays.add(overlay));

    console.log(`StateManager: Updating UI overlays for state ${this.currentState}`);
    console.log(`StateManager: UI overlays:`, Array.from(this.activeUIOverlays));

    // Emit UI update event
    this.emitEvent({
      type: 'uiUpdate',
      data: { uiOverlays: Array.from(this.activeUIOverlays) }
    });
  }

  /**
   * Title screen tick handling
   */
  private tickTitleScreen(): void {
    if (!this.ENABLE_TITLE_AUTO_DEMO) {
      return;
    }
    this.demoTimeoutTicks++;
    if (this.demoTimeoutTicks >= this.DEMO_TIMEOUT) {
      this.requestTransition(StateTransition.SHOW_DEMO);
    }
  }

  /**
   * Countdown tick handling
   */
  private tickCountdown(): void {
    this.countdownTicks++;

    // Calculate countdown state based on ticks
    const ticksPerState = Math.floor(this.COUNTDOWN_DURATION / 4);
    const stateIndex = Math.floor(this.countdownTicks / ticksPerState);

    if (stateIndex < 4) {
      const newCountdownState = [CountdownState.THREE, CountdownState.TWO, CountdownState.ONE, CountdownState.GO][stateIndex];
      if (newCountdownState !== this.countdownState) {
        this.countdownState = newCountdownState;
        console.log('Countdown:', this.countdownState === CountdownState.GO ? 'GO!' : this.countdownState.toString());
      }
    }

    // Complete countdown
    if (this.countdownTicks >= this.COUNTDOWN_DURATION) {
      this.requestTransition(StateTransition.COUNTDOWN_COMPLETE);
    }
  }

  /**
   * Game running tick handling
   */
  private tickGameRunning(): void {
    if (!this.board) return;

    // Check for game over conditions
    if (this.board.state === BoardState.GAME_OVER) {
      this.requestTransition(StateTransition.PLAYER_LOST);
    } else if (this.board.state === BoardState.WON) {
      this.requestTransition(StateTransition.PLAYER_WON, { playerWon: true });
    }
  }

  /**
   * Initialize game board for new game
   */
  private initializeGameBoard(): void {
    if (!this.board) return;

    // Reset board state
    this.board.resetForNewGame();

    // Initialize the appropriate game mode
    const gameModeManager = GameModeManager.getInstance();
    gameModeManager.startMode(this.currentGameMode);

    console.log(`Game board initialized for new game with mode: ${this.currentGameMode}`);
  }

  /**
   * Start the game
   */
  private startGame(): void {
    if (!this.board || !this.gameController) return;

    this.board.state = BoardState.RUNNING;
    this.gameController.state = GameControllerState.RUNNING;
    console.log('Game started');
  }

  /**
   * Pause the game
   */
  private pauseGame(): void {
    if (!this.gameController) return;

    this.gameController.pause();
    console.log('Game paused');
  }

  /**
   * Resume the game
   */
  private resumeGame(): void {
    if (!this.gameController) return;

    this.gameController.resume();
    console.log('Game resumed');
  }

  /**
   * End the game
   */
  private endGame(): void {
    if (!this.board || !this.gameController) return;

    console.log('Game ended. Final score:', this.board.getScore());
  }

  /**
   * Start demo mode
   */
  private startDemo(): void {
    if (!this.board) return;

    this.initializeGameBoard();
    console.log('Demo mode started');
  }

  /**
   * Stop demo mode
   */
  private stopDemo(): void {
    console.log('Demo mode stopped');
  }

  /**
   * Update current state data
   */
  private updateStateData(): void {
    if (this.board) {
      this.stateData.score = this.board.getScore();
    }
  }

  /**
   * Notify all listeners of state change
   */
  private notifyStateChange(oldState: GameState, newState: GameState): void {
    console.log(`StateManager: Notifying ${this.stateChangeListeners.length} state change listeners`);

    this.stateChangeListeners.forEach((listener, index) => {
      try {
        console.log(`StateManager: Calling state change listener ${index}`);
        listener.onStateChange(oldState, newState);
      } catch (error) {
        console.error(`Error in state change listener ${index}:`, error);
      }
    });

    // Emit state change event
    this.emitEvent({
      type: 'stateChange',
      data: { oldState, newState, stateData: this.stateData }
    });
  }

  /**
   * Emit an event to all listeners
   */
  private emitEvent(event: StateManagerEvent): void {
    console.log(`StateManager: Emitting event ${event.type} to ${this.eventListeners.length} listeners`);

    this.eventListeners.forEach((listener, index) => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in event listener ${index}:`, error);
      }
    });
  }

  /**
   * Handle music transitions between game states
   */
  private handleMusicTransition(oldState: GameState, newState: GameState): void {
    if (!this.audioSystem || !this.audioSystem.isReady()) {
      return;
    }

    console.log(`StateManager: Handling music transition from ${oldState} to ${newState}`);

    switch (newState) {
      case GameState.TITLE_SCREEN:
        if (oldState === GameState.LOADING) {
          // Play title intro then loop
          this.audioSystem.playMusic('title_intro', 1.0);
        } else {
          // Direct to title loop
          this.audioSystem.playMusic('title_loop', 1.0);
        }
        break;

      case GameState.GAME_COUNTDOWN:
        // Start battle music
        this.audioSystem.crossfadeMusic('battle_normal', 2.0);
        break;

      case GameState.GAME_RUNNING:
        if (oldState === GameState.GAME_PAUSED) {
          // Resume music
          this.audioSystem.resumeMusic();
        } else {
          // Start battle music
          this.audioSystem.crossfadeMusic('battle_normal', 2.0);
        }
        break;

      case GameState.GAME_PAUSED:
        // Pause music
        this.audioSystem.pauseMusic();
        break;

      case GameState.GAME_OVER:
        // Stop music
        this.audioSystem.stopMusic(2.0);
        break;

      default:
        // For other states, keep current music
        break;
    }
  }

  // Public getters
  public getCurrentState(): GameState { return this.currentState; }
  public getPreviousState(): GameState { return this.previousState; }
  public getStateData(): StateData { return { ...this.stateData }; }
  public getActiveUIOverlays(): UIOverlay[] { return Array.from(this.activeUIOverlays); }
  public getCurrentMenu(): MenuType | null { return this.currentMenu; }
  public getCountdownState(): CountdownState { return this.countdownState; }
  public isTransitionInProgress(): boolean { return this.transitionInProgress; }

  // Public methods for external components
  public addStateChangeListener(listener: StateChangeListener): void {
    this.stateChangeListeners.push(listener);
  }

  public removeStateChangeListener(listener: StateChangeListener): void {
    const index = this.stateChangeListeners.indexOf(listener);
    if (index > -1) {
      this.stateChangeListeners.splice(index, 1);
    }
  }

  public addEventListener(listener: (event: StateManagerEvent) => void): void {
    console.log(`StateManager: Adding event listener (total will be ${this.eventListeners.length + 1})`);
    this.eventListeners.push(listener);
  }

  public removeEventListener(listener: (event: StateManagerEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  // Game mode methods
  public setGameMode(gameMode: GameMode): void {
    this.currentGameMode = gameMode;
    console.log(`StateManager: Game mode set to ${gameMode}`);
  }

  public getCurrentGameMode(): GameMode {
    return this.currentGameMode;
  }

  // Input handling (for idle detection)
  public onUserInput(): void {
    const gameModeManager = GameModeManager.getInstance();
    gameModeManager.onUserInput();
    // Reset demo timeout when on the title screen
    if (this.currentState === GameState.TITLE_SCREEN) {
      this.demoTimeoutTicks = 0;
    }
  }

  // Debug methods
  public getDebugInfo(): string {
    return `State: ${this.currentState} | Previous: ${this.previousState} | Mode: ${this.currentGameMode} | Transitioning: ${this.transitionInProgress} | Menu: ${this.currentMenu || 'none'}`;
  }
}