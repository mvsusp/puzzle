import { describe, it, expect, beforeEach } from 'vitest';
import { GameController } from '../../src/game/GameController';
import { Board } from '../../src/game/Board';
import { Cursor } from '../../src/game/Cursor';
import { BoardRenderer } from '../../src/rendering/BoardRenderer';
import { InputAction } from '../../src/input/InputManager';

describe('Cursor Movement Integration Test', () => {
  let board: Board;
  let cursor: Cursor;
  let gameController: GameController;
  
  beforeEach(() => {
    board = new Board();
    cursor = new Cursor(board, BoardRenderer.TILE_SIZE);
    gameController = new GameController(board, cursor);
  });
  
  it('should move cursor when arrow keys are pressed', () => {
    // Skip countdown (180 ticks)
    for (let i = 0; i < 180; i++) {
      board.tick();
    }
    
    const startPos = cursor.getPosition();
    console.log('Starting position:', startPos);
    console.log('Board state:', board.state);
    
    // Get input manager and simulate key press
    const inputManager = gameController.getInputManager();
    
    // Manually trigger a keydown event
    const event = new KeyboardEvent('keydown', {
      code: 'ArrowUp',
      key: 'ArrowUp',
      bubbles: true,
      cancelable: true
    });
    
    window.dispatchEvent(event);
    
    // Update input manager to process the event
    inputManager.update();
    
    // Check if event was queued
    const events = inputManager.getInputEvents();
    console.log('Input events:', events);
    
    // Process the input through game controller
    gameController.tick();
    cursor.tick();
    
    const newPos = cursor.getPosition();
    console.log('New position:', newPos);
    
    // Check if position changed
    expect(newPos.y).toBe(startPos.y + 1);
  });
  
  it('should queue input events when keys are pressed', () => {
    const inputManager = gameController.getInputManager();
    
    // Check initial state
    expect(inputManager.getQueueSize()).toBe(0);
    
    // Simulate key press
    const event = new KeyboardEvent('keydown', {
      code: 'ArrowLeft',
      key: 'ArrowLeft',
      bubbles: true,
      cancelable: true
    });
    
    window.dispatchEvent(event);
    
    // Update input manager
    inputManager.update();
    
    // Check if event was queued
    const events = inputManager.getInputEvents();
    console.log('Queued events:', events);
    
    expect(events.length).toBeGreaterThan(0);
    if (events.length > 0) {
      expect(events[0].action).toBe(InputAction.LEFT);
    }
  });
});