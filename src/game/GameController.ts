import { Board } from './Board';
import { Cursor } from './Cursor';
import { InputManager, InputAction, InputEvent, InputEventType } from '../input/InputManager';
import { BoardState, BlockState, TileType } from './BlockTypes';
import { GarbageBlockType } from './GarbageBlock';
import { debugLog } from '../debug/InputDebugger';
import { StateManager } from '../core/StateManager';
import { StateTransition, GameState, StateUtils } from '../core/GameState';
import { AudioSystem } from '../audio/AudioSystem';
import { BlockDimensions, BoardDimensions } from '../rendering/BlockConstants';

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
  private audioSystem: AudioSystem | null = null;
  
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

  // Pointer input handling
  private canvas: HTMLCanvasElement | undefined;
  private boundPointerMove?: (event: PointerEvent) => void;
  private boundPointerDown?: (event: PointerEvent) => void;
  private boundClick?: (event: MouseEvent) => void;

  // World/board positioning for pointer calculations
  private readonly WORLD_WIDTH = BoardDimensions.BOARD_PIXEL_WIDTH + 200;
  private readonly WORLD_HEIGHT = BoardDimensions.BOARD_PIXEL_HEIGHT + 100;
  private readonly BOARD_LEFT = -100 - BoardDimensions.BOARD_PIXEL_WIDTH / 2;
  private readonly BOARD_BOTTOM = -BoardDimensions.BOARD_PIXEL_HEIGHT / 2;

  constructor(board: Board, cursor: Cursor, audioSystem?: AudioSystem, canvas?: HTMLCanvasElement) {
    debugLog('GameController', 'Constructor called');
    this.board = board;
    this.cursor = cursor;
    this.inputManager = new InputManager();
    this.audioSystem = audioSystem || null;
    this.canvas = canvas;

    if (this.canvas) {
      this.boundPointerMove = this.handlePointerMove.bind(this);
      this.boundPointerDown = this.handlePointerDown.bind(this);
      this.boundClick = this.handleClick.bind(this);

      this.canvas.addEventListener('pointermove', this.boundPointerMove);
      this.canvas.addEventListener('pointerdown', this.boundPointerDown);
      this.canvas.addEventListener('click', this.boundClick);
    }
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
      
      // Notify StateManager of user input for idle detection
      const stateManager = StateManager.getInstance();
      stateManager.onUserInput();
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

  // Pointer event handlers for touch/mouse input
  private handlePointerDown(event: PointerEvent): void {
    if (this.state !== GameControllerState.RUNNING) return;
    this.moveCursorToPointer(event);
  }

  private handlePointerMove(event: PointerEvent): void {
    if (this.state !== GameControllerState.RUNNING) return;
    // For touch devices, pointermove only fires while pressed
    if (event.pointerType === 'mouse' || event.buttons !== 0 || event.pressure > 0) {
      this.moveCursorToPointer(event);
    }
  }

  private handleClick(event: MouseEvent): void {
    if (this.state !== GameControllerState.RUNNING) return;
    this.moveCursorToPointer(event as unknown as PointerEvent);
    this.handleSwap();
  }

  private moveCursorToPointer(event: PointerEvent): void {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    const worldX = ndcX * (this.WORLD_WIDTH / 2);
    const worldY = ndcY * (this.WORLD_HEIGHT / 2);

    const localX = worldX - this.BOARD_LEFT;
    const localY = worldY - this.BOARD_BOTTOM;

    if (
      localX < 0 ||
      localX >= BoardDimensions.BOARD_PIXEL_WIDTH ||
      localY < 0 ||
      localY >= BoardDimensions.BOARD_PIXEL_HEIGHT
    ) {
      return;
    }

    const gridX = Math.floor(localX / BlockDimensions.TILE_SIZE_X);
    const gridY = Math.floor(localY / BlockDimensions.TILE_SIZE_Y);

    this.cursor.setPosition(gridX, gridY);
  }

  // Handle cursor movement
  private handleCursorMove(dx: number, dy: number): void {
    // debugLog('GameController', `handleCursorMove: dx=${dx}, dy=${dy}, boardState=${this.board.state}`);
    
    if (this.board.state !== BoardState.RUNNING) {
      // debugLog('GameController', `Board not running (state=${this.board.state}), skipping move`);
      return;
    }
    // Allow cursor movement even while the board has active animations
    // and while the cursor is still interpolating to its last target.
    // This enables fluid input during matches/clears, matching original game feel.
    
    const moved = this.cursor.move(dx, dy);
    // debugLog('GameController', `Cursor move result: ${moved}`);
    if (moved) {
      this.totalMoves++;
      // debugLog('GameController', `Total moves: ${this.totalMoves}`);
      
      // Play cursor move sound
      if (this.audioSystem) {
        this.audioSystem.playSfx('cursor');
      }
    }
  }

  // Handle block swapping
  private handleSwap(): void {
    if (this.board.state !== BoardState.RUNNING) return;

    // Allow swaps during board animations, but only if the targeted tiles
    // are safe (not garbage and not currently locked by their own animation).
    const { x, y } = this.cursor.getTargetPosition();
    const leftTile = this.board.getTile(y, x);
    const rightTile = this.board.getTile(y, x + 1);

    // Validate tiles exist
    if (!leftTile || !rightTile) return;

    // Disallow swapping garbage tiles
    if (leftTile.type === TileType.GARBAGE || rightTile.type === TileType.GARBAGE) return;

    // Disallow swapping tiles whose blocks are locked by animation/explosion
    const leftLocked = !!leftTile.block && (
      leftTile.block.state === BlockState.EXPLODING ||
      leftTile.block.state === BlockState.MATCHED ||
      leftTile.block.state === BlockState.SWAPPING_LEFT ||
      leftTile.block.state === BlockState.SWAPPING_RIGHT
    );
    const rightLocked = !!rightTile.block && (
      rightTile.block.state === BlockState.EXPLODING ||
      rightTile.block.state === BlockState.MATCHED ||
      rightTile.block.state === BlockState.SWAPPING_LEFT ||
      rightTile.block.state === BlockState.SWAPPING_RIGHT
    );

    if (leftLocked || rightLocked) return;

    const swapped = this.cursor.swap();
    if (swapped) {
      this.totalSwaps++;
      // Play swap sound
      if (this.audioSystem) {
        this.audioSystem.playSfx('swap');
      }
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
    
    // console.log(`Garbage queued: ${fullWidth ? 'FULL-WIDTH' : randomSize + '-wide'} ${randomType}`);
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
        // Play pause sound
        if (this.audioSystem) {
          this.audioSystem.playSfx('pause');
        }
      } else if (currentState === GameState.GAME_PAUSED) {
        stateManager.requestTransition(StateTransition.RESUME_GAME);
        this.state = GameControllerState.RUNNING;
        // Play pause sound (resume uses same sound)
        if (this.audioSystem) {
          this.audioSystem.playSfx('pause');
        }
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

  // Game Mode Support Methods (Phase 11)
  
  /**
   * Set demo mode (for AI control)
   */
  public setDemoMode(_enabled: boolean): void {
    // TODO: Implement demo mode control
    // This would disable user input and allow AI to control the cursor
    // console.log(`GameController: Demo mode ${_enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Simulate input for AI/Demo mode
   */
  public simulateInput(action: InputAction): void {
    // Create a synthetic input event for the AI to use
    const syntheticEvent: InputEvent = {
      action,
      type: InputEventType.PRESSED,
      timestamp: Date.now(),
      repeat: false
    };
    
    this.handleInputEvent(syntheticEvent);
  }
  
  /**
   * Game mode ended callback
   */
  public onGameModeEnded(_data: Record<string, unknown>): void {
    // console.log('GameController: Game mode ended', _data);
    // TODO: Handle game mode end events
    // This could trigger state transitions or UI updates
  }
  
  // Cleanup resources
  public dispose(): void {
    this.inputManager.dispose();
    this.resetAllHoldCounters();

    if (this.canvas) {
      if (this.boundPointerMove) {
        this.canvas.removeEventListener('pointermove', this.boundPointerMove);
      }
      if (this.boundPointerDown) {
        this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
      }
      if (this.boundClick) {
        this.canvas.removeEventListener('click', this.boundClick);
      }
    }
  }
}
