import { describe, it, expect, beforeEach } from 'vitest';
import { GameController } from '../../src/game/GameController';
import { Board } from '../../src/game/Board';
import { Cursor } from '../../src/game/Cursor';
import { EnhancedBoardRenderer } from '../../src/rendering/EnhancedBoardRenderer';
import { InputAction } from '../../src/input/InputManager';
import { BoardState } from '../../src/game/BlockTypes';

describe('Cursor Movement Integration Test', () => {
  let board: Board;
  let cursor: Cursor;
  let gameController: GameController;
  
  beforeEach(() => {
    board = new Board();
    cursor = new Cursor(board, EnhancedBoardRenderer.TILE_SIZE);
    gameController = new GameController(board, cursor);
  });
  
  it('should move cursor when arrow keys are pressed', () => {
    // Skip countdown (188 ticks required for COUNTDOWN_TICKS)
    for (let i = 0; i < 188; i++) {
      board.tick();
    }
    
    // Ensure board is in RUNNING state
    expect(board.state).toBe(BoardState.RUNNING);
    
    const startPos = cursor.getPosition();
    expect(startPos.x).toBe(2);
    expect(startPos.y).toBe(5);
    
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
    
    // Let GameController process the input
    // Note: GameController.tick() calls inputManager.update() internally
    gameController.tick();
    cursor.tick();
    
    const newPos = cursor.getPosition();
    
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
    
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].action).toBe(InputAction.LEFT);
  });
});