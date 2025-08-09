import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InputManager, InputAction, InputEventType } from '../../../src/input/InputManager';

// Mock performance.now
vi.stubGlobal('performance', {
  now: vi.fn(() => 1000)
});

describe('InputManager', () => {
  let inputManager: InputManager;
  let mockPerformanceNow: any;

  beforeEach(() => {
    // Clear all timers and mocks
    vi.clearAllTimers();
    mockPerformanceNow = vi.mocked(performance.now) as any;
    mockPerformanceNow.mockReturnValue(1000);
    
    inputManager = new InputManager();
  });

  describe('Initialization', () => {
    it('should create InputManager with default keybindings', () => {
      expect(inputManager.isEnabled()).toBe(true);
      
      const bindings = inputManager.getKeyBindings();
      expect(bindings.get('ArrowUp')).toBe(InputAction.UP);
      expect(bindings.get('ArrowDown')).toBe(InputAction.DOWN);
      expect(bindings.get('ArrowLeft')).toBe(InputAction.LEFT);
      expect(bindings.get('ArrowRight')).toBe(InputAction.RIGHT);
      expect(bindings.get('KeyX')).toBe(InputAction.SWAP);
      expect(bindings.get('KeyZ')).toBe(InputAction.RAISE);
      expect(bindings.get('Escape')).toBe(InputAction.PAUSE);
    });

    it('should start with no pressed actions', () => {
      expect(inputManager.isPressed(InputAction.UP)).toBe(false);
      expect(inputManager.isPressed(InputAction.DOWN)).toBe(false);
      expect(inputManager.isPressed(InputAction.LEFT)).toBe(false);
      expect(inputManager.isPressed(InputAction.RIGHT)).toBe(false);
      expect(inputManager.isPressed(InputAction.SWAP)).toBe(false);
      expect(inputManager.isPressed(InputAction.RAISE)).toBe(false);
      expect(inputManager.isPressed(InputAction.PAUSE)).toBe(false);
    });

    it('should start with empty input queue', () => {
      expect(inputManager.getQueueSize()).toBe(0);
      expect(inputManager.getInputEvents()).toEqual([]);
    });
  });

  describe('Key Binding Management', () => {
    it('should allow setting custom key bindings', () => {
      inputManager.setKeyBinding('KeyQ', InputAction.PAUSE);
      
      const bindings = inputManager.getKeyBindings();
      expect(bindings.get('KeyQ')).toBe(InputAction.PAUSE);
    });

    it('should allow removing key bindings', () => {
      inputManager.removeKeyBinding('Escape');
      
      const bindings = inputManager.getKeyBindings();
      expect(bindings.has('Escape')).toBe(false);
    });
  });

  describe('Enable/Disable', () => {
    it('should disable and enable input handling', () => {
      expect(inputManager.isEnabled()).toBe(true);
      
      inputManager.disable();
      expect(inputManager.isEnabled()).toBe(false);
      
      inputManager.enable();
      expect(inputManager.isEnabled()).toBe(true);
    });

    it('should clear states when disabled', () => {
      // Simulate key press
      const event = new KeyboardEvent('keydown', { code: 'ArrowUp' });
      window.dispatchEvent(event);
      inputManager.update();
      
      inputManager.disable();
      expect(inputManager.getQueueSize()).toBe(0);
    });
  });

  describe('Key Press Detection', () => {
    it('should detect key press events', () => {
      // Simulate keydown
      const event = new KeyboardEvent('keydown', { 
        code: 'ArrowUp',
        bubbles: true
      });
      
      window.dispatchEvent(event);
      
      expect(inputManager.isPressed(InputAction.UP)).toBe(true);
      expect(inputManager.isJustPressed(InputAction.UP)).toBe(true);
    });

    it('should detect key release events', () => {
      // Press key first
      const keyDownEvent = new KeyboardEvent('keydown', { 
        code: 'ArrowUp',
        bubbles: true
      });
      window.dispatchEvent(keyDownEvent);
      
      // Update to clear just pressed flag
      inputManager.update();
      expect(inputManager.isJustPressed(InputAction.UP)).toBe(false);
      expect(inputManager.isPressed(InputAction.UP)).toBe(true);
      
      // Release key
      const keyUpEvent = new KeyboardEvent('keyup', { 
        code: 'ArrowUp',
        bubbles: true
      });
      window.dispatchEvent(keyUpEvent);
      
      expect(inputManager.isPressed(InputAction.UP)).toBe(false);
      expect(inputManager.isJustReleased(InputAction.UP)).toBe(true);
    });

    it('should ignore unmapped keys', () => {
      const event = new KeyboardEvent('keydown', { 
        code: 'KeyF',
        bubbles: true
      });
      
      window.dispatchEvent(event);
      
      expect(inputManager.getQueueSize()).toBe(0);
    });
  });

  describe('Input Events Queue', () => {
    it('should queue input events correctly', () => {
      const event = new KeyboardEvent('keydown', { 
        code: 'KeyX',
        bubbles: true
      });
      
      window.dispatchEvent(event);
      
      const events = inputManager.getInputEvents();
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe(InputAction.SWAP);
      expect(events[0].type).toBe(InputEventType.PRESSED);
      expect(events[0].repeat).toBe(false);
    });

    it('should clear queue after getting events', () => {
      const event = new KeyboardEvent('keydown', { 
        code: 'KeyZ',
        bubbles: true
      });
      
      window.dispatchEvent(event);
      expect(inputManager.getQueueSize()).toBe(1);
      
      inputManager.getInputEvents();
      expect(inputManager.getQueueSize()).toBe(0);
    });

    it('should handle multiple events in queue', () => {
      const events = [
        new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true }),
        new KeyboardEvent('keydown', { code: 'KeyX', bubbles: true }),
        new KeyboardEvent('keyup', { code: 'ArrowUp', bubbles: true })
      ];
      
      events.forEach(event => window.dispatchEvent(event));
      
      const inputEvents = inputManager.getInputEvents();
      expect(inputEvents).toHaveLength(3);
      expect(inputEvents[0].action).toBe(InputAction.UP);
      expect(inputEvents[0].type).toBe(InputEventType.PRESSED);
      expect(inputEvents[1].action).toBe(InputAction.SWAP);
      expect(inputEvents[1].type).toBe(InputEventType.PRESSED);
      expect(inputEvents[2].action).toBe(InputAction.UP);
      expect(inputEvents[2].type).toBe(InputEventType.RELEASED);
    });
  });

  describe('Hold Duration', () => {
    it('should track hold duration correctly', () => {
      mockPerformanceNow.mockReturnValue(1000);
      
      const event = new KeyboardEvent('keydown', { 
        code: 'ArrowLeft',
        bubbles: true
      });
      window.dispatchEvent(event);
      
      mockPerformanceNow.mockReturnValue(1250);
      inputManager.update();
      
      expect(inputManager.getHoldDuration(InputAction.LEFT)).toBe(250);
    });

    it('should return 0 duration for unpressed keys', () => {
      expect(inputManager.getHoldDuration(InputAction.RIGHT)).toBe(0);
    });
  });

  describe('Key Repeat', () => {
    it('should not repeat if key is released early', () => {
      mockPerformanceNow.mockReturnValue(1000);
      
      // Press and release quickly
      const keyDown = new KeyboardEvent('keydown', { 
        code: 'ArrowDown',
        bubbles: true
      });
      const keyUp = new KeyboardEvent('keyup', { 
        code: 'ArrowDown',
        bubbles: true
      });
      
      window.dispatchEvent(keyDown);
      window.dispatchEvent(keyUp);
      
      // Clear initial events
      inputManager.getInputEvents();
      
      // Advance time
      mockPerformanceNow.mockReturnValue(1300);
      inputManager.update();
      
      const events = inputManager.getInputEvents();
      expect(events.every(e => e.type !== InputEventType.HELD)).toBe(true);
    });
  });

  describe('State Updates', () => {
    it('should clear just pressed/released flags after update', () => {
      const event = new KeyboardEvent('keydown', { 
        code: 'KeyX',
        bubbles: true
      });
      window.dispatchEvent(event);
      
      expect(inputManager.isJustPressed(InputAction.SWAP)).toBe(true);
      
      inputManager.update();
      
      expect(inputManager.isJustPressed(InputAction.SWAP)).toBe(false);
      expect(inputManager.isPressed(InputAction.SWAP)).toBe(true);
    });
  });

  describe('Reset', () => {
    it('should reset all input states', () => {
      // Press multiple keys
      const events = [
        new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true }),
        new KeyboardEvent('keydown', { code: 'KeyX', bubbles: true })
      ];
      
      events.forEach(event => window.dispatchEvent(event));
      
      expect(inputManager.isPressed(InputAction.UP)).toBe(true);
      expect(inputManager.isPressed(InputAction.SWAP)).toBe(true);
      expect(inputManager.getQueueSize()).toBeGreaterThan(0);
      
      inputManager.reset();
      
      expect(inputManager.isPressed(InputAction.UP)).toBe(false);
      expect(inputManager.isPressed(InputAction.SWAP)).toBe(false);
      expect(inputManager.getQueueSize()).toBe(0);
    });
  });

  describe('Debug Information', () => {
    it('should provide debug information', () => {
      const debugInfo = inputManager.getDebugInfo();
      expect(debugInfo).toContain('Input:');
      expect(debugInfo).toContain('Queue');
      expect(debugInfo).toContain('Enabled');
    });
  });

  describe('Cleanup', () => {
    it('should dispose without errors', () => {
      expect(() => inputManager.dispose()).not.toThrow();
      expect(inputManager.isEnabled()).toBe(false);
    });

    it('should clear all states on dispose', () => {
      // Set up some state
      const event = new KeyboardEvent('keydown', { 
        code: 'ArrowUp',
        bubbles: true
      });
      window.dispatchEvent(event);
      
      inputManager.dispose();
      
      expect(inputManager.getQueueSize()).toBe(0);
      expect(inputManager.getKeyBindings().size).toBe(0);
    });
  });
});