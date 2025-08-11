import { Board } from './Board';
import { Cursor } from './Cursor';
import { InputManager, InputAction, InputEvent, InputEventType } from '../input/InputManager';
import { BoardState } from './BlockTypes';
import { GarbageBlockType } from './GarbageBlock';
import { debugLog } from '../debug/InputDebugger';
import { StateManager } from '../core/StateManager';
import { StateTransition, GameState, StateUtils } from '../core/GameState';

// Game controller state
export enum GameControllerState {
  RUNNING = 'running',
  PAUSED = 'paused',
  GAME_OVER = 'game_over'
}

// Input timing constants
interface InputTiming {
  moveDelay: number;        // Ticks between cursor moves when holding
  swapDelay: number;        // Ticks between swaps when holding
  raiseDelay: number;       // Ticks between raises when holding
  initialDelay: number;     // Initial delay before repeat starts
}

export class GameController {
  // Input timing constants (matching original game feel)
  private static readonly INPUT_TIMING: InputTiming = {
    moveDelay: 8,      // ~7.5 moves per second
    swapDelay: 10,     // ~6 swaps per second
    raiseDelay: 6,     // ~10 raises per second
    initialDelay: 15   // Initial delay before repeat
  };

  // Core components
  private board: Board;
  private cursor: Cursor;
  private inputManager: InputManager;
  
  // State management
  public state: GameControllerState = GameControllerState.RUNNING;
  
  // Input timing state
  private lastMoveTime: number = 0;
  private lastSwapTime: number = 0;
  private lastRaiseTime: number = 0;
  
  // Input hold tracking
  private moveHoldTicks: number = 0;
  private swapHoldTicks: number = 0;
  private raiseHoldTicks: number = 0;
  
  // Statistics
  public totalSwaps: number = 0;
  public totalRaises: number = 0;
  public totalMoves: number = 0;
  
  // Garbage drop cooldown
  private lastGarbageDropTime: number = 0;

  constructor(board: Board, cursor: Cursor) {
    debugLog('GameController', 'Constructor called');
    this.board = board;
    this.cursor = cursor;
    this.inputManager = new InputManager();
    debugLog('GameController', 'GameController initialized');
  }

  // Main update loop
  public tick(): void {
    if (this.state === GameControllerState.PAUSED) {
      // Only process pause input when paused
      this.handlePauseInput();
      return;
    }

    // Update input manager
    this.inputManager.update();
    
    // Input processing continues below
    
    // Process all input events
    const inputEvents = this.inputManager.getInputEvents();
    if (inputEvents.length > 0) {
      debugLog('GameController', `Processing ${inputEvents.length} input events`);
    }
    for (const event of inputEvents) {
      debugLog('GameController', `Handling event: ${event.action} - ${event.type}`);
      this.handleInputEvent(event);
    }
    
    // Handle continuous input (holding keys)
    this.handleContinuousInput();
    
    // Update timing counters
    this.updateTimingCounters();
  }

  // Handle individual input events
  private handleInputEvent(event: InputEvent): void {
    switch (event.action) {
      case InputAction.PAUSE:
        if (event.type === InputEventType.PRESSED) {
          this.togglePause();
        }
        break;
        
      case InputAction.UP:
        if (event.type === InputEventType.PRESSED) {
          this.handleCursorMove(0, 1);
          this.resetMoveHold();
        }
        break;
        
      case InputAction.DOWN:
        if (event.type === InputEventType.PRESSED) {
          this.handleCursorMove(0, -1);
          this.resetMoveHold();
        }
        break;
        
      case InputAction.LEFT:
        if (event.type === InputEventType.PRESSED) {
          this.handleCursorMove(-1, 0);
          this.resetMoveHold();
        }
        break;
        
      case InputAction.RIGHT:
        if (event.type === InputEventType.PRESSED) {
          this.handleCursorMove(1, 0);
          this.resetMoveHold();
        }
        break;
        
      case InputAction.SWAP:
        if (event.type === InputEventType.PRESSED) {
          this.handleSwap();
          this.resetSwapHold();
        }
        break;
        
      case InputAction.RAISE:
        if (event.type === InputEventType.PRESSED) {
          this.handleRaise();
          this.resetRaiseHold();
        }
        break;
        
      case InputAction.DROP_GARBAGE:
        if (event.type === InputEventType.PRESSED || event.type === InputEventType.HELD) {
          // Add cooldown to prevent spam (only allow one drop per 30 ticks / 0.5 seconds)
          const currentTime = this.board.ticksRun;
          if (currentTime - this.lastGarbageDropTime >= 30) {
            this.handleGarbageDrop();
            this.lastGarbageDropTime = currentTime;
          }
        }
        break;
    }
  }

