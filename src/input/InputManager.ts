import { debugLog } from '../debug/InputDebugger';

// Input actions available in the game
export enum InputAction {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
  SWAP = 'swap',
  RAISE = 'raise',
  PAUSE = 'pause',
  DROP_GARBAGE = 'drop_garbage' // For testing garbage blocks
}

// Input event types
export enum InputEventType {
  PRESSED = 'pressed',
  RELEASED = 'released',
  HELD = 'held'
}

// Input event structure
export interface InputEvent {
  action: InputAction;
  type: InputEventType;
  timestamp: number;
  repeat: boolean;
}

// Key state tracking
interface KeyState {
  pressed: boolean;
  justPressed: boolean;
  justReleased: boolean;
  pressTime: number;
  repeatCount: number;
}

export class InputManager {
  // Default key bindings (matching original game)
  private keyBindings: Map<string, InputAction> = new Map([
    ['ArrowUp', InputAction.UP],
    ['ArrowDown', InputAction.DOWN],
    ['ArrowLeft', InputAction.LEFT],
    ['ArrowRight', InputAction.RIGHT],
    ['KeyX', InputAction.SWAP],
    ['KeyZ', InputAction.RAISE],
    ['Escape', InputAction.PAUSE],
    ['KeyQ', InputAction.DROP_GARBAGE], // For testing garbage blocks
    // Alternative bindings
    ['KeyW', InputAction.UP],
    ['KeyS', InputAction.DOWN],
    ['KeyA', InputAction.LEFT],
    ['KeyD', InputAction.RIGHT]
  ]);

  // Key state tracking
  private keyStates: Map<string, KeyState> = new Map();
  
  // Action state tracking
  private actionStates: Map<InputAction, KeyState> = new Map();
  
  // Input event queue
  private inputQueue: InputEvent[] = [];
  
  // Repeat timing constants (in milliseconds)
  private readonly REPEAT_DELAY = 250; // Initial delay before repeat
  private readonly REPEAT_RATE = 100;  // Subsequent repeat interval
  
  // Event listeners
  private boundKeyDown: (event: KeyboardEvent) => void;
  private boundKeyUp: (event: KeyboardEvent) => void;
  
  // System state
  private enabled: boolean = false;  // Start disabled so enable() will work
  private lastUpdateTime: number = 0;

  constructor() {
    debugLog('InputManager', 'Constructor called');
    
    // Initialize action states
    Object.values(InputAction).forEach(action => {
      this.actionStates.set(action, this.createKeyState());
    });

    // Bind event handlers
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    
    // Register event listeners
    this.enable();
    
    debugLog('InputManager', `Initialized with ${this.keyBindings.size} key bindings`);
  }

  // Create empty key state
  private createKeyState(): KeyState {
    return {
      pressed: false,
      justPressed: false,
      justReleased: false,
      pressTime: 0,
      repeatCount: 0
    };
  }

  // Enable input handling
  public enable(): void {
    if (this.enabled) {
      debugLog('InputManager', 'Already enabled, skipping addEventListener');
      return;
    }
    
    this.enabled = true;
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    debugLog('InputManager', 'Event listeners added successfully');
  }

  // Disable input handling
  public disable(): void {
    if (!this.enabled) return;
    
    this.enabled = false;
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    
    // Clear all states
    this.clearStates();
  }

  // Handle keydown events
  private handleKeyDown(event: KeyboardEvent): void {
    debugLog('InputManager', `KeyDown: ${event.code} (enabled=${this.enabled})`);
    
    if (!this.enabled) {
      debugLog('InputManager', 'Input disabled, ignoring keydown');
      return;
    }

    const code = event.code;
    const action = this.keyBindings.get(code);
    
    if (!action) {
      debugLog('InputManager', `No action mapped for key: ${code}`);
      return;
    }
    
    debugLog('InputManager', `Action found: ${action}`);
    
    // Prevent default browser behavior for game keys
    event.preventDefault();
    
    const currentTime = performance.now();
    
    // Update key state
    let keyState = this.keyStates.get(code);
    if (!keyState) {
      keyState = this.createKeyState();
      this.keyStates.set(code, keyState);
    }
    
    // Handle first press or repeat
    if (!keyState.pressed) {
      // First press
      keyState.pressed = true;
      keyState.justPressed = true;
      keyState.pressTime = currentTime;
      keyState.repeatCount = 0;
      
      this.queueInputEvent(action, InputEventType.PRESSED, currentTime, false);
    } else if (event.repeat) {
      // Handle browser repeat
      const elapsed = currentTime - keyState.pressTime;
      
      if (elapsed >= this.REPEAT_DELAY) {
        keyState.repeatCount++;
        this.queueInputEvent(action, InputEventType.HELD, currentTime, true);
      }
    }
    
    // Update action state
    const actionState = this.actionStates.get(action);
    if (!actionState) return;
    
    if (!actionState.pressed) {
      actionState.pressed = true;
      actionState.justPressed = true;
      actionState.pressTime = currentTime;
      actionState.repeatCount = 0;
    }
  }

