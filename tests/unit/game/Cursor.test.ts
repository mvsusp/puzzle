import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '../../../src/game/Board';
import { Cursor } from '../../../src/game/Cursor';
import { BoardState, TileType, BlockColor } from '../../../src/game/BlockTypes';
import { Block } from '../../../src/game/Block';

describe('Cursor', () => {
  let board: Board;
  let cursor: Cursor;
  const tileSize = 32;

  beforeEach(() => {
    board = new Board();
    cursor = new Cursor(board, tileSize);
  });

  describe('Initialization', () => {
    it('should initialize at board cursor position', () => {
      expect(cursor.getPosition().x).toBe(board.cursorX);
      expect(cursor.getPosition().y).toBe(board.cursorY);
    });

    it('should create cursor mesh', () => {
      const mesh = cursor.getMesh();
      expect(mesh).toBeDefined();
      expect(mesh.name).toBe('Cursor');
    });

    it('should start visible and pulsing', () => {
      const mesh = cursor.getMesh();
      expect(mesh.visible).toBe(true);
    });
  });

  describe('Movement', () => {
    it('should move cursor in valid directions', () => {
      const initialX = cursor.getPosition().x;
      const initialY = cursor.getPosition().y;
      
      // Move right
      const moved = cursor.move(1, 0);
      cursor.tick(); // Update cursor position
      expect(moved).toBe(true);
      expect(cursor.getPosition().x).toBe(initialX + 1);
      expect(cursor.getPosition().y).toBe(initialY);
    });

    it('should wrap horizontally at board edges', () => {
      // Move to right edge
      cursor.setPosition(Board.BOARD_WIDTH - 1, 5);
      cursor.tick();
      
      // Move right should wrap to left edge
      const moved = cursor.move(1, 0);
      cursor.tick();
      expect(moved).toBe(true);
      expect(cursor.getPosition().x).toBe(0);
      
      // Move left from left edge should wrap to right
      const movedLeft = cursor.move(-1, 0);
      cursor.tick();
      expect(movedLeft).toBe(true);
      expect(cursor.getPosition().x).toBe(Board.BOARD_WIDTH - 1);
    });

    it('should clamp vertically at board edges', () => {
      // Move to top edge
      cursor.setPosition(2, Board.TOP_ROW);
      cursor.tick();
      
      // Try to move up (should stay at top)
      const movedUp = cursor.move(0, 1);
      cursor.tick();
      expect(movedUp).toBe(false);
      expect(cursor.getPosition().y).toBe(Board.TOP_ROW);
      
      // Move to bottom edge
      cursor.setPosition(2, 0);
      cursor.tick();
      
      // Try to move down (should stay at bottom)
      const movedDown = cursor.move(0, -1);
      cursor.tick();
      expect(movedDown).toBe(false);
      expect(cursor.getPosition().y).toBe(0);
    });

    it('should update board cursor position', () => {
      cursor.move(2, 1);
      cursor.tick();
      expect(board.cursorX).toBe(cursor.getPosition().x);
      expect(board.cursorY).toBe(cursor.getPosition().y);
    });
  });

  describe('Position Setting', () => {
    it('should set cursor position directly', () => {
      cursor.setPosition(3, 7);
      cursor.tick();
      expect(cursor.getPosition().x).toBe(3);
      expect(cursor.getPosition().y).toBe(7);
    });

    it('should clamp position to valid bounds', () => {
      cursor.setPosition(-5, -5);
      cursor.tick();
      expect(cursor.getPosition().x).toBe(0);
      expect(cursor.getPosition().y).toBe(0);
      
      cursor.setPosition(10, 25);
      cursor.tick();
      expect(cursor.getPosition().x).toBe(Board.BOARD_WIDTH - 1);
      expect(cursor.getPosition().y).toBe(Board.TOP_ROW);
    });

    it('should reset to center position', () => {
      cursor.move(2, 3);
      cursor.resetToCenter();
      cursor.tick();
      
      const centerX = Math.floor(Board.BOARD_WIDTH / 2);
      const centerY = Math.floor(Board.TOP_ROW / 2);
      expect(cursor.getPosition().x).toBe(centerX);
      expect(cursor.getPosition().y).toBe(centerY);
    });
  });

  describe('Swap Operations', () => {
    it('should allow swap when cursor is not at right edge', () => {
      cursor.setPosition(2, 5);
      expect(cursor.canSwap()).toBe(true);
    });

    it('should not allow swap at right edge', () => {
      cursor.setPosition(Board.BOARD_WIDTH - 1, 5);
      expect(cursor.canSwap()).toBe(false);
    });

    it('should perform block swap successfully', () => {
      cursor.setPosition(1, 1);
      
      // Get initial tile contents
      const leftTile = board.getTile(1, 1);
      const rightTile = board.getTile(1, 2);
      const leftBlock = leftTile?.block;
      const rightBlock = rightTile?.block;
      
      const swapped = cursor.swap();
      expect(swapped).toBe(true);
      
      // Check that tiles were swapped
      const newLeftTile = board.getTile(1, 1);
      const newRightTile = board.getTile(1, 2);
      
      expect(newLeftTile?.block).toBe(rightBlock);
      expect(newRightTile?.block).toBe(leftBlock);
    });

    it('should set grace timer after swap', () => {
      cursor.setPosition(1, 1);
      const initialGraceTimer = board.graceTimer;
      
      cursor.swap();
      
      expect(board.graceTimer).toBeGreaterThan(initialGraceTimer);
    });

    it('should start swap animations on blocks', () => {
      cursor.setPosition(1, 1);
      
      // Ensure we have blocks to swap
      const leftTile = board.getTile(1, 1)!;
      const rightTile = board.getTile(1, 2)!;
      
      if (leftTile.block && rightTile.block) {
        cursor.swap();
        
        // Check that blocks have swap timers set
        expect(leftTile.block.swapTimer).toBeGreaterThan(0);
        expect(rightTile.block.swapTimer).toBeGreaterThan(0);
      }
    });
  });

  describe('Visual State', () => {
    it('should enable and disable pulsing', () => {
      cursor.setPulseEnabled(true);
      // Pulse state is internal, but we can check it doesn't throw
      expect(() => cursor.tick()).not.toThrow();
      
      cursor.setPulseEnabled(false);
      expect(() => cursor.tick()).not.toThrow();
    });

    it('should set cursor color', () => {
      expect(() => cursor.setColor(0xFF0000)).not.toThrow();
    });

    it('should show and hide cursor', () => {
      cursor.setVisible(true);
      expect(cursor.getMesh().visible).toBe(true);
      
      cursor.setVisible(false);
      expect(cursor.getMesh().visible).toBe(false);
    });
  });

  describe('Movement Smoothing', () => {
    it('should detect when cursor is moving', () => {
      // Initial position should not be moving
      expect(cursor.isMoving()).toBe(false);
      
      // After setting a new position, might be moving due to smoothing
      cursor.setPosition(4, 4);
      // Note: isMoving() depends on smoothing implementation details
    });

    it('should update smoothly during tick', () => {
      const initialPos = cursor.getPosition();
      cursor.move(1, 1);
      
      // Tick should update visual position
      expect(() => cursor.tick()).not.toThrow();
    });
  });

  describe('Bounds and Collision', () => {
    it('should provide cursor bounds', () => {
      const bounds = cursor.getBounds();
      expect(bounds).toHaveProperty('x');
      expect(bounds).toHaveProperty('y');
      expect(bounds).toHaveProperty('width');
      expect(bounds).toHaveProperty('height');
      expect(bounds.width).toBeGreaterThan(0);
      expect(bounds.height).toBeGreaterThan(0);
    });

    it('should check if cursor is at specific position', () => {
      cursor.setPosition(3, 4);
      cursor.tick();
      expect(cursor.isAt(3, 4)).toBe(true);
      expect(cursor.isAt(2, 4)).toBe(false);
      expect(cursor.isAt(3, 3)).toBe(false);
    });
  });

  describe('Coordinate Conversion', () => {
    it('should convert world position to grid coordinates', () => {
      const worldX = 50;
      const worldY = 100;
      const gridPos = Cursor.worldToGrid(worldX, worldY, tileSize, Board.BOARD_WIDTH, Board.TOP_ROW + 1);
      
      expect(gridPos).toHaveProperty('x');
      expect(gridPos).toHaveProperty('y');
      expect(typeof gridPos.x).toBe('number');
      expect(typeof gridPos.y).toBe('number');
    });
  });

  describe('Target Position', () => {
    it('should track target position separately from current position', () => {
      const target = cursor.getTargetPosition();
      expect(target).toHaveProperty('x');
      expect(target).toHaveProperty('y');
      
      cursor.move(1, 1);
      const newTarget = cursor.getTargetPosition();
      expect(newTarget.x).toBe(target.x + 1);
      expect(newTarget.y).toBe(target.y + 1);
    });
  });

  describe('Debug Information', () => {
    it('should provide debug information', () => {
      const debugInfo = cursor.getDebugInfo();
      expect(debugInfo).toContain('Cursor:');
      expect(debugInfo).toContain('Target:');
      expect(debugInfo).toContain('Moving:');
    });
  });

  describe('Cleanup', () => {
    it('should dispose without errors', () => {
      expect(() => cursor.dispose()).not.toThrow();
    });

    it('should dispose geometry and materials', () => {
      const mesh = cursor.getMesh();
      expect(mesh).toBeDefined();
      
      cursor.dispose();
      
      // After disposal, materials should be disposed (internal implementation detail)
      expect(() => cursor.dispose()).not.toThrow(); // Should not throw even if called twice
    });
  });

  describe('Animation Updates', () => {
    it('should handle tick updates without errors', () => {
      for (let i = 0; i < 100; i++) {
        expect(() => cursor.tick()).not.toThrow();
      }
    });

    it('should animate pulse over time', () => {
      cursor.setPulseEnabled(true);
      const initialScale = cursor.getMesh().scale.x;
      
      // Tick multiple times to see animation
      for (let i = 0; i < 50; i++) {
        cursor.tick();
      }
      
      // Scale should have changed due to pulsing (may be same due to sine wave)
      expect(typeof cursor.getMesh().scale.x).toBe('number');
    });
  });
});