  // Handle continuous input (holding keys)
  private handleContinuousInput(): void {
    // Movement input
    if (this.inputManager.isPressed(InputAction.UP) ||
        this.inputManager.isPressed(InputAction.DOWN) ||
        this.inputManager.isPressed(InputAction.LEFT) ||
        this.inputManager.isPressed(InputAction.RIGHT)) {
      
      this.moveHoldTicks++;
      
      if (this.moveHoldTicks > GameController.INPUT_TIMING.initialDelay &&
          this.moveHoldTicks % GameController.INPUT_TIMING.moveDelay === 0) {
        
        let deltaX = 0, deltaY = 0;
        
        if (this.inputManager.isPressed(InputAction.UP)) deltaY = 1;
        if (this.inputManager.isPressed(InputAction.DOWN)) deltaY = -1;
        if (this.inputManager.isPressed(InputAction.LEFT)) deltaX = -1;
        if (this.inputManager.isPressed(InputAction.RIGHT)) deltaX = 1;
        
        this.handleCursorMove(deltaX, deltaY);
      }
    }
    
    // Swap input
    if (this.inputManager.isPressed(InputAction.SWAP)) {
      this.swapHoldTicks++;
      
      if (this.swapHoldTicks > GameController.INPUT_TIMING.initialDelay &&
          this.swapHoldTicks % GameController.INPUT_TIMING.swapDelay === 0) {
        this.handleSwap();
      }
    }
    
    // Raise input
    if (this.inputManager.isPressed(InputAction.RAISE)) {
      this.raiseHoldTicks++;
      
      if (this.raiseHoldTicks > GameController.INPUT_TIMING.initialDelay &&
          this.raiseHoldTicks % GameController.INPUT_TIMING.raiseDelay === 0) {
        this.handleRaise();
      }
    }
  }

  // Handle cursor movement
  private handleCursorMove(deltaX: number, deltaY: number): void {
    debugLog('GameController', `handleCursorMove: deltaX=${deltaX}, deltaY=${deltaY}, boardState=${this.board.state}`);
    
    if (this.board.state !== BoardState.RUNNING) {
      debugLog('GameController', `Board not running (state=${this.board.state}), skipping move`);
      return;
    }
    if (this.cursor.isMoving()) {
      debugLog('GameController', 'Cursor is moving, skipping move');
      return; // Wait for smooth movement to finish
    }
    
    const moved = this.cursor.move(deltaX, deltaY);
    debugLog('GameController', `Cursor move result: ${moved}`);
    if (moved) {
      this.totalMoves++;
      debugLog('GameController', `Total moves: ${this.totalMoves}`);
    }
  }

  // Handle block swapping
  private handleSwap(): void {
    if (this.board.state !== BoardState.RUNNING) return;
    if (this.board.hasActiveBlocks()) return; // Don't swap during animations
    
    const swapped = this.cursor.swap();
    if (swapped) {
      this.totalSwaps++;
    }
  }

  // Handle manual stack raising
  private handleRaise(): void {
    if (this.board.state !== BoardState.RUNNING) return;
    
    this.board.inputForceStackRaise();
    this.totalRaises++;
  }
  
  // Handle garbage drop (for testing)
  private handleGarbageDrop(): void {
    if (this.board.state !== BoardState.RUNNING) {
      return;
    }
    
    // Queue a random garbage block for testing
    const garbageTypes = [GarbageBlockType.NORMAL, GarbageBlockType.GRAY];
    const randomType = garbageTypes[Math.floor(Math.random() * garbageTypes.length)];
    const randomSize = Math.floor(Math.random() * 4) + 2; // 2-5 width
    const fullWidth = Math.random() < 0.3;
    
    this.board.queueGarbage(
      fullWidth,
      randomSize,
      randomType
    );
    
    console.log(`Garbage queued: ${fullWidth ? 'FULL-WIDTH' : randomSize + '-wide'} ${randomType}`);
  }

  // Handle pause input (when game is paused)
  private handlePauseInput(): void {
    this.inputManager.update();
    const inputEvents = this.inputManager.getInputEvents();
    
    for (const event of inputEvents) {
      if (event.action === InputAction.PAUSE && event.type === InputEventType.PRESSED) {
        this.togglePause();
        break;
      }
    }
  }