  // Handle keyup events
  private handleKeyUp(event: KeyboardEvent): void {
    if (!this.enabled) return;

    const code = event.code;
    const action = this.keyBindings.get(code);
    
    if (!action) return;
    
    event.preventDefault();
    
    const currentTime = performance.now();
    
    // Update key state
    const keyState = this.keyStates.get(code);
    if (keyState && keyState.pressed) {
      keyState.pressed = false;
      keyState.justReleased = true;
      
      this.queueInputEvent(action, InputEventType.RELEASED, currentTime, false);
    }
    
    // Update action state
    const actionState = this.actionStates.get(action);
    if (!actionState) return;
    
    if (actionState.pressed) {
      actionState.pressed = false;
      actionState.justReleased = true;
    }
  }

  // Queue input event
  private queueInputEvent(action: InputAction, type: InputEventType, timestamp: number, repeat: boolean): void {
    this.inputQueue.push({
      action,
      type,
      timestamp,
      repeat
    });
  }

  // Update input states (call once per frame)
  public update(): void {
    const currentTime = performance.now();
    this.lastUpdateTime = currentTime;
    
    // Update action states with custom repeat logic
    this.actionStates.forEach((state, action) => {
      if (state.pressed && !state.justPressed) {
        const elapsed = currentTime - state.pressTime;
        
        if (elapsed >= (this.REPEAT_DELAY + state.repeatCount * this.REPEAT_RATE)) {
          state.repeatCount++;
          this.queueInputEvent(action, InputEventType.HELD, currentTime, true);
        }
      }
      
      // Clear just pressed/released flags
      state.justPressed = false;
      state.justReleased = false;
    });
    
    // Clear key state flags
    this.keyStates.forEach(state => {
      state.justPressed = false;
      state.justReleased = false;
    });
  }

  // Get all queued input events and clear queue
  public getInputEvents(): InputEvent[] {
    const events = [...this.inputQueue];
    this.inputQueue.length = 0;
    return events;
  }

  // Check if action is currently pressed
  public isPressed(action: InputAction): boolean {
    return this.actionStates.get(action)?.pressed ?? false;
  }

  // Check if action was just pressed this frame
  public isJustPressed(action: InputAction): boolean {
    return this.actionStates.get(action)?.justPressed ?? false;
  }

  // Check if action was just released this frame
  public isJustReleased(action: InputAction): boolean {
    return this.actionStates.get(action)?.justReleased ?? false;
  }

  // Get how long an action has been held (in milliseconds)
  public getHoldDuration(action: InputAction): number {
    const state = this.actionStates.get(action);
    if (!state || !state.pressed) return 0;
    return this.lastUpdateTime - state.pressTime;
  }

  // Set custom key binding
  public setKeyBinding(key: string, action: InputAction): void {
    this.keyBindings.set(key, action);
  }

  // Remove key binding
  public removeKeyBinding(key: string): void {
    this.keyBindings.delete(key);
  }

  // Get current key bindings
  public getKeyBindings(): Map<string, InputAction> {
    return new Map(this.keyBindings);
  }

  // Clear all input states
  private clearStates(): void {
    this.keyStates.clear();
    this.actionStates.forEach(state => {
      state.pressed = false;
      state.justPressed = false;
      state.justReleased = false;
      state.pressTime = 0;
      state.repeatCount = 0;
    });
    this.inputQueue.length = 0;
  }

  // Reset all input states (useful for game state changes)
  public reset(): void {
    this.clearStates();
  }

  // Check if input system is enabled
  public isEnabled(): boolean {
    return this.enabled;
  }

  // Get queue size (for debugging)
  public getQueueSize(): number {
    return this.inputQueue.length;
  }

  // Get debug information
  public getDebugInfo(): string {
    const pressedActions = Array.from(this.actionStates.entries())
      .filter(([_, state]) => state.pressed)
      .map(([action, _]) => action);
    
    return `Input: Queue(${this.inputQueue.length}) Pressed(${pressedActions.join(',')}) Enabled(${this.enabled})`;
  }

  // Cleanup
  public dispose(): void {
    this.disable();
    this.clearStates();
    this.keyBindings.clear();
    this.actionStates.clear();
  }
}