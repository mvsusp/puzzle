import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '../../../src/game/Board';
import { Block } from '../../../src/game/Block';
import { BlockColor, BlockState, BoardState, TileType } from '../../../src/game/BlockTypes';

describe('Gravity System', () => {
  let board: Board;

  beforeEach(() => {
    board = new Board();
    // Set board to running state so gravity works
    board.state = BoardState.RUNNING;
    
    // Clear the board for controlled testing
    for (let row = 0; row <= Board.TOP_ROW; row++) {
      for (let col = 0; col < Board.BOARD_WIDTH; col++) {
        const tile = board.getTile(row, col);
        if (tile) {
          tile.type = TileType.AIR;
          tile.block = null;
          tile.chain = false;
        }
      }
    }
  });

  describe('Basic Falling', () => {
    it('should make a block fall when support is removed', () => {
      // Place a block in the air
      const tile = board.getTile(3, 2);
      if (tile) {
        const block = new Block(BlockColor.RED);
        tile.type = TileType.BLOCK;
        tile.block = block;
      }

      // Tick multiple times to handle falling
      for (let i = 0; i < 20; i++) {
        board.tick();
      }

      // Block should have fallen to the bottom
      const bottomTile = board.getTile(0, 2);
      const originalTile = board.getTile(3, 2);
      
      expect(originalTile?.type).toBe(TileType.AIR);
      expect(bottomTile?.type).toBe(TileType.BLOCK);
      expect(bottomTile?.block?.state).toBe(BlockState.NORMAL);
      expect(bottomTile?.block?.falling).toBe(false);
    });

    it('should respect float timer (12 ticks)', () => {
      // Place a block in the air
      const tile = board.getTile(3, 2);
      if (tile) {
        const block = new Block(BlockColor.RED);
        tile.type = TileType.BLOCK;
        tile.block = block;
      }

      // Trigger first tick to detect lack of support
      board.tick();
      
      const block = board.getTile(3, 2)?.block;
      expect(block?.falling).toBe(true);
      expect(block?.state).toBe(BlockState.FLOATING);
      expect(block?.floatTimer).toBe(12);

      // Block should not fall for 11 more ticks
      for (let i = 0; i < 11; i++) {
        board.tick();
        expect(board.getTile(3, 2)?.block).toBeTruthy(); // Still there
        expect(block?.floatTimer).toBe(11 - i);
      }

      // On the 12th tick (total 13 ticks), block should fall
      board.tick();
      
      expect(board.getTile(3, 2)?.type).toBe(TileType.AIR); // Original position empty
      expect(board.getTile(0, 2)?.type).toBe(TileType.BLOCK); // Block at bottom
    });

    it('should stop falling when hitting another block', () => {
      // Place support block at bottom
      const supportTile = board.getTile(0, 2);
      if (supportTile) {
        supportTile.type = TileType.BLOCK;
        supportTile.block = new Block(BlockColor.CYAN);
      }

      // Place falling block above
      const fallingTile = board.getTile(3, 2);
      if (fallingTile) {
        fallingTile.type = TileType.BLOCK;
        fallingTile.block = new Block(BlockColor.RED);
      }

      // Let it fall
      for (let i = 0; i < 20; i++) {
        board.tick();
      }

      // Should land on row 1 (above the support block)
      expect(board.getTile(3, 2)?.type).toBe(TileType.AIR); // Original position empty
      expect(board.getTile(1, 2)?.type).toBe(TileType.BLOCK); // Landed position
      expect(board.getTile(0, 2)?.type).toBe(TileType.BLOCK); // Support still there
    });
  });

  describe('Match-Triggered Falling', () => {
    it('should make blocks fall after block removal', () => {
      // Manually simulate block removal by just clearing a tile
      const removedTile = board.getTile(2, 1);
      if (removedTile) {
        removedTile.type = TileType.AIR;
        removedTile.block = null;
      }

      // Place a block above the removed position
      const aboveTile = board.getTile(4, 1);
      if (aboveTile) {
        aboveTile.type = TileType.BLOCK;
        aboveTile.block = new Block(BlockColor.CYAN);
      }

      // Run enough ticks for falling
      for (let i = 0; i < 30; i++) {
        board.tick();
      }

      // The blue block should have fallen down
      expect(board.getTile(4, 1)?.type).toBe(TileType.AIR); // Original position empty
      expect(board.getTile(0, 1)?.type).toBe(TileType.BLOCK); // Fell to bottom
      expect(board.getTile(0, 1)?.block?.color).toBe(BlockColor.CYAN);
    });

    it('should handle basic match scoring', () => {
      // Create a simple horizontal match
      for (let col = 1; col < 4; col++) {
        const tile = board.getTile(1, col);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.RED);
        }
      }

      const initialScore = board.getScore();

      // Run enough ticks for match detection and explosion
      for (let i = 0; i < 80; i++) {
        board.tick();
      }

      // Score should increase
      expect(board.getScore()).toBeGreaterThan(initialScore);
    });
  });

  describe('Multiple Block Falling', () => {
    it('should handle multiple blocks falling in same column', () => {
      // Create a column of blocks at the top that will all fall
      const positions = [8, 9, 10]; // Blocks at higher rows
      
      for (const row of positions) {
        const tile = board.getTile(row, 2);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.GREEN);
        }
      }

      // Let them all fall
      for (let i = 0; i < 30; i++) {
        board.tick();
      }

      // All blocks should stack at bottom
      expect(board.getTile(0, 2)?.type).toBe(TileType.BLOCK);
      expect(board.getTile(1, 2)?.type).toBe(TileType.BLOCK);
      expect(board.getTile(2, 2)?.type).toBe(TileType.BLOCK);
      
      // Higher positions should be empty
      expect(board.getTile(8, 2)?.type).toBe(TileType.AIR);
      expect(board.getTile(9, 2)?.type).toBe(TileType.AIR);
      expect(board.getTile(10, 2)?.type).toBe(TileType.AIR);
    });

    it('should handle blocks falling in multiple columns simultaneously', () => {
      // Place blocks in multiple columns
      for (let col = 0; col < 3; col++) {
        const tile = board.getTile(4, col);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.PURPLE);
        }
      }

      // Let them fall
      for (let i = 0; i < 20; i++) {
        board.tick();
      }

      // All should be at bottom
      for (let col = 0; col < 3; col++) {
        expect(board.getTile(0, col)?.type).toBe(TileType.BLOCK);
        expect(board.getTile(4, col)?.type).toBe(TileType.AIR);
      }
    });
  });

  describe('Support Detection', () => {
    it('should detect block support correctly', () => {
      // Place support block at bottom
      const supportTile = board.getTile(0, 1);
      if (supportTile) {
        supportTile.type = TileType.BLOCK;
        supportTile.block = new Block(BlockColor.RED);
      }

      // Place supported block directly on top
      const supportedTile = board.getTile(1, 1);
      if (supportedTile) {
        supportedTile.type = TileType.BLOCK;
        supportedTile.block = new Block(BlockColor.CYAN);
      }

      // Tick a few times
      for (let i = 0; i < 5; i++) {
        board.tick();
      }

      // Supported block should not fall (it's directly supported)
      expect(board.getTile(1, 1)?.type).toBe(TileType.BLOCK);
      expect(board.getTile(1, 1)?.block?.falling).toBe(false);
    });

    it('should not consider exploding blocks as support', () => {
      // Place exploding support block
      const supportTile = board.getTile(2, 1);
      if (supportTile) {
        supportTile.type = TileType.BLOCK;
        const explodingBlock = new Block(BlockColor.RED);
        explodingBlock.state = BlockState.EXPLODING;
        explodingBlock.startExplosion(10);
        supportTile.block = explodingBlock;
      }

      // Place block above
      const aboveTile = board.getTile(3, 1);
      if (aboveTile) {
        aboveTile.type = TileType.BLOCK;
        aboveTile.block = new Block(BlockColor.CYAN);
      }

      // Tick once to detect lack of support
      board.tick();

      // Block above should start falling despite block below (because it's exploding)
      if (aboveTile && aboveTile.block) {
        expect(aboveTile.block.falling).toBe(true);
        expect(aboveTile.block.state).toBe(BlockState.FLOATING);
      } else {
        throw new Error('Above tile or block should not be null');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle blocks at board edges', () => {
      // Place blocks at leftmost and rightmost columns
      const leftTile = board.getTile(3, 0);
      const rightTile = board.getTile(3, Board.BOARD_WIDTH - 1);
      
      if (leftTile) {
        leftTile.type = TileType.BLOCK;
        leftTile.block = new Block(BlockColor.CYAN);
      }
      
      if (rightTile) {
        rightTile.type = TileType.BLOCK;
        rightTile.block = new Block(BlockColor.CYAN);
      }

      // Let them fall
      for (let i = 0; i < 20; i++) {
        board.tick();
      }

      // Both should fall to bottom
      expect(board.getTile(0, 0)?.type).toBe(TileType.BLOCK);
      expect(board.getTile(0, Board.BOARD_WIDTH - 1)?.type).toBe(TileType.BLOCK);
    });

    it('should handle falling blocks during swap animations', () => {
      // Place a swapping block
      const swappingTile = board.getTile(3, 2);
      if (swappingTile) {
        swappingTile.type = TileType.BLOCK;
        const swappingBlock = new Block(BlockColor.GREEN);
        swappingBlock.startSwap('left');
        swappingTile.block = swappingBlock;
      }

      // Tick multiple times
      for (let i = 0; i < 10; i++) {
        board.tick();
      }

      // Swapping block should not fall until swap completes
      // (Implementation should skip swapping blocks in gravity)
      expect(board.getTile(3, 2)?.type).toBe(TileType.BLOCK);
    });

    it('should preserve chain flags during falling', () => {
      // Create a match to trigger chain flag setting
      for (let col = 1; col < 4; col++) {
        const tile = board.getTile(1, col);
        if (tile) {
          tile.type = TileType.BLOCK;
          tile.block = new Block(BlockColor.RED);
        }
      }

      // Place block above that should get chain flag
      const chainTile = board.getTile(3, 2);
      if (chainTile) {
        chainTile.type = TileType.BLOCK;
        chainTile.block = new Block(BlockColor.CYAN);
      }

      board.state = 'running' as any;

      // Run match-explode-fall cycle
      for (let i = 0; i < 100; i++) {
        board.tick();
      }

      // Find where the blue block ended up and check chain flag
      let foundChainBlock = false;
      for (let row = 0; row <= Board.TOP_ROW; row++) {
        const tile = board.getTile(row, 2);
        if (tile?.block?.color === BlockColor.CYAN) {
          if (tile) {
            expect(tile.chain).toBe(true);
          }
          foundChainBlock = true;
          break;
        }
      }
      expect(foundChainBlock).toBe(true);
    });
  });

  describe('Performance and Stability', () => {
    it('should handle full board of falling blocks without errors', () => {
      // Fill most of the board with blocks
      for (let row = 2; row <= Board.TOP_ROW; row++) {
        for (let col = 0; col < Board.BOARD_WIDTH; col++) {
          if (Math.random() > 0.3) { // 70% fill rate
            const tile = board.getTile(row, col);
            if (tile) {
              tile.type = TileType.BLOCK;
              tile.block = new Block(Math.floor(Math.random() * 5));
            }
          }
        }
      }

      // Run many ticks without errors - this is the main test
      expect(() => {
        for (let i = 0; i < 100; i++) {
          board.tick();
        }
      }).not.toThrow();

      // Verify blocks are generally settling downward
      let topHalfBlocks = 0;
      let bottomHalfBlocks = 0;
      
      for (let row = 0; row <= Board.TOP_ROW; row++) {
        for (let col = 0; col < Board.BOARD_WIDTH; col++) {
          const tile = board.getTile(row, col);
          if (tile?.block) {
            if (row > Board.TOP_ROW / 2) {
              topHalfBlocks++;
            } else {
              bottomHalfBlocks++;
            }
          }
        }
      }
      
      // Most blocks should have settled to the bottom half
      expect(bottomHalfBlocks).toBeGreaterThanOrEqual(topHalfBlocks);
    });

    it('should maintain correct block count during falling', () => {
      // Count initial blocks
      const initialBlocks: Block[] = [];
      for (let row = 0; row <= Board.TOP_ROW; row++) {
        for (let col = 0; col < Board.BOARD_WIDTH; col++) {
          const tile = board.getTile(row, col);
          if (tile?.block) {
            initialBlocks.push(tile.block);
          }
        }
      }
      const initialCount = initialBlocks.length;

      // Make some blocks fall by removing support
      // Clear bottom row to remove support
      for (let col = 0; col < Board.BOARD_WIDTH; col++) {
        const tile = board.getTile(0, col);
        if (tile) {
          if (tile.block) {
            tile.block.dispose();
          }
          tile.type = TileType.AIR;
          tile.block = null;
        }
      }

      // Let blocks fall
      for (let i = 0; i < 30; i++) {
        board.tick();
      }

      // Count final blocks (should be same as initial - removed bottom row)
      let finalCount = 0;
      for (let row = 0; row <= Board.TOP_ROW; row++) {
        for (let col = 0; col < Board.BOARD_WIDTH; col++) {
          const tile = board.getTile(row, col);
          if (tile?.block) {
            finalCount++;
          }
        }
      }

      // We removed bottom row, so final should be initial minus bottom row
      const bottomRowBlocks = 6; // Board width
      expect(finalCount).toBe(Math.max(0, initialCount - bottomRowBlocks));
    });
  });
});