  // Toggle pause state (Phase 9 - integrate with StateManager)
  private togglePause(): void {
    const stateManager = StateManager.getInstance();
    const currentState = stateManager.getCurrentState();
    
    // Only allow pausing during gameplay states
    if (StateUtils.isGameplayState(currentState)) {
      if (currentState === GameState.GAME_RUNNING) {
        stateManager.requestTransition(StateTransition.PAUSE_GAME);
        this.state = GameControllerState.PAUSED;
        this.resetAllHoldCounters();
      } else if (currentState === GameState.GAME_PAUSED) {
        stateManager.requestTransition(StateTransition.RESUME_GAME);
        this.state = GameControllerState.RUNNING;
      }
    }
  }

  // Update timing counters
  private updateTimingCounters(): void {
    // Reset hold counters when keys are released
    if (!this.inputManager.isPressed(InputAction.UP) &&
        !this.inputManager.isPressed(InputAction.DOWN) &&
        !this.inputManager.isPressed(InputAction.LEFT) &&
        !this.inputManager.isPressed(InputAction.RIGHT)) {
      this.moveHoldTicks = 0;
    }
    
    if (!this.inputManager.isPressed(InputAction.SWAP)) {
      this.swapHoldTicks = 0;
    }
    
    if (!this.inputManager.isPressed(InputAction.RAISE)) {
      this.raiseHoldTicks = 0;
    }
  }

  // Reset move hold timing
  private resetMoveHold(): void {
    this.moveHoldTicks = 0;
  }

  // Reset swap hold timing
  private resetSwapHold(): void {
    this.swapHoldTicks = 0;
  }

  // Reset raise hold timing
  private resetRaiseHold(): void {
    this.raiseHoldTicks = 0;
  }

  // Reset all hold counters
  private resetAllHoldCounters(): void {
    this.moveHoldTicks = 0;
    this.swapHoldTicks = 0;
    this.raiseHoldTicks = 0;
  }

  // Check if game is paused
  public isPaused(): boolean {
    return this.state === GameControllerState.PAUSED;
  }

  // Force pause state
  public pause(): void {
    if (this.state === GameControllerState.RUNNING) {
      this.state = GameControllerState.PAUSED;
      this.resetAllHoldCounters();
    }
  }

  // Force resume state
  public resume(): void {
    if (this.state === GameControllerState.PAUSED) {
      this.state = GameControllerState.RUNNING;
    }
  }

  // Handle game over
  public gameOver(): void {
    this.state = GameControllerState.GAME_OVER;
    this.resetAllHoldCounters();
  }

  // Reset controller state
  public reset(): void {
    this.state = GameControllerState.RUNNING;
    this.resetAllHoldCounters();
    this.totalSwaps = 0;
    this.totalRaises = 0;
    this.totalMoves = 0;
    this.inputManager.reset();
  }

  // Get input manager
  public getInputManager(): InputManager {
    return this.inputManager;
  }

  // Set custom key bindings
  public setKeyBinding(key: string, action: InputAction): void {
    this.inputManager.setKeyBinding(key, action);
  }

  // Get current key bindings
  public getKeyBindings(): Map<string, InputAction> {
    return this.inputManager.getKeyBindings();
  }

  // Enable/disable cursor pulsing based on game state
  public updateCursorState(): void {
    switch (this.board.state) {
      case BoardState.COUNTDOWN:
        this.cursor.setPulseEnabled(false);
        this.cursor.setVisible(true);
        break;
      case BoardState.RUNNING:
        this.cursor.setPulseEnabled(true);
        this.cursor.setVisible(true);
        break;
      case BoardState.GAME_OVER:
      case BoardState.WON:
        this.cursor.setPulseEnabled(false);
        this.cursor.setVisible(false);
        break;
    }
    
    // Change cursor color in panic mode
    if (this.board.isPanic()) {
      this.cursor.setColor(0xFF4444); // Red in panic
    } else {
      this.cursor.setColor(0xFFFFFF); // White normally
    }
  }

  // Get performance statistics
  public getStats(): { swaps: number; raises: number; moves: number } {
    return {
      swaps: this.totalSwaps,
      raises: this.totalRaises,
      moves: this.totalMoves
    };
  }

  // Get debug information
  public getDebugInfo(): string {
    const stats = this.getStats();
    return `Controller: ${this.state} Swaps:${stats.swaps} Raises:${stats.raises} Moves:${stats.moves}`;
  }

  // Cleanup resources
  public dispose(): void {
    this.inputManager.dispose();
    this.resetAllHoldCounters();
  }
}