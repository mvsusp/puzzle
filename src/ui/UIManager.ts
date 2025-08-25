/**
 * UI Manager - Phase 9 Implementation
 * 
 * Central UI management system that creates and manages DOM-based UI elements
 * including menus, overlays, HUD elements, and other interface components.
 */

import { GameState, UIOverlay } from '../core/GameState';
import { StateManager, StateManagerEvent } from '../core/StateManager';
import { UIComponent } from './UITypes';
import { ScoreHUD } from './components/ScoreHUD';
import { CountdownOverlay } from './components/CountdownOverlay';
import { MainMenu } from './components/MainMenu';
import { PauseMenu } from './components/PauseMenu';
import { GameOverScreen } from './components/GameOverScreen';
import { OptionsMenu } from './components/OptionsMenu';
import { TitleScreen } from './components/TitleScreen';


/**
 * Main UI Manager class
 */
export class UIManager {
  private static instance: UIManager | null = null;
  
  // Core UI container
  private uiContainer: HTMLElement;
  private stateManager: StateManager;
  
  // UI Components
  private components: Map<string, UIComponent> = new Map();
  private activeOverlays: Set<UIOverlay> = new Set();
  
  // Component instances
  private scoreHUD: ScoreHUD | null = null;
  private countdownOverlay: CountdownOverlay | null = null;
  private titleScreen: TitleScreen | null = null;
  private mainMenu: MainMenu | null = null;
  private pauseMenu: PauseMenu | null = null;
  private gameOverScreen: GameOverScreen | null = null;
  private optionsMenu: OptionsMenu | null = null;
  
  private constructor() {
    console.log('UIManager: Constructor called');
    this.stateManager = StateManager.getInstance();
    console.log('UIManager: StateManager instance obtained');
    this.uiContainer = this.createUIContainer();
    console.log('UIManager: UI container created');
    this.setupStateListeners();
    console.log('UIManager: Constructor completed');
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): UIManager {
    if (!UIManager.instance) {
      console.log('UIManager: Creating new singleton instance');
      UIManager.instance = new UIManager();
    } else {
      console.log('UIManager: Returning existing singleton instance');
    }
    return UIManager.instance;
  }
  
  /**
   * Initialize UI manager
   */
  public initialize(): void {
    console.log('UIManager: initialize() called');
    console.log('UIManager: UI container element:', this.uiContainer);
    console.log('UIManager: State manager:', this.stateManager);
    console.log('UIManager initialized');
  }
  
