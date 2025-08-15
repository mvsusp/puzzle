import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '../../../src/game/Board';
import { BoardState, TileType, BlockColor } from '../../../src/game/BlockTypes';

describe('Board', () => {
  let board: Board;

  beforeEach(() => {
    board = new Board();
  });

  describe('Initialization', () => {
    it('should create board with correct dimensions', () => {
      expect(Board.BOARD_WIDTH).toBe(6);
      expect(Board.BOARD_HEIGHT).toBe(24);
      expect(Board.TOP_ROW).toBe(11);
    });

    it('should initialize in countdown state', () => {
      expect(board.state).toBe(BoardState.COUNTDOWN);
      expect(board.getScore()).toBe(0);
      expect(board.getChainCounter()).toBe(1);
    });

    it('should have cursor in center position', () => {
      expect(board.cursorX).toBe(2);
      expect(board.cursorY).toBe(5);
    });

    it('should initialize with random blocks in bottom rows', () => {
      let blockCount = 0;

      // Check first 6 rows for blocks
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < Board.BOARD_WIDTH; col++) {
          const tile = board.getTile(row, col);
          if (tile && tile.type === TileType.BLOCK) {
            blockCount++;
            expect(tile.block).not.toBeNull();
            expect(tile.block!.color).toBeGreaterThanOrEqual(0);
            expect(tile.block!.color).toBeLessThan(5);
          }
        }
      }

      // Should have blocks in the initial setup
      expect(blockCount).toBeGreaterThan(0);
    });

    it('should have buffer row filled', () => {
      for (let col = 0; col < Board.BOARD_WIDTH; col++) {
        const tile = board.getBufferRowTile(col);
        expect(tile).not.toBeNull();
        expect(tile!.type).toBe(TileType.BLOCK);
        expect(tile!.block).not.toBeNull();
      }
    });
  });

  describe('Tile Access', () => {
    it('should return null for out-of-bounds coordinates', () => {
      expect(board.getTile(-1, 0)).toBeNull();
      expect(board.getTile(0, -1)).toBeNull();
      expect(board.getTile(Board.BOARD_HEIGHT, 0)).toBeNull();
      expect(board.getTile(0, Board.BOARD_WIDTH)).toBeNull();
    });

    it('should return valid tiles for in-bounds coordinates', () => {
      const tile = board.getTile(0, 0);
      expect(tile).not.toBeNull();
      expect(tile!.type).toBeDefined();
    });

    it('should return null for out-of-bounds buffer row access', () => {
      expect(board.getBufferRowTile(-1)).toBeNull();
      expect(board.getBufferRowTile(Board.BOARD_WIDTH)).toBeNull();
    });
  });

  describe('Game State Management', () => {
    it('should transition from countdown to running', () => {
      expect(board.state).toBe(BoardState.COUNTDOWN);

      // Run enough ticks to complete countdown
      for (let i = 0; i < Board.COUNTDOWN_TICKS; i++) {
        board.tick();
      }

      expect(board.state).toBe(BoardState.RUNNING);
    });

    it('should update countdown state during countdown', () => {
      expect(board.countdownState).toBe(3);

      // Run partial countdown
      for (let i = 0; i < Board.COUNTDOWN_TICKS * 0.3; i++) {
        board.tick();
      }

      // Should still be in countdown but state may have changed
      expect(board.state).toBe(BoardState.COUNTDOWN);
    });

    it('should track ticks run correctly', () => {
      const initialTicks = board.ticksRun;

      board.tick();
      expect(board.ticksRun).toBe(initialTicks + 1);

      board.tick();
      board.tick();
      expect(board.ticksRun).toBe(initialTicks + 3);
    });
  });

  describe('Stack Management', () => {
    it('should force stack raise when requested', () => {
      board.state = BoardState.RUNNING; // Skip countdown

      // Record initial bottom tile properties for comparison
      const initialTile = board.getTile(0, 0);
      const initialType = initialTile?.type;
      const initialBlockColor = initialTile?.block?.color;

      // Force raise: should bypass timer and start stepping immediately
      board.inputForceStackRaise();
      board.tick();

      // After one tick we should have progressed one step
      expect(board.stackOffset).toBeGreaterThan(0);

      // Advance enough ticks to complete a full row raise (32 steps)
      const stepsRemaining = Board.STACK_RAISE_STEPS - board.stackOffset;
      for (let i = 0; i < stepsRemaining; i++) {
        board.tick();
      }

      // Now a full row should have been applied; the original bottom tile should be at row 1
      const movedTile = board.getTile(1, 0);
      expect(movedTile?.type).toBe(initialType);
      expect(movedTile?.block?.color).toBe(initialBlockColor);
    });

    it('should have proper stack raise timing', () => {
      expect(board.stackRaiseTicks).toBe(10); // Matches original game timing
      expect(board.stackRaiseTimer).toBe(0);
    });
  });

  describe('Panic and Warning States', () => {
    it('should not be in panic initially', () => {
      expect(board.isPanic()).toBe(false);
    });

    it('should not have warning columns initially', () => {
      for (let col = 0; col < Board.BOARD_WIDTH; col++) {
        expect(board.getWarnColumn(col)).toBe(false);
      }
    });

    it('should return false for out-of-bounds warning column check', () => {
      expect(board.getWarnColumn(-1)).toBe(false);
      expect(board.getWarnColumn(Board.BOARD_WIDTH)).toBe(false);
    });
  });

  describe('Garbage Management', () => {
    it('should queue garbage blocks', () => {
      board.queueGarbage(true, 4);

      // Garbage queue should have items (internal state, hard to test directly)
      // This tests that the method doesn't throw
      expect(() => board.queueGarbage(false, 2)).not.toThrow();
    });
  });

  describe('Board Reset', () => {
    it('should create new board when reset', () => {
      const originalScore = board.getScore();
      const originalTicks = board.ticksRun;

      // Modify board state
      board.tick();
      board.tick();

      const newBoard = board.reset();

      expect(newBoard).toBeInstanceOf(Board);
      expect(newBoard.getScore()).toBe(0);
      expect(newBoard.ticksRun).toBe(0);
      expect(newBoard.state).toBe(BoardState.COUNTDOWN);
    });
  });

  describe('Utility Methods', () => {
    it('should provide debug information', () => {
      const debugInfo = board.getDebugInfo();
      expect(debugInfo).toContain('Board:');
      expect(debugInfo).toContain('Ticks:');
      expect(debugInfo).toContain('Score:');
      expect(debugInfo).toContain('Chain:');
    });

    it('should handle win condition', () => {
      board.win();
      expect(board.state).toBe(BoardState.WON);
    });

    it('should advance countdown state', () => {
      const initialState = board.countdownState;
      board.advanceCountdownState();

      if (initialState > 0) {
        expect(board.countdownState).toBe(initialState - 1);
      }
    });
  });
});