  /**
   * Create the main UI container
   */
  private createUIContainer(): HTMLElement {
    let container = document.getElementById('uiContainer');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'uiContainer';
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        font-family: monospace;
        color: white;
        z-index: 1000;
      `;
      document.body.appendChild(container);
    }
    
    return container;
  }
  
  /**
   * Setup state change listeners
   */
  private setupStateListeners(): void {
    console.log('UIManager: Setting up state listeners');
    
    this.stateManager.addEventListener((event: StateManagerEvent) => {
      console.log(`UIManager: Received event ${event.type}`);
      
      switch (event.type) {
        case 'stateChange':
          console.log('UIManager: Handling state change event');
          this.handleStateChange(event);
          break;
        case 'uiUpdate':
          console.log('UIManager: Handling UI update event');
          this.handleUIUpdate(event);
          break;
        default:
          console.log(`UIManager: Unhandled event type: ${event.type}`);
          break;
      }
    });
    
    console.log('UIManager: State listeners setup complete');
  }
  
  /**
   * Handle state changes
   */
  private handleStateChange(event: StateManagerEvent): void {
    const { oldState, newState } = event.data;
    console.log(`UIManager: State change ${oldState} -> ${newState}`);
    
    // Hide components from old state
    console.log(`UIManager: Hiding components for old state: ${oldState}`);
    this.hideStateComponents(oldState);
    
    // Show components for new state
    console.log(`UIManager: Showing components for new state: ${newState}`);
    this.showStateComponents(newState);
  }
  
  /**
   * Handle UI overlay updates
   */
  private handleUIUpdate(event: StateManagerEvent): void {
    const { uiOverlays } = event.data;
    if (uiOverlays) {
      this.updateOverlays(uiOverlays as UIOverlay[]);
    }
  }
  
  /**
   * Hide UI components for a state
   */
  private hideStateComponents(state?: GameState): void {
    if (!state) return;
    
    switch (state) {
      case GameState.TITLE_SCREEN:
        this.titleScreen?.hide();
        break;
      case GameState.MAIN_MENU:
        this.mainMenu?.hide();
        break;
      case GameState.GAME_PAUSED:
        this.pauseMenu?.hide();
        break;
      case GameState.GAME_OVER:
        this.gameOverScreen?.hide();
        break;
      case GameState.OPTIONS_MENU:
        this.optionsMenu?.hide();
        break;
    }
  }
  
  /**
   * Show UI components for a state
   */
  private showStateComponents(state?: GameState): void {
    if (!state) {
      console.log('UIManager: showStateComponents called with no state');
      return;
    }
    
    console.log(`UIManager: showStateComponents called for state: ${state}`);
    
    switch (state) {
      case GameState.TITLE_SCREEN:
        console.log('UIManager: Calling showTitleScreen()');
        this.showTitleScreen();
        break;
      case GameState.MAIN_MENU:
        console.log('UIManager: Calling showMainMenu()');
        this.showMainMenu();
        break;
      case GameState.GAME_PAUSED:
        console.log('UIManager: Calling showPauseMenu()');
        this.showPauseMenu();
        break;
      case GameState.GAME_OVER:
        console.log('UIManager: Calling showGameOverScreen()');
        this.showGameOverScreen();
        break;
      case GameState.OPTIONS_MENU:
        console.log('UIManager: Calling showOptionsMenu()');
        this.showOptionsMenu();
        break;
      default:
        console.log(`UIManager: No UI component handler for state: ${state}`);
        break;
    }
  }
  
  /**
   * Update active overlays
   */
  private updateOverlays(overlays: UIOverlay[]): void {
    // Hide overlays no longer active
    for (const overlay of this.activeOverlays) {
      if (!overlays.includes(overlay)) {
        this.hideOverlay(overlay);
        this.activeOverlays.delete(overlay);
      }
    }
    
    // Show new overlays
    for (const overlay of overlays) {
      if (!this.activeOverlays.has(overlay)) {
        this.showOverlay(overlay);
        this.activeOverlays.add(overlay);
      }
    }
  }
  
  /**
   * Show an overlay
   */
  private showOverlay(overlay: UIOverlay): void {
    switch (overlay) {
      case UIOverlay.SCORE:
        this.showScoreHUD();
        break;
      case UIOverlay.COUNTDOWN:
        this.showCountdownOverlay();
        break;
      case UIOverlay.PAUSE_MENU:
        this.showPauseMenu();
        break;
      case UIOverlay.GAME_OVER:
        this.showGameOverScreen();
        break;
    }
  }
  
  /**
   * Hide an overlay
   */
  private hideOverlay(overlay: UIOverlay): void {
    switch (overlay) {
      case UIOverlay.SCORE:
        this.scoreHUD?.hide();
        break;
      case UIOverlay.COUNTDOWN:
        this.countdownOverlay?.hide();
        break;
      case UIOverlay.PAUSE_MENU:
        this.pauseMenu?.hide();
        break;
      case UIOverlay.GAME_OVER:
        this.gameOverScreen?.hide();
        break;
    }
  }
  
  /**
   * Show title screen
   */
  private showTitleScreen(): void {
    console.log('UIManager: Showing title screen');
    if (!this.titleScreen) {
      console.log('UIManager: Creating new TitleScreen component');
      this.titleScreen = new TitleScreen();
      this.titleScreen.init();
      console.log('UIManager: TitleScreen instance created');
      this.uiContainer.appendChild(this.titleScreen.element);
      this.components.set('titleScreen', this.titleScreen);
      console.log('UIManager: TitleScreen added to DOM');
    }
    console.log('UIManager: Calling titleScreen.show()');
    this.titleScreen.show();
    console.log('UIManager: TitleScreen.show() completed');
  }
  
  /**
   * Show main menu
   */
  private showMainMenu(): void {
    if (!this.mainMenu) {
      this.mainMenu = new MainMenu();
      this.mainMenu.init();
      this.uiContainer.appendChild(this.mainMenu.element);
      this.components.set('mainMenu', this.mainMenu);
    }
    this.mainMenu.show();
  }
  
  /**
   * Show score HUD
   */
  private showScoreHUD(): void {
    if (!this.scoreHUD) {
      this.scoreHUD = new ScoreHUD();
      this.scoreHUD.init();
      this.uiContainer.appendChild(this.scoreHUD.element);
      this.components.set('scoreHUD', this.scoreHUD);
    }
    this.scoreHUD.show();
  }
  
  /**
   * Show countdown overlay
   */
  private showCountdownOverlay(): void {
    if (!this.countdownOverlay) {
      this.countdownOverlay = new CountdownOverlay();
      this.countdownOverlay.init();
      this.uiContainer.appendChild(this.countdownOverlay.element);
      this.components.set('countdownOverlay', this.countdownOverlay);
    }
    this.countdownOverlay.show();
  }
  
  /**
   * Show pause menu
   */
  private showPauseMenu(): void {
    if (!this.pauseMenu) {
      this.pauseMenu = new PauseMenu();
      this.pauseMenu.init();
      this.uiContainer.appendChild(this.pauseMenu.element);
      this.components.set('pauseMenu', this.pauseMenu);
    }
    this.pauseMenu.show();
  }
  
  /**
   * Show game over screen
   */
  private showGameOverScreen(): void {
    if (!this.gameOverScreen) {
      this.gameOverScreen = new GameOverScreen();
      this.gameOverScreen.init();
      this.uiContainer.appendChild(this.gameOverScreen.element);
      this.components.set('gameOverScreen', this.gameOverScreen);
    }
    this.gameOverScreen.show();
  }
  
  /**
   * Show options menu
   */
  private showOptionsMenu(): void {
    if (!this.optionsMenu) {
      this.optionsMenu = new OptionsMenu();
      this.optionsMenu.init();
      this.uiContainer.appendChild(this.optionsMenu.element);
      this.components.set('optionsMenu', this.optionsMenu);
    }
    this.optionsMenu.show();
  }
  
  /**
   * Update all components with current data
   */
  public update(): void {
    const stateData = this.stateManager.getStateData();
    
    // Update each component with relevant data
    for (const [name, component] of this.components) {
      if (component.isVisible) {
        try {
          component.update(stateData);
        } catch (error) {
          console.error(`Error updating UI component ${name}:`, error);
        }
      }
    }
  }
  
  /**
   * Get a UI component by name
   */
  public getComponent(name: string): UIComponent | undefined {
    return this.components.get(name);
  }
  
  /**
   * Cleanup and destroy UI manager
   */
  public destroy(): void {
    for (const component of this.components.values()) {
      component.destroy();
    }
    this.components.clear();
    this.uiContainer.remove();
  }
  
  /**
   * Get debug information
   */
  public getDebugInfo(): string {
    const activeComponents = Array.from(this.components.keys())
      .filter(name => this.components.get(name)?.isVisible)
      .join(', ');
    const activeOverlaysList = Array.from(this.activeOverlays).join(', ');
    
    return `UI: Components(${activeComponents || 'none'}) | Overlays(${activeOverlaysList || 'none'})`;
  }
}